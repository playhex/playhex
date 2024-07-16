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
        cy.intercept('/api/games/00000000-0000-0000-0000-000000000000', {
            fixture: 'chat/game-playing.json',
        });

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game 00000000-0000-0000-0000-000000000000…').should('not.exist');

        cy.contains(/\d+:48 Guest 7614 Hello, I am a watcher/);
        cy.contains(/\d+:48 Guest 6569 Hi, I am your opponent, ready \?/);
        cy.contains(/\d+:49 aaa Hello, ready. Let's play/);

        cy.contains('.chat-messages .text-body', 'Guest 7614');
        cy.contains('.chat-messages .text-primary', 'Guest 6569');
        cy.contains('.chat-messages .text-danger', 'aaa');

        cy.contains('Close').click();

        cy.contains('.chat-messages .text-body', 'Guest 7614').should('not.visible');
    });
});
