describe('Watch game', () => {
    it('displays game, I have no current game', () => {
        cy.mockSocketIO();

        cy.visit('/games/280fa373-affd-46bd-b2cd-b2cb4578bc94');

        cy.contains('Loading game…');
        cy.receiveGameUpdate('watch-game/game-running.json');
        cy.contains('Loading game…').should('not.exist');

        cy.contains('Player A');
        cy.contains('Player B');
    });

    it('does not display buttons like "Resign"', () => {
        cy.mockSocketIO();

        cy.visit('/games/280fa373-affd-46bd-b2cd-b2cb4578bc94');

        cy.contains('Loading game…');
        cy.receiveGameUpdate('watch-game/game-running.json');
        cy.contains('Loading game…').should('not.exist');
        cy.contains('Offline').should('not.exist');

        cy.contains('.menu-game button', 'Resign', { timeout: 100 }).should('not.exist');
    });

    it('shows spectator joined and left messages in chat', () => {
        cy.mockSocketIO();

        cy.visit('/games/280fa373-affd-46bd-b2cd-b2cb4578bc94');

        cy.receiveGameUpdate('watch-game/game-running.json');
        cy.contains('Loading game…').should('not.exist');

        const spectator = {
            pseudo: 'Spectator1',
            publicId: 'aaaa-bbbb-cccc-dddd',
            isGuest: true,
            isBot: false,
            slug: 'spectator1',
            createdAt: '2024-01-24T16:33:29.586Z',
        };

        cy.receiveSocketIoMessage('spectatorJoined', '280fa373-affd-46bd-b2cd-b2cb4578bc94', spectator);
        cy.contains('.chat-messages', 'Spectator1 started watching');

        cy.receiveSocketIoMessage('spectatorLeft', '280fa373-affd-46bd-b2cd-b2cb4578bc94', spectator);
        cy.contains('.chat-messages', 'Spectator1 stopped watching');
    });
});
