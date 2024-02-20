const randomString = (): string => (1E24 * Math.random()).toString(36);

describe('Authentication', () => {
    it('see profile page, signup, see profile page again, logout, login', () => {
        cy.visit('/');

        const pseudo = 'test-' + randomString();
        const password = 'test-password';

        // Show guest profile page
        cy
            .get('.menu-top')
            .contains(/Guest \d+/)
            .click()
        ;

        cy.contains('h2', /Guest \d+/);

        // Create account
        cy
            .contains('Create account')
            .click()
        ;

        cy
            .contains('h2', 'Create an account')
            .closest('form')
            .contains('Pseudo')
            .click()
            .type(pseudo)
        ;

        cy
            .contains('h2', 'Create an account')
            .closest('form')
            .contains('Password')
            .click()
            .type(password)
        ;

        cy
            .contains('Create account')
            .click()
        ;

        // Account created, logged in. Show profile page
        cy
            .get('.menu-top')
            .contains(pseudo)
            .click()
        ;

        cy.contains('h2', pseudo);

        // Logout
        cy
            .contains('Logout')
            .click()
        ;

        cy
            .get('.menu-top')
            .contains(/Guest \d+/)
            .click()
        ;

        cy.contains('h2', /Guest \d+/);

        // Login
        cy
            .contains('Login')
            .click()
        ;

        cy
            .contains('h2', 'Login')
            .closest('form')
            .contains('Pseudo')
            .click()
            .type(pseudo)
        ;

        cy
            .contains('h2', 'Login')
            .closest('form')
            .contains('Password')
            .click()
            .type(password)
        ;

        cy
            .contains('button', 'Login')
            .click()
        ;

        cy
            .get('.menu-top')
            .contains(pseudo)
        ;
    });

    it('displays invalid pseudo error', () => {
        cy.visit('/');

        cy
            .get('.menu-top')
            .contains(/Guest \d+/)
            .click()
        ;

        cy
            .contains('Login')
            .click()
        ;

        cy
            .contains('h2', 'Login')
            .closest('form')
            .contains('Pseudo')
            .click()
            .type(randomString())
        ;

        cy
            .contains('h2', 'Login')
            .closest('form')
            .contains('Password')
            .click()
            .type('anyway')
        ;

        cy
            .contains('button', 'Login')
            .click()
        ;

        cy.contains('No player with this pseudo');
    });

    it('displays invalid password error', () => {
        cy.intercept('/api/auth/login', {
            fixture: 'auth/invalid-password.json',
            statusCode: 403,
        });

        cy.visit('/');

        cy
            .get('.menu-top')
            .contains(/Guest \d+/)
            .click()
        ;

        cy
            .contains('Login')
            .click()
        ;

        cy
            .contains('h2', 'Login')
            .closest('form')
            .contains('Pseudo')
            .click()
            .type('mocked-anyway')
        ;

        cy
            .contains('h2', 'Login')
            .closest('form')
            .contains('Password')
            .click()
            .type('mocked-anyway')
        ;

        cy
            .contains('button', 'Login')
            .click()
        ;

        cy.contains('Invalid password for this player');
    });

    it('requires a valid password on signup', () => {
        cy.visit('/signup');

        // Create account
        cy
            .contains('Create account')
            .click()
        ;

        cy
            .contains('h2', 'Create an account')
            .closest('form')
            .contains('Pseudo')
            .click()
            .type('-')
        ;

        cy
            .contains('h2', 'Create an account')
            .closest('form')
            .contains('Password')
            .click()
            .type('password')
        ;

        cy
            .contains('Create account')
            .click()
        ;

        cy.contains('Pseudo is invalid');
    });

    it('says that pseudo is already taken', () => {
        cy.intercept('/api/auth/signup-from-guest', {
            fixture: 'auth/pseudo-already-taken.json',
            statusCode: 409,
        });

        cy.visit('/signup');

        // Create account
        cy
            .contains('Create account')
            .click()
        ;

        cy
            .contains('h2', 'Create an account')
            .closest('form')
            .contains('Pseudo')
            .click()
            .type('already-taken-mocked')
        ;

        cy
            .contains('h2', 'Create an account')
            .closest('form')
            .contains('Password')
            .click()
            .type('anyway-mocked')
        ;

        cy
            .contains('Create account')
            .click()
        ;

        cy.contains('This pseudo is already used by another player');
    });

    it('should not return password not player id in api results', () => {
        cy.visit('/');

        /*
         * On player create response
         */
        cy.request('POST', '/api/auth/me-or-guest').as('playerResponse');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cy.get('@playerResponse').then((playerResponse: any) => {
            assert.strictEqual(playerResponse.isOkStatusCode, true);

            const player = playerResponse.body;

            assert.doesNotHaveAnyKeys(player, ['id', 'password']);

            /*
            * On player create response
            */
            cy.request('GET', `/api/players/${player.publicId}`).as('meResponse');

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cy.get('@meResponse').then((meResponse: any) => {
                assert.strictEqual(meResponse.isOkStatusCode, true);

                const player = meResponse.body;

                assert.doesNotHaveAnyKeys(player, ['id', 'password']);
            });
        });

        /*
         * On game create (host, players)
         */
        cy.request('POST', '/api/games', {
            opponent: {
                type: 'ai',
            },
            timeControl: {
                type: 'fischer',
                options: {
                    initialSeconds: 600,
                    incrementSeconds: 5,
                    maxSeconds: 600,
                },
            },
        }).as('gameResponse');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cy.get('@gameResponse').then((gameResponse: any) => {
            assert.strictEqual(gameResponse.isOkStatusCode, true);

            const game = gameResponse.body;

            assert.doesNotHaveAnyKeys(game.host, ['id', 'password']);
            assert.doesNotHaveAnyKeys(game.players[0], ['id', 'password']);
            assert.doesNotHaveAnyKeys(game.players[1], ['id', 'password']);
        });

        /*
         * On persisted games (host, players)
         */
        cy.request('GET', '/api/games?type=ended&take=5').as('persistedGamesResponse');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cy.get('@persistedGamesResponse').then((persistedGamesResponse: any) => {
            assert.strictEqual(persistedGamesResponse.isOkStatusCode, true);

            const persistedGames = persistedGamesResponse.body;

            if (0 === persistedGames.length) {
                Cypress.log({
                    displayName: '⚠ WARNING ⚠',
                    message: 'No persisted game to make assertions. Cannot fully test this case.',
                });

                return;
            }

            for (let i = 0; i < persistedGames.length; ++i) {
                assert.doesNotHaveAnyKeys(persistedGames[i].host, ['id', 'password']);
                assert.doesNotHaveAnyKeys(persistedGames[i].players[0], ['id', 'password']);
                assert.doesNotHaveAnyKeys(persistedGames[i].players[1], ['id', 'password']);
            }
        });
    });
});
