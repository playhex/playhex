const hasOnlyClass = (
    $element: JQuery<HTMLElement>,
    classname: 'text-danger' | 'text-primary' | 'text-secondary',
): boolean => [
    'text-danger',
    'text-primary',
    'text-secondary',
].every(
    c => !['text-danger', 'text-primary', 'text-secondary'].includes(classname)
        || $element.hasClass(c) === (c === classname)
    ,
);

const isEmptyHexagon = ($element: JQuery<HTMLElement>): boolean => {
    return $element.find('path').attr('d')?.startsWith('M14 4.577v6.846L8 15l-6-3.577V4.577L8') ?? false;
};

describe('My turn notification', () => {
    it('displays 1 and my color when I must play on a game', () => {
        cy.intercept('/api/games', {
            fixture: 'myturn-notification/single-games.json',
        });
        cy.intercept('/api/auth/me-or-guest', {
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
            if (!hasOnlyClass($element, 'text-primary')) {
                throw new Error('Notification should be blue');
            }

            if (isEmptyHexagon($element)) {
                throw new Error('Hexagon should be filled');
            }
        });
    });

    it('displays 0 and default color, even when I have a canceled game', () => {
        cy.intercept('/api/games', {
            fixture: 'myturn-notification/canceled-games.json',
        });
        cy.intercept('/api/auth/me-or-guest', {
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
            if (!hasOnlyClass($element, 'text-secondary')) {
                throw new Error('Notification should be grey');
            }

            if (isEmptyHexagon($element)) {
                throw new Error('Hexagon should be filled');
            }
        });
    });

    it('displays 1 and my color, empty hexagon, when I have a running game, but not my turn', () => {
        cy.intercept('/api/games', {
            fixture: 'myturn-notification/not-my-turn-games.json',
        });
        cy.intercept('/api/auth/me-or-guest', {
            fixture: 'myturn-notification/not-my-turn-guest.json',
        });

        cy.visit('/');

        cy.contains('Guest 3248');

        cy.get('.my-turn-notif a').then($a => {
            if ('0' !== $a.text()) {
                throw new Error('I should have no game where it is my turn to play');
            }
        });

        cy.get('.my-turn-notif svg').then($element => {
            if (!hasOnlyClass($element, 'text-danger')) {
                throw new Error('Notification should be red');
            }

            if (!isEmptyHexagon($element)) {
                throw new Error('Hexagon should be empty');
            }
        });
    });

    it('displays 1 and my color when I just created a game VS AI and I play first', () => {
        cy.visit('/');
        cy.get('.menu-top').contains(/Guest \d+/);

        cy.createAIGameWithRandom(false);

        cy
            .contains('Game options')
            .closest('.modal-content')
            .contains('Custom')
            .click()

            .closest('.modal-content')
            .contains('More options')
            .click()
        ;

        cy
            .contains('Game options')
            .closest('.modal-content')
            .contains(/^First$/)
            .click()
        ;

        cy.submitAIGame();

        cy.contains('random bot');

        cy.get('.my-turn-notif a').then($a => {
            if ('1' !== $a.text()) {
                throw new Error('I should have one game where I have to play');
            }
        });

        cy.get('.my-turn-notif svg').then($element => {
            if (!hasOnlyClass($element, 'text-danger')) {
                throw new Error('Notification should be red');
            }

            if (isEmptyHexagon($element)) {
                throw new Error('Hexagon should not be empty');
            }
        });
    });
});
