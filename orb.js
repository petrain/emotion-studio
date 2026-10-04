// Grainy, slowly-turning "emotion orb". Colors ease toward the selected emotion's palette;
// audio amplitude (0..1) makes the surface churn and swell.

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;

const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform float uAmp;
uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3;

float h(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float n(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h(i+vec3(0,0,0)),h(i+vec3(1,0,0)),f.x), mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x), mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y), f.z);
}
float fbm(vec3 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*n(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=.5; } return s; }

void main(){
  float m = min(uRes.x, uRes.y);
  vec2 uv = (gl_FragCoord.xy - .5*uRes) / (.5*m) * 1.06;
  float r = length(uv);
  float grain = h(vec3(gl_FragCoord.xy, floor(uTime*24.)));
  if (r > 1.0 + 0.01) { gl_FragColor = vec4(0.); return; }

  vec3 nrm = vec3(uv, sqrt(max(0., 1. - r*r)));
  float t = uTime * (.10 + .35*uAmp);
  float cy = cos(t), sy = sin(t);
  vec3 q = vec3(cy*nrm.x + sy*nrm.z, nrm.y, -sy*nrm.x + cy*nrm.z);

  vec3 w = q*1.4 + vec3(0., uTime*.05, 0.);
  float a = fbm(w + fbm(w*1.3 + uTime*.08)*(1.1 + 1.6*uAmp));
  float b = fbm(w*2.1 - vec3(uTime*.07));

  vec3 col = mix(uC1, uC2, smoothstep(.30, .70, a));
  col = mix(col, uC3, smoothstep(.45, .80, b) * .85);

  // horizontal "cloud band" near the bottom like a lit atmosphere
  float band = smoothstep(.10, .0, abs(uv.y + .55 + .05*sin(uv.x*4. + uTime*.4))) * .35;
  col = mix(col, mix(uC3, vec3(1.), .5), band);

  float light = clamp(dot(nrm, normalize(vec3(.45, .55, .7))), 0., 1.);
  col *= .62 + .55*light;
  col += pow(1. - nrm.z, 3.) * .18 * uC3;              // rim glow
  col += (grain - .5) * .10;                          // film grain

  float alpha = smoothstep(1.0, 1.0 - 0.012, r);
  gl_FragColor = vec4(col*alpha, alpha);
}`;

function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255];
}

export class Orb {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
    this.gl = gl;
    this.amp = 0; this.targetAmp = 0;
    this.cur = [[.2, .5, .3], [.9, .5, .4], [1, .8, .7]];
    this.tgt = this.cur.map((c) => c.slice());
    if (!gl) { canvas.classList.add('no-webgl'); return; }

    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);
    this.prog = prog;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.u = Object.fromEntries(['uRes', 'uTime', 'uAmp', 'uC1', 'uC2', 'uC3'].map((k) => [k, gl.getUniformLocation(prog, k)]));
    this.start = performance.now();
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    const loop = () => { this.frame(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  setPalette(hexes) { this.tgt = hexes.map(hexToRgb); }
  setAmplitude(a) { this.targetAmp = a; }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { clientWidth: w, clientHeight: h } = this.canvas;
    this.canvas.width = Math.max(1, w * dpr); this.canvas.height = Math.max(1, h * dpr);
  }

  frame() {
    const gl = this.gl;
    this.amp += (this.targetAmp - this.amp) * 0.18;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) this.cur[i][j] += (this.tgt[i][j] - this.cur[i][j]) * 0.04;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.u.uTime, (performance.now() - this.start) / 1000);
    gl.uniform1f(this.u.uAmp, this.amp);
    gl.uniform3fv(this.u.uC1, this.cur[0]); gl.uniform3fv(this.u.uC2, this.cur[1]); gl.uniform3fv(this.u.uC3, this.cur[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.canvas.style.transform = `scale(${1 + this.amp * 0.06})`;
  }
}
