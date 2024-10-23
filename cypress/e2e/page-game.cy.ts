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
