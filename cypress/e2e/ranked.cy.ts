describe('Ranked games', () => {

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

    it('plays a ranked game vs cpu to the end', () => {
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

        cy.contains('.sidebar', 'Ranked');

        // Must play diagonal line to win both as red or blue because we can't choose our color on ranked games
        cy.play(322, 436);
        cy.play(322, 367);
        cy.play(323, 233);
        cy.play(323, 264);
        cy.play(322, 397);
        cy.play(323, 299);
        cy.play(321, 337);
        cy.play(321, 466);
        cy.play(321, 503);
        cy.play(325, 166);
        cy.play(323, 196);

        cy.contains('Game finished');
        cy.contains(/Guest \d+ won the game!/);

        cy.contains('Game finished').closest('.modal-content').contains('Close').click();

        cy.contains('.sidebar', /Determinist random bot \d+/).closest('div');
        cy.contains('.sidebar', /Guest \d+ \d+/).closest('div');
    });

    it('displays my game as a ranked one on the lobby', () => {
        cy.intercept('/api/games', { fixture: 'ranked/games.json' });
        cy.intercept('/api/online-players', { fixture: 'ranked/online-players.json' });

        cy.visit('/');

        cy
            // Waiting games
            .contains('Join a game')
            .next('div')
            .contains('Guest 2943')
            .closest('tr')
            .contains('Ranked')
        ;

        cy
            // Current games
            .contains('Watch current games')
            .next('.table-responsive')
            .contains('Guest 2943')
            .closest('tr')
            .contains('Ranked')
        ;
    });

    it('displays rankings of online players', () => {
        cy.intercept('/api/online-players', { fixture: 'ranked/online-players.json' });

        cy.visit('/');

        cy.contains('Guest 2943 ~1662');
    });
});
