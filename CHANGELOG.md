## June 24, 2026
*New on PlayHex, since last month*

### Hexplorer!
Try it: https://playhex.org/hexplorer
- Analyze a position, explore lines
- Show **policy heat map** and red/blue advantage (only katahex intuition is supported for now)
- **AutoPlay**: replay a game just before a blunder or try a puzzle
- **Setup mode**: create an custom position (be aware that katahex will respond weirdly in too custom positions)
- **Marks**: triangle, circles, text, highlighted... (all marks supported by SGF so they are exported as SGF as well)
- **Import any Hex game**, from PlayHex, AbstractPlay, HexWorld link, raw moves...
- Save/Load an exploration tree

Send me all feedback, there are probably many things you want to do but cannot yet with Hexplorer.

### Added
- Added this changelog history
- When subscribing to a tournament, we now suggest to enable notifications to actually send a notification when player needs to register to tournament in order to participate
- Hide best move / current move marks while rewinding an ended game by collapsing the AI analysis graph
- When creating a game, you can now require you opponent to have an account. This is enabled by default for correspondence games, and disabled for real-time games
### Changed
- Your opponent has now a bigger notification when you join their game while they are playing against a bot

### Moderation
I enforced moderation by now having a tool to quickly see all new chat messages and nicknames,
moderate them, sending you a warning, and if necessary, temporary block chat.
In worst cases, like trying to bypass moderation (creating secondary account and recidive), your IP will also banned.

## May 20, 2026
*New on PlayHex, since last 2 months*

### Reworked lobby
Lobby had many problems that are now solved:
- live and correspondence games are no longer mixed
- show more "life": directly display board of currently playing games
- limit only to 2 playing games on lobby. Other playing games are now in Games > Observe menu
- prevent joining the wrong game when layout just shifted because another game above has been removed
- header is now always visible to always see the "my turn to play" notification
- try to mitigate stale games by showing, at the top of lobby, all my games where I need to play my move (which should be the most important information when anyone arrive on the website)
- when creating a game: separate live and correspondence time controls to prevent 3 days + 1 second, or 12h + 0s...
### New
- Avatars
- Country flag
- Lobby and tournaments chat
- Show who is spectating a game (developed by @STORM)
### Changed
- Exploration is now disabled by default for rated and tournament games
- Mohex 1 has been deleted because too random first, then unbeatable once it made a virtual connection
- Mohex 1.5 is now Mohex 1
### Fixed
- fixed a case when Pass button was wrongly disabled
- fixed color assignment in rematch games when I selected "I play first/second"
- fixed winning path kept displaying while rewind/explore

## March 23, 2026
*New on PlayHex, since last 3 months*

