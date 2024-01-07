const isEmptyHexagon = ($element: JQuery<HTMLElement>): boolean => {
    return $element.find('path').attr('d')?.startsWith('M14 4.577v6.846L8 15l-6-3.577V4.577L8') ?? false;
};

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

        cy.get('.my-turn-notif svg').then($element => {
            if (isEmptyHexagon($element)) {
                throw new Error('Notification should be filled');
            }

            if (!$element.hasClass('text-primary') || $element.hasClass('text-danger')) {
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

        cy.get('.my-turn-notif svg').then($element => {
            if (!isEmptyHexagon($element)) {
                throw new Error('Notification should be empty');
            }

            if ($element.hasClass('text-primary') || $element.hasClass('text-danger')) {
                throw new Error('Notification should be white');
            }
        });
    });
});
