describe('Page game over', () => {
    it('displays win popin', () => {
        cy.intercept('/api/games/00000000-0000-0000-0000-000000000000', {
            fixture: 'game-finished.json',
        });

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game 00000000-0000-0000-0000-000000000000…').should('not.exist');

        cy.contains('Game over');
        cy.contains('Test player won the game !');
    });

    it('displays win popin when a player resigned', () => {
        cy.intercept('/api/games/00000000-0000-0000-0000-000000000000', {
            fixture: 'game-resigned.json',
        });

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game 00000000-0000-0000-0000-000000000000…').should('not.exist');

        cy.contains('Game over');
        cy.contains('The winner won by resignation !');
    });

    it('displays win popin when game has been canceled', () => {
        cy.intercept('/api/games/00000000-0000-0000-0000-000000000000', {
            fixture: 'game-canceled.json',
        });

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game 00000000-0000-0000-0000-000000000000…').should('not.exist');

        cy.contains('Game over');
        cy.contains('Game has been canceled.');
    });
});
