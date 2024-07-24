describe('Undo', () => {

    it('allows to accept or reject opponent undo request', () => {
        cy.intercept('/api/auth/me-or-guest', { fixture: 'undo/me.json' });
        cy.intercept('/api/games/09d21b8a-814c-4a57-877c-46e0044641c0', { fixture: 'undo/game-with-undo-request.json' });

        cy.visit('/games/09d21b8a-814c-4a57-877c-46e0044641c0');

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

        cy.contains('Undo').click();

        cy.wait(500); // Wait to make sure cypress capture js error and fail if any
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

        cy.contains('Undo').click();

        cy.wait(500); // Wait to make sure cypress capture js error and fail if any
    });
});
