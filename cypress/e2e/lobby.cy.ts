describe('Lobby', () => {
    it('displays my game when I created one', () => {
        cy.visit('/');

        cy.createAIGameWithRandom();

        cy.url().should('include', '/games/');
        cy.contains(/10:0\d/); // "10:00" or "10:05" because of time increment, AI sometimes already played a move

        cy.contains('PlayHex').click();

        // My game is listed in "My turn to play" when I come back to lobby
        cy.contains('My current games')
            .closest('section')
            .contains('TestBot')
        ;

        cy.reload();

        // My game is still listed after reload
        cy.contains('My current games')
            .closest('section')
            .contains('TestBot')
        ;
    });

    it('displays created and ended games', () => {
        cy.mockSocketIO();

        cy.intercept('/api/games?*', {
            fixture: 'lobby/lobby-ended-games.json',
        });

        cy.visit('/');

        cy.receiveLobbyUpdate('lobby/lobby-active-games.json');

        // Waiting game is listed with Watch button in the open games card
        cy.contains('Join a live game')
            .closest('.card')
            .contains('Player waiting')
            .closest('tr')
            .contains('Watch')
        ;

        // Playing game is soft-removed: shown greyed out with Watch button still visible
        cy.contains('Join a live game')
            .closest('.card')
            .contains('tr.soft-removed', 'Watch')
        ;

        // Finished games section
        cy.contains('.card-header', 'Finished games')
            .next('.table-responsive')
            .contains('Player C')
            .closest('tr')
            .contains('Review')
        ;

        cy.contains('.card-header', 'Finished games')
            .next('.table-responsive')
            .contains('Player D')
        ;
    });

    it('displays "Observe correspondence games" link when no live games are featured', () => {
        cy.mockSocketIO();

        cy.visit('/');

        cy.receiveSocketIoMessage('playingGamesCountUpdate', { live: 0, correspondence: 1 });
        cy.receiveSocketIoMessage('featuredLiveGamesUpdate', []);

        cy.contains('Observe correspondence games').click();

        cy.url().should('include', '/playing-games/correspondence');
        cy.contains('Correspondence games');
    });

    it('displays open games with board sizes', () => {
        cy.mockSocketIO();

        cy.visit('/');

        cy.receiveLobbyUpdate('lobby/custom-rules-games.json');

        cy.contains('table td', '11×11');
        cy.contains('table td', '25×25');
    });
});
