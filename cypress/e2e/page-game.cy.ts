describe('Page Game', () => {
    it('displays a share link in game sidebar', () => {
        cy.intercept('/api/games/00000000-0000-0000-0000-000000000000', {
            fixture: 'game/game-playing.json',
        });

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game 00000000-0000-0000-0000-000000000000…').should('not.exist');

        cy.get('[aria-label="Open game sidebar and chat"]').click();

        cy.contains('Share game');
        // Cannot click with cypress, seems to be handled in a way it cannot make assertions.
    });
});
