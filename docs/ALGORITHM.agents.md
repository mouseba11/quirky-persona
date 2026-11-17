# quirky-persona: algorithm specification (for agents and maintainers)

Exact behaviour of `index.js`, `quirky-persona.config.json` and the language packs in `langs/`. Written to be unambiguous and to be checked against the code. For a narrative version see [`ALGORITHM.md`](ALGORITHM.md). For how to make changes see [`../AGENTS.md`](../AGENTS.md).

Function names are given instead of line numbers because lines drift. Search `index.js` for the identifier.

## 0. Contract

```
quirkyPersona(title?, options?) -> { persona: string, instruction: string }
explain(title?, options?)       -> ExplainResult   (superset; same persona and instruction)
```

- Exports: `module.exports = quirkyPersona` with properties `quirkyPersona` and `explain`.
- CommonJS, `'use strict'`, Node >= 14, **no runtime dependencies** (only the built-ins `fs` and `path`, plus the config JSON).
- **Pure and deterministic.** No `Math.random`, no `Date`, no network, no global state. The result is a function of `(truncated title, options.seed, merged config, options.quirks)`, where the merged config includes the language pack.
- Errors: a `TypeError` with message prefix `quirky-persona:` for an empty pattern list, a pattern with no templates, a non-array `triggers` or `quirkyTemplates`, an empty `templates` list passed without `patterns`, an invalid language code, or a missing language file. A missing config file path throws the underlying `fs` error. Invalid JSON throws `SyntaxError`.

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
pattern                              id of the pattern used
score                                number, cosine of that pattern; 0 when usedFallback
usedFallback                         boolean
sharedTemplate                       boolean, the shape came from the shared pool
template                             the raw template string chosen
quirksMode                           boolean, effective setting
quirky                               boolean, the quirky lists were added for this call
quirkFactor                          number, effective (clamped 0..1)
manner, verb, object                 strings, possibly empty when that pool was empty
voice                                the voice phrase, or "" when no voice was available
voiceId                              the voice id, or ""
seed                                 the options seed as a string, or null
wordsUsed, wordsIgnored              integers
scores                               { id, score }[] , every pattern, highest score first
candidates                           { id, score, share }[] , the patterns that could win
```

`persona` is the voice `name`, or `""` when no voice was available. It is the same string `quirkyPersona` returns.

`scores` ties break by `id` ascending (`localeCompare`). `share` values in `candidates` sum to 1.

## 1. Configuration

### 1.1 Merge

`loadConfig(options)`:

1. Read `options.config` (path or object) as `user`, else `{}`.
2. Resolve `lang` from `options.lang`, else `user.lang`, else `defaultConfig.lang` (`en`). Load `langs/{lang}.json` (or `{langsDir}/{lang}.json`). Unknown code → `TypeError`.
3. `config = Object.assign({}, defaultConfig, pack, user)`. Shallow merge. A supplied list replaces that list as a whole. Other lists stay.
4. Normalise the shared property lists (1.3) and set `config.lang` to the resolved code.
5. Patterns and the shared template pool, then (1.4):
   - If `user` has `templates` and does not have `patterns`: those templates are the only pattern (`id` `"custom"`, no triggers). `user.quirkyTemplates` is that pattern's quirky list, or `[]` when omitted. The shared pools are cleared. An empty template list throws `TypeError` `quirky-persona: config.templates must be a non-empty array`. This is the 1.0 pinned-sentence call.
   - Otherwise, if `user` has `patterns` and does not also supply `sharedTemplates` or `templates`, `sharedTemplates` is cleared. Same for `sharedQuirkyTemplates` / `quirkyTemplates`.
   - `sharedTemplates` defaults to `user.templates` when that key is present, else the merged `sharedTemplates`, else the merged `templates`. `sharedQuirkyTemplates` follows the same ladder with `quirkyTemplates`.
6. Copy the shared pools back onto `config.templates` and `config.quirkyTemplates` (new arrays).
7. `config.patterns` must be a non-empty array. Each entry is normalised (1.4). A pattern with no templates throws `TypeError` `quirky-persona: config.patterns[i] needs a non-empty "templates" array`.

Language support is **rudimentary**: packs are demos. Proper localisation is left as an exercise for other quirky personas.

`defaultConfig` is the algorithm JSON only and is not mutated. Normalised arrays are new arrays, so the required JSON modules are not mutated either.

### 1.2 Keys, types and defaults

Defaults below come from `quirky-persona.config.json` (algorithm settings) and `langs/en.json` (content). `quirkFactor`, `patternSpread`, and `sharedFactor` are clamped to 0..1 by `clamp01`. A non-number counts as 0. `minScore` uses `Number(value) || 0`, so a missing or non-numeric value is 0.

| Key | Default | Type and use |
| --- | --- | --- |
| `lang` | `"en"` | string. Pack used when `options.lang` is absent. |
| `maxWords` | `256` | number. `wordLimit`: a non-finite or negative value counts as 0. Otherwise `Math.floor`. |
| `minScore` | `0` | number. A pattern must score **strictly above** this to be eligible. |
| `patternSpread` | `0.2` | 0..1. Fraction of the best score a pattern must reach to stay a candidate. `undefined` counts as `0.2`. |
| `sharedFactor` | `0.25` | 0..1. Chance of drawing the sentence shape from the shared pool. |
| `quirks` | `false` | boolean. `quirksOn`: config counts as on only when it is strictly `true`. |
| `quirkFactor` | `0.7` | 0..1. Chance that quirks mode adds the quirky lists. |
| `stopWords` | see pack | strings. Dropped from the title before scoring, after `fold`. |
| `numbers` | see pack | strings. Folded tokens that select a `numbered` pattern. English: `2`, `3`, `5`, `two`, `three`, `five`, `42`. |
| `patterns` | 27 in English | The stances. German and Spanish packs are shorter demos. |
| `manners` | 8 strings | Shared `{manner}` plain pool. |
| `quirkyManners` | 5 strings | Shared quirky manners. |
| `verbs` | 8 strings | Shared `{verb}` plain pool. |
| `quirkyVerbs` | 6 strings | Shared quirky verbs. |
| `objects` | 5 strings | Shared `{object}` plain pool. |
| `quirkyObjects` | 4 strings | Shared quirky objects. |
| `voices` | 4 voices | Shared plain personas. |
| `quirkyVoices` | 12 voices | Shared quirky personas. Names are the actors. Phrases are the styles, including forms such as a hip hop song or an instruction manual. |
| `templates` | 2 strings | Shared sentence shapes. May be empty when every pattern has its own templates. |
| `quirkyTemplates` | 2 strings | Shared quirky shapes. May be empty. |
| `locale` | `{ id, label }` | Ignored by the algorithm. The example site uses `label`. |

English has one pattern per slugger title family (`history`, `comparison`, `connection`, `recipe`, `review`, `howto`, `list`, `explainer`, `opinion`, `news`, `portrait`, `place`, `nature`, `science`, `culture`, `society`, `statistics`, `sport`, `objects`, `food`, `health`, `tech`, `comfort`, `personal`, `essentials`, `tips`) plus `default`, which has no triggers. Do not treat German or Spanish lengths as part of the contract. One pattern in every shipped pack has an empty `triggers` array.

### 1.3 Normalisation of shared lists

`asStrings`: a non-array becomes `[]`. Each entry is `String(entry).trim()`. Empty strings are dropped.

`asVoices`: a non-array becomes `[]`. Each kept entry is `{ id, name, phrase }`.

- A string or number becomes `{ id: slugify(phrase), name: phrase, phrase }` where `phrase` is the trimmed string.
- An object uses `phrase`, then `name`, then `""` for the phrase. `name` defaults to the phrase. `id` defaults to `slugify(name)`, then `slugify(phrase)`, then `voice-<index+1>`.
- An entry whose phrase is empty is dropped.
- `slugify` is internal: NFKD, strip combining marks, lower case, runs of non `[a-z0-9]` become one hyphen, trim hyphens. It is not exported.

`stopWords` and `numbers` are `asStrings`. Folding happens at match time, not at load time.

### 1.4 Patterns

`normalisePattern` copies each pattern. It does not keep unknown keys.

```
{
  id: string,                  trimmed, or "pattern-<index>" when blank
  triggers: string[],          empty means generic fallback
  templates: string[],         required, non-empty after trim
  quirkyTemplates: string[],
  manners?, quirkyManners?,    present only when the source had the key
  verbs?, quirkyVerbs?,
  objects?, quirkyObjects?,
  voices?, quirkyVoices?,
  numbered?                 present only when the source value is true
}
```

- `triggers` present and not an array → `TypeError`.
- `quirkyTemplates` present and not an array → `TypeError`.
- A non-object pattern throws the templates error.
- An optional list that normalises to `[]` is stored and then treated as "use the shared list" by `takeList` (a non-empty check).

A pattern list is used instead of the shared list only when it is non-empty.

### 1.5 Voice

```
{ id: string, name: string, phrase: string }
```

`phrase` is required after normalisation. `name` is the persona. `phrase` is `{voice}`.

## 2. Title

`splitWords` splits on `/\s+/` and drops empty pieces. `words = allWords.slice(0, wordLimit(config.maxWords))`.

`wordsUsed = words.length`. `wordsIgnored = allWords.length - words.length`.

The counted words are joined with a single space. That string is both the seed (section 3) and the text that is tokenised for scoring.

`tokenize` is NFKD, strip combining marks, lower case, then `[a-z0-9]+`. Punctuation does not produce tokens. `fold` is the quirky-slugger stem, applied to tokens and to triggers, never written out:

1. length > 4 and ends `ies` → drop `ies`, add `y`
2. else length > 5 and ends `ing` → drop `ing`
3. else length > 4 and ends `ed` → drop `ed`
4. else length > 4 and ends `(s|x|z|ch|sh|o)es` → drop `es`
5. else length > 3 and ends `s`, but not `ss` / `us` / `is` → drop `s`
6. then length > 3 and ends `e` → drop `e`

Stop words are folded the same way and dropped from the query. They are not dropped from triggers. A trigger that folds to a stop word can never match.

## 3. Seed

```
hasSeed = options.seed !== undefined && options.seed !== null && options.seed !== ''
seed    = words.join(' ') + (hasSeed ? '|seed:' + options.seed : '')
```

`options.seed` is concatenated, so a number `0` becomes the characters `0`. `explain().seed` is `String(options.seed)` when `hasSeed`, otherwise `null`. The internal `seed` string is not returned.

`hash(s)` is the unsigned 32-bit mix in `index.js`: djb2 (`h * 33` xor char), then the xorshift / imul mix (`0x85ebca6b`, `0xc2b2ae35`). Do not change it casually. It is the same mix quirky-slugger uses.

```
pick(list, salt)   = list[hash(seed + salt) % list.length]    when list.length > 0, else undefined
chance(salt)       = hash(seed + salt) / 4294967296           in [0, 1)
```

### Salt table

| Salt | Choice |
| --- | --- |
| `\|pattern` | pattern. Weighted by score, or an even `pick` among generic patterns on fallback. |
| `\|quirk` | quirky roll |
| `\|shared` | whether the sentence shape comes from the shared pool |
| `\|template` | template, inside whichever pool `|shared` selected |
| `\|manner` | manner |
| `\|verb` | verb |
| `\|object` | object |
| `\|voice` | voice |

Salts are independent. Appending to one list does not change the index chosen in another list. Inserting or reordering a list changes the index for that salt. Record output-changing list edits in `CHANGELOG.md`.

## 4. Scoring and pattern choice

Same TF-IDF and cosine as quirky-slugger. There is no separate keyword list: the title is the query.

```
idf(term) = ln((N + 1) / (df(term) + 1)) + 1
```

`N` is the number of patterns. `df` counts patterns whose triggers contain the folded term, once per pattern.

Query term weight is `count * idf(term)`. A pattern vector sets each distinct folded trigger to `idf(term)` (presence, not a count). `cosine` is the dot product divided by the product of Euclidean norms. A zero norm scores 0.

```
minScore = Number(config.minScore) || 0
spread   = config.patternSpread === undefined ? 0.2 : clamp01(config.patternSpread)
usedFallback = no pattern has score > minScore
```

- Not fallback: candidates are patterns with `score > minScore` and `score >= bestScore * spread`. `share = score / sum(scores)`. Walk candidates in pattern order, subtracting `share` from `chance('|pattern')`. The first candidate that crosses zero wins. If none does, the last candidate wins.
- A count token is a folded token of an entry in `config.numbers` (`asStrings`, then `tokenize` and `fold`). When the query has one and at least one pattern has `numbered === true`, those patterns score `1` and they are the only candidates. `share` is even. `pick(candidates, '|pattern')`. `usedFallback` is false. `explain().score` is `1`. `minScore` and `patternSpread` do not apply to this choice. Other patterns keep the cosine they scored, so `scores` still shows them under the numbered pattern. The English list is `2`, `3`, `5`, `two`, `three`, `five`, `42`.
- Fallback: candidates are the patterns with empty `triggers`, or `patterns[0]` when every pattern has triggers. `share` is even. `pick(candidates, '|pattern')`.
- `explain().score` is `0` on fallback, otherwise the chosen pattern's cosine.

## 5. Quirks, templates, and pools

```
quirksMode = quirksOn(options, config)
quirkFactor = clamp01(config.quirkFactor)
quirky = quirksMode && chance('|quirk') < quirkFactor
```

`quirksOn`: if `options.quirks` is `undefined` or `null`, use `config.quirks === true`. Otherwise quirks are on only when the option is `true` or `"true"`.

```
ownTemplates    = pool(pattern.templates, pattern.quirkyTemplates, quirky)
sharedTemplates = pool(config.sharedTemplates, config.sharedQuirkyTemplates, quirky)
sharedFactor    = clamp01(config.sharedFactor)
sharedTemplate  = sharedTemplates.length > 0
                  && (ownTemplates.length === 0 || chance('|shared') < sharedFactor)
