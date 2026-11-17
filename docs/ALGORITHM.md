# How quirky-persona works

This is the plain-language guide. If you are an AI agent or you need the exact formulas, seed rules and data shapes, read [`ALGORITHM.agents.md`](ALGORITHM.agents.md) instead.

## The idea in one minute

You give it some **text** and, if you want, a **seed**. It answers two questions:

1. **Who is speaking?** A persona, such as Professional, Reporter, or Douglas Adams.
2. **What should the writer do?** One instruction, such as `Combine the text succinctly and professionally`.

It answers both by filling a **template** from four lists: manners, verbs, objects, and voices. The text does not score those lists. It only keeps the choice steady, so the same passage and the same seed always repeat.

```
text + seed
    |
    v
1. keep the first maxWords words
    |
    v
2. roll quirks ──────────────── on, and the factor hits? add the quirky lists
    |
    v
3. pick a template ──────────── a sentence shape with gaps
    |
    v
4. pick one manner, verb, object, and voice
    |
    v
5. fill the gaps and capitalise the first letter
```

Everything is local and deterministic. The "random" choices are made by a hash of the input, so the same input always gives the same output. Pass a different `seed` to get a different choice.

## A worked example

Text:

> Lemurs are primates from Madagascar. They move through the trees by grasping and leaping.

Call `explain` with seed `demo` and quirks left off. The English pack then produces:

| Field | Value |
| --- | --- |
| persona | Editor |
| instruction | Quietly summarise the points in the manner of a careful editor |
| template | `{manner} {verb} {object} {voice}` |
| manner | quietly |
| verb | summarise |
| object | the points |
| voice | in the manner of a careful editor |
| quirky | false |

The first letter of `quietly` becomes `Quietly` because it is the start of the sentence. `Editor` is the voice's name. The phrase is what the sentence says. The lemurs and the geometry never appear in the instruction. They only made this the choice for this passage and this seed.

The same text with no seed, quirks off, is a different row of the same lists: persona `Reporter`, instruction `Present the paragraphs succinctly and in a neutral tone`.

## The four properties

| Property | Placeholder | Plain list | Added on a quirky roll |
| --- | --- | --- | --- |
| Manner | `{manner}` | `manners` | `quirkyManners` |
| Verb | `{verb}` | `verbs` | `quirkyVerbs` |
| Object | `{object}` | `objects` | `quirkyObjects` |
| Voice | `{voice}` and `{persona}` | `voices` | `quirkyVoices` |

A voice has three fields:

- `name` is the persona (`Douglas Adams`, `Professional`).
- `phrase` is what the instruction says (`in the style of Douglas Adams`, `professionally`).
- `id` is the stable label in `explain().voiceId`.

A quirky roll **adds** the quirky list to the plain one. It does not throw the plain list away. With quirks off, the quirky lists are not consulted.

## Templates

A template is the sentence with the gaps still in it.

| Template | One way it can read |
| --- | --- |
| `{manner} {verb} {object} {voice}` | Coherently discombobulate the themes in the style of Douglas Adams |
| `{verb} {object} {manner} and {voice}` | Combine the text succinctly and professionally |

`and` is written in the template. So is any comma. The code does not decide grammar. If a list entry is empty, or the list itself is empty, that gap closes and the extra space is removed.

`{persona}` writes the name instead of the phrase: `Write as Editor: quietly gather the sources`.

On a quirky roll, `quirkyTemplates` are added to `templates`. The plain shapes stay in the pool.

## What the text is for

Only the first `maxWords` words (default 256) enter the seed, joined by single spaces. Words after that cannot change the result. A `maxWords` of 0 drops the text entirely, and the seed alone decides.

Changing one character of the counted text can change the hash, and so the row that is picked. That is variety across passages, not an understanding of the passage. If you want the instruction to follow the subject of the text, write that into the lists and templates yourself. This package does not score themes.

## Quirks

`quirks` defaults to off. Turn it on with `options.quirks` or `config.quirks`.

When it is on, one roll uses `quirkFactor` (default 0.7). If the roll hits, every quirky list that has entries is concatenated onto its plain list, and then one row is picked. If the roll misses, only the plain lists are used.

`quirkFactor` 0 never adds the quirky lists. `quirkFactor` 1 always adds them. A value that is not a number counts as 0.

## Seeds

With no seed, the result is fixed by the counted words and the config. `options.seed` is appended, so a new seed is a new roll and the same seed is the same roll. `0` counts as a seed.

Each choice has its own salt, so lengthening the verb list does not move the manner. The salts are `|quirk`, `|template`, `|manner`, `|verb`, `|object`, and `|voice`. The exact mix is in the [agent spec](ALGORITHM.agents.md).

## Languages

`options.lang` loads `langs/{lang}.json` after the algorithm defaults and before `options.config`. The shipped `de` and `es` packs are short demos. They use the same placeholders and their own word order. They are not a grammar engine. Proper language support is left as an exercise for other quirky personas.

## Glossary

| Term | Meaning |
| --- | --- |
| Persona | The voice's `name`. Returned beside the instruction. |
| Instruction | The filled, capitalised template. |
| Voice | One persona: `id`, `name`, and `phrase`. |
| Property | Manner, verb, object, or voice. Each is a list the seed picks from. |
| Template | The sentence shape. |
| Quirky roll | The single chance, when quirks are on, that the quirky lists join the plain ones. |
| Seed | The extra value that varies the hash without changing the text. |

## Tuning

| You want | Do this |
| --- | --- |
| A new kind of sentence | Add a template. |
| A new persona | Append a voice. Put the playful ones on `quirkyVoices`. |
| The same sentence every time | One entry on each list you use, and one template. |
| More variety | Lengthen the lists, or pass a changing seed. |
| Less surprise | Set `quirkFactor` to 0. |
| The passage to stop mattering | Set `maxWords` to 0. |