### New
- Exploration while playing: from rewind mode, you can now try lines, from current position or earlier position. Can be disabled in game options.
- Show spectators joining and leaving your game (developped by @STORM)
- Games export: add players ratings at the time the game was played to prevent tor ecomoute thay ourselves
### Fixed
- Fixed premoves that can persist and auto-execute on the next turn ([reported](https://github.com/playhex/playhex/issues/131) by `@Hexanna`)
- Fixed player caching issue: was re-updating player info when using trying to register again in an outdated brower tab (fixed by @STORM)
- Fixed just played move poped on board while rewinded to a previous position

## December 31, 2025
*New on PlayHex, since last 3 months*

I took a break of ~2 months, so not much changes. And I'll still have less time for next months.
### New
- 🚀 [Tutorial for newcomers](https://playhex.org/tutorial). Try it as incognito to see how it's suggested to new visitors
- 🔇 Allow to [mute sounds](https://playhex.org/settings#audio), useful on mobile where you can mute browser tab (developed by @Replicat)
- 🧹 Hide bot games from lobby (developed by @Mason)
- Tournaments
  - allow canceling a tournament (and I could clean stale tournaments and games)
  - ranks in double elimination are now updated while tournament is running, when a match ends
  - allow customize url path, fixes "tournament name already taken" (useful when you need to re-create tournament with same same)
  - fix 2nd and 3rd rank to tournament winners that could be reversed in a case
### Donations
I've not yet did something to highlight donators on playhex (adding a yellow badge, wings or something), but **thank you a lot** @Mason @叭布/bobson @falsifian and secrets donators for donating for 1 or 2 next years!!

Having donators really makes playhex looks "bigger" I think, and now it's no longer just a simple website!
### About the android app
- [F-Droid](https://f-droid.org/packages/org.playhex.twa/): it has been published and promoted (because I filled all criteria, images, description), and generated a peak of visit, and now still having few visits daily.
- google play: it's published, but not indexed, we cannot find it unless we type the exact same name or have the link. But I think it can be fixed by promoting it and having 500+ downloads (others indexed Hex app have 500+ downloads). I'll do something later.
### Trends 2025
I'm confident about next year, there is a good trend of number of visitors every month. This year, compared to last year, there was 3.4x more visits, 3.7x more 1v1 games, 4.7x more bot games.

Happy new year! 🎆

## September 26, 2025
*New on PlayHex, since last month*

### New
- Seeding players in tournaments: either randomly, by rating, or hybrid (asked by @Mason)
- [Android app](https://play.google.com/store/apps/details?id=org.playhex.twa), same as website, so just for try to gain visibility. Should be soon on [F-Droid](https://f-droid.org/) too
- 📫 **Notifications** in header: don't miss a chat message on an past game, and see which correspondence games have ended while your were offline
- Displays `(1) ...` in page title when you need to play a move
- 💾 Shortcut `ctrl + S` on a game page to download it as SGF
- Add a system chat message when exactly [AI analysis has been made available](https://playhex.org/games/89b03c96-711f-4d31-b485-01541df8ebc6)
### Fixed/changed
- Fix slow loading in [game archives](https://playhex.org/games-archive): changing filters and click prev/next is now way faster
- Fix ctrl+click to paste coords in chat wasn't working in rewind mode, fix uppercase coords was not highlighting cell, do not paste on long click on desktop (reported by @Mason and @comonoid)

Register for tonight sya's tournament: https://playhex.org/tournaments/blitz-12x12

## August 23, 2025
*New on PlayHex, since last month*

### New
- **Share coordinates in chat**: `ctrl+click` on cell, and click on coords in chat to highlight cell on board
    - on mobile, long press on board to paste it in chat
- Play vs AI:
    - Add **new beginner AI: Davies** (from https://daviesgit.github.io/hex_board_game/)
    - Simplify "Play vs AI" by only listing all AI and level (remove AI engines tabs)
- [New offline lobby](https://playhex.org/offline-lobby)
    - play locally with AI if you have no internet. This should be useful in the incoming Android app
    - I plan to add more offline tools here, like pass and play and so, or use tablet as board (suggested by @yqx)
- On takeback move: show a toast, and a service message in chat (suggested by @comonoid)
- On rematch: make them more visible: show a toast when player wants to rematch, also add a sound
- Add time control and remaining time after each move in SGF files (suggested by @Mason)
- Add a confirmation for pass move to prevent misclick (suggested by @Mason)
### Fixed/changed
- **Tournaments** fix/feedback:
    - Allow organizer to **add admins**
    - Add **markdown support** in description
    - Allow organizer to delete their tournament
    - Try making subscribe/check-in less confusing
    - Fix wordings, add missing info
- Fix Japanese/Chinese urls slugs: now we show those chars in url to prevent empty slug for Japanese players with no latin chars in nickname
- Fixed stale games auto-cancel (and reworked from scratch)
### Android app
Incoming in next month:
- nothing new, same as website
- just hope to gain more visibility, and offer a new Android app (the best one is no longer compatible with many devices)
- the offline lobby should be useful in this android app

Don't forget @StillYetAnother11's blitz tournament, soon! https://playhex.org/tournaments/17x17-blitz-tournament

## July 24, 2025
*New on PlayHex, since last 4 months*

### Added
- Tournaments!
- 🔔 Push notifications
- 📁 [Export all PlayHex games](https://playhex.org/export-games-data)
- Show 🌙 when a player is idle for more than ~5min
- Show a message (toast) when opponent passed
### Changed
- Unranked bot game
- Set max boardsize to 53 (previous limit was 42) (requested by @StillYetAnother11  obviously)
### Fixed
- Try to notify better someone when you join his 1v1 game while he is playing a bot game:
  - fix notification no longer being sent,
  - display more visible toast,
  - do not show `1` in header for bot games to make 1v1 games more visible
- Fix "move" sound played twice when I play a move, or not played when I play too fast after opponent move
- Fix "low time" sound playing when it is not the case
- Fix some players rating incorrect history when they played a game before creating an account (reported by [scottiamcgrath](https://github.com/playhex/playhex/issues/112))
- Fix Pass button greyed out when it's my turn after undoing move (reported by Gulchen)
- Make online/offline icon more distuiguable (from @arekkulczycki)

## February 17, 2025
*New on PlayHex, since last month*

### Added
- Premoves
- [Conditional moves](https://playhex.org/guide/conditional-moves)
- [Guide for AI analysis](https://playhex.org/guide/ai-analysis)
- [Rating simulator](https://playhex.org/rating-simulator) (calculates winrate, rating changes)
### Changed
- Stop showing a browser notification every time opponent made a move
- Chat dates: show date also for first message; show "today" and "yesterday" instead when applicable
### Fixed
- When game cancels, "win" sound notification was played

## January 21, 2025
*New on PlayHex, since last 2 months*

### Added
- New [Archive page](https://playhex.org/games-archive): browse all played games on PlayHex. You can access it from lobby, at the end of "Finished games"
- Show a warning to guests trying to join a correspondence game. By @BlackHat , suggested by @knusbrick just above
- Player page: add some stats, full ratings, rating history, add filters in games history.
### Changed
- Fischer clock: change to uncapped by default. Allow to add cap.
### Fixed
- Toggling the sidebar removes the move preview, but only visually, [reported](https://github.com/playhex/playhex/issues/98) by @Mason
- Click on turn notification in the header sometimes does nothing, [reported](https://github.com/playhex/playhex/issues/63) by @Mason

Currently doing: conditionnal moves for correspondence games.

## November 25, 2024
*New on PlayHex, since last 2 months*

Today I just rented a new server to run PlayHex.
I am currently running AI workers on this new server, and I'll move PlayHex (application and database) soon.

Last server was a cheap one, too slow to run an AI worker efficiently, only 4Gb RAM (so mohex and katahex filled half),
and old hard disk drive, very slow: you can feel this slowness when refreshing lobby, games take time to appear,
just because waiting for ended games that are stored in database, on this HDD.
Games are running on memory though, so not a big problem.

I almost not worked on PlayHex this last month.

- Reworked game sidebar (added tabs) to better organize space on mobile, thanks for feedback from @comonoid , @Mason , @marekf
- All ratings displayed on lobby (e.g your open games) should now update
- Always show HexWorld button on unranked games
- Auto-cancel/resign correspondence games when no activity for 2 weeks to prevent stale games on lobby
- Order the online players list lexicographically, helpful to find your opponent during Hex Monthly, by @comonoid
- Started Indonesian translation 🇮🇩, by @2swap
### Fixed
- Fix cases when you miss just-played move when you join a playing game, by @comonoid
- Fix wrong board orientation on mobile (when using PWA), by @comonoid
- Fix arrows keys to navigate in analysis review also move cursor in chat message, by @comonoid
- Fix dates in chats sometimes off by one day, reported by @Mason
- Fix byo-yomi showing NaN:NaN :nyan_cat:

## September 26, 2024
*New on PlayHex, since last 2 months*

- ⏪ Rewind board position:
  - press left or right arrow, or click the rewind button to start rewinding
  - click move number in chat to rewind to position when chat messages have been made
- 🎯 And then, click on analysis moves!
  - will rewind to position, show a mark on the board for best move, played move eval (green: good, orange/red: blunder)
  - use left/right arrows to also navigate through analysis moves
  *(sorry for the `#00ff00`, still have not found the "ha!" idea to make UI nice)*
- When rematch with same opponent, colors alternate
- Silent disconnects fixes:
  - reload page when browser detected a reconnect and you may have lost updates, by @Mason
  - show a red "Offline" on game page when you disconnect, by @comonoid
- 💬 Chat enhancements:
  - add move number (i.e `move 4`) headers to known when comment is made,
  - add date (i.e `september 26`) headers to stop being confused about hours of different day

## July 25, 2024
*New on PlayHex, since last 2 months*

- Undo move
- Sounds: game started/win/lose, chrono <10 seconds, chat received
- Make chrono warns you when you have <10 seconds
- Ratings
- Allow to force landscape or portrait board orientation
- Better premove when swap
- Allow cancel premove by clicking on same cell
- Fixed losing by time when clock is not at zero (you could lose with 2s remaining, or chrono go to negative values)
- Add some pages: [Contributors](https://playhex.org/contributors), [How to contribute](https://playhex.org/contribute), [How analysis work](https://playhex.org/hex-game-analysis), [How to host an AI worker](https://playhex.org/spawn-worker)

### Next
- Fix chat behaviour on mobile, very glitchy
- Pass move
- Rework lobby
- A kind of "last activities" in the header, where you no longer miss chat messages sent on your ended games, or when your opponent has resigned your correspondence game...

## May 18, 2024
*New on PlayHex, since last month*

- Rematch 1v1, developed by @comonoid, you can rematch a game, and your opponent can directly accept your rematch.
- Win popin no longer pop everytime you open a game, and buttons have moved into the sidebar, developed by @comonoid
- Hexworld link now open your game in same rotation on desktop, developed by @comonoid
- Chat now clearly shows its limit of 250 chars instead of losing your message, sorry if your long explanation was lost, but now it's fixed...

**Currently working**: Fix timestamps consistency (milliseconds are lost in many place between moves, player chrono changing...), fix date shift that make chrono not well synced.

**Translations**: app is now translated, and french has been added. You can switch in settings page.
You can also **contribute to translations** by adding your language/locale. I asked Weblate for free hosting (they offer it for open source projects).

But you can already add your language and translate here: https://hosted.weblate.org/projects/playhex/

and start translating PlayHex in your language 🙂
You need a Weblate account, and if you have a github account, link it, so weblate will author commit as your name.

I guess next translations most wanted are Chinese, Spanish, German to cover >95% of visitors

## April 5, 2024
*New on PlayHex, since last month*

> From last month: "Next: I now want to make better 1vsAI and make AI review tool."

- 📊 Analyze by AI now available, still in beta: go on a finished game and request an analyze
- Play with Katahex, and different levels of Mohex

💙 I was not alone this last month, thanks to @Mason and @comonoid for their many contributions!
### Game
- 🔔 Browser notifications on game started and move played -- developped by @Mason
- Hexworld link now shows resign move or timeout -- developped by @comonoid
- Use relative coords in game chat, `[44]` => shows `44(d8)` -- developped by @Mason
- 🔗 Links clickable in the chat, useful to share hexworld links -- developped by @comonoid
- Button to share current game link in game sidebar
### Lobby
- Make lobby shows more useful info: -- developped by @comonoid
    - created, started, finished dates
    - size and time control in playing and finished games
    - sort games by most dynamic ones in first
    - hide bot games in finished games
    - dates and time control in game sidebar
### Misc
- Change your PlayHex password in settings -- developped by @comonoid
- App moved to playhex.org
### Next
Mostly fix, finalize, stabilize things, lobby... Then, maybe rankings
### Good first issues
If you want to contribute or try developing things, here is a list of "less-hard" things:
- Fix ByoYomi never elapsing when setting 0 seconds periods (only js)
- Allow changing username (vue, backend)
- in player page: our games history should be sorted by endedAt (backend)

## March 5, 2024
*New on PlayHex, since last 2 months*

### Updated the site

- ⏲️ **Time now only starts when first move is played**, to prevent time starting too savagely
- 💬 **Chat**, *so you can say "ready?", "have fun", "haha u noob", ...*
- When watching a playing game, you now have a link in game sidebar to Hexworld for review *(requires account to prevent incognito passby)*
- Lobby now displays if custom rules are defined for a game *("no swap rule", "host plays first")*
- Optimize board space to appear as larger as it can, useful for mobiles
- few fixes like UI truncated on mobile after orientation change ; games in history appears as lost instead of canceled ; players colors not updated on game start

### Soon moving to a new url

If you have a guest session, it will be lost. If you want to keep your history and current games, you should add pseudo and password: you will keep all of it. Unless you want to erase all your losses againts Mohex 😄

### Next

I now want to make better 1vsAI and make AI review tool.

### Good first issues

If you want to contribute or try developing things, I can let you "easy" things to do. Currently:
- Add missing "resign" move in Hexworld link (only js)
- Fix ByoYomi never elapsing when setting 0 seconds periods (only js)
- Allow changing pseudo / password (less easy: vue, js, backend)

## January 5, 2024
*New on PlayHex, since last week*

Swap move is available.
That was a little tricky with mohex: what he calls "swap-pieces" is actually a swap side, so had to find a workaround. Also I have to recompile mohex with swap moves for 13x13 boards, currently mohex does not swap on boards > 11x11.

## December 29, 2023
*New on PlayHex, since last week*

Hi, I added some new features in https://hex.alcalyn.app/:
- ✅ Time controls
- ✅ Cancel a game if none joined (for you @叭布/bobson :p)
- ✅ Show green or grey circle if opponent is here or akf
- ✅ Show last ended games

Next, I want to work on this:
- Swap rule
- Review game by AI (see my bad moves and where would it be better to play...)
- Having an account to login from anywhere, have a pseudo, game history (for now you can only download SGF at the end of a game)
- Rewind moves with left arrow to playback game

And a lot of other things!

Here is my trello (todolist): https://trello.com/b/Fzb4SXvZ/hex.
You can leave any feedback here in discord, or in the feedback link in platform (but it requires an email).
And the github repository: https://github.com/alcalyn/hex.

## December 18, 2023
Hello, I'm developing a side project, a Hex online website: https://hex.alcalyn.app/
For now you can:
- play 1v1, just send game link to someone,
- or play against Mohex (you must choose a board size <= 13), power limited, but still playable. Will unlock some power soon.

We cannot, for now, use swap rule, run game analysis, play defered games, play ranked... but I'm still working on the website. It's open source.
