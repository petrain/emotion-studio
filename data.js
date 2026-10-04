// Voice catalog + style support.
// Sources:
//   MAI voices  – https://learn.microsoft.com/azure/ai-services/speech-service/mai-voices
//   HD voices   – https://learn.microsoft.com/azure/ai-services/speech-service/high-definition-voices

const S = {
  // MAI "expressive" set (19 emotions)
  A: 'angry confused determined disgusted embarrassed excited fearful happy hopeful jealous joyful neutral regretful relieved sad shouting softvoice surprised whispering',
  // MAI "professional" set
  P: 'agent audiobook customer_call_center educational narrator neutral',
  // MAI "conversational" set
  C: 'adventurous caringempathy curious encouraging excited friendlycheerful neutral nostalgic reflective saddisappointed serious',
  N: 'neutral',
};
const st = (s) => (S[s] || s).split(' ');

// [id, gender, styles]
const MAI_VOICES = [
  ['cs-CZ-Grant', 'M', 'P'], ['cs-CZ-Harper', 'F', 'P'],
  ['da-DK-Grant', 'M', 'agent customer_call_center educational narrator neutral'], ['da-DK-Harper', 'F', 'P'],
  ['de-DE-Grant', 'M', 'P'], ['de-DE-Harper', 'F', 'P'], ['de-DE-Klaus', 'M', 'A'], ['de-DE-Mia', 'F', 'A'],
  ['en-AU-Isla', 'F', 'A'],
  ['en-GB-Emily', 'F', 'agent angry audiobook confused customer_call_center disgusted educational embarrassed excited fearful happy jealous joyful narrator neutral sad surprised'],
  ['en-GB-Harry', 'M', 'agent angry audiobook customer_call_center disgusted educational fearful joyful narrator neutral sad surprised'],
  ['en-IN-Dhruv', 'M', 'N'], ['en-IN-Priya', 'F', 'N'],
  ['en-US-Ethan', 'M', 'A'], ['en-US-Grant', 'M', 'P'],
  ['en-US-Harper', 'F', 'agent angry audiobook confused customer_call_center determined educational embarrassed excited happy hopeful joyful narrator neutral regretful relieved sad shouting softvoice whispering'],
  ['en-US-Iris', 'F', 'N'], ['en-US-Jasper', 'M', 'N'], ['en-US-Olivia', 'F', 'A'], ['en-US-Sage', 'M', 'P'],
  ['es-ES-Marta', 'F', 'C'],
  ['es-MX-Alejo', 'M', 'A'], ['es-MX-Grant', 'M', 'N'], ['es-MX-Harper', 'F', 'P'], ['es-MX-Valeria', 'F', 'A'],
  ['fi-FI-Grant', 'M', 'N'], ['fi-FI-Harper', 'F', 'P'],
  ['fr-FR-Grant', 'M', 'N'], ['fr-FR-Harper', 'F', 'P'], ['fr-FR-Marc', 'M', 'A'], ['fr-FR-Soleil', 'F', 'A'],
  ['hi-IN-Arjun', 'M', 'angry confused disgusted embarrassed excited fearful happy hopeful jealous joyful neutral regretful sad surprised'],
  ['hi-IN-Dhruv', 'M', 'A'], ['hi-IN-Grant', 'M', 'audiobook neutral'],
  ['hi-IN-Harper', 'F', 'agent customer_call_center educational narrator neutral'],
  ['hi-IN-Kavya', 'F', 'A'], ['hi-IN-Priya', 'F', 'A'],
  ['hu-HU-Bence', 'M', 'N'], ['hu-HU-Grant', 'M', 'N'], ['hu-HU-Harper', 'F', 'P'], ['hu-HU-Levente', 'M', 'N'],
  ['hu-HU-Lilla', 'F', 'N'], ['hu-HU-Reka', 'F', 'N'],
  ['id-ID-Grant', 'M', 'P'], ['id-ID-Harper', 'F', 'N'],
  ['it-IT-Grant', 'M', 'audiobook educational neutral'], ['it-IT-Harper', 'F', 'agent customer_call_center narrator neutral'],
  ['it-IT-Luca', 'M', 'A'], ['it-IT-Rosa', 'F', 'A'],
  ['ko-KR-Grant', 'M', 'P'],
  ['ko-KR-Haena', 'F', 'angry confused determined embarrassed excited happy hopeful joyful neutral regretful relieved sad softvoice surprised'],
  ['ko-KR-Harper', 'F', 'P'],
  ['ko-KR-Junho', 'M', 'angry confused determined embarrassed excited happy hopeful joyful neutral relieved sad softvoice'],
  ['nb-NO-Grant', 'M', 'educational neutral'], ['nb-NO-Harper', 'F', 'agent audiobook customer_call_center narrator neutral'],
  ['nl-NL-Grant', 'M', 'agent customer_call_center educational narrator neutral'], ['nl-NL-Harper', 'F', 'P'], ['nl-NL-Sander', 'M', 'C'],
  ['pl-PL-Grant', 'M', 'N'], ['pl-PL-Harper', 'F', 'P'],
  ['pt-BR-Caio', 'M', 'A'], ['pt-BR-Grant', 'M', 'agent customer_call_center educational neutral'],
  ['pt-BR-Harper', 'F', 'audiobook narrator neutral'], ['pt-BR-Luana', 'F', 'A'],
  ['pt-BR-Pedro', 'M', 'confused determined embarrassed excited happy hopeful joyful neutral regretful relieved sad softvoice surprised'],
  ['pt-BR-Rafael', 'M', 'angry confused determined embarrassed excited happy hopeful joyful neutral regretful relieved sad softvoice surprised'],
  ['pt-PT-Grant', 'M', 'N'], ['pt-PT-Harper', 'F', 'N'],
  ['pt-PT-Rui', 'M', 'angry confused determined embarrassed excited happy hopeful joyful neutral regretful relieved sad softvoice surprised'],
  ['ro-RO-Andrei', 'M', 'N'], ['ro-RO-Elena', 'F', 'N'], ['ro-RO-Grant', 'M', 'agent customer_call_center educational narrator neutral'],
  ['ro-RO-Harper', 'F', 'audiobook neutral'], ['ro-RO-Ioana', 'F', 'N'], ['ro-RO-Radu', 'M', 'N'],
  ['ru-RU-Grant', 'M', 'agent customer_call_center neutral'], ['ru-RU-Harper', 'F', 'audiobook educational narrator neutral'],
  ['ru-RU-Lev', 'M', 'C'], ['ru-RU-Masha', 'F', 'C'],
  ['sv-SE-Grant', 'M', 'N'], ['sv-SE-Harper', 'F', 'P'],
  ['th-TH-Grant', 'M', 'P'], ['th-TH-Harper', 'F', 'P'], ['th-TH-Krit', 'F', 'C'], ['th-TH-Nattapong', 'M', 'C'],
  ['tr-TR-Aydin', 'M', 'C'], ['tr-TR-Elif', 'F', 'C'], ['tr-TR-Grant', 'M', 'educational narrator neutral'],
  ['tr-TR-Harper', 'F', 'agent audiobook customer_call_center neutral'],
  ['vi-VN-Grant', 'M', 'agent customer_call_center educational narrator neutral'], ['vi-VN-Harper', 'F', 'audiobook neutral'],
  ['zh-CN-Bo', 'M', 'A'], ['zh-CN-Grant', 'M', 'P'], ['zh-CN-Harper', 'F', 'P'],
  ['zh-CN-Lan', 'F', 'angry confused disgusted embarrassed excited fearful happy joyful neutral sad surprised'],
  ['zh-CN-Mei', 'F', 'A'],
  ['zh-CN-Wei', 'M', 'angry confused disgusted embarrassed excited fearful happy hopeful jealous joyful neutral regretful sad surprised'],
];