template        = pick(sharedTemplate ? sharedTemplates : ownTemplates, '|template')
```

`pool(plain, extra, quirky)` returns a new array: `plain` alone, or `plain.concat(extra)` when `quirky` is true and `extra` has length.

`takeList(pattern, key, quirky, config)` for `manners`, `verbs`, `objects`, `voices`:

- Plain rows: the pattern's list when it is non-empty, otherwise the shared list.
- When `quirky` is false, return the plain rows.
- When `quirky` is true, append the pattern's quirky list when it is non-empty.
- Also append the shared quirky list when the pattern did not supply a non-empty plain list.
- For `voices` only, also append the shared quirky voices when the pattern did supply its own plain voices.

The shared template does not switch the property lists. It only switches the sentence shape.

All five picks (template, manner, verb, object, voice) happen on every call, whether or not the chosen template contains the placeholder.

## 6. Fill

```
values = { manner, verb, object, voice: phrase, persona: name }
instruction = capitalise(fill(template, values))
```

`fill` replaces `{(manner|verb|object|voice|persona)}` globally. Any other `{token}` is left unchanged. A missing value (empty string, or no voice) is replaced with `""`.

`capitalise` collapses whitespace to single spaces, trims, and uppercases the first character with `toLocaleUpperCase('en')`. The rest of the string is unchanged. An empty result stays `""`.

`persona` returned to the caller is `voice.name`, or `""` when the voice pool was empty.

## 7. Invariants

1. `quirkyPersona(title, options)` equals `{ persona, instruction }` from `explain(title, options)` for the same arguments.
2. Equal truncated title, equal seed, equal merged config, and equal effective quirks produce an equal result. No clock and no randomness.
3. Words beyond `maxWords` cannot change `persona` or `instruction`.
4. With `quirky === false`, no value is drawn from a quirky-only list.
5. With `quirky === true`, plain rows stay in the pool. A pattern that brought its own verbs or objects does not also take the shared quirky verbs or objects. Shared quirky voices are still eligible.
6. A pattern with no templates throws. The shared template pool may be empty.
7. The first character of a non-empty instruction is that character's `en` upper case. Later characters are not title-cased.
8. `persona` and `{voice}` come from the same voice pick.
9. Supplying one config key does not clear the other keys, except `patterns` clears the shared template pools unless those pools are also supplied, and `templates` without `patterns` replaces the pattern set with one generic pattern.
10. Language packs and `options.config` cannot change the salt strings, the hash, or `fold`. Those live in `index.js`.
11. A title whose content tokens match no trigger above `minScore`, and which has no count claimed by a numbered pattern, uses a trigger-less pattern when one exists. `usedFallback` is true and `score` is 0.
12. The title is not copied into the instruction unless a list entry contains those words.
13. A folded token of `config.numbers` selects every pattern with `numbered === true`. The chosen score is `1` and `usedFallback` is false. Any other token, including `101` and `1920`, is an ordinary term.

## 8. Tests that lock the contract

`test.js` pins:

- The Douglas Adams sentence and the professional sentence, via a one-entry config (`templates` and no `patterns`).
- The default English history title, with no seed, with `{ quirks: true, seed: 2 }`, and `explain` seed `demo`.
- The lemur paragraph, which matches no trigger: persona Reporter with no seed, Footnote with `{ quirks: true, seed: 2 }`, and the `default` pattern with seed `demo`.
- `The History of Lemurs`, `How Do Lemurs and Geometry Compare?`, `A Beginner's Guide to Lemurs`, and `A short account of lemurs through the years` at `patternSpread` 1.
- `Die Geschichte von Lemuren` and `La historia de los lémures` select `history`. `Lemuren Vergleich` and `Comparación de lémures` select `comparison`.
- Quirk factor 0 never returns a quirky-only voice id from the English shared voices (200 seeds on the unmatched lemur paragraph).
- Quirk factor 1 over 300 seeds of that paragraph hits both a shared plain voice id and a shared quirky voice id, and at least 150 distinct instructions.

A change to default English list order, trigger membership, or pattern order will fail those pins. Update the pins, the README quick start, and `docs/ALGORITHM.md` in the same change.
