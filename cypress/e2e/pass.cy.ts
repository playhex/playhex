describe('Pass', () => {

    it('allows to pass', () => {
        cy.visit('/');

        cy.createAIGameWithRandom();

        cy.contains('.sidebar', 'Playing');
        cy.get('[aria-label="Secondary actions"]').click();
        cy.contains('button', 'Pass').click();

        cy.contains('Pass my turn?');
        cy.contains('Yes, pass').click();

        cy.wait(200); // Wait to make sure cypress capture js error and fail if any
    });

    it('allows to pass when I play second, i.e pass is disabled when not my turn, then is enabled when I can play', () => {
        cy.visit('/');

        cy.createAIGameWithRandom(false, true);
        cy.contains('More options').click();
        cy.contains('Second').click();
        cy.submitAIGame();

        // I can't pass while waiting for opponent's first move
        cy.get('[aria-label="Secondary actions"]').click();
        cy.contains('Pass').should('have.attr', 'disabled');

        cy.wait(1200); // Wait for random bot move

        // Now I can pass
        cy.get('[aria-label="Secondary actions"]').click();
        cy.contains('Pass').should('not.have.attr', 'disabled');

        // Try again after rematch
        cy.play(236, 308);
        cy.contains('Resign').click();
        cy.contains('Yes, I resign').click();
        cy.contains('Game finished');
        cy.contains('.modal-content .modal-footer', 'Close').click();
        cy.contains('Rematch').click();
        cy.contains('.sidebar', 'Playing');

        // I can't pass while waiting for opponent's first move
        cy.get('[aria-label="Secondary actions"]').click();
        cy.contains('Pass').should('have.attr', 'disabled');

        cy.wait(1200); // Wait for random bot move

        // Now I can pass
        cy.get('[aria-label="Secondary actions"]').click();
        cy.contains('Pass').should('not.have.attr', 'disabled');
    });

});
