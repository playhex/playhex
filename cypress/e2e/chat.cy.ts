describe('Chat', () => {
    it('can post chat message', () => {
        cy.visit('/');
        cy.get('.menu-top').contains(/Guest \d+/);

        cy.createAIGameWithRandom();

        cy.get('.chat-input input').type('Hello, have a good game!');
        cy.contains('.chat-input button', 'Send').click();

        cy.contains('.chat-messages', /\d+:\d+ Guest \d+ Hello, have a good game!/);
        cy.get('.chat-input input').should('have.value', '');

        // Chat messages stays after page refresh
        cy.reload();
        cy.contains('.chat-messages', /\d+:\d+ Guest \d+ Hello, have a good game!/);
    });

    it('shows previous chat message on game page load', () => {
        cy.mockSocketIO();
        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game…');
        cy.receiveGameUpdate('chat/game-playing.json');
        cy.contains('Loading game…').should('not.exist');

        cy.contains(/\d+:48 Guest 7614 Hello, I am a watcher/);
        cy.contains(/\d+:48 Guest 6569 Hi, I am your opponent, ready \?/);
        cy.contains(/\d+:49 aaa Hello, ready. Let's play/);

        cy.contains('.chat-messages .text-body', 'Guest 7614');
        cy.contains('.chat-messages .text-primary', 'Guest 6569');
        cy.contains('.chat-messages .text-danger', 'aaa');

        cy.contains('Close').click();

        cy.contains('.chat-messages .text-body', 'Guest 7614').should('not.visible');
    });

    it('shows chat message length limit when I am about to reach it, instead of crashing when sending a too long message', () => {
        cy.mockSocketIO();
        cy.intercept('/api/auth/me-or-guest', {
            fixture: 'game/me-or-guest.json',
        });

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game…');
        cy.receiveGameUpdate('chat/game-playing.json');
        cy.contains('Loading game…').should('not.exist');

        cy.contains(/\d+ \/ 250 characters/).should('not.exist');
        cy.get('.chat-input input').click().type('I am writing a message too long, Quod natus vitae soluta officia. Laboriosam assumenda velit quasi et laboriosam magnam occaecati. Et similique aspernatur rerum est ipsa. Aut at ut itaque. Odio sed non qui aut minima sed vel. Deleniti illo dolorum', { timeout: 10000 });
        cy.contains('247 / 250 characters');
    });
});
