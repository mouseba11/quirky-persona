# AGENTS.md

Guidance for AI agents (and humans in a hurry) working on **quirky-persona**.

quirky-persona turns a title into a persona name and a writing instruction. The title is scored against pattern triggers the way quirky-slugger scores a passage, and the winning pattern fills a template from its lists (manners, verbs, objects, voices). It is local, deterministic and has **no runtime dependencies**.

Read order for a non-trivial change:

1. This file (rules and recipes).
2. [`docs/ALGORITHM.agents.md`](docs/ALGORITHM.agents.md) (exact specification, seed and salt table, invariants).
3. [`docs/ALGORITHM.md`](docs/ALGORITHM.md) if you need the plain-language explanation to write user-facing text.

## Commands

```
npm test            # node test.js. Plain assert, no framework. Prints "all tests passed".
npm start           # example site on http://localhost:4000 (PORT env var overrides)
npm run pack:check  # npm pack --dry-run: lists exactly what would be published
```

Run `npm test` after every change.

## Repository map

| Path | What it is | Change it when |
| --- | --- | --- |
| `index.js` | The whole algorithm and the public API (`quirkyPersona`, `explain`), including `options.lang`. | The **method** changes. |
| `quirky-persona.config.json` | Shared algorithm settings only (`maxWords`, `minScore`, `patternSpread`, `sharedFactor`, `quirks`, `quirkFactor`, default `lang`). | You change those defaults. |
| `langs/*.json` | Language packs (`en`, `de`, `es`): patterns, shared lists, voices, stop words, `locale`. | You want different **wording**, a new voice, a new pattern, or a new language. Most content changes belong here. |
| `langs/samples.json` | Example-site sample text per language. Not published. | The demo sample changes. |
| `package.json` | Name (`@mouseba11/quirky-persona`), scripts, and the `files` whitelist that decides what is published. | A file must be added to or kept out of the package, or you add a language pack. |
| `test.js` | Test suite. Uses pinned sentences plus surveys over the default English pack. | You change behaviour or defaults. |
| `example/server.js` | Zero-dependency HTTP server. Serves `/api/config`, `/api/langs`, `/api/lang/:code`, `/api/samples`, `POST /api/persona`. | The API or options change. |
| `example/index.html` | Demo page with Tester, Config, and a Language dropdown. | New `explain` fields or languages should be shown. |
| `example/settings-help.json` | The **?** text for each config setting. One array of paragraphs per key. | The explanation of a setting changes. |
| `docs/ALGORITHM.md` | Human explanation. | Behaviour that users should understand changes. |
| `docs/ALGORITHM.agents.md` | Exact specification. | **Any** change to `index.js` or the defaults it describes. |
| `README.md` | Package documentation (install, API, languages, config, templates). | The API, config keys or placeholders change. |
| `CHANGELOG.md` | Version history. | Every release, and any output-changing change. |

Published: `index.js`, the config file, `langs/en.json`, `langs/de.json`, `langs/es.json`, `docs/`, `AGENTS.md`, `CHANGELOG.md` (plus `README.md`, `LICENSE` and `package.json`, which npm always includes). Not published: `example/`, `test.js`, `langs/samples.json`. Run `npm run pack:check` to confirm.

## Rules

