describe('Moderation overlay', () => {
    beforeEach(() => {
        cy.intercept('/api/auth/me-or-guest', { fixture: 'game/me-or-guest.json' });
        cy.intercept('PATCH', '/api/player-moderation-actions/*/acknowledge', { statusCode: 204 });
    });

    it('shows chat restriction with reason, details and related messages, and is acked', () => {
        cy.intercept('/api/player-moderation-actions', { fixture: 'moderation/chat-restricted.json' });

        cy.visit('/');

        cy.contains('.modal-body', 'chat access has been restricted until');
        cy.contains('.modal-body', 'This is a warning.').should('not.exist');

        cy.contains('.modal-body', 'Reason');
        cy.contains('.modal-body', 'Insults or inappropriate behavior in chat');

        cy.contains('.modal-body', 'Details');
        cy.contains('.modal-body', 'You insulted your opponent during the game.');

        cy.contains('.modal-body', 'Related messages');
        cy.contains('.list-group-item', 'u suck');
        cy.contains('.list-group-item', 'get rekt');
        cy.contains('.list-group-item strong', 'aaa');


        cy.contains('.modal', 'Moderation notice');
        cy.contains('I have read and understood').click();

        cy.get('.modal').should('not.exist');
    });

    it('calls the acknowledge API when chat restriction action is acknowledged', () => {
        cy.intercept('/api/player-moderation-actions', { fixture: 'moderation/chat-restricted.json' });
        cy.intercept(
            'PATCH',
            '/api/player-moderation-actions/aaaaaaaa-0000-0000-0000-000000000002/acknowledge',
            { statusCode: 204 },
        ).as('acknowledge');

        cy.visit('/');

        cy.contains('I have read and understood').click();
        cy.wait('@acknowledge');
    });

    it('shows warning, chat restriction and reasons are optional', () => {
        cy.intercept('/api/player-moderation-actions', { fixture: 'moderation/warning-only.json' });

        cy.visit('/');

        cy.contains('.modal-header', 'Moderation notice');
        cy.contains('.modal-body', 'This is a warning.');

        cy.contains('.modal-body', 'chat access has been restricted').should('not.exist');
        cy.contains('.modal-body', 'Reason').should('not.exist');
        cy.contains('.modal-body', 'Details').should('not.exist');
        cy.contains('.modal-body', 'Related messages').should('not.exist');

        cy.contains('.modal', 'I have read and understood');

        cy.contains('.modal', 'Moderation notice');
        cy.contains('I have read and understood').click();

        cy.get('.modal').should('not.exist');
    });

    it('does not show overlay when no pending moderation actions', () => {
        cy.intercept('/api/player-moderation-actions', { body: [] }).as('modActions');

        cy.visit('/');

        cy.wait('@modActions');

        cy.get('.modal').should('not.exist');
    });
});
