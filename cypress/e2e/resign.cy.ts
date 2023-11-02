describe('Resign a game', () => {
    it('displays button to resign a game', () => {
        cy.visit('http://localhost:3000/');
        cy.get('.menu-top').contains(/Guest \d+/);

        cy.contains('Create game vs CPU').click();

        cy.contains('Game options')
            .closest('.modal-content')
            .contains('Create game')
            .click()
        ;

        cy
            .contains('Resign')
            .click()
        ;

        cy
            .contains('Are you sure you want to resign game?')
            .closest('.modal-content')
            .contains('Yes, resign')
            .click()
        ;

        cy.contains('Game over');
        cy.contains(' won the game !');
    });
});
