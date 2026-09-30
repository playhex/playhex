# King of the Hill (ladder): rules

"Ladder" in code, "King of the Hill" for players, at `/king-of-the-hill`.

All rules are implemented as pure functions in `src/shared/app/ladder/ladderRules.ts`,
with every number in `defaultLadderRulesConfig`. Player-facing rules page: `src/client/vue/ladder/pages/PageLadderRules.vue`.

1. [Design goals](#1-design-goals): what the rules are for, and what they must prevent.
2. [Rules today](#2-rules-today): what is implemented.
3. [Known issues](#3-known-issues-and-ideas-for-next-version): feedback, problems, things to change in a next version of the rules.

---

## 1. Design goals

### Goals

- **Anyone can join, anytime.** No season, no registration window. You enter at the bottom.
- **A top player reaches #1 in 6 to 8 wins**, in one or two months of correspondence, not in a year.
- **Rewards strength and activity.** Holding a seat requires playing.
- **Ladder must stay hot**, inactive players are excluded.
- **Cheap to enter, cheap to lose, expensive to stay on top.** Losing a challenge costs nothing, losing a defense costs one seat, the higher you sit the more you must defend.
- **Hard to farm with a small group of friends.**

### Problems to avoid

| Problem | Where it comes from | Rule against it |
|---|---|---|
| **Fortress King**: King never loses because they are never really challenged | King lowers incoming slots to 1 and plays one slow game | Minimum incoming slots grow with height; no way to decline a challenge |
| **Squatter**: absent player keeps a high seat | Nothing forces them to play | Challenges can't be declined, timeouts give strikes, 2 strikes = removed (1 if never finished a game); 60 days without game = removed |
| **Ghost newcomer**: joins, never plays, holds a seat and blocks challengers' slots | Reaching 2 strikes takes weeks in correspondence | First strike removes a player who has not finished any game yet |
| **Dodging**: avoiding a dangerous challenger | Accept/decline, or filling own slots on purpose | No accept/decline; incoming and outgoing slots are separate |
| **Friends farming**: two accounts trading wins to lift each other | Repeated games between the same players | 7-day same-opponent cooldown, 2-in-6 diversity rule, 7-day account age, halving range forces you to beat whoever sits above |
| **Throwaway accounts** used as stepping stones | Free account creation | Account must be 7 days old |
| **Quitting to void a lost defense** | Leaving the ladder cancels running games (OGS) | Running games stay ladder games, result applies to the seat held when leaving; 7 days before rejoining |
| **Ordering results**: holding a won game back to apply results in a better order | Results resolved by creation order, or delayed | Results apply the instant a game ends |
| **Double jump** with parallel challenges | Seat taken = seat the defender held when challenged | Seat taken = seat the defender holds when the game ends |
| **Spam**: being locked in back-to-back games | Unlimited incoming challenges | Incoming slots, cooling-down after each game, same-opponent cooldown |
| **Staircase at the summit**: pure halving makes the last steps slow (7 → 4 → 2 → 1) | `ceil(P/2)` range | Flat 10-seat floor: top 11 can challenge the King directly |
| **Losing one game ruins months of climbing** | Big drops on defeat | A lost defense costs exactly one seat, a lost challenge costs zero |
| **Bottom of the ladder never plays** | Nobody challenges downward | More outgoing slots at the bottom (3) |

---

## 2. Rules today

### 2.1 The ladder

- One ordered list of seats, from #1 to #N. Seat #1 is the **King of the Hill**.
- One ladder today (`main`): board sizes **11×11 to 19×19**, time control **Fischer 3 days + 1 day increment, capped at 3 days**, rated.
  The data model supports several ladders.
- Ladder games are normal rated PlayHex games. The seat is not the rating.
- Join at any time, **at the bottom** (seat N+1).
- Requirements: registered account (no guests, no bots), **created at least 7 days ago**.
  Time played as a guest before registering counts.

### 2.2 Challenges

**Range.** From seat P, you can challenge seats from `min(ceil(P/2), P-10)` (but at least 1) to `P-1`.
Every win roughly halves your seat:

| Ladder size | Wins from bottom to #1 |
|---|---|
| 64 | 4 |
| 256 | 6 (257 → 129 → 65 → 33 → 17 → 7 → 1) |
| 1024 | 8 |

Anyone in the top 11 can challenge the King. The King cannot challenge anyone, they only defend.

**No accept/decline.** The game starts immediately. The challenger picks the board size within the ladder range.
The challenger plays first, the defender may swap (pie rule).
A ladder game cannot be canceled by players.

**One running game per pair**, whoever challenged.

**Live option.** The challenger may propose to play live instead, with any live time control, only if the defender is currently active on PlayHex.

- The defender may accept (live game) or decline (correspondence game). The challenge itself can't be declined.
- The defender has **10 minutes** to answer, otherwise the correspondence game starts.
- The defender can accept only while the challenger is still active.
- Once sent, the challenge and the proposal can't be withdrawn. The pending proposal already takes a slot on both sides.
- Same board size, same stakes.

**Outgoing slots** (challenges sent at the same time):

| Seat | Slots |
|---|---|
| Top 10 | 1 |
| 11 to middle (`ceil(N/2)`) | 2 |
| Bottom half | 3 |

**Incoming slots** (challenges received at the same time):

| Seat | Minimum |
|---|---|
| Top 3 | 4 |
| 4 to 10 | 3 |
| 11 and below | 2 |

Players can raise it up to **5**. The minimum of the current seat applies automatically when climbing.
When full, nobody can challenge you. Running games over the limit after a seat change are not canceled.

**Cooling-down: 2 hours.** After one of your games ends (including a canceled one), nobody can challenge you for 2 hours. You can still send challenges.

**Same-opponent cooldown: 7 days** after a game between two players, whoever challenged.
**Revenge exception:** if you lost your last game against them, **2 days**. Canceled games don't count.

**Diversity rule:** among your last **6** ladder games, at most **2** against the same player.
The new game and running games count, canceled games don't. Checked for both players.

Cooldown and diversity only look at the last **120 days** of games.

### 2.3 Results

| Outcome | Challenger | Defender | Everyone in between |
|---|---|---|---|
| Challenger wins | takes the defender's seat | −1 | −1 each |
| Defender wins | no change | no change | no change |
| Canceled | no change | no change | no change |

- A lost defense costs exactly one seat. A lost challenge costs zero.
- You can also move down one seat without playing, when someone below you beats someone above you.
- Results apply **as soon as a game ends**, in the order games end.
- With parallel challenges, the challenger takes the seat the defender holds **when the game ends**.
  If the challenger is already above, the win counts (streaks, titles) but nobody moves.

### 2.4 Streaks and titles

- **Defense streak**: successful defenses in a row, any seat. Current and best are shown. Only a lost defense resets it.
- **Reign**: how long the King held seat #1 without interruption, and how many defenses. Ends on lost defense, leaving or removal. Taking #1 back starts a new reign. Hall of Fame: longest reigns, most defended reigns, best defense streaks, Giant Slayers, Climbers.
- **Giant Slayer**: dethrone a King who defended **5+** times in their current reign.
- **Climber**: **3** challenge wins in a row, earned again at each multiple (3, 6, 9...). Only a lost challenge breaks the series. Wins without moving count; lost defenses don't break it.
- Giant Slayer and Climber can be earned several times.

### 2.5 Timeouts and strikes

> Losing is fine. Ghosting is not.

- Losing on time (or forfeit) = loss + **1 strike**. Warning after the first one.
- Game canceled because a player did not play their first move: no result, strike to that player.
- Game canceled by a moderator: no result, no strike.
- **2 strikes in 60 days** → removed, can rejoin at the bottom after **30 days**.
- **A strike before having finished any game** since (re)joining → removed immediately, without warning, rejoin after 30 days.
- Resigning is never a strike.

**Why the first-strike removal.** Originally, only 2 strikes removed a player.
But a player who joins and never comes back takes a long time to collect 2 strikes:
with 3 days per move, the first timeout comes at least 3 days after the first challenge,
and the second one only if someone challenges them again in the meantime.
Meanwhile they hold a seat and block challengers' slots. A player who never finished a game has proven nothing, so the first strike is enough.

Precisely:

- "Finished a game" means any ladder game ended since the last (re)join: won, lost, or canceled (even canceled by a moderator, or because the opponent did not play their first move).
- The game giving the strike does not count. Rejoining resets it.
- Applies to both kinds of strike: losing on time, and game canceled because the player did not play their first move.
- The player's other running games are not canceled, as for any removal.

### 2.6 Leaving and removal

- **Leave** anytime, rejoin at the bottom after **7 days**.
- **Strikes**: see above, rejoin after 30 days.
- **Inactivity**: no ladder game ended for **60 days** (from the last game end, even canceled, or from joining) → removed, can rejoin immediately.
  Never removed while a challenge (sent or received) is running.

When a player leaves or is removed:

- The seat is freed immediately, everyone below moves up one. If the King leaves, #2 becomes King.
- Running challenges and pending live proposals are not canceled, games are played to the end.
- If a defender left and the challenger wins, the challenger takes the seat the defender held when leaving, if it is above theirs (everyone in between moves down one).
- If a challenger left, their result moves nobody. The defender's streak still grows if they win.
- On rejoin: bottom seat, best defense streak and titles kept, current streaks reset.

Expired live proposals are processed every minute, inactivity removals every few minutes.

### 2.7 Changes since the original design

The original design is `ladder-rules/LADDER_RULES.md` (outside this repo). Differences:

- Cooling-down is **2 hours**, not 8.
- Canceled games: explicit rule (no result, strike to the player who did not play their first move, no strike when canceled by a moderator).
- Removal on the first strike when the player has not finished any game since joining (2026-09-29), see 2.5.
- Cooldown and diversity history limited to 120 days.
- Live option detailed: defender must be active, 10 minutes to answer, pending proposal takes slots, cannot be withdrawn.
- Not implemented: multiple user-created ladders, open defenses (see below).

---

## 3. Known issues and ideas for next version

Biggest issue to me: **Games in ladder should not be impacted by being a ladder game**:
    - games duration may be artificially increased because a player want to change the order of wins/loses, or want to be king longer
    - games may be resigned early because the challenger is no longer interested in the game: because opponent lost his place, and losing a game has no penalty as challenger

### 3.1 Feedback from players

- @Mason: a king can makes the game last longer (play one move a day, play all bridges to the end) to increase time being king
- We can also delay a winning game to win after a lose to not losing a place and take the higher place.

### 3.2 Issues found by analysing the rules

**Slow play fortress.** Minimum incoming slots prevent a King from lowering them, but not from filling them.
With 4 incoming slots and 3 days per move, a King playing every move just before the deadline keeps all slots busy for weeks, legally.
Nobody else can challenge. Ideas: shorter time control for top seats, a cap on game duration, or one extra slot always open for top 11.

**Small ladder starvation.** With few players, cooldowns block everyone:
seat 3 has only 2 targets, after playing both it waits 7 days (or 2 after a loss).
Same for the King: nobody may be able to challenge them, yet they can't send challenges, so the 60-day inactivity clock runs against them.
Ideas: scale cooldowns with ladder size, or never remove the King for inactivity when no one could challenge them.

**Strikes on live games.** Losing on time in a live game gives a strike, like a correspondence timeout.
In blitz, losing on time is normal play, not ghosting. Idea: no strike for live games (`playedLive`), or only for abandonment.

**No vacation.** No break mode: a player on holiday for a week with running correspondence games can time out and get strikes, then removed.
Lichess has breaks with cumulative decay, OGS has a vacation mode. Idea: break mode that blocks incoming challenges and makes the seat decay slowly.

### 3.3 Parked idea: multiple ladders

Data model is ready (one ladder = one row). Player-created ladders: board size range within 11-19, correspondence time control, name, host starting at #1.
Listed by active player count. One busy ladder is better than five dead ones: wait until the first one is alive.
