# How quirky-persona works

This is the plain-language guide. If you are an AI agent or you need the exact formulas, seed rules and data shapes, read [`ALGORITHM.agents.md`](ALGORITHM.agents.md) instead.

## The idea in one minute

You give it a **title** and, if you want, a **seed**. The title is the one quirky-slugger just produced, or an edit of that title. It answers two questions:

1. **Who is speaking?** A persona, such as Historian, Adjudicator, or Douglas Adams.
2. **What should the writer do?** One instruction, such as `Recount the history this title names carefully and as a historian`.

It answers by scoring the title against **patterns**. Each pattern is a stance: a list of trigger words, a sentence shape, and the manners, verbs, objects, and voices that fit that stance. The winning pattern fills one template. The same title and the same seed always repeat.

```
title + seed
    |
    v
1. keep the first maxWords words
    |
    v
2. score each pattern ────────── triggers, TF-IDF, cosine
    |
    v
3. pick a pattern ────────────── close scores can share the win; otherwise a generic pattern
    |
    v
4. roll quirks ───────────────── on, and the factor hits? add the quirky rows that belong
    |
    v
5. pick a template ───────────── the pattern's own shape, or sometimes a shared one
    |
    v
6. pick one manner, verb, object, and voice
    |
    v
7. fill the gaps and capitalise the first letter
```

Everything is local and deterministic. The "random" choices are made by a hash of the input, so the same input always gives the same output. Pass a different `seed` to get a different choice inside the pattern that won.

## A worked example

Title:

> The History of Lemurs

Call `quirkyPersona` with no seed and quirks left off. The English pack matches the `history` pattern and produces:

| Field | Value |
| --- | --- |
| persona | Historian |
| instruction | Recount the history this title names carefully and as a historian |

`history` is a trigger on that pattern, so the historian's lists are used. `Lemurs` is the subject. It is not a trigger, and it is not copied into the instruction.

The same title with seed `demo` still matches `history`. The seed picks a different row, and this time the sentence shape is borrowed from the shared pool:

| Field | Value |
| --- | --- |
| persona | Historian |
| instruction | Recount the history this title names plainly and as a historian |
| pattern | history |
| sharedTemplate | true |
| manner | plainly |
| verb | recount |
| object | the history this title names |
| voice | as a historian |

With quirks on and seed `2`, the stance stays historical and the voice is allowed to be playful:

> Follow the years this title spans quietly and as a nature documentary

`A short account of lemurs through the years` also matches `history`, because `years` is a trigger. `Lemurs` on its own matches nothing. The generic `default` pattern answers, for example `Briefly combine the paragraphs in the manner of a careful editor`.

## How a title is scored

The match is the same idea as quirky-slugger's pattern choice.

