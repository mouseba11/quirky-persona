# quirky-persona: algorithm specification (for agents and maintainers)

Exact behaviour of `index.js`, `quirky-persona.config.json` and the language packs in `langs/`. Written to be unambiguous and to be checked against the code. For a narrative version see [`ALGORITHM.md`](ALGORITHM.md). For how to make changes see [`../AGENTS.md`](../AGENTS.md).

Function names are given instead of line numbers because lines drift. Search `index.js` for the identifier.

## 0. Contract

```
quirkyPersona(text?, options?) -> { persona: string, instruction: string }
explain(text?, options?)       -> ExplainResult   (superset; same persona and instruction)
```

- Exports: `module.exports = quirkyPersona` with properties `quirkyPersona` and `explain`.
- CommonJS, `'use strict'`, Node >= 14, **no runtime dependencies** (only the built-ins `fs` and `path`, plus the config JSON).
- **Pure and deterministic.** No `Math.random`, no `Date`, no network, no global state. The result is a function of `(truncated text, options.seed, merged config, options.quirks)`, where the merged config includes the language pack.
- Errors: a `TypeError` with message prefix `quirky-persona:` for an empty `templates` list, an invalid language code, or a missing language file. A missing config file path throws the underlying `fs` error. Invalid JSON throws `SyntaxError`.

### Options

| Option | Type | Effect |
| --- | --- | --- |
| `lang` | string | Language pack code, `/^[a-z]{2}(-[a-z0-9]+)?$/i`. Wins over `config.lang`. Default `"en"`. Invalid code or missing file → `TypeError`. |
| `langsDir` | string | Folder holding `{lang}.json` packs. Relative paths resolve against `process.cwd()`. Default: the bundled `langs/`. |
| `config` | object or string | An object, or a path to a JSON file read with `fs.readFileSync` on **every call**. |
| `quirks` | boolean | If not `undefined` and not `null`, overrides `config.quirks`. Only `true` and `"true"` turn quirks on. |
| `seed` | string or number | If not `undefined`, not `null` and not `''`, appended to the seed string (see 3). Numbers are stringified. `0` counts as set. |

### `ExplainResult`

```
persona, instruction                 strings
lang                                 language code used (lowercase)
template                             the raw template string chosen
quirksMode                           boolean, effective setting
quirky                               boolean, the quirky lists were added for this call
quirkFactor                          number, effective (clamped 0..1)
manner, verb, object                 strings, possibly empty when that pool was empty
voice                                the voice phrase, or "" when no voice was available
voiceId                              the voice id, or ""
seed                                 the options seed as a string, or null
wordsUsed, wordsIgnored              integers
```

`persona` is the voice `name`, or `""` when no voice was available. It is the same string `quirkyPersona` returns.

## 1. Configuration

### 1.1 Merge

`loadConfig(options)`:

1. Read `options.config` (path or object) as `user`, else `{}`.
2. Resolve `lang` from `options.lang`, else `user.lang`, else `defaultConfig.lang` (`en`). Load `langs/{lang}.json` (or `{langsDir}/{lang}.json`). Unknown code → `TypeError`.
3. `config = Object.assign({}, defaultConfig, pack, user)`. Shallow merge. A supplied list replaces that list as a whole. Other lists stay.
4. Normalise lists (1.3) and set `config.lang` to the resolved code.
5. If `config.templates` is empty after normalisation, throw `TypeError` `quirky-persona: config.templates must be a non-empty array`.

Language support is **rudimentary**: packs are demos. Proper localisation is left as an exercise for other quirky personas.

`defaultConfig` is the algorithm JSON only and is not mutated. Normalised arrays are new arrays, so the required JSON modules are not mutated either.

### 1.2 Keys, types and defaults

Defaults below come from `quirky-persona.config.json` (algorithm settings) and `langs/en.json` (content). Counts are for the English pack. `quirkFactor` is clamped to 0..1 by `clamp01`, and a non-number (`undefined`, `NaN`, a non-numeric string) counts as 0.

| Key | Default | Type and use |
| --- | --- | --- |
| `lang` | `"en"` | string. Pack used when `options.lang` is absent. |
| `maxWords` | `256` | number. `wordLimit`: a non-finite or negative value counts as 0. Otherwise `Math.floor`. |
| `quirks` | `false` | boolean. `quirksOn`: config counts as on only when it is strictly `true`. |
| `quirkFactor` | `0.7` | 0..1. Chance that quirks mode adds the quirky lists. |
| `manners` | 8 strings | `{manner}` plain pool. |
| `quirkyManners` | 5 strings | Appended on a quirky roll. |
| `verbs` | 8 strings | `{verb}` plain pool. |
| `quirkyVerbs` | 6 strings | Appended on a quirky roll. |
| `objects` | 5 strings | `{object}` plain pool. |
| `quirkyObjects` | 4 strings | Appended on a quirky roll. |
| `voices` | 4 voices | Plain personas. |
| `quirkyVoices` | 4 voices | Appended on a quirky roll. |
| `templates` | 2 strings | Plain shapes. Must be non-empty after normalisation. |
| `quirkyTemplates` | 2 strings | Appended on a quirky roll. May be empty. |
| `locale` | `{ id, label }` | Ignored by the algorithm. The example site uses `label`. |

German and Spanish counts differ. They are demos. Do not treat their lengths as part of the contract.

### 1.3 Normalisation

`asStrings`: a non-array becomes `[]`. Each entry is `String(entry).trim()`. Empty strings are dropped.

