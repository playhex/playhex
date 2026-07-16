describe('Challenge a player', () => {
    beforeEach(() => {
        cy.mockSocketIO();
        cy.intercept('POST', '/api/auth/me-or-guest', { fixture: 'challenge/me.json' });
    });

    it('does not appear in lobby "open games" section', () => {
        cy.visit('/');
        cy.get('.nav-player-item').should('not.contain', 'logging in');

        cy.receiveLobbyUpdate('challenge/open-game.json');
        cy.receiveMyGamesUpdate('challenge/challenge-playing.json');

        cy.contains('Join a game').closest('.card')
            .should('contain', 'Player B') // sanity check: open games pipeline does render games
            .and('not.contain', 'Challenger') // the nominative challenge must not leak into open games
        ;
    });

    it('does not appear in lobby "open games" section when created while lobby is open (lobbyGameCreated event)', () => {
        cy.visit('/');
        cy.get('.nav-player-item').should('not.contain', 'logging in');

        cy.receiveLobbyUpdate('challenge/open-game.json');
        cy.receiveLobbyGameCreated('challenge/challenge-created-not-target.json');

        cy.contains('Join a game').closest('.card')
            .should('contain', 'Player B') // sanity check: open games pipeline does render games
            .and('not.contain', 'Challenger') // the nominative challenge must not leak into open games
        ;
    });

    it('still appears in lobby "open games" section for the targeted player (lobbyGameCreated event)', () => {
        cy.visit('/');
        cy.get('.nav-player-item').should('not.contain', 'logging in');

        cy.receiveLobbyUpdate('challenge/open-game.json');
        cy.receiveLobbyGameCreated('challenge/challenge-created-target.json');

        cy.contains('Join a game').closest('.card').should('contain', 'Challenger');
    });

    it('still appears in lobby "open games" section for the host who created the challenge (lobbyGameCreated event)', () => {
        cy.visit('/');
        cy.get('.nav-player-item').should('not.contain', 'logging in');

        cy.receiveLobbyUpdate('challenge/open-game.json');
        cy.receiveLobbyGameCreated('challenge/challenge-created-by-me.json');

        cy.contains('Join a game').closest('.card').should('contain', 'Me');
    });

    it('playing game issued from a challenge appears in "My current games" section', () => {
        cy.visit('/');
        cy.get('.nav-player-item').should('not.contain', 'logging in');

        cy.receiveMyGamesUpdate('challenge/challenge-playing.json');

        cy.contains('My current games')
            .closest('section')
            .contains('Challenger')
        ;
    });

    it('shows an incoming challenge as a distinct card in "My turn to play", after my playing games but before bot games', () => {
        cy.visit('/');
        cy.get('.nav-player-item').should('not.contain', 'logging in');

        // A playing game (Rival), an incoming challenge (Challenger) and a playing bot game (TestBot),
        // deliberately not in this order in the fixture, to prove the app re-sorts them.
        cy.receiveMyGamesUpdate('challenge/my-games-mixed.json');

        // The challenge counts as actionable, just like a game where it's my turn.
        cy.contains('h2', 'My turn to play').find('.badge').should('contain', '2');

        cy.get('.game-card').should('have.length', 3).then(cards => {
            const texts = [...cards].map(card => card.textContent ?? '');

            expect(texts[0], 'my playing game appears first').to.include('Rival');
            expect(texts[1], 'incoming challenge appears after playing games').to.include('Challenger');
            expect(texts[2], 'bot game appears last').to.include('TestBot');
        });

        // The challenge card is visually distinct and offers a dedicated Accept button.
        cy.get('.game-card.challenge-card').should('have.length', 1).within(() => {
            cy.contains('Challenges you!');
            cy.contains('Challenger');
            cy.contains('button', 'Accept');
        });
    });

    it('shows "Accept" button only when I am the target of the challenge', () => {
        cy.visit('/games/50000000-0000-0000-0000-00000000dddd');
        cy.receiveGameUpdate('challenge/challenge-created-not-target.json');
        cy.contains('Loading game…').should('not.exist');

        cy.contains('button', 'Accept').should('not.exist');
    });

    it('shows "Accept" button when I am the target of the challenge', () => {
        cy.visit('/games/40000000-0000-0000-0000-00000000cccc');
        cy.receiveGameUpdate('challenge/challenge-created-target.json');
        cy.contains('Loading game…').should('not.exist');

        cy.contains('button', 'Accept').should('be.visible');
    });

    it('explains why "Accept" is not shown, naming the target, when I am neither host nor target', () => {
        cy.intercept('GET', '/api/players/60000000-0000-0000-0000-000000000006', { fixture: 'challenge/target-player.json' });

        cy.visit('/games/50000000-0000-0000-0000-00000000dddd');
        cy.receiveGameUpdate('challenge/challenge-created-not-target.json');
        cy.contains('Loading game…').should('not.exist');

        cy.contains('button', 'Accept').should('not.exist');
        cy.contains('TargetPlayer');
    });

    it('explains why "Accept" is not shown, naming the target, when I am the host of the challenge', () => {
        cy.intercept('GET', '/api/players/60000000-0000-0000-0000-000000000006', { fixture: 'challenge/target-player.json' });

        cy.visit('/games/80000000-0000-0000-0000-00000000ffff');
        cy.receiveGameUpdate('challenge/challenge-created-by-me.json');
        cy.contains('Loading game…').should('not.exist');

        cy.contains('button', 'Accept').should('not.exist');
        cy.contains('TargetPlayer');
    });
});
