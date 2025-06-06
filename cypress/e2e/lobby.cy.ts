describe('Lobby', () => {
    it('displays my game when I created one', () => {
        cy.visit('/');
        cy
            .get('.menu-top')
            .contains(/Guest \d+/)
            .invoke('text')
            .invoke('trim')
            .as('myUsername')
        ;

        cy.createAIGameWithRandom();

        cy.contains(/10:0\d/); // "10:00" or "10:05" because of time increment, AI sometimes already played a move

        cy.contains('PlayHex')
            .click()
        ;

        /**
         * Makes "Guest 1234" will instead search for regex /Guest\s+1234/
         * because of unsure spaces between Guest and its username.
         */
        const usernameMatch = (username: JQuery<HTMLElement>): string => String(username).split(/\s+/g).join('\\s+');

        // My game is listed when I come back to lobby
        cy.get('@myUsername').then(myUsername => {
            cy
                .contains(new RegExp(`${usernameMatch(myUsername)}.+TestBot|TestBot.+${usernameMatch(myUsername)}`))
                .closest('tr')
                .contains('Watch')
                .closest('tr')
                .contains(/\d+/)
            ;
        });

        cy.reload();

        cy
            .get('.menu-top')
            .contains(/Guest \d+/)
            .invoke('text')
            .invoke('trim')
            .as('myUsername')
        ;

        // My game is listed when I load page
        cy.get('@myUsername').then(myUsername => {
            cy
                .contains(new RegExp(`${usernameMatch(myUsername)}.+TestBot|TestBot.+${usernameMatch(myUsername)}`))
                .closest('tr')
                .contains('Watch')
                .closest('tr')
                .contains(/\d+/)
            ;
        });
    });

    it('displays created, playing and some ended games', () => {
        cy.mockSocketIO();

        cy.intercept('/api/games?*', {
            fixture: 'lobby/lobby-ended-games.json',
        });

        cy.visit('/');

        cy.receiveLobbyUpdate('lobby/lobby-active-games.json');

        cy
            // Waiting games
            .contains('Join a game')
            .next('div')
            .contains('Player waiting')
            .closest('tr')
            .contains('Accept')
        ;

        cy
            // Current games
            .contains('Watch current games')
            .next('.table-responsive')
            .contains('Player A')
            .closest('tr')
            .contains('Watch')
        ;

        cy.contains('Watch current games').next('.table-responsive').contains('Player B');

        cy
            // Finished games
            .contains('Finished games')
            .next('.table-responsive')
            .contains('Player C')
            .closest('tr')
            .contains('Review')
        ;

        cy.contains('Finished games').next('.table-responsive').contains('Player D');
    });

    it('warns when there is custom rules', () => {
        cy.mockSocketIO();

        cy.visit('/');

        cy.receiveLobbyUpdate('lobby/custom-rules-games.json');

        cy.contains('table td', '11').should('not.have.class', 'text-warning');
        cy.contains('table td', '25').should('have.class', 'text-warning');

        cy.contains('table td', '11').closest('tr').contains('standard');
        cy.contains('table td', '12').closest('tr').contains('no swap');
        cy.contains('table td', '13').closest('tr').contains('no swap host plays first');
    });
});
