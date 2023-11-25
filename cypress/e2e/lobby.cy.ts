describe('Lobby', () => {
    it.only('displays my game when I created one', () => {
        cy.visit('/');
        cy
            .get('.menu-top')
            .contains(/Guest \d+/)
            .invoke('text')
            .invoke('trim')
            .as('myUsername')
        ;

        cy.contains('Play vs AI').click();

        cy.contains('Play vs AI options')
            .closest('.modal-content')
            .contains('Play!')
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
});
