import { Orb } from './orb.js';

const { MODELS, REGIONS, SAMPLE_LINES, PARALINGUISTICS, OMNI_STYLES, prettyStyle } = window.CATALOG;
const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------------ storage */
function sessionKey() { try { return sessionStorage.getItem('es.key') || ''; } catch { return ''; } }
const store = {
  get(k, d) { try { const v = localStorage.getItem('es.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('es.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};

/* ------------------------------------------------------------------ state */
const state = {
  model: null, locale: null, voice: null, styles: ['neutral'],
  pos: 0, target: 0, committed: -1, dragging: false,
  hasSpoken: false, playing: false, busy: false, sweepToken: 0,
  auth: { proxy: false, region: store.get('region', 'eastus'), key: store.get('key', '') || sessionKey() },
};
const cache = new Map(); // ssml -> blob URL

// Rebuild the catalog from the resource's live voice list (cached). The doc tables in data.js are the offline fallback.
// list rows: [ShortName, Gender, StyleList|null]
const NEURAL_RE = /^([a-z]{2,3}-[A-Z][A-Za-z]{1,3})-([A-Za-z0-9]+?)Neural$/;
function applyVoiceList(list) {
  const bySuffix = {}, omniIds = new Map();
  for (const [name, gender, styles, locale] of list) {
    // Multi-talker voices (e.g. "en-Multitalker") need dialogue-turn SSML this page doesn't build.
    if (/multitalker/i.test(name)) continue;
    const [base, suffix] = name.split(':');
    const g = gender === 'Female' ? 'F' : 'M';
    if (suffix) {
      (bySuffix[suffix] ||= []).push({ id: base, gender: g, locale, styles: styles || [] });
      if (suffix === 'DragonHDOmniLatestNeural') omniIds.set(base, { g, locale });
      continue;
    }
    const m = NEURAL_RE.exec(name);
    if (m && !/Multilingual|Turbo/.test(m[2]) && !omniIds.has(`${m[1]}-${m[2]}`)) omniIds.set(`${m[1]}-${m[2]}`, { g, locale });
  }
  let total = 0;
  for (const model of MODELS) {
    if (model.id === 'DragonHDOmni') {
      if (omniIds.size) model.voices = [...omniIds].map(([id, { g, locale }]) => ({ id, gender: g, locale, styles: OMNI_STYLES }));
      total += model.voices.length; continue;
    }
    const live = bySuffix[model.suffix];
    if (!live?.length) { total += model.voices.length; continue; }
    const prev = new Map(model.voices.map((v) => [v.id, v]));
    model.voices = live.map((v) => {
      const p = prev.get(v.id);
      // MAI: union of documented + live styles; others: live list, else documented, else model default
      let styles = model.family === 'MAI' ? [...(p?.styles || []), ...v.styles]
        : v.styles.length ? v.styles : p?.styles || model.defaultStyles || [];
      return { id: v.id, gender: v.gender, locale: v.locale, note: p?.note, styles: [...new Set(['neutral', ...styles])] };
    });
    total += model.voices.length;
  }
  return total;
}
const cachedList = store.get('voiceList2', null);
if (cachedList?.rows) applyVoiceList(cachedList.rows);

async function fetchVoiceRows(region, key) {
  let res;
  try {
    res = key
      ? await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, { headers: { 'Ocp-Apim-Subscription-Key': key } })
      : await fetch('api/voices');
  } catch {
    throw new Error(key ? `Couldn't reach ${region}.tts.speech.microsoft.com — check the region name.` : 'Proxy unreachable.');
  }
  if (res.status === 401 || res.status === 403) throw new Error(`Key rejected for region “${region}”. Make sure the key belongs to a Speech resource in that region.`);
  if (!res.ok) throw new Error(`Azure returned HTTP ${res.status}.`);
  const rows = (await res.json()).map((v) => [v.ShortName, v.Gender, v.StyleList || null, v.Locale]);
  if (!rows.length) throw new Error('Azure returned an empty voice list.');
  return rows;
}

async function syncVoices({ region, key, force = false } = {}) {
  if (!force && cachedList && Date.now() - cachedList.at < 864e5) return null;
  const rows = await fetchVoiceRows(region, key);
  store.set('voiceList2', { at: Date.now(), rows });
  const total = applyVoiceList(rows);
  setModel(state.model.id);
  return total;
}

/* ------------------------------------------------------------------ palettes */
const GROUPS = {
  joy: [['#f2a541', '#f26b5b', '#ffe3b3'], 'happy joyful cheerful friendlycheerful amused laughing joking optimistic hopeful relieved appreciative proud impressed encouraging chat cute'],
  excite: [['#ff5e62', '#ff9966', '#ffe29f'], 'excited ecstatic amazed adventurous live-commercial fast urgent'],
  calm: [['#3f8f86', '#a7c7e7', '#eef3e2'], 'calm reassuring reflective peaceful comforting gentle relaxed poetry-reading slow story audiobook narrator educational'],
  tender: [['#b0739a', '#f3c4c4', '#fff0e8'], 'caringempathy empathetic sympathetic affectionate nostalgic sentimental softvoice whispering quiet shy secretive'],
  sad: [['#24325f', '#5b7db1', '#c9d6ea'], 'sad saddisappointed disappointed defeated hurt remorseful regretful resigned lonely depressed sorry guilty tired'],
  anger: [['#6e0d18', '#e0362c', '#ff9a6b'], 'angry annoyed frustrated shouting defiant upset impatient complaining strict debating'],
  fear: [['#2e2150', '#7b5ea7', '#c3b1e1'], 'fearful anxious panicked terrified nervous scared cautious hesitant embarrassed pleading painful struggling panting concerned'],
  wry: [['#4d5a1e', '#a3b330', '#e3e7a0'], 'disgusted jealous sarcastic skeptical suspicious doubtful defensive'],
  wonder: [['#1e6fa8', '#f15bb5', '#fee440'], 'surprised shocked confused intrigued curious'],
  steel: [['#22343c', '#5f7d8c', '#cfd8dc'], 'serious determined confident news'],
  pro: [['#1f5e3a', '#e98a6c', '#ffd3c2'], 'neutral agent customer_call_center customer-service voice-assistant'],
  roles: [['#3e1f47', '#b5838d', '#ffcdb2'], 'assassin captain cavalier prince game-narrator geomancer poet'],
};
const STYLE_GROUP = {};
for (const [g, [, words]] of Object.entries(GROUPS)) for (const w of words.split(' ')) STYLE_GROUP[w] = g;

function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function shiftHue(hex, deg) {
  let r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
  }
  h = (h + deg + 360) % 360;
  const f = (n) => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return '#' + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}
function paletteFor(style) {
  const g = STYLE_GROUP[style] || 'pro';
  const base = GROUPS[g][0];
  const shift = style === 'neutral' ? 0 : (hash(style) % 31) - 15;
  return base.map((c) => shiftHue(c, shift));
}

/* ------------------------------------------------------------------ catalog helpers */
const langName = (() => {
  let dn; try { dn = new Intl.DisplayNames(['en'], { type: 'language' }); } catch { /* old browser */ }
  return (loc) => { try { return dn ? dn.of(loc) : loc; } catch { return loc; } };
})();
const voiceName = (v) => v.id.split('-').slice(2).join('-');
const localeOf = (v) => v.locale || v.id.split('-').slice(0, 2).join('-');
const fullVoiceId = (v) => `${v.id}:${state.model.suffix}`;

function fillSelect(sel, items, value) {
  sel.innerHTML = '';
  for (const [val, label] of items) sel.add(new Option(label, val, false, val === value));
  if (!items.some(([v]) => v === value) && items.length) sel.value = items[0][0];
}

function setModel(id, keepLocale = true) {
  state.model = MODELS.find((m) => m.id === id) || MODELS[0];
  const locales = [...new Set(state.model.voices.map(localeOf))].sort((a, b) => langName(a).localeCompare(langName(b)));
  const want = keepLocale && locales.includes(state.locale) ? state.locale : (locales.includes('en-US') ? 'en-US' : locales[0]);
  fillSelect($('locale'), locales.map((l) => [l, `${langName(l)} · ${l}`]), want);
  setLocale($('locale').value);
}

function setLocale(loc) {
  const prevLang = state.locale?.split('-')[0];
  state.locale = loc;
  const voices = state.model.voices.filter((v) => localeOf(v) === loc)
    .sort((a, b) => b.styles.length - a.styles.length || a.id.localeCompare(b.id));
  const prevName = state.voice && voiceName(state.voice);
  const keep = voices.find((v) => voiceName(v) === prevName);
  fillSelect($('voice'), voices.map((v) => [v.id,
    `${voiceName(v)} · ${v.gender === 'F' ? 'Female' : 'Male'}${v.note ? ' · ' + v.note : ''}${v.styles.length > 1 ? ` · ${v.styles.length} styles` : ''}`]),
    (keep || voices[0]).id);
  if (prevLang !== loc.split('-')[0]) setSampleLine(0);
  setVoice($('voice').value);
}

function setVoice(id) {
  const prevStyle = state.styles[state.committed] || 'neutral';
  state.voice = state.model.voices.find((v) => v.id === id);
  // neutral first, rest alphabetical — then centre the wheel on the previous emotion if this voice has it
  const rest = state.voice.styles.filter((s) => s !== 'neutral').sort();
  state.styles = state.voice.styles.includes('neutral') ? ['neutral', ...rest] : rest;
  buildWheel();
  const i = Math.max(0, state.styles.indexOf(prevStyle));
  state.pos = state.target = i; state.committed = -1;
  commit(i, false);
  updateChrome();
  store.set('sel', { model: state.model.id, locale: state.locale, voice: state.voice.id });
}

function updateChrome() {
  const m = state.model;
  $('subhead').textContent = `${m.label} · ${voiceName(state.voice)}`;
  $('blurb').textContent = m.blurb;
  $('para').hidden = !m.paralinguistics;
  $('tempRow').hidden = !m.temperature;

  const hints = [];
  if (state.styles.length <= 1) hints.push('This voice has a single style. Pick a voice with more styles to explore emotions.');
  if (m.englishStylesOnly && !state.locale.startsWith('en')) hints.push('HD styles are tuned for English text; other languages are still expressive but styles may be subtle.');
  if (m.mode === 'bracket') hints.push('Dragon HD styles are sent as inline [style] tags.');
  $('hint').textContent = hints.join(' ');
}

/* ------------------------------------------------------------------ sample lines */
let sampleIdx = 0;
function setSampleLine(step) {
  const lines = SAMPLE_LINES[state.locale.split('-')[0]] || SAMPLE_LINES.en;
  sampleIdx = (sampleIdx + step + lines.length) % lines.length;
  $('line').value = lines[sampleIdx];
  autosize(); renderSsml();
}

/* ------------------------------------------------------------------ wheel */
const wheel = $('wheel'), itemsEl = $('wheelItems'), activeRow = $('activeRow');
let itemEls = [];
const geo = { x0: 0, cy: 0, R: 0, spacing: 58 };

function buildWheel() {
  itemsEl.innerHTML = '';
  itemEls = state.styles.map((s, i) => {
    const el = document.createElement('div');
    el.className = 'wheel-item';
    el.textContent = prettyStyle(s);
    el.dataset.i = i;
    itemsEl.appendChild(el);
    return el;
  });
  measure();
}

function measure() {
  const r = wheel.getBoundingClientRect();
  const small = r.width < 520;
  geo.spacing = small ? 46 : 58;
  geo.x0 = small ? 16 : Math.min(r.width * 0.12, 120);
  geo.cy = r.height / 2;
  geo.R = Math.max(260, r.height * 0.62);
  activeRow.style.left = geo.x0 + 'px';
  autosize();
}
new ResizeObserver(measure).observe(wheel);

const wraps = () => state.styles.length >= 9;
const n = () => state.styles.length;
const mod = (a, m) => ((a % m) + m) % m;
const indexAt = (p) => (wraps() ? mod(Math.round(p), n()) : Math.max(0, Math.min(n() - 1, Math.round(p))));
function delta(i, p) {
  let d = i - p;
  if (wraps()) d = mod(d + n() / 2, n()) - n() / 2;
  return d;
}
function clampTarget() { if (!wraps()) state.target = Math.max(0, Math.min(n() - 1, state.target)); }

function renderWheel() {
  const extra = Math.max(0, activeRow.offsetHeight - geo.spacing * 0.9) / 2;
  const step = geo.spacing / geo.R;
  for (let i = 0; i < itemEls.length; i++) {
    const d = delta(i, state.pos);
    const th = d * step;
    const el = itemEls[i];
    if (Math.abs(th) > 1.45) { el.style.opacity = 0; el.style.visibility = 'hidden'; continue; }
    const push = Math.sign(d) * Math.min(Math.abs(d), 1) * extra;
    const x = geo.x0 - geo.R + geo.R * Math.cos(th);
    const y = geo.cy + geo.R * Math.sin(th) + push;
    const near = Math.min(1, Math.max(0, (Math.abs(d) - 0.3) / 0.45));
    el.style.visibility = 'visible';
    el.style.opacity = (near * (1 - Math.abs(th) / 1.6)).toFixed(3);
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translateY(-50%) rotate(${th.toFixed(4)}rad)`;
  }
  const live = state.styles[indexAt(state.pos)];
  const label = `[ ${prettyStyle(live)} ]`;
  if ($('activeTag').textContent !== label) {
    $('activeTag').textContent = label;
    const pal = paletteFor(live);
    applyPalette(pal);
  }
}

function applyPalette(pal) {
  orb.setPalette(pal);
  const root = document.documentElement.style;
  root.setProperty('--c1', pal[0]); root.setProperty('--c2', pal[1]); root.setProperty('--c3', pal[2]);
  $('activeTag').style.color = pal[1];
}

let autoTimer = 0;
function commit(i, user = true) {
  if (i === state.committed) return;
  state.committed = i;
  const style = state.styles[i];
  $('orbCaption').textContent = `${voiceName(state.voice)} · ${prettyStyle(style)}`;
  renderSsml();
  if (user && $('autoplay').checked && state.hasSpoken && !state.sweeping) {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => speak(), 280);
  }
}

function tick() {
  if (!state.dragging) {
    let d = state.target - state.pos;
    state.pos += d * 0.16;
    if (Math.abs(d) < 0.002) state.pos = state.target;
    if (Math.abs(state.target - state.pos) < 0.02 && state.target === Math.round(state.target)) commit(indexAt(state.target));
  }
  renderWheel();
  updatePlayback();
  requestAnimationFrame(tick);
}

function go(stepOrIndex, absolute = false) {
  if (absolute) state.target = Math.round(state.pos) + Math.round(delta(stepOrIndex, Math.round(state.pos)));
  else state.target = Math.round(state.target) + stepOrIndex;
  clampTarget();
}

// scroll wheel
let snapTimer = 0;
wheel.addEventListener('wheel', (e) => {
  if (e.target === $('line') && $('line').scrollHeight > $('line').clientHeight) return;
  e.preventDefault();
  state.target += (e.deltaY || e.deltaX) / geo.spacing * 0.5;
  clampTarget();
  clearTimeout(snapTimer);
  snapTimer = setTimeout(() => { state.target = Math.round(state.target); clampTarget(); }, 110);
}, { passive: false });

// drag
let drag = null;
wheel.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.line-wrap')) return;
  drag = { y: e.clientY, t: state.pos, moved: false, id: e.pointerId, el: e.target };
});
window.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dy = e.clientY - drag.y;
  if (!drag.moved && Math.abs(dy) > 4) { drag.moved = true; state.dragging = true; wheel.setPointerCapture?.(drag.id); }
  if (drag.moved) { state.pos = state.target = drag.t - dy / geo.spacing; clampTarget(); if (!wraps()) state.pos = state.target; }
});
window.addEventListener('pointerup', () => {
  if (!drag) return;
  if (!drag.moved) {
    const item = drag.el.closest?.('.wheel-item');
    if (item) go(+item.dataset.i, true);
    else if (drag.el.closest?.('#activeTag')) speak();
  } else {
    state.target = Math.round(state.pos); clampTarget();
  }
  state.dragging = false; drag = null;
});
wheel.addEventListener('keydown', (e) => {
  if (e.target === $('line')) return;
  if (e.key === 'ArrowUp') { go(-1); e.preventDefault(); }
  if (e.key === 'ArrowDown') { go(1); e.preventDefault(); }
  if (e.key === 'Enter' || e.key === ' ') { speak(); e.preventDefault(); }
});

/* ------------------------------------------------------------------ text */
const line = $('line');
function autosize() { line.style.height = 'auto'; line.style.height = line.scrollHeight + 'px'; }
line.addEventListener('input', () => { autosize(); renderSsml(); });
let lastLineW = 0;
new ResizeObserver(([e]) => { const w = Math.round(e.contentRect.width); if (w !== lastLineW) { lastLineW = w; autosize(); } }).observe(line);
line.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); speak(); }
  if (e.key === 'ArrowUp' && e.altKey) { go(-1); e.preventDefault(); }
  if (e.key === 'ArrowDown' && e.altKey) { go(1); e.preventDefault(); }
});

for (const p of PARALINGUISTICS) {
  const b = document.createElement('button');
  b.className = 'chip'; b.type = 'button'; b.textContent = `[${p.replace('_', ' ')}]`;
  b.addEventListener('click', () => {
    const tag = `[${p}] `, s = line.selectionStart ?? line.value.length;
    line.setRangeText(tag, s, line.selectionEnd ?? s, 'end');
    line.focus(); autosize(); renderSsml();
  });
  $('paraChips').appendChild(b);
}

/* ------------------------------------------------------------------ SSML */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function buildSsml(style = state.styles[indexAt(state.target)]) {
  const m = state.model;
  const text = esc(line.value.trim() || line.placeholder || '');
  const params = m.temperature ? ` parameters="temperature=${(+$('temp').value).toFixed(2)}"` : '';
  let body;
  if (style === 'neutral' || !style) body = `    ${text}`;
  else if (m.mode === 'bracket') body = `    [${style}] ${text}`;
  else body = `    <mstts:express-as style="${style}">\n      ${text}\n    </mstts:express-as>`;
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="${state.locale}">
  <voice name="${fullVoiceId(state.voice)}"${params}>
${body}
  </voice>
</speak>`;
}
function renderSsml() { if (!$('ssmlPanel').hidden) $('ssmlOut').textContent = buildSsml(); }

$('ssmlBtn').addEventListener('click', () => {
  $('ssmlPanel').hidden = !$('ssmlPanel').hidden;
  $('ssmlBtn').classList.toggle('active', !$('ssmlPanel').hidden);
  renderSsml();
});
$('closeSsml').addEventListener('click', () => { $('ssmlPanel').hidden = true; $('ssmlBtn').classList.remove('active'); });
$('copySsml').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(buildSsml()); toast('SSML copied'); } catch { toast('Copy failed — select the text manually'); }
});
$('temp').addEventListener('input', () => { $('tempOut').textContent = (+$('temp').value).toFixed(2); renderSsml(); });

