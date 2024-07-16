describe('Play a game to the end', () => {
    beforeEach(() => {
        cy.visit('/');
        cy.get('.menu-top').contains(/Guest \d+/);

        cy.createAIGameWithRandom(false);

        cy
            .contains('h5', 'Play vs AI')
            .closest('.modal-content')
            .contains('Custom')
            .click()

            .closest('.modal-content')
            .get('input[type=number]')
            .clear()
            .type('4')

            .closest('.modal-content')
            .contains('More options')
            .click()
        ;
    });

    /*
        // Coordinates generated with this code placed on "PagePlayRemote.vue" file:

        const clickHistory: { x: number, y: number }[] = [];
        window.onclick = ({ clientX, clientY }) => {
            clickHistory.push({ x: clientX, y: clientY });

            console.log(
                clickHistory
                    .map(c => `cy.play(${c.x}, ${c.y});\n`)
                    .join('')
                ,
            );
        };
    */

    it('wins vs cpu on board size 4', () => {
        cy
            .contains('h5', 'Play vs AI')
            .closest('.modal-content')
            .contains(/^First$/)
            .click()
        ;

        cy.submitAIGame();

        cy.play(339, 284);
        cy.play(336, 382);
        cy.play(254, 236);
        cy.play(420, 427);

        cy.contains('Game finished');
        cy.contains(/Guest \d+ won the game!/);
    });

    it('loses vs cpu on board size 4', () => {
        cy
            .contains('h5', 'Play vs AI')
            .closest('.modal-content')
            .contains(/^First$/)
            .click()
        ;

        cy.submitAIGame();

        cy.play(170, 385);
        cy.play(504, 283);
        cy.play(505, 383);
        cy.play(341, 381);
        cy.play(251, 430);
        cy.play(425, 436);

        cy.contains('Game finished');
        cy.contains('Determinist random bot won the game!');
    });

    it('uses swap rule and wins on board size 4', () => {
        cy
            .contains('h5', 'Play vs AI')
            .closest('.modal-content')
            .contains(/^Second$/)
            .click()
        ;

        cy.submitAIGame();

        cy.play(336, 182);
        cy.play(339, 282);
        cy.play(342, 182);
        cy.play(422, 329);
        cy.play(422, 432);

        cy.contains('Game finished');
        cy.contains(/Guest \d+ won the game!/);
    });
});