const HD_STYLES = ('neutral amazed amused angry annoyed anxious appreciative calm cautious concerned confident confused curious defeated ' +
  'defensive defiant determined disappointed disgusted doubtful encouraging excited fast fearful frustrated happy hesitant ' +
  'hurt impatient impressed intrigued laughing optimistic panicked pleading quiet reassuring reflective remorseful resigned ' +
  'sad sarcastic secretive serious shouting shy skeptical slow surprised suspicious sympathetic upset urgent whispering').split(' ');

const OMNI_STYLES = ('neutral amazed amused angry annoyed anxious appreciative calm cautious concerned confident confused curious defeated ' +
  'defensive defiant determined disappointed disgusted doubtful ecstatic encouraging excited fast fearful frustrated happy ' +
  'hesitant hurt impatient impressed intrigued joking laughing optimistic painful panicked panting pleading proud quiet ' +
  'reassuring reflective relieved remorseful resigned sad sarcastic secretive serious shocked shouting shy skeptical slow ' +
  'struggling surprised suspicious sympathetic terrified upset urgent').split(' ');

const PARALINGUISTICS = ['laughter', 'sighing', 'breathing', 'coughing', 'throat_clearing', 'yawning'];

const DRAGON_HD = [
  ['de-DE-Florian', 'M'], ['de-DE-Seraphina', 'F'],
  ['en-US-Adam', 'M'], ['en-US-Alloy', 'M'], ['en-US-Andrew', 'M'], ['en-US-Andrew2', 'M', 'conversational'],
  ['en-US-Andrew3', 'M', 'podcast'], ['en-US-Aria', 'F'], ['en-US-Ava', 'F'], ['en-US-Ava3', 'F', 'podcast'],
  ['en-US-Brian', 'M'], ['en-US-Davis', 'M'], ['en-US-Emma', 'F'], ['en-US-Emma2', 'F', 'conversational'],
  ['en-US-Jenny', 'F'], ['en-US-Nova', 'F'], ['en-US-Phoebe', 'F'], ['en-US-Serena', 'F'], ['en-US-Steffan', 'M'],
  ['es-ES-Tristan', 'M'], ['es-ES-Ximena', 'F'], ['fr-FR-Remy', 'M'], ['fr-FR-Vivienne', 'F'],
  ['ja-JP-Masaru', 'M'], ['ja-JP-Nanami', 'F'], ['zh-CN-Xiaochen', 'F'], ['zh-CN-Yunfan', 'M'],
];

