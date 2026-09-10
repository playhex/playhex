const ME_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_ID = '22222222-2222-2222-2222-222222222222';
const BOT_ID = '33333333-3333-3333-3333-333333333333';

const me = {
    pseudo: 'Me Test',
    publicId: ME_ID,
    isGuest: false,
    isBot: false,
    slug: 'me-test',
    createdAt: '2024-01-19T12:00:00.000Z',
};

const other = {
    pseudo: 'Other Test',
    publicId: OTHER_ID,
    isGuest: false,
    isBot: false,
    slug: 'other-test',
    createdAt: '2024-01-19T12:00:00.000Z',
};

const bot = {
    pseudo: 'Bot Test',
    publicId: BOT_ID,
    isGuest: false,
    isBot: true,
    slug: 'bot-test',
    createdAt: '2024-01-19T12:00:00.000Z',
};

const headToHead = {
    totalGames: 27,
    wonGames: 10,
    lostGames: 17,
    firstGamePublicId: 'aaaaaaaa-0000-0000-0000-000000000000',
    firstGameEndedAt: '2023-11-22T00:00:00.000Z',
    lastGamePublicId: 'bbbbbbbb-0000-0000-0000-000000000000',
    lastGameEndedAt: '2024-01-18T00:44:34.083Z',
    totalPlayTimeSeconds: 5698,
    liveGames: 27,
};

const interceptProfilePage = (profilePlayer: typeof other) => {
    cy.intercept('/api/auth/me-or-guest', { body: me });
    cy.intercept('/api/player-settings', { body: {} });
    cy.intercept(`/api/players?slug=${profilePlayer.slug}`, { body: profilePlayer });
    cy.intercept(`/api/players/${profilePlayer.publicId}/stats`, { body: null });
    cy.intercept(`/api/players/${profilePlayer.publicId}/current-ratings`, { body: [] });
    cy.intercept(`/api/players/${profilePlayer.publicId}/active-games`, { body: [] });
    cy.intercept(`/api/players/${profilePlayer.publicId}/has-moderation-actions`, { body: false });
    cy.intercept('/api/games?*', { body: [], headers: { 'Content-Range': 'items 0-0/0' } });
};

describe('Head to head stats', () => {
    it('shows head to head stats on another player profile', () => {
        interceptProfilePage(other);
        cy.intercept(`/api/players/${ME_ID}/head-to-head/${OTHER_ID}`, { body: headToHead });

        cy.visit('/@other-test');

        cy.get('.card').contains('h3', 'Head to head').should('exist');
        cy.contains('Games together').parent().contains('27');

        // win rate bar
        cy.contains('37%').should('exist');
        cy.contains('10').should('exist');
        cy.contains('17').should('exist');
        cy.get('.progress-bar.bg-success').should('exist');
        cy.get('.progress-bar.bg-danger').should('exist');

        cy.contains('Time played together').parent().contains('1h34min');

        // rivalry verdict, 10/27 won
        cy.get('.badge').contains('They have the upper hand').should('exist');

        // first and last games link to their game page
        cy.contains('p', 'First game').find('a')
            .should('have.attr', 'href', `/games/${headToHead.firstGamePublicId}`);
        cy.contains('p', 'Last game').find('a')
            .should('have.attr', 'href', `/games/${headToHead.lastGamePublicId}`);
    });

    it('tells when both players never played together', () => {
        interceptProfilePage(other);
        cy.intercept(`/api/players/${ME_ID}/head-to-head/${OTHER_ID}`, {
            body: {
                ...headToHead,
                totalGames: 0,
                wonGames: 0,
                lostGames: 0,
                liveGames: 0,
                totalPlayTimeSeconds: 0,
                firstGamePublicId: null,
                firstGameEndedAt: null,
                lastGamePublicId: null,
                lastGameEndedAt: null,
            },
        });

        cy.visit('/@other-test');

        cy.contains('h3', 'Head to head').should('exist');
        cy.contains('You never played against this player yet.').should('exist');
        cy.contains('Games together').should('not.exist');
    });

    it('does not show a rivalry verdict when they barely played together', () => {
        interceptProfilePage(other);
        cy.intercept(`/api/players/${ME_ID}/head-to-head/${OTHER_ID}`, {
            body: { ...headToHead, totalGames: 2, wonGames: 0, lostGames: 2, liveGames: 2 },
        });

        cy.visit('/@other-test');

        cy.contains('Games together').parent().contains('2');
        cy.get('.badge').should('not.exist');
    });

    it('does not show head to head stats on a bot profile', () => {
        interceptProfilePage(bot);

        cy.visit('/@bot-test');

        cy.contains('h3', 'Rating').should('exist'); // page is loaded
        cy.contains('h3', 'Head to head').should('not.exist');
    });

    it('does not show head to head stats on my own profile', () => {
        interceptProfilePage({ ...me, slug: me.slug } as typeof other);

        cy.visit('/@me-test');

        cy.contains('h3', 'Rating').should('exist'); // page is loaded
        cy.contains('h3', 'Head to head').should('not.exist');
    });
});
