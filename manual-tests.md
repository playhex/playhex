# Manual tests

Non-regression tests not automated to check manually.
These tests are either not yet automated, or too hard to automate.

- Accept button
    - Player A host a new game
    - Player B go to the game page with the url, or with "watch" link
    - Player B click "Accept"
    - Accept should disappear
    - Both player A and B can play moves.

- Win popin appears once
    - Create a game vs remote AI
    - Go back to home, join again, home again, join again...
    - Finish the game
    - Win popin should appears once.

- I can see last move when I lose
    - Create a game vs remote AI
    - Lose the game
    - I should see the last move from AI, and the lose popin.

- I cannot play against myself, join my own game twice
