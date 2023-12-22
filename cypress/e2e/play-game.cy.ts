describe('Play a game to the end', () => {
    beforeEach(() => {
        cy.visit('/');
        cy.get('.menu-top').contains(/Guest \d+/);

        cy.contains('Play vs AI').click();

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
            .contains(/^First$/)
            .click()

            .closest('.modal-content')
            .contains('Play vs AI')
            .click()
        ;

        cy.contains('Determinist random bot');
    });

    /*
        // Coordinates generated with this code placed on "PagePlayRemote.vue" file:

        const clickHistory: { x: number, y: number }[] = [];
        window.onclick = ({ clientX, clientY }) => {
            clickHistory.push({ x: clientX, y: clientY });

            console.log(
                "cy.get('canvas')\n"
                    + clickHistory
                        .map(c => `    .click(${c.x}, ${c.y})`)
                        .join('\n')
                    + "\n;\n"
                ,
            );
        };
    */

    it('wins vs cpu on board size 4', () => {
        cy.get('canvas')
            .click(502, 257)
            .click(504, 384)
            .click(409, 203)
            .click(616, 449)
        ;

        cy.contains('Game over');
        cy.contains(/Guest \d+ won the game !/);
    });

    it('loses vs cpu on board size 4', () => {
        cy.get('canvas')
            .click(289, 258)
            .click(615, 454)
            .click(721, 383)
            .click(828, 320)
            .click(179, 316)
            .click(722, 259)
            .click(395, 196)
        ;

        cy.contains('Game over');
        cy.contains('Determinist random bot won the game !');
    });
});
