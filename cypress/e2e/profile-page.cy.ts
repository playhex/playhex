describe('Profile page', () => {
    it('see my profile page', () => {
        cy.intercept('/api/auth/me-or-guest', {
            fixture: 'profile-page/player-test.json',
        });
        cy.intercept('/api/players?slug=player-test', {
            fixture: 'profile-page/player-test.json',
        });
        cy.intercept('/api/games?*d63e9d50-0afd-48ff-88f4-706fbee620b2*', {
            fixture: 'profile-page/games.json',
        });
        cy.intercept('/api/players/d63e9d50-0afd-48ff-88f4-706fbee620b2/games?state=ended', {
            fixture: 'profile-page/games-state-ended.json',
        });

        cy.visit('/@player-test');
        cy.get('header').contains('Player Test');

        cy.contains('h2', 'Player Test');
        cy.contains('Account created on 19 January 2024');

        cy.contains('Log out');
        cy.contains('Settings');

        cy.contains('Determinist random bot');
        cy.contains('win');
    });

    it('see someone else profile page', () => {
        cy.intercept('/api/games?*d63e9d50-0afd-48ff-88f4-706fbee620b2*', {
            fixture: 'profile-page/games.json',
        });
        cy.intercept('/api/players?slug=player-test', {
            fixture: 'profile-page/player-test.json',
        });
        cy.intercept('/api/players/d63e9d50-0afd-48ff-88f4-706fbee620b2/games?state=ended', {
            fixture: 'profile-page/games-state-ended.json',
        });

        cy.visit('/@player-test');

        cy.contains('h2', 'Player Test');
        cy.contains('Account created on 19 January 2024');

        cy.contains('Log out').should('not.exist');
        cy.contains('Settings').should('not.exist');

        cy.contains('Determinist random bot');
        cy.contains('win');
    });
});
