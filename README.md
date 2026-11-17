# quirky-persona

Turn a little **text** into a **persona** and a **writing instruction**.

```js
const quirkyPersona = require('@mouseba11/quirky-persona');

const text = 'Lemurs are primates from Madagascar. They move through the trees by grasping and leaping.';

quirkyPersona(text);
// -> { persona: 'Reporter',
//      instruction: 'Present the paragraphs succinctly and in a neutral tone' }

quirkyPersona(text, { quirks: true, seed: 2 });
// -> { persona: 'Footnote',
//      instruction: 'Connect the text quietly and as a footnote that got ideas' }
```

The same pieces can be pinned, which is how the two shapes below are guaranteed:

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
- **A persona and an instruction.** The persona is a name, such as `Douglas Adams` or `Professional`. The instruction is one sentence that tells a writer what to do.
- **Built from properties.** Each sentence is a template filled from lists you can edit: manners, verbs, objects, and voices.
- **Quirky when you want it.** An optional quirks mode adds the playful lists: `discombobulate`, `the themes`, `in the style of Douglas Adams`.
- **The text does not pick the words.** It only steadies the choice, so the same passage keeps the same instruction until you change the seed.
- **Easy to configure.** The lists and the templates live in a JSON language pack you can extend or replace.
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

const text = 'Lemurs are primates from Madagascar. They move through the trees by grasping and leaping.';

quirkyPersona(text);
// -> { persona: 'Reporter',
//      instruction: 'Present the paragraphs succinctly and in a neutral tone' }

quirkyPersona(text, { quirks: true, seed: 2 });
// -> { persona: 'Footnote',
//      instruction: 'Connect the text quietly and as a footnote that got ideas' }

quirkyPersona.explain(text, { seed: 'demo' });
// persona: Editor
// instruction: Quietly summarise the points in the manner of a careful editor
```

The default-pack lines above are real output. Any change to the configuration or the seed can change which instruction you get. The two pinned calls in the introduction do not depend on the default lists. See [Getting more (or less) variety](#getting-more-or-less-variety).

## API

```js
const quirkyPersona = require('@mouseba11/quirky-persona');

