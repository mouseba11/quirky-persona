'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const api = require('./index.js');

const quirkyPersona = api;
const explain = api.explain;

function pinned(text, options) {
  const opts = Object.assign({}, options);
  opts.quirks = false;
  opts.config = Object.assign({ quirkFactor: 0 }, opts.config);
  return quirkyPersona(text, opts);
}

// ---------- the two shapes the package is built around ----------

const adams = pinned('', {
  config: {
    templates: ['{manner} {verb} {object} {voice}'],
    manners: ['coherently'],
    verbs: ['discombobulate'],
    objects: ['the themes'],
    voices: [{ id: 'douglas-adams', name: 'Douglas Adams', phrase: 'in the style of Douglas Adams' }],
  },
});
assert.deepStrictEqual(adams, {
  persona: 'Douglas Adams',
  instruction: 'Coherently discombobulate the themes in the style of Douglas Adams',
});

const professional = pinned('', {
  config: {
    templates: ['{verb} {object} {manner} and {voice}'],
    manners: ['succinctly'],
    verbs: ['combine'],
    objects: ['the text'],
    voices: [{ id: 'professional', name: 'Professional', phrase: 'professionally' }],
  },
});
assert.deepStrictEqual(professional, {
  persona: 'Professional',
  instruction: 'Combine the text succinctly and professionally',
});

// A string voice uses the same words for the name and the phrase.
const shorthand = pinned('', {
  config: {
    templates: ['{verb} {object} {manner} and {voice}'],
    manners: ['succinctly'],
    verbs: ['combine'],
    objects: ['the text'],
    voices: ['professionally'],
  },
});
assert.strictEqual(shorthand.persona, 'professionally');
assert.strictEqual(shorthand.instruction, 'Combine the text succinctly and professionally');

// {persona} is the name, {voice} is the phrase, and the first letter is capitalised.
const named = pinned('', {
  config: {
    templates: ['write as {persona}: {manner} {verb} {object}'],
    manners: ['quietly'],
    verbs: ['gather'],
    objects: ['the sources'],
    voices: [{ id: 'editor', name: 'Editor', phrase: 'in the manner of a careful editor' }],
  },
});
assert.deepStrictEqual(named, {
  persona: 'Editor',
  instruction: 'Write as Editor: quietly gather the sources',
});

// Empty slots collapse, and a missing name falls back to the phrase.
const gaps = pinned('', {
  config: {
    templates: ['{manner} {verb} {object} {voice}'],
    manners: ['clearly'],
    verbs: [],
    objects: ['the points'],
    voices: [{ phrase: 'in a neutral tone' }],
  },
});
assert.strictEqual(gaps.persona, 'in a neutral tone');
assert.strictEqual(gaps.instruction, 'Clearly the points in a neutral tone');

// An unknown placeholder is left as written.
const unknown = pinned('', {
  config: {
    templates: ['{manner} {nope}'],
    manners: ['plainly'],
    verbs: ['present'],
    objects: ['the text'],
    voices: [{ id: 'guide', name: 'Guide', phrase: 'as a clear guide' }],
  },
});
assert.strictEqual(unknown.instruction, 'Plainly {nope}');

// ---------- determinism and seed ----------

const sample = 'Lemurs move through the trees. Geometry describes flat space.';
assert.deepStrictEqual(
  quirkyPersona(sample, { seed: 'demo' }),
  quirkyPersona(sample, { seed: 'demo' }),
);
assert.deepStrictEqual(explain(sample, { seed: 0 }), explain(sample, { seed: '0' }));

const varied = new Set();
for (let i = 0; i < 12; i += 1) varied.add(quirkyPersona(sample, { seed: i }).instruction);
assert.ok(varied.size > 1, 'a different seed should be able to change the instruction');

