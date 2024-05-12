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
            .contains('Username')
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
            .contains('Sign up')
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
            .contains('Log out')
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
            .contains('Log in')
            .click()
        ;

        cy
            .contains('h2', 'Log in')
            .closest('form')
            .contains('Username')
            .click()
            .type(pseudo)
        ;

        cy
            .contains('h2', 'Log in')
            .closest('form')
            .contains('Password')
            .click()
            .type(password)
        ;

        cy
            .contains('button', 'Log in')
            .click()
        ;

        cy
            .get('.menu-top')
            .contains(pseudo)
        ;
    });

    it('displays invalid username error', () => {
        cy.visit('/');

        cy
            .get('.menu-top')
            .contains(/Guest \d+/)
            .click()
        ;

        cy
            .contains('Log in')
            .click()
        ;

        cy
            .contains('h2', 'Log in')
            .closest('form')
            .contains('Username')
            .click()
            .type(randomString())
        ;

        cy
            .contains('h2', 'Log in')
            .closest('form')
            .contains('Password')
            .click()
            .type('anyway')
        ;

        cy
            .contains('button', 'Log in')
            .click()
        ;

        cy.contains('No player with this username');
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
            .contains('Log in')
            .click()
        ;

        cy
            .contains('h2', 'Log in')
            .closest('form')
            .contains('Username')
            .click()
            .type('mocked-anyway')
        ;

        cy
            .contains('h2', 'Log in')
            .closest('form')
            .contains('Password')
            .click()
            .type('mocked-anyway')
        ;

        cy
            .contains('button', 'Log in')
            .click()
        ;

        cy.contains('Invalid password for this account');
    });

    it('requires a valid password on signup', () => {
        cy.visit('/signup');

        // Create account
        cy
            .contains('Sign up')
            .click()
        ;

        cy
            .contains('h2', 'Create an account')
            .closest('form')
            .contains('Username')
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
            .contains('button', 'Sign up')
            .click()
        ;

        cy.contains('Username is invalid');
    });

    it('says that username is already taken', () => {
        cy.intercept('/api/auth/signup-from-guest', {
            fixture: 'auth/pseudo-already-taken.json',
            statusCode: 409,
        });

        cy.visit('/signup');

        // Create account
        cy
            .contains('Sign up')
            .click()
        ;

        cy
            .contains('h2', 'Create an account')
            .closest('form')
            .contains('Username')
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
            .contains('button', 'Sign up')
            .click()
        ;

        cy.contains('This username is already used by another player');
    });

    it('sign up and change password', () => {
        const pseudo = 'test-' + randomString();
        const password = 'test';

        cy.visit('/signup');

        const signupForm = () => cy.contains('h2', 'Create an account').closest('form');
        signupForm().contains('Username').click().type(pseudo);
        signupForm().contains('Password').click().type(password);
        signupForm().contains('button', 'Sign up').click();

        cy.get('.menu-top').contains(pseudo).click();
        cy.contains('Settings').click();

        cy.contains('h3', 'Change password').closest('form').as('form');

        // Invalid old password should fail
        cy.get('@form').contains('Old password').click().type('invalidpwd');
        cy.get('@form').contains('New password').click().type('foo');
        cy.get('@form').contains('Confirm new password').click().type('foo');
        cy.get('@form').contains('button', 'Update password').click();

        cy.get('@form').contains('Invalid password for this account');

        // "New password" and "Confirm new password" must match
        cy.get('@form').contains('Old password').click().type('{selectall}{backspace}' + password);
        cy.get('@form').contains('New password').click().type('{selectall}{backspace}foo-a');
        cy.get('@form').contains('Confirm new password').click().type('{selectall}{backspace}foo-b');
        cy.get('@form').contains('button', 'Update password').click();

        cy.get('@form').contains('Passwords do not match');

        // Finally change the password
        cy.get('@form').contains('New password').click().type('{selectall}{backspace}foo');
        cy.get('@form').contains('Confirm new password').click().type('{selectall}{backspace}foo');
        cy.get('@form').contains('button', 'Update password').click();

        cy.get('@form').contains('The password has been changed.');

        // Log out
        cy.get('.menu-top').contains(pseudo).click();
        cy.contains('Log out').click();

        cy.get('.menu-top').contains(/Guest \d+/).click();
        cy.contains('Log in').click();

        const loginForm = () => cy.contains('h2', 'Log in').closest('form');

        // Cannot log in with the previous password
        loginForm().contains('Username').click().type(pseudo);
        loginForm().contains('Password').click().type(password);
        loginForm().contains('button', 'Log in').click();

        cy.contains('Invalid password for this account');

        // Log in with the new password
        loginForm().contains('Password').click().type('{selectall}{backspace}foo');
        loginForm().contains('button', 'Log in').click();

        cy.get('.menu-top').contains(pseudo);
    });

    it('should not return password nor player id in api results', () => {
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
            opponentType: 'player',
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
            assert.doesNotHaveAnyKeys(game.hostedGameToPlayers[0].player, ['id', 'password']);
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
                assert.doesNotHaveAnyKeys(persistedGames[i].hostedGameToPlayers[0].player, ['id', 'password']);
                assert.doesNotHaveAnyKeys(persistedGames[i].hostedGameToPlayers[1].player, ['id', 'password']);
            }
        });
    });
});