// Dragon HD Omni covers 700+ voices. A curated starter set; "Load all voices" in Settings expands it from your resource.
const OMNI_STARTER = [
  ['en-US-Ava', 'F'], ['en-US-Andrew', 'M'], ['en-US-Emma', 'F'], ['en-US-Brian', 'M'], ['en-US-Jenny', 'F'],
  ['en-US-Guy', 'M'], ['en-US-Aria', 'F'], ['en-US-Davis', 'M'], ['en-US-Jane', 'F'], ['en-US-Tony', 'M'],
  ['en-GB-Sonia', 'F'], ['en-GB-Ryan', 'M'], ['en-AU-Natasha', 'F'], ['en-AU-William', 'M'],
  ['de-DE-Katja', 'F'], ['de-DE-Conrad', 'M'], ['fr-FR-Denise', 'F'], ['fr-FR-Henri', 'M'],
  ['es-ES-Elvira', 'F'], ['es-ES-Alvaro', 'M'], ['es-MX-Dalia', 'F'], ['es-MX-Jorge', 'M'],
  ['it-IT-Elsa', 'F'], ['it-IT-Diego', 'M'], ['pt-BR-Francisca', 'F'], ['pt-BR-Antonio', 'M'],
  ['ja-JP-Nanami', 'F'], ['ja-JP-Keita', 'M'], ['ko-KR-SunHi', 'F'], ['ko-KR-InJoon', 'M'],
  ['zh-CN-Xiaoxiao', 'F'], ['zh-CN-Yunxi', 'M'], ['zh-CN-Xiaoyi', 'F'], ['zh-CN-Yunjian', 'M'],
  ['hi-IN-Swara', 'F'], ['hi-IN-Madhur', 'M'], ['nl-NL-Fenna', 'F'], ['nl-NL-Maarten', 'M'],
];

