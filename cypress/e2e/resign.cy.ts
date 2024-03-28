describe('Resign a game', () => {
    it('displays button to resign a game', () => {
        cy.visit('/');
        cy.get('.menu-top').contains(/Guest \d+/);

        cy.contains('Play vs AI').click();

        cy.contains('Game options')
            .closest('.modal-content')
            .contains('Play vs AI')
            .click()
        ;

        // Play at least one move to have Resign button
        cy.get('canvas');
        cy.get('body').click(409, 326);

        cy
            .contains('Resign')
            .click()
        ;

        cy
            .contains('Are you sure you want to resign the game?')
            .closest('.modal-content')
            .contains('Yes, resign')
            .click()
        ;

        cy.contains('Game finished');
        cy.contains(' won by resignation!');
    });
});
