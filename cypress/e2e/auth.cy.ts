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
});
