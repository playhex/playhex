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

        cy.play(409, 326);
        cy.play(307, 270);
        cy.play(603, 329);
        cy.play(504, 279);
        cy.play(605, 440);

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

        cy.play(210, 326);
        cy.play(410, 209);
        cy.play(509, 145);
        cy.play(797, 328);
        cy.play(506, 497);
        cy.play(601, 205);
        cy.play(510, 269);
        cy.play(413, 326);

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

        cy.play(504, 152);
        cy.play(605, 323);
        cy.play(607, 208);
        cy.play(607, 439);

        cy.contains('Game finished');
        cy.contains(/Guest \d+ won the game!/);
    });
});
