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
            .contains(/^Me$/)
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
            .click(388, 448)
            .click(400, 327)
            .click(507, 259)
            .click(502, 135)
        ;

        cy.contains('Game over');
        cy.contains(/Guest \d+ won the game !/);
    });

    it('loses vs cpu on board size 4', () => {
        cy.get('canvas')
            .click(218, 329)
            .click(260, 391)
            .click(379, 458)
            .click(491, 527)
            .click(485, 138)
            .click(716, 396)
            .click(625, 336)
        ;

        cy.contains('Game over');
        cy.contains('Determinist random bot won the game !');
    });
});