1. **No runtime dependencies.** Node built-ins only. CommonJS, `'use strict'`, 2-space indent, single quotes, semicolons.
2. **Stay deterministic.** No `Math.random`, `Date`, network or global state in `index.js`. Variety comes from `options.seed`. The example page may call `Math.random()` to mint a seed. The library must not.
3. **Output depends on list order.** `pick(list, salt)` uses `hash(seed + salt) % list.length`. Adding, removing or reordering any template, manner, verb, object or voice changes the result for existing inputs. That is acceptable, but record it in `CHANGELOG.md` and prefer **appending** to lists. Never change a salt string or the seed format casually (see the salt table in the spec).
4. **Prefer config over code.** A new sentence shape is a new template. A new persona is a new voice. A new adverb is a new list entry. Only touch `index.js` when the method itself must change.
5. **Keep the persona and the instruction on the same voice.** `persona` is `voice.name`. `{voice}` is `voice.phrase`. Never choose them separately.
6. **Grammar is authored, not computed.** The code does not inflect words. It capitalises the first character of the finished instruction and collapses whitespace. Fit is guaranteed by the way the template and the list entries are written. Language support is rudimentary: the shipped packs demonstrate the hooks. Proper localisation is left as an exercise for other quirky personas.
7. **The title scores patterns. It does not understand the article.** Matching is TF-IDF and cosine over pattern `triggers`, the same fold and formula as quirky-slugger. Triggers are framing words that appear in the title (`history`, `compare`, `guide`), not the subject. A pattern with `numbered: true` is the exception: a token from the pack's `numbers` list selects it on its own. That list is the strings slugger writes for `{n}` (`2`, `3`, `5`, `two`, `three`, `five`, and the quirky `42`). A title with no trigger above `minScore` and none of those strings uses a pattern whose `triggers` array is empty. Do not add a second similarity engine.
8. **Do not add logging or debug output** to `index.js`. Use `explain()` to inspect a result.
9. **Keep docs and code in step.** If you change behaviour, update `docs/ALGORITHM.agents.md` and the matching `README.md` section in the same change.
10. **Do not modify unrelated code.** Keep changes focused on the request.

## Inspect before you change

`explain()` shows everything that led to a result. This is the first thing to run when an instruction looks wrong.

```js
const q = require('./index.js');
const e = q.explain('The History of Lemurs', { seed: 'x', quirks: true });
e.persona; e.instruction; e.pattern; e.score; e.usedFallback;
e.template; e.manner; e.verb; e.object; e.voice; e.voiceId;
e.quirksMode; e.quirky; e.quirkFactor; e.scores;
```

To reproduce a result, keep the exact title (it is part of the seed and the match), config and seed.

To render one template with one of each property:

```js
console.log(q('', {
  config: {
    templates: ['{manner} {verb} {object} {voice}'],
    manners: ['coherently'],
    verbs: ['discombobulate'],
    objects: ['the themes'],
    voices: [{ id: 'douglas-adams', name: 'Douglas Adams', phrase: 'in the style of Douglas Adams' }]
  }
}));
```

## Recipes

### Add a language

1. Copy `langs/en.json` to `langs/xx.json` (two-letter code).
2. Fill `locale`: `id` and `label`.
3. Rewrite the shared lists, the patterns (triggers and, where the stance should change, the voices and verbs), and the templates so a filled sentence reads correctly in that language. Put the word order in the templates. The code will not rearrange them. Triggers should be words that actually appear in that language's slugger titles.
4. Add a sample under `langs/samples.json`.
5. Add `langs/xx.json` to the `files` list in `package.json`. It is an explicit whitelist (so `samples.json` stays out), and a pack that is not listed is not published.
6. The example site picks up new packs from the `langs/` folder automatically (`GET /api/langs`).
7. Add a smoke test (load pack, non-empty persona and instruction, `explain().lang`).
8. Update README / CHANGELOG. Keep the note that language support is rudimentary and further work is left to other quirky personas.

### Add a voice

Append an object to `voices` or `quirkyVoices` in `langs/en.json` (and the other packs, if the persona should exist in every language):

```json
{ "id": "douglas-adams", "name": "Douglas Adams", "phrase": "in the style of Douglas Adams" }
```

- `phrase` is what `{voice}` writes. Read it in both default templates: after a space, and after `and `. A style is the same shape as an actor: `as a hip hop song` is a phrase, and `Hip hop` is the name the call returns.
- `name` is the persona. Keep it short enough to stand on its own.
- Prefer **appending**. Inserting changes which existing seed lands on which row.
- A playful persona belongs on `quirkyVoices`, so it stays out of the pool while quirks are off.
- Update the English counts in `docs/ALGORITHM.agents.md` section 1.2 if the default pack changed, and run `npm test`. The pinned quick-start sentences fail when default order changes. Update them, the README, and `docs/ALGORITHM.md` together.

### Add a word to a property list

Append to `manners`, `verbs`, `objects`, or the matching `quirky*` list.

- A manner reads correctly at the start of a sentence and after the object (`succinctly`, `coherently`).
- A verb is the form the template needs. English templates want a bare verb (`combine`, not `combines`).
- An object is a noun phrase that already includes its article (`the text`, `the themes`).
- Check both English templates with the new word and a plain voice and a quirky voice.

