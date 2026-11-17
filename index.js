'use strict';

const fs = require('fs');
const path = require('path');
const defaultConfig = require('./quirky-persona.config.json');
const DEFAULT_LANGS_DIR = path.join(__dirname, 'langs');

const PLAIN_KEYS = ['manners', 'verbs', 'objects', 'voices'];
const QUIRKY_OF = {
  manners: 'quirkyManners',
  verbs: 'quirkyVerbs',
  objects: 'quirkyObjects',
  voices: 'quirkyVoices',
};


// ---------- text helpers ----------

function stripAccents(s) {
  return String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function tokenize(s) {
  return stripAccents(s).toLowerCase().match(/[a-z0-9]+/g) || [];
}

// Light stemming so word forms match each other: "years" = "year", "compared" = "compare",
// "guides" = "guide". The result is only used for comparing words, never shown.
// Same fold as quirky-slugger, so a title it emits and a trigger written the same way agree.
function fold(token) {
  let t = token;
  if (t.length > 4 && t.endsWith('ies')) t = t.slice(0, -3) + 'y';
  else if (t.length > 5 && t.endsWith('ing')) t = t.slice(0, -3);
  else if (t.length > 4 && t.endsWith('ed')) t = t.slice(0, -2);
  else if (t.length > 4 && /(?:s|x|z|ch|sh|o)es$/.test(t)) t = t.slice(0, -2);
  else if (t.length > 3 && t.endsWith('s') && !/(?:ss|us|is)$/.test(t)) t = t.slice(0, -1);
  if (t.length > 3 && t.endsWith('e')) t = t.slice(0, -1);
  return t;
}

function slugify(s) {
  return stripAccents(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Deterministic 32-bit hash (djb2 plus a final mix so similar inputs spread out).
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

// A factor is a number from 0 to 1. Anything that is not a number counts as 0.
function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

function splitWords(text) {
  return String(text || '').split(/\s+/).filter(Boolean);
}

// How many words of the title enter the seed and the match. A non-number or a negative counts as 0.
function wordLimit(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function asStrings(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item == null ? '' : item).trim()).filter(Boolean);
}

function asVoices(value) {
  if (!Array.isArray(value)) return [];
  const voices = [];
  value.forEach((entry, index) => {
    let voice;
    if (typeof entry === 'string' || typeof entry === 'number') {
      const phrase = String(entry).trim();
      voice = { id: slugify(phrase), name: phrase, phrase };
    } else if (entry && typeof entry === 'object') {
      const phrase = String(entry.phrase != null ? entry.phrase : (entry.name != null ? entry.name : '')).trim();
      const name = String(entry.name != null ? entry.name : phrase).trim();
      const id = String(entry.id != null ? entry.id : (slugify(name) || slugify(phrase))).trim();
      voice = { id, name, phrase };
    }
    if (!voice || !voice.phrase) return;
    if (!voice.name) voice.name = voice.phrase;
    if (!voice.id) voice.id = slugify(voice.name) || `voice-${index + 1}`;
    voices.push(voice);
  });
  return voices;
}

function capitalise(sentence) {
  const text = String(sentence || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.charAt(0).toLocaleUpperCase('en') + text.slice(1);
}

function fill(template, values) {
  return String(template || '').replace(/\{(manner|verb|object|voice|persona)\}/g, (_, name) => values[name] || '');
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveLangsDir(langsDir) {
  if (!langsDir) return DEFAULT_LANGS_DIR;
  return path.isAbsolute(langsDir) ? langsDir : path.resolve(process.cwd(), langsDir);
}

function loadLanguagePack(lang, langsDir) {
  const code = String(lang || 'en');
  if (!/^[a-z]{2}(-[a-z0-9]+)?$/i.test(code)) {
    throw new TypeError(`quirky-persona: invalid language code "${code}"`);
  }
  const file = path.join(resolveLangsDir(langsDir), `${code.toLowerCase()}.json`);
  if (!fs.existsSync(file)) {
    throw new TypeError(`quirky-persona: unknown language "${code}" (expected ${file})`);
  }
  return readJsonFile(file);
}

function owns(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function normalisePattern(raw, index) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TypeError(`quirky-persona: config.patterns[${index}] needs a non-empty "templates" array`);
  }
  if (raw.triggers !== undefined && !Array.isArray(raw.triggers)) {
    throw new TypeError(`quirky-persona: config.patterns[${index}].triggers must be an array`);
  }
  if (raw.quirkyTemplates !== undefined && !Array.isArray(raw.quirkyTemplates)) {
    throw new TypeError(`quirky-persona: config.patterns[${index}].quirkyTemplates must be an array`);
  }
  const pattern = {
    id: String(raw.id != null ? raw.id : '').trim() || `pattern-${index}`,
    triggers: asStrings(raw.triggers),
    templates: asStrings(raw.templates),
    quirkyTemplates: asStrings(raw.quirkyTemplates),
  };
  if (!pattern.templates.length) {
    throw new TypeError(`quirky-persona: config.patterns[${index}] needs a non-empty "templates" array`);
  }
  PLAIN_KEYS.forEach((key) => {
    if (raw[key] !== undefined) {
      pattern[key] = key === 'voices' ? asVoices(raw[key]) : asStrings(raw[key]);
    }
    const quirkyKey = QUIRKY_OF[key];
    if (raw[quirkyKey] !== undefined) {
      pattern[quirkyKey] = key === 'voices' ? asVoices(raw[quirkyKey]) : asStrings(raw[quirkyKey]);
    }
  });
  // A count in the title, the rendered {n}, selects this pattern on its own.
  if (raw.numbered === true) pattern.numbered = true;
  return pattern;
}

// A pattern list, when non-empty, replaces the shared list for that property.
// On a quirky roll the pattern's own quirky rows are appended. Shared quirky rows
// are appended when the pattern did not bring its own plain list, and shared quirky
// voices are always appended so a quirk such as Douglas Adams can land on any pattern.
function takeList(pattern, key, quirky, config) {
  const own = pattern[key];
  const usingOwn = Boolean(own && own.length);
  const plain = usingOwn ? own : (config[key] || []);
  if (!quirky) return plain.slice();
  const ownExtra = pattern[QUIRKY_OF[key]];
  const sharedExtra = config[QUIRKY_OF[key]] || [];
  const extra = [];
  if (ownExtra && ownExtra.length) extra.push.apply(extra, ownExtra);
  if ((!usingOwn || key === 'voices') && sharedExtra.length) extra.push.apply(extra, sharedExtra);
  return plain.concat(extra);
}

// Merge: algorithm defaults → language pack → options.config.
// options.lang (or config.lang / defaultConfig.lang) selects the pack.
//
// `templates` is the shared pool when `patterns` is also supplied (or comes from the pack).
// `templates` with no `patterns` key is the older call: one generic pattern, and those
// templates are the only shapes. That keeps a one-entry config pinned to one sentence.
function loadConfig(options) {
  options = options || {};
  let user = {};
  if (typeof options.config === 'string') {
    user = readJsonFile(options.config);
  } else if (options.config && typeof options.config === 'object') {
    user = options.config;
  }

  const lang = String(
    options.lang !== undefined && options.lang !== null && options.lang !== ''
      ? options.lang
      : (user.lang !== undefined && user.lang !== null && user.lang !== ''
        ? user.lang
        : (defaultConfig.lang || 'en'))
  ).toLowerCase();

  const pack = loadLanguagePack(lang, options.langsDir);
  const config = Object.assign({}, defaultConfig, pack, user);
  config.lang = lang;
  config.manners = asStrings(config.manners);
  config.quirkyManners = asStrings(config.quirkyManners);
  config.verbs = asStrings(config.verbs);
  config.quirkyVerbs = asStrings(config.quirkyVerbs);
  config.objects = asStrings(config.objects);
  config.quirkyObjects = asStrings(config.quirkyObjects);
  config.voices = asVoices(config.voices);
  config.quirkyVoices = asVoices(config.quirkyVoices);
  config.stopWords = asStrings(config.stopWords);
  config.numbers = asStrings(config.numbers);

  const userHasPatterns = owns(user, 'patterns');
  const userHasTemplates = owns(user, 'templates');
  const userHasQuirkyTemplates = owns(user, 'quirkyTemplates');

  if (!userHasPatterns && userHasTemplates) {
    const templates = asStrings(user.templates);
    if (!templates.length) {
      throw new TypeError('quirky-persona: config.templates must be a non-empty array');
    }
    config.patterns = [{
      id: 'custom',
      triggers: [],
      templates,
      quirkyTemplates: userHasQuirkyTemplates ? user.quirkyTemplates : [],
    }];
    config.sharedTemplates = [];
    config.sharedQuirkyTemplates = [];
  } else {
    if (userHasPatterns) {
      if (!owns(user, 'sharedTemplates') && !userHasTemplates) config.sharedTemplates = [];
      if (!owns(user, 'sharedQuirkyTemplates') && !userHasQuirkyTemplates) config.sharedQuirkyTemplates = [];
    }
    if (!owns(user, 'sharedTemplates')) {
      config.sharedTemplates = userHasTemplates ? user.templates : config.sharedTemplates;
    }
    if (config.sharedTemplates == null) config.sharedTemplates = config.templates;
    if (!owns(user, 'sharedQuirkyTemplates')) {
      config.sharedQuirkyTemplates = userHasQuirkyTemplates ? user.quirkyTemplates : config.sharedQuirkyTemplates;
    }
    if (config.sharedQuirkyTemplates == null) config.sharedQuirkyTemplates = config.quirkyTemplates;
  }

  config.sharedTemplates = asStrings(config.sharedTemplates);
  config.sharedQuirkyTemplates = asStrings(config.sharedQuirkyTemplates);
  config.templates = config.sharedTemplates.slice();
  config.quirkyTemplates = config.sharedQuirkyTemplates.slice();

  if (!Array.isArray(config.patterns) || config.patterns.length === 0) {
    throw new TypeError('quirky-persona: config.patterns must be a non-empty array');
  }
  config.patterns = config.patterns.map(normalisePattern);
  return config;
}

function quirksOn(options, config) {
  if (options && options.quirks !== undefined && options.quirks !== null) {
    return options.quirks === true || options.quirks === 'true';
  }
  return config.quirks === true;
}

function pool(plain, extra, quirky) {
  const base = plain || [];
  if (!quirky || !extra || !extra.length) return base.slice();
  return base.concat(extra);
}

// ---------- vectors ----------

// Each pattern is a document made of its trigger terms. IDF down-weights
// trigger terms that appear in many patterns. Same formula as quirky-slugger.
function buildIdf(patterns) {
  const df = new Map();
  patterns.forEach((p) => {
    const terms = new Set((p.triggers || []).flatMap(tokenize).map(fold));
    terms.forEach((t) => df.set(t, (df.get(t) || 0) + 1));
  });
  const n = patterns.length;
  return (term) => Math.log((n + 1) / ((df.get(term) || 0) + 1)) + 1;
}

function norm(vec) {
  let sum = 0;
  vec.forEach((v) => { sum += v * v; });
  return Math.sqrt(sum);
}

function cosine(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  let dot = 0;
  a.forEach((v, k) => { if (b.has(k)) dot += v * b.get(k); });
  return dot / (na * nb);
}

function stopSet(words) {
  const set = new Set();
  asStrings(words).forEach((word) => {
    tokenize(word).forEach((raw) => set.add(fold(raw)));
  });
  return set;
}

// The strings slugger can write for {n}. Matching uses the same fold as triggers,
// so "three" and "five" meet the title after the trailing e is set aside.
function numberSet(values) {
  const set = new Set();
  asStrings(values).forEach((value) => {
    tokenize(value).map(fold).forEach((term) => set.add(term));
  });
  return set;
}

function choosePattern(config, query, pick, chance) {
  const idf = buildIdf(config.patterns);
  const minScore = Number(config.minScore) || 0;
  let bestScore = minScore;
  const rows = [];
  config.patterns.forEach((pattern, index) => {
    const vec = new Map();
    pattern.triggers.flatMap(tokenize).map(fold).forEach((term) => {
      vec.set(term, idf(term));
    });
    const score = cosine(query, vec);
    rows.push({ id: pattern.id, score, index, pattern });
    if (score > bestScore) bestScore = score;
  });

  const counts = numberSet(config.numbers);
  let counted = false;
  query.forEach((_weight, term) => {
    if (counts.has(term)) counted = true;
  });
  const numberedRows = counted ? rows.filter((row) => row.pattern.numbered === true) : [];

  const spread = config.patternSpread === undefined ? 0.2 : clamp01(config.patternSpread);
  let usedFallback = !rows.some((row) => row.score > minScore);
  let candidates;
  let best;
  if (numberedRows.length) {
    numberedRows.forEach((row) => { row.score = 1; });
    usedFallback = false;
    candidates = numberedRows.map((row) => ({ id: row.id, score: 1, pattern: row.pattern }));
    candidates.forEach((candidate) => { candidate.share = 1 / candidates.length; });
    best = pick(candidates, '|pattern').pattern;
  } else if (usedFallback) {
    const generic = config.patterns.filter((pattern) => pattern.triggers.length === 0);
    const poolPatterns = generic.length ? generic : [config.patterns[0]];
    candidates = poolPatterns.map((pattern) => ({
      id: pattern.id,
      score: 0,
      pattern,
    }));
    candidates.forEach((candidate) => { candidate.share = 1 / candidates.length; });
    best = pick(candidates, '|pattern').pattern;
  } else {
    candidates = rows.filter((row) => row.score > minScore && row.score >= bestScore * spread);
    const total = candidates.reduce((sum, candidate) => sum + candidate.score, 0);
    candidates.forEach((candidate) => { candidate.share = candidate.score / total; });
    let roll = chance('|pattern');
    best = (candidates.find((candidate) => { roll -= candidate.share; return roll < 0; }) || candidates[candidates.length - 1]).pattern;
  }

  const chosen = rows.find((row) => row.pattern === best);
  const scores = rows
    .map((row) => ({ id: row.id, score: row.score }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return {
    pattern: best,
    score: usedFallback ? 0 : chosen.score,
    usedFallback,
    scores,
    candidates: candidates.map((candidate) => ({
      id: candidate.id,
      score: candidate.score,
      share: candidate.share,
    })),
  };
}

/**
 * @param {string} [title]           a title, such as the one quirky-slugger returns, or an edit of it
 * @param {object} [options]
 * @param {string} [options.lang]          language pack code ("en", "de", "es"...); default "en"
 * @param {string} [options.langsDir]      folder of {lang}.json packs, instead of the bundled langs/
 * @param {object|string} [options.config] config object, or path to a JSON config file
 * @param {boolean} [options.quirks]       turn quirks mode on or off (overrides config.quirks)
 * @param {string|number} [options.seed]   vary the choices; the same input and seed always give the same instruction
 * @returns {object} the persona, the instruction, and everything that went into choosing them
 */
function explain(title, options) {
  options = options || {};
  const config = loadConfig(options);
  const allWords = splitWords(title);
  const limit = wordLimit(config.maxWords);
  const words = allWords.slice(0, limit);

  const hasSeed = options.seed !== undefined && options.seed !== null && options.seed !== '';
  const seed = words.join(' ') + (hasSeed ? '|seed:' + options.seed : '');
  const pick = (list, salt) => (list.length ? list[hash(seed + salt) % list.length] : undefined);
  const chance = (salt) => hash(seed + salt) / 4294967296;

  const stop = stopSet(config.stopWords);
  const tf = new Map();
  tokenize(words.join(' ')).forEach((raw) => {
    const term = fold(raw);
    if (stop.has(term)) return;
    tf.set(term, (tf.get(term) || 0) + 1);
  });
  const idf = buildIdf(config.patterns);
  const query = new Map();
  tf.forEach((count, term) => query.set(term, count * idf(term)));

  const choice = choosePattern(config, query, pick, chance);
  const quirksMode = quirksOn(options, config);
  const quirkFactor = clamp01(config.quirkFactor);
  const quirky = quirksMode && chance('|quirk') < quirkFactor;

  const ownTemplates = pool(choice.pattern.templates, choice.pattern.quirkyTemplates, quirky);
  const sharedTemplates = pool(config.sharedTemplates, config.sharedQuirkyTemplates, quirky);
  const sharedFactor = clamp01(config.sharedFactor);
  const sharedTemplate = sharedTemplates.length > 0
    && (ownTemplates.length === 0 || chance('|shared') < sharedFactor);
  const template = pick(sharedTemplate ? sharedTemplates : ownTemplates, '|template');
  // The shared pool only lends a sentence shape. The matched pattern still supplies the stance.
  const manner = pick(takeList(choice.pattern, 'manners', quirky, config), '|manner') || '';
  const verb = pick(takeList(choice.pattern, 'verbs', quirky, config), '|verb') || '';
  const object = pick(takeList(choice.pattern, 'objects', quirky, config), '|object') || '';
  const voice = pick(takeList(choice.pattern, 'voices', quirky, config), '|voice');
  const persona = voice ? voice.name : '';
  const phrase = voice ? voice.phrase : '';
  const instruction = capitalise(fill(template, {
    manner,
    verb,
    object,
    voice: phrase,
    persona,
  }));

  return {
    persona,
    instruction,
    lang: config.lang,
    pattern: choice.pattern.id,
    score: choice.score,
    usedFallback: choice.usedFallback,
    sharedTemplate,
    template,
    quirksMode,
    quirky,
    quirkFactor,
    manner,
    verb,
    object,
    voice: phrase,
    voiceId: voice ? voice.id : '',
    seed: hasSeed ? String(options.seed) : null,
    wordsUsed: words.length,
    wordsIgnored: allWords.length - words.length,
    scores: choice.scores,
    candidates: choice.candidates,
  };
}

function quirkyPersona(title, options) {
  const made = explain(title, options);
  return { persona: made.persona, instruction: made.instruction };
}

module.exports = quirkyPersona;
module.exports.quirkyPersona = quirkyPersona;
module.exports.explain = explain;