/* ------------------------------------------------------------------ synthesis */
async function synthesize(ssml) {
  if (cache.has(ssml)) return cache.get(ssml);
  const headers = { 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3' };
  let url;
  if (state.auth.proxy) url = 'api/tts';
  else {
    if (!state.auth.key) { openSettings(); throw new Error('Add your Speech resource key to start.'); }
    url = `https://${state.auth.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    headers['Ocp-Apim-Subscription-Key'] = state.auth.key;
  }
  const res = await fetch(url, { method: 'POST', headers, body: ssml });
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 200);
    if (res.status === 401) throw new Error(`Key rejected (401) for region “${state.auth.region}”. Check Settings.`);
    if (res.status === 400) throw new Error(`Azure rejected the request (400). This voice/model may not be enabled in ${state.auth.region}. ${detail}`);
    if (res.status === 429) throw new Error('Rate limited (429). Wait a moment and try again.');
    throw new Error(`Synthesis failed (${res.status}). ${detail}`);
  }
  const blob = await res.blob();
  if (!blob.size) throw new Error('Azure returned empty audio — the voice may not support this text or style.');
  const u = URL.createObjectURL(blob);
  cache.set(ssml, u);
  return u;
}

/* ------------------------------------------------------------------ playback */
const audio = new Audio();
let actx = null, analyser = null, timeBuf = null;
function ensureAudioGraph() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    const src = actx.createMediaElementSource(audio);
    analyser = actx.createAnalyser(); analyser.fftSize = 1024;
    timeBuf = new Uint8Array(analyser.fftSize);
    src.connect(analyser); analyser.connect(actx.destination);
  } catch { actx = null; }
}

let words = [];
function prepareOverlay(text) {
  const ov = $('lineOverlay'); ov.innerHTML = ''; words = [];
  let total = 0;
  for (const tok of text.split(/(\s+)/)) {
    if (!tok) continue;
    if (/^\s+$/.test(tok)) { ov.appendChild(document.createTextNode(tok)); continue; }
    const s = document.createElement('span');
    s.className = /^\[[a-z_]+\]$/.test(tok) ? 'w para-tag' : 'w';
    s.textContent = tok; ov.appendChild(s);
    const weight = s.classList.contains('para-tag') ? 3 : tok.length + 2;
    total += weight; words.push({ el: s, end: total });
  }
  for (const w of words) w.end /= total || 1;
}

function updatePlayback() {
  let amp = 0;
  if (state.playing && analyser) {
    analyser.getByteTimeDomainData(timeBuf);
    let sum = 0; for (let i = 0; i < timeBuf.length; i++) { const v = (timeBuf[i] - 128) / 128; sum += v * v; }
    amp = Math.min(1, Math.sqrt(sum / timeBuf.length) * 4.5);
  }
  orb.setAmplitude(amp);
  if (state.playing && audio.duration) {
    // speech usually has ~0.15s lead-in / tail; map progress onto the word list
    const p = Math.max(0, Math.min(1, (audio.currentTime - 0.12) / Math.max(0.3, audio.duration - 0.35)));
    for (const w of words) w.el.classList.toggle('on', w.end - 0.0001 <= p + 0.04);
  }
}

function setPlaying(on) {
  state.playing = on;
  $('line').closest('.line-wrap').classList.toggle('playing', on);
  $('speakIcon').textContent = on ? '■' : '▶';
  $('speakLabel').textContent = on ? 'Stop' : 'Speak';
}
audio.addEventListener('ended', () => setPlaying(false));
audio.addEventListener('pause', () => setPlaying(false));

function stop() { state.sweepToken++; state.sweeping = false; $('sweepBtn').classList.remove('active'); audio.pause(); }

async function play(style) {
  const ssml = buildSsml(style);
  $('speakBtn').disabled = true; state.busy = true;
  try {
    const url = await synthesize(ssml);
    state.hasSpoken = true;
    ensureAudioGraph();
    prepareOverlay(line.value.trim());
    audio.src = url;
    const dl = $('downloadBtn');
    dl.href = url; dl.download = `${voiceName(state.voice)}-${state.model.id}-${style}.mp3`; dl.hidden = false;
    setPlaying(true);
    await audio.play();
    $('speakBtn').disabled = false;
    await new Promise((r) => { const done = () => { audio.removeEventListener('ended', done); audio.removeEventListener('pause', done); r(); }; audio.addEventListener('ended', done); audio.addEventListener('pause', done); });
  } finally {
    $('speakBtn').disabled = false; state.busy = false;
  }
}

async function speak() {
  if (state.playing) { stop(); return; }
  if (!line.value.trim()) { toast('Type something to say first.'); line.focus(); return; }
  try { await play(state.styles[indexAt(state.target)]); } catch (e) { setPlaying(false); toast(e.message); }
}
$('speakBtn').addEventListener('click', speak);

$('sweepBtn').addEventListener('click', async () => {
  if (state.sweeping) { stop(); return; }
  if (state.styles.length < 2) { toast('This voice has only one style.'); return; }
  if (state.playing) audio.pause();
  const token = ++state.sweepToken;
  state.sweeping = true; $('sweepBtn').classList.add('active');
  const start = indexAt(state.target);
  const count = Math.min(5, state.styles.length);
  try {
    for (let k = 0; k < count && token === state.sweepToken; k++) {
      const i = mod(start + k, n());
      go(i, true);
      // pre-fetch next while this one plays
      const next = mod(start + k + 1, n());
      if (k + 1 < count) synthesize(buildSsml(state.styles[next])).catch(() => {});
      await play(state.styles[i]);
      if (token !== state.sweepToken) break;
      await new Promise((r) => setTimeout(r, 250));
    }
  } catch (e) { toast(e.message); setPlaying(false); }
  if (token === state.sweepToken) { state.sweeping = false; $('sweepBtn').classList.remove('active'); }
});

$('shuffleBtn').addEventListener('click', () => setSampleLine(1));

/* ------------------------------------------------------------------ selects */
function guarded(fn) {
  return (e) => {
    try { fn(e.target.value); } catch (err) {
      console.error(err);
      toast(`Couldn't switch: ${err.message}`);
      $('model').value = state.model.id; $('locale').value = state.locale; $('voice').value = state.voice.id;
    }
  };
}
$('model').addEventListener('change', guarded(setModel));
$('locale').addEventListener('change', guarded(setLocale));
$('voice').addEventListener('change', guarded(setVoice));

