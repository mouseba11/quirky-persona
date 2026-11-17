# quirky-persona

Turn a **title** into a **persona** and a **writing instruction**.

Pass the title quirky-slugger just made, or an edit of it. The framing words in that title (`history`, `compare`, `guide`, `recipe`, and the rest) choose the stance. The same title and the same seed always repeat.

```js
const quirkyPersona = require('@mouseba11/quirky-persona');

const title = 'The History of Lemurs';

quirkyPersona(title);
// -> { persona: 'Historian',
//      instruction: 'Recount the history this title names carefully and as a historian' }

quirkyPersona(title, { quirks: true, seed: 2 });
// -> { persona: 'Nature documentary',
//      instruction: 'Follow the years this title spans quietly and as a nature documentary' }
```

A title with none of those framing words falls back to a generic persona. The two shapes below are pinned with a one-entry config, so they do not depend on the title at all:

```js
quirkyPersona('', {
  config: {
    templates: ['{manner} {verb} {object} {voice}'],
    manners: ['coherently'],
    verbs: ['discombobulate'],
    objects: ['the themes'],
    voices: [{ id: 'douglas-adams', name: 'Douglas Adams', phrase: 'in the style of Douglas Adams' }],
  },
});
// -> { persona: 'Douglas Adams',
//      instruction: 'Coherently discombobulate the themes in the style of Douglas Adams' }

quirkyPersona('', {
  config: {
    templates: ['{verb} {object} {manner} and {voice}'],
    manners: ['succinctly'],
    verbs: ['combine'],
    objects: ['the text'],
    voices: [{ id: 'professional', name: 'Professional', phrase: 'professionally' }],
  },
});
// -> { persona: 'Professional',
//      instruction: 'Combine the text succinctly and professionally' }
```

- **Local and deterministic.** No network, no AI service, no dependencies. The same input (and seed) always gives the same result.
- **A persona and an instruction.** The persona is a name, such as `Historian` or `Douglas Adams`. The instruction is one sentence that tells a writer what to do.
- **Matched the way slugger matches.** The title is scored against pattern triggers with TF-IDF and cosine. Close scores can share the win. A rewritten title that keeps a word such as `years` or `compare` still matches. A title that keeps none of them uses the generic pattern.
- **Built from properties.** Each pattern fills a template from its own manners, verbs, objects, and voices. Lists you leave off a pattern fall back to the shared ones.
- **Quirky when you want it.** An optional quirks mode can still land on `in the style of Douglas Adams`. The matched pattern keeps its own verb and object, so the history stays a history.
- **Language hooks.** Rudimentary packs for `en`, `de` and `es` show how switching works. Proper language support is left as an exercise for other quirky personas.

## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [API](#api)
- [Instructions](#instructions)
- [Languages](#languages)
- [Configuration](#configuration)
- [Templates and placeholders](#templates-and-placeholders)
- [Quirks mode](#quirks-mode)
- [Getting more (or less) variety](#getting-more-or-less-variety)
- [Example site](#example-site)
- [Documentation](#documentation)
- [Development](#development)
- [Releasing](#releasing)
- [License](#license)

## Install

From the public npm registry:

```
npm install @mouseba11/quirky-persona
```

From a git checkout of this repository:

```
npm install github:mouseba11/quirky-persona
```

From [GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry), add this to your project `.npmrc` (and authenticate with a classic PAT that has `read:packages`):

```
@mouseba11:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_TOKEN
```

Then:

```
npm install @mouseba11/quirky-persona
```

Requires Node 14 or later. There are no runtime dependencies.

## Quick start

```js
const quirkyPersona = require('@mouseba11/quirky-persona');

const title = 'The History of Lemurs';

quirkyPersona(title);
// -> { persona: 'Historian',
//      instruction: 'Recount the history this title names carefully and as a historian' }

quirkyPersona(title, { quirks: true, seed: 2 });
// -> { persona: 'Nature documentary',
//      instruction: 'Follow the years this title spans quietly and as a nature documentary' }

quirkyPersona.explain(title, { seed: 'demo' });
// pattern: history
// persona: Historian
// instruction: Recount the history this title names plainly and as a historian
```

`A short account of lemurs through the years` still matches `history`, because `years` is one of that pattern's triggers. `Lemurs` on its own matches nothing and uses the generic pattern.

The lines above are real output of the default English pack. Any change to the configuration or the seed can change which instruction you get. The two pinned calls in the introduction do not depend on the default lists. See [Getting more (or less) variety](#getting-more-or-less-variety).

## API

```js
const quirkyPersona = require('@mouseba11/quirky-persona');

// explain is also a property, so it can be destructured:
const { explain } = require('@mouseba11/quirky-persona');
```

### `quirkyPersona(title, options)`

Returns `{ persona, instruction }`.

| Argument | Description |
| --- | --- |
| `title` | The title to match. Usually the title quirky-slugger returned, or an edit of it. Only the first `maxWords` (default 256) words are scored. The words are not copied into the instruction. |
| `options.lang` | Optional language code (`en`, `de`, `es`, …). Loads `langs/{lang}.json`. Defaults to `en`. |
| `options.langsDir` | Optional path to a folder of `{lang}.json` packs, if you keep your own editable copies outside the package. |
| `options.config` | Optional config object, or a path to a JSON config file. Merged last, after the language pack. See [Configuration](#configuration). |
| `options.quirks` | Optional `true` or `false`. Turns quirks mode on or off for this call, overriding `config.quirks`. |
| `options.seed` | Optional string or number. The same title and seed always give the same result. A different seed can give a different instruction inside the matched pattern. Pass `Math.random()` for a new instruction every call. |

`persona` is the chosen voice's name. `instruction` is the filled template, with the first letter capitalised.

### `explain(title, options)`

Takes the same arguments as `quirkyPersona` and returns everything that went into the result.

```js
quirkyPersona.explain(title, { seed: 'demo' });
```

| Field | Meaning |
| --- | --- |
| `persona` / `instruction` | The persona and the instruction, identical to what `quirkyPersona` returns. |
| `pattern` | Id of the pattern that was used. |
| `score` | Cosine score of that pattern. `0` when nothing matched and a generic pattern was used. |
| `usedFallback` | `true` when no pattern scored above `minScore`. |
| `sharedTemplate` | `true` when the sentence shape came from the shared pool rather than the pattern's own templates. |
| `scores` | Every pattern id and its score, highest first. |
| `candidates` | The patterns that were allowed to win, each with `id`, `score`, and `share`. |
| `lang` | The language code that was used. |
| `template` | The template that was filled in. |
| `quirksMode` / `quirky` / `quirkFactor` | Whether quirks mode was on, whether the quirky lists were added, and the factor used. |
| `manner` / `verb` / `object` | The values used for `{manner}`, `{verb}` and `{object}`. |
| `voice` / `voiceId` | The phrase used for `{voice}`, and the voice's `id`. |
| `seed` | The seed as a string, or `null`. |
| `wordsUsed` / `wordsIgnored` | Words that entered the match, and words dropped for exceeding `maxWords`. |

## Instructions

The instruction is one sentence. The persona is the name of the voice that sentence is written in.

The title is matched first. Each pattern is a small document made of its `triggers`. The title is tokenised, lightly stemmed (the same fold quirky-slugger uses, so `compared` meets `compare` and `years` meets `year`), and stop words are dropped. TF-IDF and cosine then score every pattern. `patternSpread` (default `0.2`) keeps every pattern that scored at least that fraction of the best score, and the seed picks one with chances in proportion to the score. A spread of `1` keeps only the top score. If nothing scores above `minScore`, the seed picks a pattern that has no triggers.

A pattern with its own manners, verbs, objects, or voices uses those. A list it leaves out uses the shared list of the same name. `sharedFactor` (default `0.25`) is the chance of borrowing a sentence shape from `templates` instead of the pattern's own templates. The pattern's words are still used.

- A template is ordinary text with placeholders. `{manner} {verb} {object} {voice}` can become `Coherently discombobulate the themes in the style of Douglas Adams`.
- `{verb} {object} {manner} and {voice}` can become `Combine the text succinctly and professionally`. The word `and` belongs to the template.
- The first character of the finished sentence is capitalised. The rest is left as the lists wrote it, so `Douglas Adams` keeps its capitals and `professionally` stays lower case.
- Extra spaces from an empty placeholder are collapsed.
- `persona` is the voice's `name`. The instruction uses the voice's `phrase`, unless the template asks for `{persona}` itself.

Passing `templates` and not `patterns` is the 1.0 call: those templates become the only pattern, with no triggers, so the sentence is pinned and the title is not matched.

## Languages

Language packs live in [`langs/`](langs/): `en.json`, `de.json`, `es.json`. Each pack owns the shared lists, the patterns, the stop words, and a `locale` block with `id` and `label`.

```js
quirkyPersona('Die Geschichte von Lemuren', { lang: 'de' });
quirkyPersona('La historia de los lémures', { lang: 'es' });
```

Merge order is **algorithm defaults → language pack → `options.config`**. Point `options.langsDir` at your own folder if you keep editable copies outside `node_modules`.

**Language support is rudimentary.** The hooks (`options.lang`, `langs/*.json`) are there so packs can be switched and expanded. The shipped `de` and `es` files are short demos, not production localisation. There is no grammar engine. **Proper language support is left as an exercise for other quirky personas.** Fork a pack, rewrite the lists, the triggers, and the templates for your locale, and improve the rules if you need to.

See [`docs/ALGORITHM.md`](docs/ALGORITHM.md) and the "Add a language" recipe in [`AGENTS.md`](AGENTS.md).

## Configuration

Algorithm defaults (`maxWords`, `patternSpread`, `sharedFactor`, `quirkFactor`, `lang`, …) are in [`quirky-persona.config.json`](quirky-persona.config.json). Language content is in [`langs/`](langs/). Pass `options.config` to override any key after the pack is loaded. Keys you leave out keep their merged defaults.

```js
quirkyPersona(title, { config: { patternSpread: 1, sharedFactor: 0 } });
quirkyPersona(title, { config: './my-persona.json' });
```

| Key | Default | Meaning |
| --- | --- | --- |
| `maxWords` | `256` | Words of the title that are matched. Further words are ignored. |
| `minScore` | `0` | A pattern must score above this to win. Otherwise a generic pattern is used. |
| `patternSpread` | `0.2` | How close to the best score a pattern must be to stay in the running. `1` keeps only the top score. |
| `sharedFactor` | `0.25` | Chance of using a shared sentence shape instead of the pattern's own. |
| `quirks` | `false` | Turns quirks mode on by default. |
| `quirkFactor` | `0.7` | In quirks mode, the chance (0 to 1) that the quirky lists are added. |
| `stopWords` | see pack | Words dropped before scoring. Matched after the same light stemming as the title. |
| `numbers` | see pack | The `{n}` strings. A title that contains one selects a pattern marked `numbered`. |
| `patterns` | see pack | The stances. Each needs an `id`, a `triggers` array (empty for a generic fallback), and a non-empty `templates` array. Optional lists: `manners`, `verbs`, `objects`, `voices`, and the `quirky*` twins. `numbered: true` means a count in the title selects this pattern. |
| `manners` / `quirkyManners` | see pack | Shared adverbs for `{manner}`, used when a pattern does not bring its own. |
| `verbs` / `quirkyVerbs` | see pack | Shared verbs for `{verb}`. |
| `objects` / `quirkyObjects` | see pack | Shared noun phrases for `{object}`. |
| `voices` / `quirkyVoices` | see pack | Shared personas. Each entry is `{ id, name, phrase }`, or a string used as both the name and the phrase. |
| `templates` / `quirkyTemplates` | see pack | Shared sentence shapes. Also accepted as `sharedTemplates` / `sharedQuirkyTemplates`. |

`quirkFactor`, `patternSpread`, and `sharedFactor` are clamped to the range 0 to 1, and a value that is not a number counts as 0. `maxWords` that is not a number, or is negative, counts as 0, so the title drops out of the match.

Supplying `patterns` replaces the whole set and clears the shared templates unless you also pass `templates` or `sharedTemplates`. Supplying any other key replaces that key. It does not clear the others. An empty `voices` array means the call has no persona when the pattern does not bring its own.

### Pattern

```json
{
  "id": "history",
  "triggers": ["history", "years", "timeline"],
  "voices": [{ "id": "historian", "name": "Historian", "phrase": "as a historian" }],
  "verbs": ["trace", "recount"],
  "objects": ["the history this title names"],
  "templates": ["{manner} {verb} {object} {voice}"]
}
```

Triggers are the words that show up in that kind of title, not the subject (`lemur`, `geometry`). A user can rewrite the title and the match still holds as long as one of those words, or a light variant of it (`compared`, `guides`, `histories`), remains. The `numbers` list does the same job for a pattern marked `numbered`: `3 Things You Didn't Know About Lemurs` and `Two Things You Didn't Know About Lemurs` are lists, because those strings are what slugger writes for `{n}`. `Lemurs 101` stays with essentials. Patterns with an empty `triggers` array are the fallback.

### Voices

```json
{ "id": "douglas-adams", "name": "Douglas Adams", "phrase": "in the style of Douglas Adams" }
```

| Field | Meaning |
| --- | --- |
| `id` | A stable name, shown in `explain()` as `voiceId`. Filled from the name when you leave it out. |
| `name` | The persona the call returns. |
| `phrase` | What `{voice}` writes. Required. A row without one is dropped. |

A plain string is shorthand for a voice whose name and phrase are that string.

## Templates and placeholders

| Placeholder | Becomes |
| --- | --- |
| `{manner}` | One entry from the pattern's `manners`, or the shared list. `quirkyManners` join on a quirky roll. |
| `{verb}` | One entry from the pattern's `verbs`, or the shared list. |
| `{object}` | One entry from the pattern's `objects`, or the shared list. |
| `{voice}` | The chosen voice's `phrase`. |
| `{persona}` | The chosen voice's `name`. |

A voice is chosen on every call, so `persona` is set even when the template never writes the name. Manner, verb, and object are also chosen on every call. A placeholder the template does not use simply does not appear in the instruction. `explain()` still reports the roll.

Rules:

- Write the glue yourself: `and`, commas, colons. The code does not inflect words or insert articles.
- Every pattern needs at least one non-empty template. Quirky templates are optional.
- On a quirky roll the quirky templates are **added** to the plain ones. The plain shapes remain available.
- An unknown placeholder, such as `{nope}`, is left as written.

## Quirks mode

Off by default, so instructions stay on the plain lists. Switch it on per call or in the config:

```js
quirkyPersona(title, { quirks: true });
```

In quirks mode one roll, with probability `quirkFactor`, adds the quirky rows. The plain rows are never removed.

When the matched pattern brought its own verbs or objects, the shared quirky verbs and objects stay out, so the instruction does not abandon the stance. Shared quirky voices are still added. A voice is an actor, a role, or a style: the name is the persona, and the phrase is how the instruction reads. The English quirky list includes Douglas Adams, P.G. Wodehouse, a beat poet, Hunter S. Thompson, a theatre critic, and styles such as a hip hop song, an instruction manual, the shipping forecast, a nature documentary, and a cookbook. A pattern that left a list empty uses the shared quirky rows for that list, as before.

## Getting more (or less) variety

| To get | Change |
| --- | --- |
| A different instruction on every call | Pass a changing `seed`, such as `Math.random()`. |
| The same instruction for the same input | Pass no seed, or the same one. |
| A different stance | Change the title's framing words, or edit `patterns`. |
| Only the single best pattern | Set `patternSpread` to `1`. |
| No shared sentence shapes | Set `sharedFactor` to `0`. |
| A generic persona for every title | Give every pattern an empty `triggers` array, or set `maxWords` to `0`. |
| No quirky words | Leave `quirks` off, or set `quirkFactor` to `0`. |
| Quirky words always in the pool | Set `quirks` on and `quirkFactor` to `1`. |
| One exact sentence | Pass `templates` and the four lists, and do not pass `patterns`. |
| Stable results for tests | Set `quirks: false` or `quirkFactor: 0`, and pass a fixed seed. |

## Example site

A small Node server and page with two views, **Tester** and **Config**. The tester is where you paste a title, press **Generate**, and see the **OUTPUT** (`persona:` and `instruction:`) together with the pattern, its score, and the rolls behind it.

Config is where you set that sample and edit the configuration: the settings, the shared and quirky lists, the `{n}` strings, and each pattern. **Edit** on a pattern opens its actors, triggers, and templates. **Number** means a title that contains one of the number strings selects that pattern. Each setting has a **?** button. The explanations live in `example/settings-help.json`, separate from the page, so the wording is easy to change. Switching to Tester applies the sample and the config. Config also shows the JSON to copy into `options.config`. Nothing is written to a file. The page has no dependencies.

```
npm start
```

Then open http://localhost:4000. The tester starts from a sample title for the current language. Replace it with a slugger title, or with an edit of one. The tester has a quirks checkbox, a quirk factor slider, and a seed option (a new random seed on each press by default). Opening Tester sets those from the config and the sample.

The sample, the edited config and the log are kept in this browser's `localStorage` only. The log is newest first, up to 200 attempts. Nothing is sent anywhere else. Click a log row to reload an attempt, or use Clear log.

If port 4000 is taken, set `PORT` (PowerShell: `$env:PORT=4001; npm start`; bash: `PORT=4001 npm start`). The server only listens on `127.0.0.1`. The `example` folder is not published to npm.

## Documentation

| Document | For | Contents |
| --- | --- | --- |
| [`docs/ALGORITHM.md`](docs/ALGORITHM.md) | People | How the algorithm works, with a worked example, a glossary, and how to tune it. |
| [`docs/ALGORITHM.agents.md`](docs/ALGORITHM.agents.md) | AI agents and maintainers | The exact specification: data shapes, formulas, seed and salt table, invariants. |
| [`AGENTS.md`](AGENTS.md) | AI agents | Orientation, repository map, rules, and step-by-step recipes for common changes. |
| [`CHANGELOG.md`](CHANGELOG.md) | Everyone | What changed in each version. |

## Development

```
npm test      # run the test suite (plain Node assert, no framework)
npm start     # run the example site
```

Files:

| Path | Purpose |
| --- | --- |
| `index.js` | The whole algorithm and the public API. |
| `quirky-persona.config.json` | The algorithm settings: `lang`, `maxWords`, `minScore`, `patternSpread`, `sharedFactor`, `quirks`, `quirkFactor`. |
| `langs/` | Language packs (`en`, `de`, `es`) and `samples.json` for the example site. |
| `test.js` | The test suite. |
| `example/` | The example site (`server.js`, `index.html`, `settings-help.json`). Not published. |
| `docs/` | Algorithm documentation. |

Changes to the wording are changes to a language pack. If you change `index.js`, read [`docs/ALGORITHM.agents.md`](docs/ALGORITHM.agents.md) first: the output is deterministic, so a small change to how the seed is built can change every result.

## Releasing

1. Update the version with `npm version patch` (or `minor` / `major`) and add an entry to [`CHANGELOG.md`](CHANGELOG.md).
2. Run `npm test`.
3. Check what will be published: `npm pack --dry-run`.
4. Log in once with `npm login`, then publish with `npm publish`.

A change to the default lists or to how choices are derived from the seed changes the output for existing inputs, so treat it as at least a `minor` release.

## License

[MIT](LICENSE)