### Add a template

Append it to `templates` or `quirkyTemplates`.

Checklist:

- Placeholders are only `{manner}`, `{verb}`, `{object}`, `{voice}`, `{persona}`. `test.js` enforces this for the default packs.
- Write glue words in the template (`and`, commas, colons). The code does not insert them.
- Read it with a one-word manner and with a long voice phrase (`in the style of Douglas Adams`).
- A quirky template is added to the plain pool. It does not replace it. If the shape must be the only one, put it on `templates` and clear `quirkyTemplates`.
- `templates` must keep at least one non-empty string. Quirks-off calls never see `quirkyTemplates`.

### Add a new placeholder

A placeholder name appears in **four** places. Update all of them:

1. The placeholder regex in `fill` inside `index.js`.
2. The `values` object passed to `fill`, and `explain()` if the chosen value should be visible.
3. The allowed-placeholder test in `test.js` (the loop over every default template).
4. The placeholder table in `README.md`, `docs/ALGORITHM.md` and `docs/ALGORITHM.agents.md`.

Give any new random choice its own salt, and add that salt to the salt table. Reuse an existing salt only when the new placeholder must be the same roll as a current one (`{persona}` reuses the voice roll on purpose).

### Change a default setting

Edit the key in `quirky-persona.config.json` (or in `langs/*.json` for pack content), then update the default in `README.md` (configuration table) and `docs/ALGORITHM.agents.md` (section 1.2). Update any test that pins default output.

### Change the algorithm

1. Read `docs/ALGORITHM.agents.md` sections 3 to 6. Note which invariants (section 6) you could affect.
2. Make the change in `index.js`.
3. Update the spec first-hand: formulas, salts, edge cases. The spec must describe the code, not the other way around.
4. Update the explanatory text in `docs/ALGORITHM.md` and `README.md`.
5. If `explain()` gains or loses a field, update the `README.md` field table, `example/index.html` if it displays it, and the spec's `ExplainResult`.
6. Add tests. Decide whether the change is a breaking change in output (see "Versioning").

## Testing

`test.js` is a single script of `assert` calls. A failing assertion throws and shows the line.

- **Pinned tests.** A one-entry config forces an exact sentence. The Douglas Adams sentence and the professional sentence are pinned this way. They must keep matching the README introduction.
- **Default-pack pins.** The lemur quick-start sentences are real output of `langs/en.json`. If you edit that pack, re-run those calls and update the test, the README, and the worked example together.
- **Surveys.** Quirk factor 0 over 200 seeds never returns a quirky-only English voice. Quirk factor 1 over 300 seeds hits both pools and at least 150 distinct instructions.

New tests go in the matching section of `test.js`. When a test should be independent of default data, give it its own config. A key you leave out keeps the pack's value. Pass `voices: []` when you mean no persona.

## Versioning

The project follows semantic versioning with one convention: **a change that alters the output for existing inputs is not a patch.** That includes new or reordered templates and words (because of the position-based `pick`), changed defaults, and any change to the seed format or salts.

| Change | Release |
| --- | --- |
| Bug fix with no output change; docs; tests | patch |
| New voice, template, word or option; default data changes | minor |
| Removed or renamed API, option or config key; changed seed format or salts; changed default behaviour that callers rely on | major |

Add an entry to `CHANGELOG.md` for each release. `npm test` first, then `npm run pack:check`. Publish with `npm run publish:npm` (npmjs.org) and `npm run publish:github` (GitHub Packages). The package name is `@mouseba11/quirky-persona`.

## Common pitfalls

- Reordering a default list changes the pinned quick-start sentences. Update the pins in the same change.
- A custom config replaces a list only when that key is present. Omitting `voices` keeps the pack's voices, so `persona` is still filled.
- `quirkyTemplates` are added to the plain templates, not used instead of them.
- Quirk factor is one roll for every list. It is not a separate roll per property.
- The text is part of the seed and of the match. One character of difference inside `maxWords` can change the choice. A match on `history` means the title contained a history trigger. It does not mean the package read the article.
- A `quirkFactor` that is missing or not a number counts as 0, so quirky lists are never added.
- Do not put a persona's name in `phrase` unless the sentence should say the name. Use `{persona}` when the name itself belongs in the instruction.