/* ------------------------------------------------------------------ settings */
const dlg = $('settings');
const connStatus = (msg, kind = '') => { const el = $('connStatus'); el.textContent = msg; el.className = 'status ' + kind; };

// Accepts "eastus", "East US", "East US 2", or an endpoint URL such as https://eastus.api.cognitive.microsoft.com/
function normalizeRegion(raw) {
  const v = raw.trim().toLowerCase();
  const m = /^https?:\/\/([a-z0-9]+)\.(?:api\.cognitive|tts\.speech|stt\.speech)\.microsoft\.com/.exec(v);
  return (m ? m[1] : v).replace(/[\s_-]+/g, '');
}

function openSettings() {
  $('regionList').innerHTML = REGIONS.map((r) => `<option value="${r}">`).join('');
  $('region').value = state.auth.region;
  $('key').value = state.auth.key; $('key').type = 'password'; $('toggleKey').textContent = 'Show';
  $('rememberKey').checked = !state.auth.key || !!store.get('key', '');
  $('proxyNote').textContent = state.auth.proxy
    ? 'Currently using the key configured on the local server (server.js). A key entered here overrides it in this browser.'
    : 'Paste your Speech resource region and key. Calls go straight from this page to Azure.';
  connStatus(state.auth.key ? `Saved key ••••${state.auth.key.slice(-4)} · ${state.auth.region}` : '');
  dlg.showModal();
  (state.auth.key ? $('region') : $('key')).focus();
}
$('settingsBtn').addEventListener('click', openSettings);
$('cancelSettings').addEventListener('click', () => dlg.close());
$('toggleKey').addEventListener('click', () => {
  const show = $('key').type === 'password';
  $('key').type = show ? 'text' : 'password'; $('toggleKey').textContent = show ? 'Hide' : 'Show';
});
$('region').addEventListener('change', () => { $('region').value = normalizeRegion($('region').value); });

