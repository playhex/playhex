describe('Player settings', () => {
    it('can change "ask move confirm" parameters', () => {
        cy.visit('/');
        cy.get('.menu-top').contains(/Guest \d+/);

        // Create normal game
        cy.contains('Play vs AI').click();

        cy
            .contains('Game options')
            .closest('.modal-content')
            .contains('Custom')
            .click()

            .closest('.modal-content')
            .get('input[type=number]')
            .clear()
            .type('11')

            .closest('.modal-content')
            .contains('Play vs AI')
            .click()
        ;

        // Confirm move button not there by default on normal games
        cy.contains('button', 'Cancel');
        cy.contains('Confirm move').should('not.exist');

        // Enable Confirm move in settings
        cy.contains(/Guest \d+/).click();
        cy.contains('Settings').click();

        cy.contains('Confirm move before submit');

        cy.get('[id="confirm-move-normal"]').select('true');

        // Go back to game, Confirm move button should be there
        cy.contains(/Guest \d+/).click();
        cy.contains('Watch').click();
        cy.contains('button', 'Cancel');

        cy.contains('Confirm move').should('have.attr', 'disabled');

        cy.get('canvas');
        cy.get('body').click(506, 397);

        cy.contains('Confirm move').should('not.have.attr', 'disabled');
        cy.contains('Confirm move').click();
        cy.contains('Confirm move').should('have.attr', 'disabled');
    });
});
