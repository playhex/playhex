describe('Clock replay on finished game', () => {
    beforeEach(() => {
        cy.mockSocketIO();
        cy.visit('/games/00000000-0000-0000-0000-000000000000');
        cy.receiveGameUpdate('game-finished/game-finished-clock.json');
        cy.contains('Loading game…').should('not.exist');
    });

    it('shows clock time as it was at rewinded position', () => {
        // Initial clock state, shows final state
        cy.contains('.player-a .chrono-time', '0:59');
        cy.contains('.player-b .chrono-time', '0:49');

        // Enter simulation mode and go to the start (empty board)
        cy.get('body').type('{leftarrow}'); // enters simulation mode at position 29
        cy.get('.rewind-controls .btn-outline-primary').eq(0).click(); // rewind to first move (position 0)

        // Position 0: both clocks at initial time 1:00
        cy.contains('.player-a .chrono-time', '1:00');
        cy.contains('.player-b .chrono-time', '1:00');

        // Navigate to position 10
        cy.get('body').type('{rightarrow}'.repeat(10));

        // Position 10: red bot played fast, blue used ~2.7s total
        cy.contains('.player-a .chrono-time', '0:59');
        cy.contains('.player-b .chrono-time', '0:57');

        // Navigate to position 20
        cy.get('body').type('{rightarrow}'.repeat(10));

        // Position 20: blue has used ~6.1s total
        cy.contains('.player-a .chrono-time', '0:59');
        cy.contains('.player-b .chrono-time', '0:53');

        // Close rewind mode: clock should revert to final game state (from fixture timeControl)
        cy.get('.rewind-controls .btn-outline-danger').click();
        cy.contains('.player-a .chrono-time', '0:59');
        cy.contains('.player-b .chrono-time', '0:49');
    });
});
