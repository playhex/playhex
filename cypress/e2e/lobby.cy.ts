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

        cy.contains('Play vs AI').click();

        cy.contains('Game options')
            .closest('.modal-content')
            .contains('Play vs AI')
            .click()
        ;

        cy.contains('Play Hex')
            .click()
        ;

        // My game is listed when I come back to lobby
        cy.get('@myUsername').then(myUsername => {
            cy
                .contains(new RegExp(`${myUsername} vs Determinist random bot|Determinist random bot vs ${myUsername}`))
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
                .contains(new RegExp(`${myUsername} vs Determinist random bot|Determinist random bot vs ${myUsername}`))
                .closest('tr')
                .contains('Watch')
                .closest('tr')
                .contains(/\d+/)
            ;
        });
    });

    it('displays created, playing and some ended games', () => {
        cy.intercept('/api/games', {
            fixture: 'lobby-games.json',
        });

        cy.visit('/');

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
            .next('table')
            .contains('Player A')
            .closest('tr')
            .contains('Watch')
        ;

        cy.contains('Watch current games').next('table').contains('Player B');

        cy
            // Finished games
            .contains('Finished games')
            .next('table')
            .contains('Player C')
            .closest('tr')
            .contains('Review')

            // should not display canceled games
            .closest('table')
            .contains(/Cancel A|Cancel B/).should('not.exist')
        ;

        cy.contains('Finished games').next('table').contains('Player D');
    });

    it('warns when there is custom rules', () => {
        cy.intercept('/api/games', {
            fixture: 'lobby/custom-rules-games.json',
        });

        cy.visit('/');

        cy.contains('table td', '11').should('not.have.class', 'text-warning');
        cy.contains('table td', '25').should('have.class', 'text-warning');

        cy.contains('table td', '11').closest('tr').contains('normal');
        cy.contains('table td', '12').closest('tr').contains('no swap');
        cy.contains('table td', '13').closest('tr').contains('no swap host plays first');
    });
});