const HD_FLASH = [
  ['zh-CN-Xiaoxiao', 'F', 'angry chat cheerful customer-service excited fearful sad voice-assistant'],
  ['zh-CN-Xiaoxiao2', 'F', 'affectionate angry anxious cheerful curious disappointed empathetic encouraging excited fearful guilty lonely poetry-reading sad sentimental sorry story surprised tired whispering'],
  ['zh-CN-Xiaochen', 'F', 'cheerful debating empathetic live-commercial poetry-reading sad sorry'],
  ['zh-CN-Xiaoyi', 'F', 'angry complaining cute gentle nervous sad shy strict'],
  ['zh-CN-Xiaoyu', 'F', 'angry debating cheerful comforting sad sorry'],
  ['zh-CN-Xiaohan', 'F', 'affectionate angry cheerful complaining fearful gentle sad shy strict'],
  ['zh-CN-Xiaoshuang', 'F', 'chat'],
  ['zh-CN-Xiaoyou', 'F', 'chat angry cheerful poetry-reading sad story cute'],
  ['zh-CN-Yunxi', 'M', 'angry chat cheerful complaining depressed fearful news sad shy strict voice-assistant'],
  ['zh-CN-Yunyi', 'M', 'assassin captain cavalier prince game-narrator geomancer poet'],
  ['zh-CN-Yunxiao', 'M', ''],
  ['zh-CN-Yunhan', 'M', 'angry cheerful curious empathetic encouraging excited guilty lonely sad serious sorry whispering surprised tired'],
  ['zh-CN-Yunxia', 'M', 'affectionate angry cheerful comforting encouraging excited fearful sad surprised'],
  ['zh-CN-Yunye', 'M', ''],
  ['en-US-Tiana', 'F', ''], ['en-US-Tyler', 'M', ''], ['en-US-Jimmie', 'M', ''],
];

// Model registry. `mode` decides how a style is written into SSML.
//   express  -> <mstts:express-as style="...">
//   bracket  -> inline "[style] text" (Dragon HD doesn't accept express-as)
const MODELS = [
  {
    id: 'MAI-Voice-2.1', family: 'MAI', label: 'MAI-Voice-2.1', mode: 'express', suffix: 'MAI-Voice-2.1',
    blurb: 'Highest-fidelity MAI model — studio-grade, long-form, 23 languages.',
    voices: MAI_VOICES.map(([id, g, s]) => ({ id, gender: g, styles: st(s) })),
  },
  {
    id: 'MAI-Voice-2.1-Flash', family: 'MAI', label: 'MAI-Voice-2.1 Flash', mode: 'express', suffix: 'MAI-Voice-2.1-Flash',
    blurb: 'Ultra-low-latency MAI model built for real-time voice agents.',
    voices: MAI_VOICES.map(([id, g, s]) => ({ id, gender: g, styles: st(s) })),
  },
  {
    id: 'DragonHDOmni', family: 'HD', label: 'Dragon HD Omni', mode: 'express', suffix: 'DragonHDOmniLatestNeural',
    temperature: true, paralinguistics: true, englishStylesOnly: true, defaultStyles: OMNI_STYLES,
    blurb: '700+ multilingual voices with 60+ expressive styles and paralinguistics.',
    voices: OMNI_STARTER.map(([id, g]) => ({ id, gender: g, styles: OMNI_STYLES })),
  },
  {
    id: 'DragonHD', family: 'HD', label: 'Dragon HD', mode: 'bracket', suffix: 'DragonHDLatestNeural',
    temperature: true, paralinguistics: true, englishStylesOnly: true, defaultStyles: HD_STYLES,
    blurb: 'Fine-tuned HD personas that read context and emote on their own.',
    voices: DRAGON_HD.map(([id, g, note]) => ({ id, gender: g, note, styles: HD_STYLES })),
  },
  {
    id: 'DragonHDFlash', family: 'HD', label: 'Dragon HD Flash', mode: 'express', suffix: 'DragonHDFlashLatestNeural',
    blurb: 'Fast HD variants for zh-CN and en-US with per-voice styles.',
    voices: HD_FLASH.map(([id, g, s]) => ({ id, gender: g, styles: ['neutral', ...(s ? s.split(' ') : [])] })),
  },
];

