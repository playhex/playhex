describe('Play a game to the end', () => {
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
                "cy.get('canvas');\ncy.get('body')\n"
                    + clickHistory
                        .map(c => `    .click(${c.x}, ${c.y})`)
                        .join('\n')
                    + '\n;\n'
                ,
            );
        };
    */

    it('wins vs cpu on board size 4', () => {
        cy
            .contains('Game options')
            .closest('.modal-content')
            .contains(/^First$/)
            .click()
        ;

        cy.submitAIGame();

        cy.get('canvas');
        cy.get('body')
            .click(409, 326)
            .click(307, 270)
            .click(603, 329)
            .click(504, 279)
            .click(605, 440)
        ;

        cy.contains('Game finished');
        cy.contains(/Guest \d+ won the game!/);
    });

    it('loses vs cpu on board size 4', () => {
        cy
            .contains('Game options')
            .closest('.modal-content')
            .contains(/^First$/)
            .click()
        ;

        cy.submitAIGame();

        cy.get('canvas');
        cy.get('body')
            .click(210, 326)
            .click(410, 209)
            .click(509, 145)
            .click(797, 328)
            .click(506, 497)
            .click(601, 205)
            .click(510, 269)
            .click(413, 326)
        ;

        cy.contains('Game finished');
        cy.contains('Determinist random bot won the game!');
    });

    it('uses swap rule and wins on board size 4', () => {
        cy
            .contains('Game options')
            .closest('.modal-content')
            .contains(/^Second$/)
            .click()
        ;

        cy.submitAIGame();

        cy.get('canvas');
        cy.get('body')
            .click(504, 152)
            .click(605, 323)
            .click(607, 208)
            .click(607, 439)
        ;

        cy.contains('Game finished');
        cy.contains(/Guest \d+ won the game!/);
    });
});
