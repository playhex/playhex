describe('Channel chat', () => {
    beforeEach(() => {
        cy.mockSocketIO();
        cy.intercept('/api/auth/me-or-guest', { fixture: 'game/me-or-guest.json' });
        cy.intercept('/api/player-moderation-actions', { body: [] });
        cy.intercept('/api/games?*', { body: { games: [], total: 0 } });
    });

    it('allows a non-restricted player to type in channel chat', () => {
        const player = { pseudo: 'aaa', publicId: 'e3d50579-6a8b-4ca3-a618-b2cc3e97ae30', isGuest: false, isBot: false, slug: 'aaa' };

        cy.intercept(
            '/api/players/e3d50579-6a8b-4ca3-a618-b2cc3e97ae30/has-moderation-actions',
            { body: false },
        );

        cy.visit('/');

        cy.get('.channel-card input').should('not.be.disabled');
        cy.get('.channel-card button[type=submit]').should('not.be.disabled');

        cy.mockSendChannelChat(player);

        cy.get('.channel-card input').type('Hello lobby!');
        cy.get('.channel-card button[type=submit]').click();

        cy.contains('.channel-messages', 'Hello lobby!');
        cy.get('.channel-card input').should('have.value', '');
    });

    it('disables channel chat input for a chat-blocked player', () => {
        cy.intercept(
            '/api/players/e3d50579-6a8b-4ca3-a618-b2cc3e97ae30/has-moderation-actions',
            { body: true },
        );

        cy.visit('/');

        cy.get('.channel-card input').should('be.disabled');
        cy.get('.channel-card button[type=submit]').should('be.disabled');
    });
});