const REGIONS = ['eastus', 'eastus2', 'westus', 'westus2', 'westus3', 'canadacentral', 'westeurope', 'northeurope',
  'francecentral', 'swedencentral', 'centralindia', 'eastasia', 'southeastasia', 'japaneast'];

// Short, emotionally ambiguous lines — they read differently in every style.
const SAMPLE_LINES = {
  en: ['You remember me?', 'I didn’t think you’d actually come back.', 'So this is where it all ends.', 'Wait — did you hear that?', 'We did it. We actually did it.'],
  de: ['Du erinnerst dich an mich?', 'Ich hätte nicht gedacht, dass du zurückkommst.'],
  fr: ['Tu te souviens de moi ?', 'Je ne pensais pas que tu reviendrais.'],
  es: ['¿Te acuerdas de mí?', 'No pensé que volverías.'],
  it: ['Ti ricordi di me?', 'Non pensavo che saresti tornato.'],
  pt: ['Você se lembra de mim?', 'Eu não achei que você voltaria.'],
  zh: ['你还记得我吗？', '我没想到你真的会回来。'],
  ja: ['私のこと、覚えてる？', '本当に戻ってくるとは思わなかった。'],
  ko: ['나 기억해?', '네가 정말 돌아올 줄은 몰랐어.'],
  hi: ['तुम्हें मैं याद हूँ?', 'मुझे नहीं लगा था कि तुम वापस आओगे।'],
  nl: ['Herinner je je mij?', 'Ik dacht niet dat je terug zou komen.'],
  ru: ['Ты меня помнишь?', 'Я не думал, что ты вернёшься.'],
  tr: ['Beni hatırlıyor musun?', 'Geri döneceğini düşünmemiştim.'],
  th: ['คุณจำฉันได้ไหม', 'ฉันไม่คิดว่าคุณจะกลับมา'],
  vi: ['Bạn còn nhớ tôi không?', 'Tôi không nghĩ bạn sẽ quay lại.'],
  pl: ['Pamiętasz mnie?', 'Nie sądziłem, że wrócisz.'],
  sv: ['Minns du mig?', 'Jag trodde inte att du skulle komma tillbaka.'],
  fi: ['Muistatko minut?', 'En uskonut, että palaisit.'],
  da: ['Kan du huske mig?', 'Jeg troede ikke, du ville komme tilbage.'],
  nb: ['Husker du meg?', 'Jeg trodde ikke du ville komme tilbake.'],
  cs: ['Pamatuješ si mě?', 'Nemyslel jsem, že se vrátíš.'],
  hu: ['Emlékszel rám?', 'Nem gondoltam, hogy visszajössz.'],
  ro: ['Îți mai amintești de mine?', 'Nu credeam că te vei întoarce.'],
  id: ['Kamu ingat aku?', 'Aku tidak menyangka kamu akan kembali.'],
};

const LABELS = {
  customer_call_center: 'Call center', 'customer-service': 'Customer service', softvoice: 'Soft voice',
  caringempathy: 'Caring', friendlycheerful: 'Cheerful', saddisappointed: 'Disappointed',
  throat_clearing: 'Throat clearing', 'voice-assistant': 'Assistant', 'poetry-reading': 'Poetry',
  'live-commercial': 'Live commercial', 'game-narrator': 'Game narrator',
};
const prettyStyle = (s) => LABELS[s] || (s.charAt(0).toUpperCase() + s.slice(1).replace(/[_-]/g, ' '));

window.CATALOG = { MODELS, OMNI_STYLES_ALL: OMNI_STYLES, REGIONS, SAMPLE_LINES, PARALINGUISTICS, OMNI_STYLES, prettyStyle };
