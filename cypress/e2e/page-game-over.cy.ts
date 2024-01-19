describe('Page game over', () => {
    it('displays win popin', () => {
        cy.intercept('/api/games/00000000-0000-0000-0000-000000000000', {
            fixture: 'game-finished.json',
        });

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game 00000000-0000-0000-0000-000000000000…').should('not.exist');

        cy.contains('Game over');
        cy.contains('Test player won the game !');

        // Winner appears in his color, blue
        cy.get('strong.text-primary').contains('Test player');
    });

    it('displays win popin when a player resigned', () => {
        cy.intercept('/api/games/00000000-0000-0000-0000-000000000000', {
            fixture: 'game-resigned.json',
        });

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game 00000000-0000-0000-0000-000000000000…').should('not.exist');

        cy.contains('Game over');
        cy.contains('The winner won by resignation !');

        // Winner appears in his color, red
        cy.get('strong.text-danger').contains('The winner');
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

    it('displays win popin when game has been canceled before being started', () => {
        cy.intercept('/api/games/00000000-0000-0000-0000-000000000000', {
            fixture: 'game-not-started-canceled.json',
        });

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game 00000000-0000-0000-0000-000000000000…').should('not.exist');

        cy.contains('Cancel').should('not.exist');

        cy.get('Accept').should('not.exist');

        cy.contains('Game over');
        cy.contains('Game has been canceled.');
    });

    it('as host, Cancel button no longer appears when game is already canceled', () => {
        cy.intercept('/api/games/00000000-0000-0000-0000-000000000000', {
            fixture: 'game-not-started-canceled.json',
        });
        cy.intercept('/auth/me-or-guest', {
            fixture: 'game-not-started-canceled-guest.json',
        });

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game 00000000-0000-0000-0000-000000000000…').should('not.exist');

        cy.contains('Cancel').should('not.exist');

        cy.get('Accept').should('not.exist');

        cy.contains('Game over');
        cy.contains('Game has been canceled.');
    });
});