`asVoices`: a non-array becomes `[]`. Each kept entry is `{ id, name, phrase }`.

- A string or number becomes `{ id: slugify(phrase), name: phrase, phrase }` where `phrase` is the trimmed string.
- An object uses `phrase`, then `name`, then `""` for the phrase. `name` defaults to the phrase. `id` defaults to `slugify(name)`, then `slugify(phrase)`, then `voice-<index+1>`.
- An entry whose phrase is empty is dropped.
- `slugify` is internal: NFKD, strip combining marks, lower case, runs of non `[a-z0-9]` become one hyphen, trim hyphens. It is not exported.

### 1.4 Voice

```
{ id: string, name: string, phrase: string }
```

`phrase` is required after normalisation. `name` is the persona. `phrase` is `{voice}`.

## 2. Text

`splitWords` splits on `/\s+/` and drops empty pieces. `words = allWords.slice(0, wordLimit(config.maxWords))`.

`wordsUsed = words.length`. `wordsIgnored = allWords.length - words.length`.

The counted words are joined with a single space. Original spacing and newlines do not otherwise affect the seed. Punctuation stays attached to the word it was written on, because the split is whitespace only.

## 3. Seed

```
hasSeed = options.seed !== undefined && options.seed !== null && options.seed !== ''
seed    = words.join(' ') + (hasSeed ? '|seed:' + options.seed : '')
```

`options.seed` is concatenated, so a number `0` becomes the characters `0`. `explain().seed` is `String(options.seed)` when `hasSeed`, otherwise `null`. The internal `seed` string is not returned.

`hash(s)` is the unsigned 32-bit mix in `index.js`: djb2 (`h * 33` xor char), then the xorshift / imul mix (`0x85ebca6b`, `0xc2b2ae35`). Do not change it casually.

```
pick(list, salt)   = list[hash(seed + salt) % list.length]    when list.length > 0, else undefined
chance(salt)       = hash(seed + salt) / 4294967296           in [0, 1)
```

### Salt table

| Salt | Choice |
| --- | --- |
| `\|quirk` | quirky roll |
| `\|template` | template |
| `\|manner` | manner |
| `\|verb` | verb |
| `\|object` | object |
| `\|voice` | voice |

Salts are independent. Appending to one list does not change the index chosen in another list. Inserting or reordering a list changes the index for that salt. Record output-changing list edits in `CHANGELOG.md`.

## 4. Quirks and pools

```
quirksMode = quirksOn(options, config)
quirkFactor = clamp01(config.quirkFactor)
quirky = quirksMode && chance('|quirk') < quirkFactor
```

`quirksOn`: if `options.quirks` is `undefined` or `null`, use `config.quirks === true`. Otherwise quirks are on only when the option is `true` or `"true"`.

`pool(plain, extra, quirky)` returns a new array: `plain` alone, or `plain.concat(extra)` when `quirky` is true and `extra` has length. The plain rows stay at the front. An empty plain list with a quirky roll yields just the quirky rows.

| Pool | Plain | Extra |
| --- | --- | --- |
| template | `templates` | `quirkyTemplates` |
| manner | `manners` | `quirkyManners` |
| verb | `verbs` | `quirkyVerbs` |
| object | `objects` | `quirkyObjects` |
| voice | `voices` | `quirkyVoices` |

All five picks happen on every call, whether or not the chosen template contains the placeholder.

## 5. Fill

```
values = { manner, verb, object, voice: phrase, persona: name }
instruction = capitalise(fill(template, values))
```

`fill` replaces `{(manner|verb|object|voice|persona)}` globally. Any other `{token}` is left unchanged. A missing value (empty string, or no voice) is replaced with `""`.

`capitalise` collapses whitespace to single spaces, trims, and uppercases the first character with `toLocaleUpperCase('en')`. The rest of the string is unchanged. An empty result stays `""`.

`persona` returned to the caller is `voice.name`, or `""` when the voice pool was empty.

## 6. Invariants

1. `quirkyPersona(text, options)` equals `{ persona, instruction }` from `explain(text, options)` for the same arguments.
2. Equal truncated text, equal seed, equal merged config, and equal effective quirks produce an equal result. No clock and no randomness.
3. `words` beyond `maxWords` cannot change `persona` or `instruction`.
4. With `quirky === false`, no value is drawn from a quirky-only list.
5. With `quirky === true`, every quirky list that has entries is part of its pool, and the plain list is still part of that pool.
6. `templates` empty after trim throws. `quirkyTemplates` may be empty.
7. The first character of a non-empty instruction is that character's `en` upper case. Later characters are not title-cased.
8. `persona` and `{voice}` come from the same voice pick.
9. Supplying one config key does not clear the other keys.
10. Language packs and `options.config` cannot change the salt strings or the hash. Those live in `index.js`.

## 7. Tests that lock the contract

`test.js` pins:

- The Douglas Adams sentence and the professional sentence, via a one-entry config.
- The default English quick start: the lemur sentence with no seed, with `{ quirks: true, seed: 2 }`, and `explain` seed `demo`.
- Quirk factor 0 never returns a quirky-only voice id from the English pack (200 seeds).
- Quirk factor 1 over 300 seeds of the English pack hits both a plain voice id and a quirky voice id, and at least 150 distinct instructions.

A change to default English list order or membership will fail those pins. Update the pins, the README quick start, and `docs/ALGORITHM.md` in the same change.