// explain is also a property, so it can be destructured:
const { explain } = require('@mouseba11/quirky-persona');
```

### `quirkyPersona(text, options)`

Returns `{ persona, instruction }`.

| Argument | Description |
| --- | --- |
| `text` | Optional free text. Only the first `maxWords` (default 256) words affect the result, and only as part of the seed. The words are not copied into the instruction. |
| `options.lang` | Optional language code (`en`, `de`, `es`, …). Loads `langs/{lang}.json`. Defaults to `en`. |
| `options.langsDir` | Optional path to a folder of `{lang}.json` packs, if you keep your own editable copies outside the package. |
| `options.config` | Optional config object, or a path to a JSON config file. Merged last, after the language pack. See [Configuration](#configuration). |
| `options.quirks` | Optional `true` or `false`. Turns quirks mode on or off for this call, overriding `config.quirks`. |
| `options.seed` | Optional string or number. Without it the result depends only on the text and the config. With it, the same input and seed always give the same result, and a different seed can give a different instruction. Pass `Math.random()` for a new instruction every call. |

`persona` is the chosen voice's name. `instruction` is the filled template, with the first letter capitalised.

### `explain(text, options)`

Takes the same arguments as `quirkyPersona` and returns everything that went into the result.

```js
quirkyPersona.explain(text, { seed: 'demo' });
```

| Field | Meaning |
| --- | --- |
| `persona` / `instruction` | The persona and the instruction, identical to what `quirkyPersona` returns. |
| `lang` | The language code that was used. |
| `template` | The template that was filled in. |
| `quirksMode` / `quirky` / `quirkFactor` | Whether quirks mode was on, whether the quirky lists were added, and the factor used. |
| `manner` / `verb` / `object` | The values used for `{manner}`, `{verb}` and `{object}`. |
| `voice` / `voiceId` | The phrase used for `{voice}`, and the voice's `id`. |
| `seed` | The seed as a string, or `null`. |
| `wordsUsed` / `wordsIgnored` | Words that entered the seed, and words dropped for exceeding `maxWords`. |

## Instructions

The instruction is one sentence. The persona is the name of the voice that sentence is written in.

- A template is ordinary text with placeholders. `{manner} {verb} {object} {voice}` can become `Coherently discombobulate the themes in the style of Douglas Adams`.
- `{verb} {object} {manner} and {voice}` can become `Combine the text succinctly and professionally`. The word `and` belongs to the template.
- The first character of the finished sentence is capitalised. The rest is left as the lists wrote it, so `Douglas Adams` keeps its capitals and `professionally` stays lower case.
- Extra spaces from an empty placeholder are collapsed.
- `persona` is the voice's `name`. The instruction uses the voice's `phrase`, unless the template asks for `{persona}` itself.

The text does not select a manner, a verb, an object, or a voice. Two different passages can still get different instructions, because the passage is part of the seed. Pass the same seed, or no seed, and the same passage always repeats.

## Languages

Language packs live in [`langs/`](langs/): `en.json`, `de.json`, `es.json`. Each pack owns the property lists, the voices, the templates, and a `locale` block with `id` and `label`.

```js
quirkyPersona(germanText, { lang: 'de' });
quirkyPersona(spanishText, { lang: 'es', quirks: true, seed: 1 });
```

Merge order is **algorithm defaults → language pack → `options.config`**. Point `options.langsDir` at your own folder if you keep editable copies outside `node_modules`.

**Language support is rudimentary.** The hooks (`options.lang`, `langs/*.json`) are there so packs can be switched and expanded. The shipped `de` and `es` files are short demos, not production localisation. There is no grammar engine. **Proper language support is left as an exercise for other quirky personas.** Fork a pack, rewrite the lists and the templates for your locale, and improve the rules if you need to.

See [`docs/ALGORITHM.md`](docs/ALGORITHM.md) and the "Add a language" recipe in [`AGENTS.md`](AGENTS.md).

## Configuration

Algorithm defaults (`maxWords`, `quirkFactor`, `lang`, …) are in [`quirky-persona.config.json`](quirky-persona.config.json). Language content is in [`langs/`](langs/). Pass `options.config` to override any key after the pack is loaded. Keys you leave out keep their merged defaults.

```js
quirkyPersona(text, { config: { maxWords: 40, quirkFactor: 0 } });
quirkyPersona(text, { config: './my-persona.json' });
```

| Key | Default | Meaning |
| --- | --- | --- |
| `maxWords` | `256` | Words of text that enter the seed. Further words are ignored. |
| `quirks` | `false` | Turns quirks mode on by default. |
| `quirkFactor` | `0.7` | In quirks mode, the chance (0 to 1) that the quirky lists are added to the plain pools. |
| `manners` / `quirkyManners` | see pack | Adverbs for `{manner}`. |
| `verbs` / `quirkyVerbs` | see pack | Verbs for `{verb}`. |
| `objects` / `quirkyObjects` | see pack | Noun phrases for `{object}`. |
| `voices` / `quirkyVoices` | see pack | Personas. Each entry is `{ id, name, phrase }`, or a string used as both the name and the phrase. |
| `templates` / `quirkyTemplates` | see pack | Instruction shapes. `templates` must contain at least one. |

`quirkFactor` is clamped to the range 0 to 1, and a value that is not a number counts as 0. `maxWords` that is not a number, or is negative, counts as 0, so the text drops out of the seed.

Supplying a key replaces that key. It does not clear the others. An empty `voices` array means the call has no persona.

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
| `{manner}` | One entry from `manners`, plus `quirkyManners` when the quirk roll hits. |
| `{verb}` | One entry from `verbs`, plus `quirkyVerbs` on a quirky roll. |
| `{object}` | One entry from `objects`, plus `quirkyObjects` on a quirky roll. |
| `{voice}` | The chosen voice's `phrase`. |
| `{persona}` | The chosen voice's `name`. |

A voice is chosen on every call, so `persona` is set even when the template never writes the name. Manner, verb, and object are also chosen on every call. A placeholder the template does not use simply does not appear in the instruction. `explain()` still reports the roll.

Rules:

- Write the glue yourself: `and`, commas, colons. The code does not inflect words or insert articles.
- The plain `templates` list has to contain at least one non-empty string. Quirky templates are optional.
- On a quirky roll the quirky templates are **added** to the plain ones. The plain shapes remain available.
- An unknown placeholder, such as `{nope}`, is left as written.

## Quirks mode

Off by default, so instructions stay on the plain lists. Switch it on per call or in the config:

```js
quirkyPersona(text, { quirks: true });
```

In quirks mode each call adds the quirky lists (`quirkyManners`, `quirkyVerbs`, `quirkyObjects`, `quirkyVoices`, `quirkyTemplates`) with probability `quirkFactor`, and uses the plain lists alone otherwise. The plain rows are never removed. That is why a quirky roll can still say `professionally`, and a plain roll never says `discombobulate` unless you put that word on the plain list.

## Getting more (or less) variety

| To get | Change |
| --- | --- |
| A different instruction on every call | Pass a changing `seed`, such as `Math.random()`. |
| The same instruction for the same input | Pass no seed, or the same one. |
| A different instruction for a different passage | Keep the seed and change the text. Only the first `maxWords` count. |
| An instruction that ignores the text | Set `maxWords` to `0`. |
| No quirky words | Leave `quirks` off, or set `quirkFactor` to `0`. |
| Quirky words always in the pool | Set `quirks` on and `quirkFactor` to `1`. |
| One exact sentence | Give each list a single entry and a single template. |
| Stable results for tests | Set `quirks: false` or `quirkFactor: 0`, and pass a fixed seed. |

## Example site

A small Node server and page with two views, **Tester** and **Config**. The tester is where you enter text, press **Generate**, and see the **OUTPUT** (`persona:` and `instruction:`) together with the rolls behind it: manner, verb, object, voice, template, and the raw `explain` output.

Config is where you set that sample and edit the configuration (settings, word lists, voices, and templates). Each setting has a **?** button. The explanations live in `example/settings-help.json`, separate from the page, so the wording is easy to change. Switching to Tester applies the sample and the config. Config also shows the JSON to copy into `options.config`. Nothing is written to a file. The page has no dependencies.

```
npm start
```

Then open http://localhost:4000. The tester starts from the sample for the current language. The text is only there to steady the seed: replace it with the passage you want to try. The tester has a quirks checkbox, a quirk factor slider, and a seed option (a new random seed on each press by default). Opening Tester sets those from the config and the sample.

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
| `quirky-persona.config.json` | The algorithm settings: `lang`, `maxWords`, `quirks`, `quirkFactor`. |
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
