describe('Undo', () => {

    it('allows to accept or reject opponent undo request', () => {
        cy.mockSocketIO();
        cy.intercept('/api/auth/me-or-guest', { fixture: 'undo/me.json' });

        cy.visit('/games/09d21b8a-814c-4a57-877c-46e0044641c0');

        cy.receiveGameUpdate('undo/game-with-undo-request.json');

        cy.contains('.sidebar', 'Playing');

        cy.contains('.menu-game', 'Accept undo');
        cy.contains('.menu-game', 'Reject');
    });

    it('player undo his swap move', () => {
        cy.visit('/');

        cy.createAIGameWithRandom(false);

        cy
            .contains('h5', 'Play vs AI')
            .closest('.modal-content')
            .contains('More options')
            .click()
        ;

        cy.contains('.modal-content .btn', 'First').click();

        cy.submitAIGame();

        cy.contains('.sidebar', 'Playing');

        cy.play(367, 390);

        cy.wait(50); // Wait AI plays

        cy.get('[aria-label="Secondary actions"]').click();
        cy.contains('Takeback').click();

        cy.contains(/Guest \d+ took back their move/);

        cy.wait(200); // Wait to make sure cypress capture js error and fail if any
    });

    it('player undo his swap move after opponent played', () => {
        cy.visit('/');

        cy.createAIGameWithRandom(false);

        cy
            .contains('h5', 'Play vs AI')
            .closest('.modal-content')
            .contains('More options')
            .click()
        ;

        cy.contains('.modal-content .btn', 'Second').click();

        cy.submitAIGame();

        cy.contains('.sidebar', 'Playing');

        cy.play(276, 259);

        cy.wait(50); // Wait AI plays

        cy.get('[aria-label="Secondary actions"]').click();
        cy.contains('Takeback').click();

        cy.contains(/Guest \d+ took back their move/);

        cy.wait(200); // Wait to make sure cypress capture js error and fail if any
    });

    it('player plays, and undo his move before opponent played', () => {
        cy.visit('/');

        cy.createAIGameWithRandom(false, true);

        cy
            .contains('h5', 'Play vs AI')
            .closest('.modal-content')
            .contains('More options')
            .click()
        ;

        cy.contains('.modal-content .btn', 'First').click();

        cy.submitAIGame();

        cy.contains('.sidebar', 'Playing');

        cy.play(367, 390);

        cy.wait(50); // Wait AI plays

        cy.get('[aria-label="Secondary actions"]').click();
        cy.contains('Takeback').click();

        cy.contains(/Guest \d+ took back their move/);

        cy.wait(200); // Wait to make sure cypress capture js error and fail if any

        // Pass button is not disabled, and I can pass
        cy.get('[aria-label="Secondary actions"]').click();
        cy.contains('Pass').should('be.enabled').click();
        cy.contains('Yes, pass').click();
        cy.wait(50);
        cy.contains(/passed his turn/, { timeout: 100 }).should('not.exist'); // should only appear when opponent pass his turn, not me
    });
});
