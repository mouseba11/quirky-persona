# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [semantic versioning](https://semver.org/) with the convention described in [`AGENTS.md`](AGENTS.md): a change that alters the output for existing inputs is not a patch.

## [2.0.0] - 2026-11-17

The title now chooses the persona.

### Changed

- `quirkyPersona(title, options)` scores the title against pattern triggers, the same way quirky-slugger scores a passage: light stemming, stop words, TF-IDF, cosine, `patternSpread`, `minScore`, and a generic fallback when nothing scores. The triggers are the framing words of the titles slugger emits (`history`, `compare`, `guide`, `recipe`, and the rest), so a slugger title and a light edit of one land on the same stance.
- Each pattern can carry its own manners, verbs, objects, voices, and templates. A history title asks for a historian. A comparison title asks for an adjudicator. A title with none of those words uses the trigger-less `default` pattern.
- `templates` / `quirkyTemplates` are the shared sentence shapes. `sharedFactor` is the chance of using one. The matched pattern still supplies the words. Passing `templates` without `patterns` still pins one sentence, as in 1.0.0.
- On a quirky roll, a pattern keeps its own verbs and objects. Shared quirky voices, including Douglas Adams, are still added, so a history title can be told in that style without dropping the history.
- `explain()` adds `pattern`, `score`, `usedFallback`, `sharedTemplate`, `scores`, and `candidates`.

### Added

- `minScore` (default `0`), `patternSpread` (default `0.2`), `sharedFactor` (default `0.25`).
- A title that contains one of the `numbers` strings selects a pattern marked `numbered`. The strings are what slugger writes for `{n}`: `2`, `3`, `5`, `two`, `three`, `five`, and the quirky `42` (German `zwei`, `drei`, `fünf`; Spanish `dos`, `tres`, `cinco`). The list patterns are marked. `Lemurs 101` is not one of those strings, so it stays with essentials.
- Shared quirky actors now include a beat poet, Hunter S. Thompson, and a theatre critic, plus styles: a hip hop song, an instruction manual, the shipping forecast, a nature documentary, and a cookbook. The name is the persona. The phrase is what `{voice}` writes. German and Spanish packs have the same rows in their own wording.

## [1.0.0] - 2026-11-17

First public release.

### Added

- `quirkyPersona(text, options)` returns `{ persona, instruction }`.
- `explain()` returns the persona, the instruction, and the manner, verb, object, voice, and template that produced them.
- Instruction templates filled from configurable property lists: manners, verbs, objects, and voices.
- Quirks mode (`quirks`, `quirkFactor`) appends the quirky lists to those pools.
- Rudimentary language packs under `langs/` (`en`, `de`, `es`) via `options.lang` / `options.langsDir`.
- Deterministic variety through `options.seed`. The text steadies the seed. It does not score the lists.
- Example site (`npm start`) with Tester, Config, a language dropdown, and a browser-only `localStorage` log.
- Documentation for people (`docs/ALGORITHM.md`) and for agents (`docs/ALGORITHM.agents.md`, `AGENTS.md`).
