const PLAYER_ID = 'd63e9d50-0afd-48ff-88f4-706fbee620b2';

const player = {
    pseudo: 'Player Test',
    publicId: PLAYER_ID,
    isGuest: false,
    isBot: false,
    slug: 'player-test',
    createdAt: '2024-01-19T12:00:00.000Z',
};

const playerWithFlag = {
    ...player,
    countryFlag: '🇫🇷',
};

const interceptSettings = (playerFixture: object = player) => {
    cy.intercept('/api/auth/me-or-guest', { body: playerFixture });
    cy.intercept('/api/player-settings', { body: {} });
};

const interceptProfilePage = (playerFixture: object) => {
    cy.intercept('/api/auth/me-or-guest', { body: playerFixture });
    cy.intercept('/api/players?slug=player-test', { body: playerFixture });
    cy.intercept(`/api/players/${PLAYER_ID}/stats`, { body: null });
    cy.intercept(`/api/players/${PLAYER_ID}/current-ratings`, { body: [] });
    cy.intercept(`/api/games?*${PLAYER_ID}*`, { body: [], headers: { 'Content-Range': 'items 0-0/0' } });
};

describe('Country flag setting', () => {
    it('shows the flag section in settings for registered players', () => {
        interceptSettings();

        cy.visit('/settings');

        cy.get('#country-flag').should('exist');
        cy.get('#country-flag').contains('Country flag');
    });

    it('does not show the flag section for guests', () => {
        interceptSettings({ ...player, isGuest: true });

        cy.visit('/settings');

        cy.get('#country-flag').should('not.exist');
    });

    it('can select a flag and the PATCH API is called', () => {
        interceptSettings();
        cy.intercept('PATCH', `/api/players/${PLAYER_ID}/country-flag`, (req) => {
            req.reply({ body: { countryFlag: req.body.countryFlag } });
        }).as('updateFlag');

        cy.visit('/settings');

        cy.get('#country-flag input[type=search]').type(' ');
        cy.get('#country-flag .flag-btn').first().click();

        cy.wait('@updateFlag').its('request.body.countryFlag').should('be.a', 'string');
    });

    it('can search for a country and select its flag', () => {
        interceptSettings();
        cy.intercept('PATCH', `/api/players/${PLAYER_ID}/country-flag`, (req) => {
            req.reply({ body: { countryFlag: req.body.countryFlag } });
        }).as('updateFlag');

        cy.visit('/settings');

        cy.get('#country-flag input[type=search]').type('France');
        cy.get('#country-flag').contains('button', '🇫🇷').click();

        cy.wait('@updateFlag').its('request.body.countryFlag').should('eq', '🇫🇷');
    });

    it('can remove a flag', () => {
        interceptSettings(playerWithFlag);
        cy.intercept('PATCH', `/api/players/${PLAYER_ID}/country-flag`, (req) => {
            req.reply({ body: { countryFlag: req.body.countryFlag } });
        }).as('updateFlag');

        cy.visit('/settings');

        cy.get('#country-flag').contains('Remove flag').click();

        cy.wait('@updateFlag').its('request.body.countryFlag').should('be.null');
    });

    it('highlights the currently selected flag', () => {
        interceptSettings(playerWithFlag);

        cy.visit('/settings');

        cy.get('#country-flag input[type=search]').type(' ');
        cy.get('#country-flag .flag-btn.btn-primary').should('contain', '🇫🇷');
    });
});

describe('Country flag display on PagePlayer', () => {
    it('shows flag next to pseudo on profile page when player has a flag', () => {
        interceptProfilePage(playerWithFlag);

        cy.visit('/@player-test');

        cy.contains('h2', '🇫🇷').should('exist');
        cy.contains('h2', 'Player Test').should('exist');
    });

    it('does not show flag on profile page when player has no flag', () => {
        interceptProfilePage(player);

        cy.visit('/@player-test');

        cy.get('h2').should('not.contain', '🇫🇷');
    });
});

describe('Country flag display in lobby', () => {
    beforeEach(() => {
        cy.mockSocketIO();
        cy.intercept('/api/auth/me-or-guest', { body: player });
        cy.intercept('/api/player-settings', { body: {} });
        cy.intercept('/api/games?*', {
            fixture: 'country-flag/lobby-ended-games.json',
            headers: { 'Content-Range': 'items 0-1/1' },
        });
    });

    it('shows flag next to host in waiting games list', () => {
        cy.visit('/');
        cy.receiveLobbyUpdate('country-flag/lobby-waiting-games.json');

        cy.contains('Join a game')
            .closest('.card')
            .contains('Player E')
            .closest('tr')
            .should('contain', '🇺🇸');
    });

    it('shows flags next to players in recently ended games', () => {
        cy.visit('/');
        cy.receiveLobbyUpdate('country-flag/lobby-waiting-games.json');

        cy.contains('.card-header', 'Finished games')
            .next('.table-responsive')
            .contains('Player C')
            .closest('tr')
            .should('contain', '🇫🇷');

        cy.contains('.card-header', 'Finished games')
            .next('.table-responsive')
            .contains('Player D')
            .closest('tr')
            .should('contain', '🇬🇧');
    });
});
