describe('Watch game', () => {
    it.only('displays game, I have no current game', () => {
        cy.intercept('/api/games/00000000-0000-0000-0000-000000000000', {
            fixture: 'watch-game/game-running.json',
        });

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game 00000000-0000-0000-0000-000000000000…').should('not.exist');

        cy.contains('Player A');
        cy.contains('Player B');
    });
});
