describe('Page Game finished', () => {
    it('displays win popin, and review options', () => {
        cy.mockSocketIO();

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game…');
        cy.receiveGameUpdate('game-finished/game-finished.json');
        cy.contains('Loading game…').should('not.exist');

        // Game sidebar
        cy.contains('Test player wins!');

        // Winner appears in his color, blue
        cy.get('h3 .text-primary').contains('Test player');

        cy.contains('.sidebar', 'Test player wins');
        cy.contains('.sidebar', '24 January 2024 9:18 PM → 9:18 PM');
        cy.contains('.sidebar', 'host plays second');

        // Assert review links. Download SGF and HexWorld link.
        cy.contains('.nav-game-sidebar', 'Info').click();
        cy.contains('button', 'SGF');
        cy.contains('HexWorld').should('have.attr', 'href', 'https://hexworld.org/board/#11r7c1,g3h6i3i8b8g6d5i5e7k5c9f6e8e6e3d7a6c6h2a7i10b7b6d6c2j4d4e10b11k4');
    });

    it('displays win popin when a player resigned', () => {
        cy.mockSocketIO();

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game…');
        cy.receiveGameUpdate('game-finished/game-resigned.json');
        cy.contains('Loading game…').should('not.exist');

        // Game sidebar
        cy.contains('The winner wins!');

        // Winner appears in his color, red
        cy.get('h3 .text-danger').contains('The winner');
    });

    it('displays win popin when game has been canceled', () => {
        cy.mockSocketIO();

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game…');
        cy.receiveGameUpdate('game-finished/game-canceled.json');
        cy.contains('Loading game…').should('not.exist');

        // Game sidebar
        cy.contains('Game has been canceled.');
    });

    it('displays win popin when game has been canceled before being started', () => {
        cy.mockSocketIO();

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game…');
        cy.receiveGameUpdate('game-finished/game-not-started-canceled.json');
        cy.contains('Loading game…').should('not.exist');

        cy.contains('Cancel').should('not.exist');

        cy.get('Accept').should('not.exist');

        // Game sidebar
        cy.contains('Game has been canceled');

        cy.contains('Accept').should('not.exist');
    });

    it('as host, Cancel button no longer appears when game is already canceled', () => {
        cy.mockSocketIO();
        cy.intercept('/api/auth/me-or-guest', {
            fixture: 'game-finished/game-not-started-canceled-guest.json',
        });

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game…');
        cy.receiveGameUpdate('game-finished/game-not-started-canceled.json');
        cy.contains('Loading game…').should('not.exist');

        cy.contains('Cancel').should('not.exist');

        cy.get('Accept').should('not.exist');

        // Game sidebar
        cy.contains('Game has been canceled');
    });

    it('displays a forfeited game', () => {
        cy.mockSocketIO();

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game…');
        cy.receiveGameUpdate('game-finished/game-forfeited.json');
        cy.contains('Loading game…').should('not.exist');

        cy.contains('Cancel').should('not.exist');

        cy.get('Accept').should('not.exist');

        cy.title().should('include', 'Forfeited');

        // Game sidebar
        cy.contains('aa is declared a forfeit.');

        cy.contains('.nav-game-sidebar', 'Info').click();
        cy.contains('button', 'SGF');
        cy.contains('HexWorld').should('have.attr', 'href', 'https://hexworld.org/board/#11r7c1,g3i7j4j7g8g5d1d7a6b7k2c11f5:fw');
    });
});
