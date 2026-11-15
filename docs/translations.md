# Translations

PlayHex is translated with [i18next](https://www.i18next.com/).
Locale files are in `src/shared/app/i18n/locales/`:

- `en.json` is the source language: new strings are added there first.
- all other locales are also translated on [Weblate](https://hosted.weblate.org/engage/playhex/) by contributors,
  and can be completed with the command below when many strings are missing.

## Translate missing strings

```sh
pnpm -s hex missing-translations <locale>
```

It prints only the keys missing in this locale compared to `en.json`, as nested JSON,
with the plural rules of this locale (which plural suffixes to produce, and which numbers use each one).
Without input, it does not write anything.

Translate this JSON, then paste it in terminal, or pipe it back to the same command to write it in the locale file:

```sh
pnpm -s hex missing-translations <locale> < translated.json
```

The translations are deep-merged into the locale file, with the existing 4-space formatting.
Run the first command again: it should print `No missing translations.`

Keys ending with `_male` or `_female` are ignored by this command, see [Gendered strings](#gendered-strings).

### Rules

- Only translate values. Keys and JSON structure stay the same.
- Keep placeholders and HTML tags as they are:
  - `{{count}}`, `{{ player }}` are i18next interpolations,
  - `{player}` (single braces) are replaced by Vue components.
- Plurals: only add the plural suffixes listed for this locale.
  For example Russian uses `_one`, `_few` and `_many`, so an `_other` key would be wrong.
  When English has no equivalent category, the English text shown is the `_other` form,
  translate it according to the numbers listed.
  When `_one` is used for other numbers than 1 (Russian 21, 31…), write `{{count}}` instead of `1`.
- Keep the tone of the locale file: formal or informal "you",
  and existing names such as "King of the Hill", "puzzle", "study".
  Read the existing strings of the same section before translating.

## Gendered strings

Players can set their pronouns: he/him, she/her, they/them, or nothing.
Some strings are translated with an i18next context depending on these pronouns:

```ts
t('ladder.king', { context: playerGender(player) }) // 'male' | 'female' | 'other'
```

(`playerGender()` is in `src/shared/app/playerPronouns.ts`.)

i18next then looks for `key_male` or `key_female`, and falls back to `key`. So:

- `key` is used for they/them, for players without pronouns, and for any gender without its own variant,
- `key_male` and `key_female` are only needed when the wording differs.

`fr.json` is a good example of a fully gendered language:
inclusive base key with `(e)`, and `_male` / `_female` variants.

### Which strings can be gendered

A `_male` or `_female` variant is only used if the string is translated with a `context` in the code.

But any string about a player can need gender in some language, even when English does not.
For example "{{ player }} canceled the game" needs no gender in English, but does in Russian (`отменил/отменила`).
In this case, do not stay limited to strings already gendered:
update the code to pass the context where the string is translated,
with the gender of the player the sentence is about:

```ts
// before
t('game_canceled_by', { player: player.pseudo })

// after
t('game_canceled_by', { player: player.pseudo, context: playerGender(player) })
```

Check whose gender is (or must be) passed as context, because this is what the sentence must agree with:

- the logged-in player, when the text talks to "you":
  `confirm_overlay.are_you_sure?`, `tournament_subscribe`, `ladder.intro`, `ladder.nobody_to_challenge`, `ladder.notification.*`, `i_play.first`,
- another player:
  `undo.*`, `ladder.event.*` (`ladder.event.challenge_defended` uses the opponent's gender),
  `ladder.refusal.*` (the challenged player), `ladder.title` and `ladder.king` (the current leader),
  `tournament_history.player_*`, `social_preview.*`.

Never use the context to gender a word about someone else.
For example in `ladder.notification.challenge`, the context is the viewer, not `{{player}}`.

### Rules

- Only add a `_male` or `_female` variant when the language needs a different wording.
  Never add a variant identical to the base key.
- Don't add a key `_other` for gender, use default key.
- Languages need gender in different places than English:
  - English "his/her" is often a possessive without gender: `su` in Spanish, `sitt` in Swedish. No variant needed.
  - Past participles, adjectives and past tense verbs often agree with gender, even when English does not:
    `interesado/interesada` (es), `sicuro/sicura` (it), `отменил/отменила` (ru), `zostałeś/zostałaś` (pl), `byl/byla` (cs), Arabic verbs and adjectives.
  - Nouns: King/Queen exists in almost all languages (`König/Königin`, `王/女王`, `Kral/Kraliçe`, `Raja/Ratu`…),
    as well as winner, climber, player, opponent, challenger.
  - Languages without grammatical gender (ja, ko, zh-Hans, tr, fi, hu, id, ta…) usually only need the queen titles.
- When the language genders the sentence, the base key should be inclusive or neutral, in a way natural for this language,
  and the masculine wording goes in `_male`.
  Examples: es `seguro/a`, it `sicuro/a`, pt `certo(a)`, pl `zostałeś(-aś)`, ru `отменил(а)`, cs `byl(a)`, ar `متأكد/ة`, de `Aufsteiger*in`.
  A neutral rephrasing is better when it exists: de `Diese Person` instead of `Dieser Spieler`,
  ru `Последняя победа:` instead of `Последний победитель:`.
- Titles like King keep the usual masculine base key, with only a `_female` variant, as in `en.json`.
- i18next supports plural and gender together (`key_female_one`), but avoid it unless really needed.

## Checks

When done, for each locale:

- the file is valid JSON, and `pnpm -s hex missing-translations <locale> < /dev/null` prints `No missing translations.`,
- no `_male`/`_female` value is identical to its base key,
- every `_male`/`_female` key has a base key, and is translated with a `context` in the code (add it if missing),
- placeholders and HTML tags are the same as in `en.json`.
