describe('Page Game', () => {
    it('displays a share link in game sidebar', () => {
        cy.intercept('/api/games/00000000-0000-0000-0000-000000000000', {
            fixture: 'game/game-playing.json',
        });

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game 00000000-0000-0000-0000-000000000000…').should('not.exist');

        cy.contains('Share game');
        // Cannot click with cypress, seems to be handled in a way it cannot make assertions.
    });

    it('shows chat message length limit when I am about to reach it, instead of crashing when sending a too long message', () => {
        cy.intercept('/api/games/00000000-0000-0000-0000-000000000000', {
            fixture: 'game/game-playing.json',
        });
        cy.intercept('/api/auth/me-or-guest', {
            fixture: 'game/me-or-guest.json',
        });

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game 00000000-0000-0000-0000-000000000000…').should('not.exist');

        cy.contains(/\d+ \/ 250 characters/).should('not.exist');
        cy.get('.chat-input input').click().type('I am writing a message too long, Quod natus vitae soluta officia. Laboriosam assumenda velit quasi et laboriosam magnam occaecati. Et similique aspernatur rerum est ipsa. Aut at ut itaque. Odio sed non qui aut minima sed vel. Deleniti illo dolorum', { timeout: 10000 });
        cy.contains('247 / 250 characters');
    });

    it('displays remaining time for both players', () => {
        cy.intercept('/api/games/00000000-0000-0000-0000-000000000000', {
            fixture: 'game/game-playing.json',
        });

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game 00000000-0000-0000-0000-000000000000…').should('not.exist');

        cy.contains('.player-a .chrono-time', '10:00');
        cy.contains('.player-b .chrono-time', /\d+/);
    });
});