// The text is part of the seed. Words beyond maxWords are not.
const longA = 'alpha beta recipe later-a';
const longB = 'alpha beta geometry later-b';
assert.strictEqual(
  explain(longA, { config: { maxWords: 2 } }).wordsUsed,
  2,
);
assert.strictEqual(explain(longA, { config: { maxWords: 2 } }).wordsIgnored, 2);
assert.deepStrictEqual(
  quirkyPersona(longA, { config: { maxWords: 2 } }),
  quirkyPersona(longB, { config: { maxWords: 2 } }),
);
const far = new Set([longA, longB, 'other words entirely', 'gamma delta epsilon'].map((text) => (
  quirkyPersona(text, {
    config: {
      maxWords: 32,
      manners: Array.from({ length: 32 }, (_, i) => `manner-${i}`),
      templates: ['{manner}'],
    },
  }).instruction
)));
assert.ok(far.size > 1, 'different text should be able to change the instruction');

// A non-number maxWords counts as no words.
assert.strictEqual(explain('one two', { config: { maxWords: 'nope' } }).wordsUsed, 0);

// Empty text still returns a persona and an instruction.
const bare = quirkyPersona('');
assert.ok(bare.persona);
assert.ok(bare.instruction);
assert.strictEqual(bare.instruction[0], bare.instruction[0].toLocaleUpperCase('en'));

// ---------- quirks ----------

const quirkConfig = {
  templates: ['{voice}'],
  voices: [{ id: 'professional', name: 'Professional', phrase: 'professionally' }],
  quirkyVoices: [{ id: 'douglas-adams', name: 'Douglas Adams', phrase: 'in the style of Douglas Adams' }],
  quirkFactor: 1,
};

let quirkyHits = 0;
let plainHits = 0;
for (let i = 0; i < 80; i += 1) {
  const made = explain('a short note', { quirks: true, seed: i, config: quirkConfig });
  if (made.voiceId === 'douglas-adams') quirkyHits += 1;
  if (made.voiceId === 'professional') plainHits += 1;
  assert.strictEqual(made.quirksMode, true);
  assert.strictEqual(made.quirky, true);
}
assert.ok(quirkyHits > 0, 'quirk factor 1 should be able to pick a quirky voice');
assert.ok(plainHits > 0, 'plain voices stay in the pool when the quirk roll hits');

for (let i = 0; i < 40; i += 1) {
  const made = explain('a short note', { quirks: true, seed: i, config: Object.assign({}, quirkConfig, { quirkFactor: 0 }) });
  assert.strictEqual(made.quirky, false);
  assert.strictEqual(made.voiceId, 'professional');
}

// options.quirks overrides the config, and a factor that is not a number counts as 0.
const forcedOff = explain('', { quirks: false, seed: 1, config: Object.assign({ quirks: true }, quirkConfig) });
assert.strictEqual(forcedOff.quirksMode, false);
assert.strictEqual(forcedOff.voiceId, 'professional');
const badFactor = explain('', { quirks: true, seed: 1, config: Object.assign({}, quirkConfig, { quirkFactor: 'often' }) });
assert.strictEqual(badFactor.quirkFactor, 0);
assert.strictEqual(badFactor.quirky, false);

// Quirky templates join the pool only on a quirky roll.
const shapes = {
  templates: ['plain {manner}'],
  quirkyTemplates: ['quirky {manner}'],
  manners: ['briefly'],
  quirkFactor: 1,
};
assert.strictEqual(explain('', { quirks: false, config: shapes }).template, 'plain {manner}');
assert.strictEqual(explain('', { quirks: true, seed: 3, config: shapes }).quirky, true);
const seenShapes = new Set();
for (let i = 0; i < 30; i += 1) seenShapes.add(explain('', { quirks: true, seed: i, config: shapes }).template);
assert.ok(seenShapes.has('plain {manner}'));
assert.ok(seenShapes.has('quirky {manner}'));

// ---------- explain matches the public result ----------

const full = explain(sample, { seed: 'demo', quirks: true });
assert.deepStrictEqual(quirkyPersona(sample, { seed: 'demo', quirks: true }), {
  persona: full.persona,
  instruction: full.instruction,
});
assert.strictEqual(full.lang, 'en');
assert.strictEqual(full.seed, 'demo');
assert.ok(full.template.includes('{'));
assert.ok(full.wordsUsed > 0);

// ---------- languages ----------

for (const lang of ['en', 'de', 'es']) {
  const made = explain(sample, { lang, seed: 'pack' });
  assert.strictEqual(made.lang, lang);
  assert.ok(made.persona, lang);
  assert.ok(made.instruction, lang);
  assert.strictEqual(made.instruction[0], made.instruction[0].toLocaleUpperCase('en'));
}

