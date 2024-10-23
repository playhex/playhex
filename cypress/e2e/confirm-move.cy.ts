describe('Confirm move', () => {
    it('can change "ask move confirm" parameters', () => {
        cy.visit('/');
        cy.get('.menu-top').contains(/Guest \d+/);

        // Create normal game
        cy.createAIGameWithRandom();

        // Confirm move button not there by default on normal games
        cy.contains('button', 'Cancel');
        cy.contains('Confirm move').should('not.exist');

        // Enable Confirm move in settings
        cy.contains(/Guest \d+/).click();
        cy.contains('Settings').click();

        cy.contains('Confirm move');

        cy.get('[id="confirm-move-normal"]').select('true');

        // Go back to game, Confirm move button should be there
        cy.contains(/Guest \d+/).click();
        cy.contains('Watch').click();
        cy.contains('button', 'Cancel');

        cy.contains('Confirm move').should('have.attr', 'disabled');

        cy.play(406, 397);

        cy.contains('Confirm move').should('not.have.attr', 'disabled');
        cy.contains('Confirm move').click();
        cy.contains('Confirm move').should('have.attr', 'disabled');
    });

    it('should show "Confirm move" button when game is not yet started to make sure it works', () => {
        cy.mockSocketIO();
        cy.intercept('/api/auth/me-or-guest', {
            fixture: 'confirm-move/me-or-guest.json',
        });
        cy.intercept('/api/player-settings', {
            fixture: 'confirm-move/player-settings.json',
        });

        cy.visit('/games/4b720b93-1100-46e2-8255-24d419fa268b');

        cy.contains('Loading game…');
        cy.receiveGameUpdate('confirm-move/game-created.json');
        cy.contains('Loading game…').should('not.exist');

        cy.contains('Confirm move').should('have.attr', 'disabled');
    });

    it('should not show "Confirm move" button when game is finished', () => {
        cy.mockSocketIO();
        cy.intercept('/api/auth/me-or-guest', {
            fixture: 'confirm-move/me-or-guest.json',
        });
        cy.intercept('/api/player-settings', {
            fixture: 'confirm-move/player-settings.json',
        });

        cy.visit('/games/705e2163-9fbd-4fd7-a408-098c5919625c');

        cy.contains('Loading game…');
        cy.receiveGameUpdate('confirm-move/game-finished.json');
        cy.contains('Loading game…').should('not.exist');

        cy.contains('Confirm move').should('not.exist');
    });

    it('should not show "Confirm move" button when I am watcher', () => {
        cy.mockSocketIO();
        cy.intercept('/api/player-settings', {
            fixture: 'confirm-move/player-settings.json',
        });

        cy.visit('/games/dcd1701c-dd98-4d6e-8c05-efb887419e2f');

        cy.contains('Loading game…');
        cy.receiveGameUpdate('confirm-move/game-running.json');
        cy.contains('Loading game…').should('not.exist');

        cy.contains('Confirm move').should('not.exist');
    });
});
