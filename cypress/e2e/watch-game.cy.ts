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

    it('shows spectator count icon when spectators are present', () => {
        cy.mockSocketIO();

        cy.visit('/games/280fa373-affd-46bd-b2cd-b2cb4578bc94');

        cy.receiveGameUpdate('watch-game/game-running.json');
        cy.contains('Loading game…').should('not.exist');

        const spectator1 = {
            pseudo: 'Spectator1',
            publicId: 'aaaa-bbbb-cccc-dddd',
            isGuest: true,
            isBot: false,
            slug: 'spectator1',
            createdAt: '2024-01-24T16:33:29.586Z',
        };

        const spectator2 = {
            pseudo: 'Spectator2',
            publicId: 'eeee-ffff-0000-1111',
            isGuest: true,
            isBot: false,
            slug: 'spectator2',
            createdAt: '2024-01-24T16:33:29.586Z',
        };

        // No spectator count initially
        cy.get('.spectator-count').should('not.have.class', 'spectator-count-visible');

        // Spectator list with one spectator
        cy.receiveSocketIoMessage('spectatorList', '280fa373-affd-46bd-b2cd-b2cb4578bc94', [spectator1]);
        cy.get('.spectator-count-visible').should('contain', '1');

        // Click to open popup, verify list
        cy.get('.spectator-count-visible').click();
        cy.get('.spectator-popup-list li').should('have.length', 1).and('contain', 'Spectator1');

        // Second spectator joins
        cy.receiveSocketIoMessage('spectatorJoined', '280fa373-affd-46bd-b2cd-b2cb4578bc94', spectator2);
        cy.get('.spectator-count-visible').should('contain', '2');
        cy.get('.spectator-popup-list li').should('have.length', 2);

        // Click to close popup
        cy.get('.spectator-count-visible').click();
        cy.get('.spectator-popup').should('not.be.visible');

        // One spectator leaves
        cy.receiveSocketIoMessage('spectatorLeft', '280fa373-affd-46bd-b2cd-b2cb4578bc94', spectator1);
        cy.get('.spectator-count').should('be.visible').and('contain', '1');

        // Last spectator leaves — icon fades out, popup auto-closes
        cy.receiveSocketIoMessage('spectatorLeft', '280fa373-affd-46bd-b2cd-b2cb4578bc94', spectator2);
        cy.get('.spectator-count').should('not.have.class', 'spectator-count-visible');

        // No spectator messages in chat
        cy.contains('.chat-messages', 'started watching').should('not.exist');
        cy.contains('.chat-messages', 'stopped watching').should('not.exist');
    });
});
