'use strict';

const fs = require('fs');
const path = require('path');
const defaultConfig = require('./quirky-persona.config.json');
const DEFAULT_LANGS_DIR = path.join(__dirname, 'langs');


// ---------- text helpers ----------

function stripAccents(s) {
  return String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
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

// How many words of the text enter the seed. A non-number or a negative counts as 0.
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

// Merge: algorithm defaults → language pack → options.config.
// options.lang (or config.lang / defaultConfig.lang) selects the pack.
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
  config.templates = asStrings(config.templates);
  config.quirkyTemplates = asStrings(config.quirkyTemplates);

  if (!config.templates.length) {
    throw new TypeError('quirky-persona: config.templates must be a non-empty array');
  }
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

/**
 * @param {string} [text]            free text, truncated to config.maxWords words. It steadies the seed. It does not choose the words.
 * @param {object} [options]
 * @param {string} [options.lang]          language pack code ("en", "de", "es"...); default "en"
 * @param {string} [options.langsDir]      folder of {lang}.json packs, instead of the bundled langs/
 * @param {object|string} [options.config] config object, or path to a JSON config file
 * @param {boolean} [options.quirks]       turn quirks mode on or off (overrides config.quirks)
 * @param {string|number} [options.seed]   vary the choices; the same input and seed always give the same instruction
 * @returns {object} the persona, the instruction, and everything that went into choosing them
 */
function explain(text, options) {
  options = options || {};
  const config = loadConfig(options);
  const allWords = splitWords(text);
  const limit = wordLimit(config.maxWords);
  const words = allWords.slice(0, limit);

  const hasSeed = options.seed !== undefined && options.seed !== null && options.seed !== '';
  const seed = words.join(' ') + (hasSeed ? '|seed:' + options.seed : '');
  const pick = (list, salt) => (list.length ? list[hash(seed + salt) % list.length] : undefined);
  const chance = (salt) => hash(seed + salt) / 4294967296;

  const quirksMode = quirksOn(options, config);
  const quirkFactor = clamp01(config.quirkFactor);
  const quirky = quirksMode && chance('|quirk') < quirkFactor;

  const templatePool = pool(config.templates, config.quirkyTemplates, quirky);
  const template = pick(templatePool, '|template');
  const manner = pick(pool(config.manners, config.quirkyManners, quirky), '|manner') || '';
  const verb = pick(pool(config.verbs, config.quirkyVerbs, quirky), '|verb') || '';
  const object = pick(pool(config.objects, config.quirkyObjects, quirky), '|object') || '';
  const voice = pick(pool(config.voices, config.quirkyVoices, quirky), '|voice');
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
  };
}

function quirkyPersona(text, options) {
  const made = explain(text, options);
  return { persona: made.persona, instruction: made.instruction };
}

module.exports = quirkyPersona;
module.exports.quirkyPersona = quirkyPersona;
module.exports.explain = explain;
