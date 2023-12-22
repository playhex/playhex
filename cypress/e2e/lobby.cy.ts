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

        cy.contains('Home')
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
            .next('table')
            .contains('Player waiting')
            .closest('tr')
            .contains('Accept')
        ;

        cy
            // Current games
            .contains('Watch current game')
            .next('table')
            .contains('Player A vs Player B')
            .closest('tr')
            .contains('Watch')
        ;

        cy
            // Ended games
            .contains('Ended games')
            .next('table')
            .contains('Player C won against Player D')
            .closest('tr')
            .contains('Review')

            // should not display canceled games
            .closest('table')
            .contains(/Cancel A|Cancel B/).should('not.exist')
        ;
    });
});
