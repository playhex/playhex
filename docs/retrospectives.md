# Yearly retrospectives

Registered players get a retrospective of their year on PlayHex, at `/@<slug>/retro/<year>/<shareCode>`. The share code is 5 random letters and digits, stored in the retrospective and kept when it is recomputed: a retrospective is private, only visible by people its player shared the link with. A player's own retrospectives (with their codes) are listed only to them, at `/@<slug>/retro` and on their profile.

A retrospective page is displayed only when it has been generated and published by the command below, and with the right share code. Otherwise the page and the api return 404. Nothing is computed on the fly.

A retrospective is listed to its player (profile, `/@<slug>/retro`, lobby card) only once its year is over (from January 1st of next year). A retrospective of the current year, generated to check it, is reachable by its link only.

## Generate

Run in early January, for the year that just ended.

First, analyze games that have no analyze yet (the server must be running, with AI workers connected): accuracy and blunder are computed only on analyzed games, so more analyzed games give more players an accuracy, and more choice for the blunder of the year.

``` bash
pnpm hex game:analyze
pnpm hex retro:generate 2026
```

The command works in two passes:

1. It computes stats of every eligible player (`isRetrospectiveEligible()`: registered human player, not an anonymous account of a deleted player, who ended at least one game this year, and arrived on PlayHex before this year: no retrospective for an incomplete year). Players not eligible get a hidden retrospective, never displayed. With `--force`, already generated retrospectives no longer eligible are recomputed as hidden. It also computes a hidden snapshot of the previous year when missing (e.g. a player registered this year), so that progress can be shown.
2. It computes the "top X%" values, the progress compared to the previous year and the challenges, then publishes.

Run years in order (e.g. `2025` then `2026`), so that progress compares against a complete previous year.

Options:

- `--force`: recompute retrospectives that were already generated.
- `--player <slug>`: recompute only one player. Top percents are still computed against all players of the year. If player is not eligible, the retrospective is computed hidden.

## Rules

All rules (blunder threshold, game of the year, best tournament, challenges, lobby card dates) are in `src/shared/app/retrospective/retrospectiveRules.ts`, and tested in `src/shared/app/test/retrospective/`.

Server side code is in `src/server/retrospective/`: `RetrospectiveDataLoader` runs queries, `retrospectiveStats` computes stats from loaded rows (tested in `src/server/test/retrospective/`), `RetrospectiveGenerator` assembles them.

- Rating at end of year is displayed only if confident, with its "top X%" among active players with a confident rating.
- Strongest opponent beaten: by opponent current rating at generation time, not rating at game time, only if confident. Game has at least 8 moves.
- Rival: registered opponent played the most (at least 3 games), with wins and losses.
- Activity calendar: games per month, tournament results on the month they ended, and one crown on the month the best King of the Hill place was first reached.
- Game of the year: always a game won, not by forfeit, with at least 8 moves.
- Blunder of the year: a game lost after being very winning for a while, losing until the end after one blunder, with at most 3 blunders.
- Challenges never ask to improve rating or to play more: only tournaments, bots and King of the Hill (become king, reclaim the throne if no longer king at end of year, or defend it).
- Tournaments: top 5 best results (most players ranked below, then bigger tournament). Canceled tournaments are ignored everywhere. Tournament matches exclude forfeits.
- King of the Hill: voided challenges are ignored everywhere.
- Blunder: a move losing more than 0.7 of win rate, only on games already analyzed.
- Lobby card: shown from January 1st to April 30th, until dismissed. The dismiss date is stored in `PlayerSettings.retrospectiveDismissedAt`, and a dismiss from an earlier year does not hide the new retrospective.
