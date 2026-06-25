describe('Page Game', () => {
    it('displays a share link in game sidebar', () => {
        cy.mockSocketIO();

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game…');

        cy.receiveGameUpdate('game/game-playing.json');

        cy.contains('Loading game…').should('not.exist');

        cy.contains('.nav-game-sidebar', 'Info').click();
        cy.get('[aria-label="Share game"]').should('be.visible');
        // Cannot click with cypress, seems to be handled in a way it cannot make assertions.
    });

    it('displays remaining time for both players', () => {
        cy.mockSocketIO();

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game…');

        cy.receiveGameUpdate('game/game-playing.json');

        cy.contains('Loading game…').should('not.exist');

        cy.contains('.player-a .chrono-time', '10:00');
        cy.contains('.player-b .chrono-time', /\d+/);
    });
});

describe('Hexplorer link not visible in playing games', () => {
    beforeEach(() => {
        cy.mockSocketIO();
        cy.intercept('/api/auth/me-or-guest', { fixture: 'game/me-or-guest.json' });
        cy.visit('/games/00000000-0000-0000-0000-000000000000');
    });

    const assertHexplorerNotVisible = (): void => {
        cy.contains('Loading game…').should('not.exist');
        cy.contains('.nav-game-sidebar', 'Info').click();
        cy.contains('.sidebar a', 'Hexplorer').should('not.exist');
    };

    it('does show Hexplorer button in a playing AI game', () => {
        cy.receiveGameUpdate('game/game-playing.json');
        cy.contains('Loading game…').should('not.exist');
        cy.contains('.nav-game-sidebar', 'Info').click();
        cy.contains('.sidebar a', 'Hexplorer').should('exist');
    });

    it('does not show Hexplorer button in a playing correspondence game', () => {
        cy.receiveGameUpdate('game/game-playing-correspondence.json');
        assertHexplorerNotVisible();
    });

    it('does not show Hexplorer button in a playing live game', () => {
        cy.receiveGameUpdate('game/game-playing-live.json');
        assertHexplorerNotVisible();
    });
});
