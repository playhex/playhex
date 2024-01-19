describe('Profile page', () => {
    it('see my profile page', () => {
        cy.intercept('/api/auth/me-or-guest', {
            fixture: 'profile-page/me-or-guest.json',
        });
        cy.intercept('/api/games', {
            fixture: 'profile-page/games.json',
        });
        cy.intercept('/api/players/30d1227f-e318-45a6-a7fd-64f7671e561f/games?state=ended', {
            fixture: 'profile-page/games-state-ended.json',
        });

        cy.visit('/@ddd');

        cy.contains('h2', 'ddd');
        cy.contains('Account created on 19 January 2024');

        cy.contains('Logout');
        cy.contains('Settings');

        cy.contains('Game vs Determinist random bot');
        cy.contains('won against Determinist random bot');
        cy.contains('lost against Determinist random bot');
    });

    it('see someone else profile page', () => {
        cy.intercept('/api/games', {
            fixture: 'profile-page/games.json',
        });
        cy.intercept('/api/players/30d1227f-e318-45a6-a7fd-64f7671e561f/games?state=ended', {
            fixture: 'profile-page/games-state-ended.json',
        });

        cy.visit('/@ddd');

        cy.contains('h2', 'ddd');
        cy.contains('Account created on 19 January 2024');

        cy.contains('Logout').should('not.exist');
        cy.contains('Settings').should('not.exist');

        cy.contains('Game vs Determinist random bot');
        cy.contains('won against Determinist random bot');
        cy.contains('lost against Determinist random bot');
    });
});