async function testFromForm() {
  const region = normalizeRegion($('region').value), key = $('key').value.trim();
  $('region').value = region;
  if (!region) throw new Error('Enter a region, e.g. eastus.');
  if (!key) throw new Error('Paste your Speech resource key.');
  connStatus('Testing…');
  const rows = await fetchVoiceRows(region, key);
  const mai = rows.filter(([n]) => n.includes(':MAI-Voice-2.1')).length;
  return { region, key, rows, mai };
}

$('testConn').addEventListener('click', async () => {
  try {
    const { region, rows, mai } = await testFromForm();
    connStatus(`✓ Connected to ${region} · ${rows.length} voices${mai ? ` · ${mai} MAI-Voice-2.1 voices` : ' · no MAI-Voice-2.1 voices in this region'}`, 'ok');
  } catch (e) { connStatus(e.message, 'err'); }
});

$('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('saveSettings').disabled = true;
  try {
    const { region, key, rows } = await testFromForm();
    state.auth = { proxy: false, region, key };
    store.set('region', region);
    const remember = $('rememberKey').checked;
    store.set('key', remember ? key : '');
    try { remember ? sessionStorage.removeItem('es.key') : sessionStorage.setItem('es.key', key); } catch { /* blocked */ }
    store.set('voiceList2', { at: Date.now(), rows });
    applyVoiceList(rows); setModel(state.model.id);
    cache.clear(); updateConn();
    dlg.close();
    toast(`Connected to ${region}.`);
  } catch (err) {
    connStatus(err.message, 'err');
  } finally { $('saveSettings').disabled = false; }
});

