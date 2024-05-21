describe('Time controls', () => {
    beforeEach(() => {
        cy.visit('/');
        cy.get('.menu-top').contains(/Guest \d+/);

        cy.createAIGameWithRandom(false);

        cy
            .contains('Game options')
            .closest('.modal-content')
            .contains('Custom')
            .click()

            .closest('.modal-content')
            .contains('More options')
            .click()
        ;

        // I must play first to keep full time for my opponent and make assertions on his time
        cy
            .contains('Game options')
            .closest('.modal-content')
            .contains(/^First$/)
            .click()
        ;
    });

    it('create a game with default 10 minutes for each player', () => {
        cy
            .contains('Game options')
            .closest('.modal-content')

            .contains('Time control')
            .closest('div')
            .contains('Normal 10 + 5')
            .click()
        ;

        cy.submitAIGame();

        cy.contains('Determinist random bot');
        cy.contains('10:00');
    });

    it('create a game with default 5 minutes for each player', () => {
        cy
            .contains('Game options')
            .closest('.modal-content')

            .contains('Time control')
            .closest('div')
            .contains('Fast 5 + 2')
            .click()
        ;

        cy.submitAIGame();

        cy.contains('Determinist random bot');
        cy.contains('5:00');
    });

    it('create a game with custom time control, Byo Yomi', () => {
        cy
            .contains('Game options')
            .closest('.modal-content')

            .contains('Time control')
            .closest('div')
            .contains('Custom')
            .click()
        ;

        cy
            .contains('Game options')
            .closest('.modal-content')
            .contains('Use Byo-Yomi')
            .click()
        ;

        cy.contains('Periods:');

        cy.submitAIGame();

        cy.contains('Determinist random bot');
        cy.contains('10:00 + 5 × 5s');
    });

    it('create a game with custom time control, Fischer', () => {
        cy
            .contains('Game options')
            .closest('.modal-content')

            .contains('Time control')
            .closest('div')
            .contains('Custom')
            .click()
        ;

        cy.submitAIGame();

        cy.contains('Determinist random bot');
        cy.contains('10:00');
    });
});