1. Split the title into words and keep the first `maxWords`.
2. Break those words into tokens, strip accents, and apply a light stem so `compared` and `compare` meet, and `years` and `year` meet. The stem is only for matching. It is never written out.
3. Drop stop words (`the`, `of`, `a`, and the rest of the pack's list).
4. Each pattern is a document made of its triggers. A trigger that appears in many patterns counts for less (TF-IDF). Cosine measures how much of the title sits in that pattern.
5. Every pattern that scored at least `patternSpread` (default 0.2) of the best score is a candidate. The seed picks one, with chances in proportion to the score. A spread of 1 keeps only the top score.
6. If nothing scored above `minScore`, the seed picks a pattern with no triggers. That is the generic fallback, for a title someone has rewritten past recognition.
7. A title that contains one of the `numbers` strings selects a pattern marked `numbered`, and that match stands on its own. Those strings are what slugger writes for `{n}`: `2`, `3`, `5`, `two`, `three`, `five`, and the quirky `42`. `Two Things You Didn't Know About Lemurs` is a list, and so is the title with `3`. `Lemurs 101` is not, because `101` is not one of those strings. A year such as `1920` is not either.

Triggers are the framing words of the title (`history`, `compare`, `guide`, `recipe`), not the subject (`lemur`, `beans`). That is why a light edit still matches, and why two different subjects with the same kind of title share a stance.

Scores on a short title are coarse. What matters is which pattern is ahead, and which others are close enough to share the win.

## What a pattern owns

| Piece | On the pattern | If the pattern leaves it out |
| --- | --- | --- |
| Triggers | The words that select it. Empty means "generic fallback". | — |
| Numbered | When set, a title that contains one of the pack's `numbers` strings selects this pattern and no other. | Word scoring, as above. |
| Templates | The sentence shapes for this stance. | Required. A pattern with none is an error. |
| Manners, verbs, objects, voices | The words and the persona for this stance. | The shared list of the same name. |

`sharedFactor` (default 0.25) is the chance of using a shared sentence shape instead of the pattern's own. The pattern's words are still used. The shared shape is only a different arrangement of the same gaps.

## The four properties

| Property | Placeholder | Plain list | Added on a quirky roll |
| --- | --- | --- | --- |
| Manner | `{manner}` | `manners` | `quirkyManners`, when this list is the shared one |
| Verb | `{verb}` | `verbs` | `quirkyVerbs`, when this list is the shared one |
| Object | `{object}` | `objects` | `quirkyObjects`, when this list is the shared one |
| Voice | `{voice}` and `{persona}` | `voices` | the pattern's quirky voices, and always the shared quirky voices |

A voice has three fields:

- `name` is the persona (`Historian`, `Douglas Adams`, `Hip hop`).
- `phrase` is what the instruction says (`as a historian`, `in the style of Douglas Adams`, `as a hip hop song`). An actor, a role, and a style are the same kind of row. The name is who or what comes back. The phrase is the style.
- `id` is the stable label in `explain().voiceId`.

A quirky roll **adds** quirky rows. It does not throw the plain rows away. A pattern that brought its own verbs and objects keeps them on a quirky roll, so the instruction does not abandon the stance. Shared quirky voices are still added. That pool holds actors (Douglas Adams, a beat poet, Hunter S. Thompson, a theatre critic) and styles (a hip hop song, an instruction manual, the shipping forecast, a nature documentary, a cookbook).

## Quirks

`quirks` defaults to off. Turn it on with `options.quirks` or `config.quirks`.

When it is on, one roll uses `quirkFactor` (default 0.7). If the roll hits, the quirky rows described above join their pools. If the roll misses, only the plain lists are used.

`quirkFactor` 0 never adds the quirky lists. `quirkFactor` 1 always adds them. A value that is not a number counts as 0.

## Seeds

With no seed, the result is fixed by the counted words and the config. `options.seed` is appended, so a new seed is a new roll and the same seed is the same roll. `0` counts as a seed.

Each choice has its own salt, so lengthening the verb list does not move the manner. The salts are `|quirk`, `|pattern`, `|shared`, `|template`, `|manner`, `|verb`, `|object`, and `|voice`. The exact mix is in the [agent spec](ALGORITHM.agents.md).

## Languages

`options.lang` loads `langs/{lang}.json` after the algorithm defaults and before `options.config`. The English pack has a pattern for each family of title slugger emits, plus a generic `default`. The shipped `de` and `es` packs are shorter demos of the same shape, with triggers taken from those languages' slugger titles (`geschichte`, `historia`, `vergleich`, `comparación`). They are not a grammar engine. Proper language support is left as an exercise for other quirky personas.

## Glossary

| Term | Meaning |
| --- | --- |
| Persona | The voice's `name`. Returned beside the instruction. |
| Instruction | The filled, capitalised template. |
| Pattern | One stance: triggers, templates, and optional word lists. |
| Trigger | A word that, found in the title, argues for that pattern. |
| Fallback | The trigger-less pattern used when the title matches nothing. |
| Voice | One persona: `id`, `name`, and `phrase`. |
| Template | The sentence with the gaps still in it. |
| Shared template | A sentence shape any pattern may borrow. |
| Quirks mode | The setting. Off, quirky lists are ignored. |
| Quirky roll | The single chance, inside quirks mode, that adds quirky rows. |
| Seed | The value that makes one input produce many results. |
| Salt | A fixed suffix so each choice is independent. |
