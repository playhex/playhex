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

    it('plays a ranked game vs cpu to the end, and rematch: colors must be reversed', () => {
        cy.visit('/');
        cy.get('.menu-top').contains(/Guest \d+/);

        cy.contains('Ranked vs AI').click();

        cy
            .contains('h5', 'Ranked vs AI')
            .closest('.modal-content')
            .contains('TestBot Determinist instant')
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

        cy.contains('.sidebar', /TestBot Determinist instant loses. \d+/).closest('div');
        cy.contains('.sidebar', /Guest \d+ wins! \d+/).closest('div');
    });

    it('displays my game as a ranked one on the lobby', () => {
        cy.mockSocketIO();

        cy.visit('/');

        cy.receiveLobbyUpdate('ranked/games.json');

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
        cy.mockSocketIO();

        cy.visit('/');

        cy.receiveOnlinePlayersUpdate('ranked/online-players.json');

        cy.contains('Guest 2943 ~1662');
    });
});
