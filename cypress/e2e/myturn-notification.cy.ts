describe('My turn notification', () => {
    it('displays 1 and my color when I must play on a game', () => {
        cy.intercept('/api/games', {
            fixture: 'myturn-notification/single-games.json',
        });
        cy.intercept('/auth/guest', {
            fixture: 'myturn-notification/single-guest.json',
        });

        cy.visit('/');

        cy.contains('Guest 1817');

        cy.get('.my-turn-notif a').then($a => {
            if ('1' !== $a.text()) {
                throw new Error('I should have 1 game where it is my turn to play');
            }
        });

        cy.get('.my-turn-notif i').then($i => {
            if ($i.hasClass('bi-hexagon') || !$i.hasClass('bi-hexagon-fill')) {
                throw new Error('Notification should not be filled');
            }

            if (!$i.hasClass('text-primary') || $i.hasClass('text-danger')) {
                throw new Error('Notification should be blue');
            }
        });
    });

    it('displays 0 and default color, even when I have a canceled game', () => {
        cy.intercept('/api/games', {
            fixture: 'myturn-notification/canceled-games.json',
        });
        cy.intercept('/auth/guest', {
            fixture: 'myturn-notification/canceled-guest.json',
        });

        cy.visit('/');

        cy.contains('Guest 8201');

        cy.get('.my-turn-notif a').then($a => {
            if ('0' !== $a.text()) {
                throw new Error('I should have no game where it is my turn to play');
            }
        });

        cy.get('.my-turn-notif i').then($i => {
            if (!$i.hasClass('bi-hexagon') || $i.hasClass('bi-hexagon-fill')) {
                throw new Error('Notification should not be filled');
            }

            if ($i.hasClass('text-primary') || $i.hasClass('text-danger')) {
                throw new Error('Notification should be white');
            }
        });
    });
});
