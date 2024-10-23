describe('Watch game', () => {
    it('displays game, I have no current game', () => {
        cy.mockSocketIO();

        cy.visit('/games/280fa373-affd-46bd-b2cd-b2cb4578bc94');

        cy.contains('Loading game…');
        cy.receiveGameUpdate('watch-game/game-running.json');
        cy.contains('Loading game…').should('not.exist');

        cy.contains('Player A');
        cy.contains('Player B');
    });
});