assert.throws(() => quirkyPersona('', { lang: 'nope' }), /invalid language code/);
assert.throws(() => quirkyPersona('', { lang: 'xx' }), /unknown language/);

// A config file path is read on the call.
const file = path.join(os.tmpdir(), `quirky-persona-${process.pid}.json`);
fs.writeFileSync(file, JSON.stringify({
  templates: ['{verb} {object}'],
  verbs: ['gather'],
  objects: ['the sources'],
  voices: [],
}));
try {
  assert.deepStrictEqual(quirkyPersona('ignored', { config: file }), {
    persona: '',
    instruction: 'Gather the sources',
  });
} finally {
  fs.unlinkSync(file);
}

// No plain template is an error. The defaults are not.
assert.throws(() => quirkyPersona('', { config: { templates: [] } }), /config\.templates/);
assert.throws(() => quirkyPersona('', { config: { templates: ['  '] } }), /config\.templates/);
assert.doesNotThrow(() => quirkyPersona(''));

// ---------- default packs ----------

const en = require('./langs/en.json');
const de = require('./langs/de.json');
const es = require('./langs/es.json');

function voicesOk(list, label) {
  assert.ok(Array.isArray(list) && list.length, label);
  list.forEach((voice) => {
    assert.ok(voice.id && voice.name && voice.phrase, `${label} ${JSON.stringify(voice)}`);
  });
}

for (const [pack, label] of [[en, 'en'], [de, 'de'], [es, 'es']]) {
  assert.ok(pack.templates.length >= 2, label);
  assert.ok(pack.manners.length >= 4, label);
  assert.ok(pack.verbs.length >= 4, label);
  assert.ok(pack.objects.length >= 3, label);
  voicesOk(pack.voices, label);
  voicesOk(pack.quirkyVoices, label);
  pack.templates.concat(pack.quirkyTemplates).forEach((template) => {
    const unknown = template.match(/\{[^}]+\}/g).filter((token) => !/^\{(manner|verb|object|voice|persona)\}$/.test(token));
    assert.deepStrictEqual(unknown, [], `${label} ${template}`);
  });
}

// With the quirk roll held off, a quirky-only voice never appears.
const plainIds = new Set(en.voices.map((voice) => voice.id));
for (let i = 0; i < 200; i += 1) {
  const made = explain(sample, { quirks: true, seed: i, config: { quirkFactor: 0 } });
  assert.ok(plainIds.has(made.voiceId), made.voiceId);
  assert.strictEqual(made.quirky, false);
}

// With the quirk roll always on, both pools show up, and the instructions vary.
const quirkyIds = new Set(en.quirkyVoices.map((voice) => voice.id));
let sawPlain = false;
let sawQuirky = false;
const instructions = new Set();
for (let i = 0; i < 300; i += 1) {
  const made = explain(sample, { quirks: true, seed: `survey-${i}`, config: { quirkFactor: 1 } });
  instructions.add(made.instruction);
  if (plainIds.has(made.voiceId)) sawPlain = true;
  if (quirkyIds.has(made.voiceId)) sawQuirky = true;
  assert.strictEqual(made.quirky, true);
}
assert.ok(sawPlain);
assert.ok(sawQuirky);
assert.ok(instructions.size >= 150, `expected variety, got ${instructions.size}`);

// README quick start. These are real output of the default English pack.
const quickText = 'Lemurs are primates from Madagascar. They move through the trees by grasping and leaping.';
assert.deepStrictEqual(quirkyPersona(quickText), {
  persona: 'Reporter',
  instruction: 'Present the paragraphs succinctly and in a neutral tone',
});
assert.deepStrictEqual(quirkyPersona(quickText, { quirks: true, seed: 2 }), {
  persona: 'Footnote',
  instruction: 'Connect the text quietly and as a footnote that got ideas',
});
assert.deepStrictEqual(
  {
    persona: explain(quickText, { seed: 'demo' }).persona,
    instruction: explain(quickText, { seed: 'demo' }).instruction,
  },
  {
    persona: 'Editor',
    instruction: 'Quietly summarise the points in the manner of a careful editor',
  },
);

console.log('all tests passed');
