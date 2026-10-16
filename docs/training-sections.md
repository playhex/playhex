# Training sections

A training section is a list of puzzles that players replay over time until they master them.
"Defend your template" (`/training/defend-your-template`, type `defend-your-template`) is the first one.

All sections share the same code, only their puzzles, url and texts change:

- `src/shared/app/training/sections/`: one file per section, with its puzzles.
- `src/shared/app/training/trainingLevels.ts`: list of sections.
- `src/shared/app/training/trainingRules.ts`: rules as pure functions, tested in `src/shared/app/test/training/`.
- `src/server/training/`: `TrainingController` (`/api/trainings/:trainingType/...`) and `TrainingRepository`.
- `src/client/vue/training/`: progression, session and practice pages, taking `trainingType` as prop.

Results are stored in two tables, told apart by the `trainingType` column:

- `training_attempt`: every attempt, with its date and one boolean per line (true = solved first try, no wrong move, no hint).
- `training_progress`: one row per player and puzzle, derived from attempts (Leitner box, lapses, next review date).

## Edit a section content

Puzzles are normal puzzles, created in the puzzle editor.
For "Defend your template": computer plays first, and each root answer is an intrusion to defend.

Then add the puzzle publicId to the section file, e.g. `sections/defendYourTemplateTraining.ts`.
Each inner array is a level, puzzles are shown and proposed in array order.

```ts
export const defendYourTemplateTraining: string[][] = [
    ['publicId-a', 'publicId-b'], // level 1
    ['publicId-c'], // level 2
];
```

Puzzles not found in database are skipped, so prod publicIds do nothing in dev.

Removing a puzzle from the list hides it but keeps player history. Deleting the puzzle deletes its attempts and progress.

## Add a section

No migration and no new server code needed.

1. Create `sections/myTypeTraining.ts` with its puzzles, and add it in `trainingLevels` under the `myType` key (max 32 chars).
2. Add its routes in `src/client/vue/router.ts`: `trainingRoutes('myType', '/training/my-url')`. Route names will be `myType-training`, `myType-training-session` and `myType-training-practice`.
3. Add `training.sections.myType.title` and `intro` in `en.json` and `fr.json`.
4. Add a link in `AppHeader.vue` if needed.

## Tune the rules

Rules are the same for all sections. Numbers are constants in `trainingRules.ts`: review intervals, box needed to be acquired, unlock ratio, session size, how many new puzzles per session.

Progress is stored as computed at attempt time. After changing box or interval rules, existing `training_progress` rows keep old values until the player plays the puzzle again. They can be rebuilt from `training_attempt` if needed.

Puzzles are played with `<AppPuzzle training>`: it hides links leaving the puzzle, adds a "Give up" button, and emits `solved` or `gaveUp` once with the report to post.
