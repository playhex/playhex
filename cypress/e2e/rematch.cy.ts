describe('Rematch', () => {

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

    it('reverses colors from previous game if colors were random', () => {
        cy.visit('/');
        cy.get('.menu-top').contains(/Guest \d+/);

        cy.contains('Ranked vs AI').click();

        cy
            .contains('h5', 'Ranked vs AI')
            .closest('.modal-content')
            .contains('button', 'random')
            .click()
        ;

        cy
            .contains('h5', 'Ranked vs AI')
            .closest('.modal-content')
            .contains('Determinist')
            .click()
        ;

        cy
            .contains('h5', 'Ranked vs AI')
            .closest('.modal-content')
            .contains('button', 'Play ranked vs AI')
            .click()
        ;

        // Must play diagonal line to win both as red or blue because we can't choose our color on ranked games
        cy.play(217, 297);
        cy.play(247, 314);
        cy.play(189, 278);
        cy.play(159, 266);
        cy.play(127, 245);
        cy.play(275, 332);
        cy.play(307, 347);
        cy.play(335, 363);
        cy.play(365, 382);
        cy.play(393, 398);
        cy.play(425, 417);

        cy.contains('Game finished');
        cy.contains(/Guest \d+ wins!/);

        cy.contains('Game finished').closest('.modal-content').contains('Close').click();

        // Rematch should reverse players colors.
        let previousFirstPlayer: string;
        let currentFirstPlayer: string;

        cy
            .get('.game-info-overlay .player-a .text-danger')
            .invoke('text')
            .invoke('trim')
            .then(p => previousFirstPlayer = p)
        ;


        cy.contains('Rematch').click();
        cy.contains('.sidebar', 'Playing');

        cy
            .get('.game-info-overlay .player-a .text-danger')
            .invoke('text')
            .invoke('trim')
            .then(p => currentFirstPlayer = p)
        ;

        cy.then(() => {
            if (previousFirstPlayer === currentFirstPlayer) {
                throw new Error('Players have not switched color after rematch');
            }
        });
    });

    it('keeps same colors when "host plays first"', () => {
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

        cy.contains('Game finished').closest('.modal-content').contains('Close').click();

        // Rematch should reverse players colors.
        let previousFirstPlayer: string;
        let currentFirstPlayer: string;

        cy
            .get('.game-info-overlay .player-a .text-danger')
            .invoke('text')
            .invoke('trim')
            .then(p => previousFirstPlayer = p)
        ;


        cy.contains('Rematch').click();
        cy.contains('.sidebar', 'Playing');

        cy
            .get('.game-info-overlay .player-a .text-danger')
            .invoke('text')
            .invoke('trim')
            .then(p => currentFirstPlayer = p)
        ;

        cy.then(() => {
            if (previousFirstPlayer !== currentFirstPlayer) {
                throw new Error('Players have switched color after rematch');
            }
        });
    });
});
