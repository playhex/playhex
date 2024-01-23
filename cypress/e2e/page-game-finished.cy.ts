describe('Page Game finished', () => {
    it('displays win popin, and review options', () => {
        cy.intercept('/api/games/00000000-0000-0000-0000-000000000000', {
            fixture: 'game-finished.json',
        });

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game 00000000-0000-0000-0000-000000000000…').should('not.exist');

        cy.contains('Game finished');
        cy.contains('Test player won the game !');

        // Winner appears in his color, blue
        cy.get('strong.text-primary').contains('Test player');

        // Assert review links. Download SGF and HexWorld link.
        cy.contains('button', 'SGF');
        cy.contains('HexWorld').should('have.attr', 'href', 'https://hexworld.org/board/#9,a3a6d9b6h8c6h1d6f1e6e7f6a2g6h4h6g1i6');
    });

    it('displays win popin when a player resigned', () => {
        cy.intercept('/api/games/00000000-0000-0000-0000-000000000000', {
            fixture: 'game-resigned.json',
        });

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game 00000000-0000-0000-0000-000000000000…').should('not.exist');

        cy.contains('Game finished');
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

        cy.contains('Game finished');
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

        cy.contains('Game finished');
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

        cy.contains('Game finished');
        cy.contains('Game has been canceled.');
    });
});