$('forgetKey').addEventListener('click', () => {
  store.set('key', '');
  try { sessionStorage.removeItem('es.key'); } catch { /* blocked */ }
  state.auth.key = ''; $('key').value = '';
  cache.clear();
  fetch('api/config').then((r) => (r.ok ? r.json() : null)).then((cfg) => { state.auth.proxy = !!cfg?.proxy; updateConn(); }).catch(updateConn);
  updateConn();
  connStatus('Key removed from this browser.');
});

function updateConn() {
  const ok = state.auth.proxy || !!state.auth.key;
  $('connDot').classList.toggle('ok', ok);
  $('settingsBtn').classList.toggle('off', !ok);
  $('connLabel').textContent = ok ? (state.auth.proxy ? 'Server key' : state.auth.region) : 'Connect';
  $('settingsBtn').title = ok ? 'Connection settings' : 'Add your Azure Speech region and key';
}

/* ------------------------------------------------------------------ toast */
let toastTimer = 0;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 4200);
}

/* ------------------------------------------------------------------ boot */
const orb = new Orb($('orb'));
fillSelect($('model'), MODELS.map((m) => [m.id, m.label]), MODELS[0].id);

const sel = store.get('sel', null);
state.locale = sel?.locale || 'en-US';
if (sel) $('model').value = sel.model;
setModel($('model').value);
if (sel && state.model.voices.some((v) => v.id === sel.voice) && localeOf({ id: sel.voice }) === state.locale) {
  $('voice').value = sel.voice; setVoice(sel.voice);
} else if (!sel) {
  const harper = state.model.voices.find((v) => v.id === 'en-US-Harper');
  if (harper) { $('voice').value = harper.id; setVoice(harper.id); }
}
if (!line.value) setSampleLine(0);
// open on an expressive emotion so first impression isn't "neutral"
const firstIdx = state.styles.indexOf('excited');
if (!sel && firstIdx > 0) { state.pos = state.target = firstIdx; state.committed = -1; commit(firstIdx, false); }

fetch('api/config').then((r) => (r.ok ? r.json() : null)).then((cfg) => {
  if (cfg?.proxy && !state.auth.key) { state.auth.proxy = true; state.auth.region = cfg.region || state.auth.region; }
  updateConn();
  if (state.auth.proxy || state.auth.key) syncVoices(state.auth.proxy ? {} : state.auth).catch(() => {});
}).catch(updateConn);

requestAnimationFrame(tick);
