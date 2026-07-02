// liveInitialTimeSteps[10] = 5min, liveSecondaryTimeSteps[15] = 30s → "5min + 30s" (non-preset)
const pseudo = 'tc-' + (1E24 * Math.random()).toString(36).slice(0, 8);
const password = 'test-password';

const modal = () => cy.contains('h5', 'Play vs AI').closest('.modal-content');
const editModal = () => cy.contains('.modal-title', 'Reorganize presets').closest('.modal-content');

describe('Favorite time controls', () => {
    it('full flow: last preset, custom save, rename label, visible after reload', () => {
        cy.request('POST', '/api/auth/signup', { pseudo, password });
        cy.visit('/');
        cy.get('.menu-top').contains(pseudo);

        // 1. Create a game with "Normal 10 + 5"
        cy.createAIGameWithRandom(false);
        modal().contains('Normal 5 + 10').click();
        cy.submitAIGame();

        // 2. Go back to lobby and verify "(last)" label
        cy.visit('/');
        cy.get('.menu-top').contains(pseudo);

        cy.createAIGameWithRandom(false);
        modal().contains('Normal 5 + 10 (last)');

        // 3. Slide to a custom TC "5min + 30s"
        cy.slidePrimaryTimeControl(5, 'min');
        cy.slideSecondaryTimeControl(30, 's');

        modal().contains('5min + 30s');

        // 4. Save the custom preset: "Save" button disappears, TC becomes a regular preset
        modal().contains('button', 'Save').click();
        modal().contains('button', 'Save').should('not.exist');
        modal().contains('5min + 30s');

        // 5. Open "Edit" and rename the custom entry
        modal().contains('button', 'Reorganize').click();
        editModal().should('be.visible');

        editModal().find(`input[placeholder="5min + 30s"]`).type('Hex Monthly');
        editModal().contains('button', 'Save').click();

        // 6. Reload: favorites are fetched from the real server
        cy.reload();
        cy.get('.menu-top').contains(pseudo);

        cy.createAIGameWithRandom(false);
        modal().contains('Hex Monthly');
    });
});
