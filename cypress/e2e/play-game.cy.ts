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

        cy.play(236, 308);
        cy.play(321, 355);
        cy.play(399, 305);
        cy.play(153, 259);

        cy.contains('Game finished');
        cy.contains(/Guest \d+ wins!/);
    });

    it('loses vs cpu on board size 4', () => {
        cy
            .contains('h5', 'Play vs AI')
            .closest('.modal-content')
            .contains(/^First$/)
            .click()
        ;

        cy.submitAIGame();

        cy.play(156, 355);
        cy.play(236, 303);
        cy.play(233, 404);
        cy.play(321, 450);
        cy.play(233, 214);
        cy.play(316, 164);

        cy.contains('Game finished');
        cy.contains('TestBot Determinist instant wins!');
    });

    it('uses swap rule and wins on board size 4', () => {
        cy
            .contains('h5', 'Play vs AI')
            .closest('.modal-content')
            .contains(/^Second$/)
            .click()
        ;

        cy.submitAIGame();

        cy.play(154, 256);
        cy.play(316, 261);
        cy.play(319, 352);
        cy.play(236, 217);

        cy.contains('Game finished');
        cy.contains(/Guest \d+ wins!/);
    });
});
