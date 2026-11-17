# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [semantic versioning](https://semver.org/) with the convention described in [`AGENTS.md`](AGENTS.md): a change that alters the output for existing inputs is not a patch.

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
