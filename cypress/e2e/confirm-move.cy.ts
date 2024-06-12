describe('Confirm move', () => {
    it('can change "ask move confirm" parameters', () => {
        cy.visit('/');
        cy.get('.menu-top').contains(/Guest \d+/);

        // Create normal game
        cy.createAIGameWithRandom(false);

        cy
            .contains('h5', 'Play vs AI')
            .closest('.modal-content')
            .contains('Custom')
            .click()

            .closest('.modal-content')
            .get('input[type=number]')
            .clear()
            .type('11')
        ;

        cy.submitAIGame();

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

        cy.play(506, 397);

        cy.contains('Confirm move').should('not.have.attr', 'disabled');
        cy.contains('Confirm move').click();
        cy.contains('Confirm move').should('have.attr', 'disabled');
    });

    it('should show "Confirm move" button when game is not yet started to make sure it works', () => {
        cy.intercept('/api/games/4b720b93-1100-46e2-8255-24d419fa268b', {
            fixture: 'confirm-move/game-created.json',
        });
        cy.intercept('/api/auth/me-or-guest', {
            fixture: 'confirm-move/me-or-guest.json',
        });
        cy.intercept('/api/player-settings', {
            fixture: 'confirm-move/player-settings.json',
        });

        cy.visit('/games/4b720b93-1100-46e2-8255-24d419fa268b');

        cy.contains('Loading game 4b720b93-1100-46e2-8255-24d419fa268b…').should('not.exist');
        cy.contains('Confirm move').should('have.attr', 'disabled');
    });

    it('should not show "Confirm move" button when game is finished', () => {
        cy.intercept('/api/games/705e2163-9fbd-4fd7-a408-098c5919625c', {
            fixture: 'confirm-move/game-finished.json',
        });
        cy.intercept('/api/auth/me-or-guest', {
            fixture: 'confirm-move/me-or-guest.json',
        });
        cy.intercept('/api/player-settings', {
            fixture: 'confirm-move/player-settings.json',
        });

        cy.visit('/games/705e2163-9fbd-4fd7-a408-098c5919625c');

        cy.contains('Loading game 705e2163-9fbd-4fd7-a408-098c5919625c…').should('not.exist');
        cy.contains('Confirm move').should('not.exist');
    });

    it('should not show "Confirm move" button when I am watcher', () => {
        cy.intercept('/api/games/dcd1701c-dd98-4d6e-8c05-efb887419e2f', {
            fixture: 'confirm-move/game-running.json',
        });
        cy.intercept('/api/player-settings', {
            fixture: 'confirm-move/player-settings.json',
        });

        cy.visit('/games/dcd1701c-dd98-4d6e-8c05-efb887419e2f');

        cy.contains('Loading game dcd1701c-dd98-4d6e-8c05-efb887419e2f…').should('not.exist');
        cy.contains('Confirm move').should('not.exist');
    });
});
