const PLAYER_ID = 'd63e9d50-0afd-48ff-88f4-706fbee620b2';

const player = {
    pseudo: 'Player Test',
    publicId: PLAYER_ID,
    isGuest: false,
    isBot: false,
    slug: 'player-test',
    createdAt: '2024-01-19T12:00:00.000Z',
};

const playerWithAvatar = {
    ...player,
    avatarPath: '/avatars/test-uuid.jpg',
    avatarThumbnailPath: '/avatars/test-uuid_thumb.jpg',
};

const interceptProfilePage = (playerFixture: object) => {
    cy.intercept('/api/auth/me-or-guest', { body: playerFixture });
    cy.intercept('/api/players?slug=player-test', { body: playerFixture });
    cy.intercept(`/api/players/${PLAYER_ID}/stats`, { body: null });
    cy.intercept(`/api/players/${PLAYER_ID}/current-ratings`, { body: [] });
    cy.intercept(`/api/games?*${PLAYER_ID}*`, { body: [], headers: { 'Content-Range': 'items 0-0/0' } });
};

describe('Avatar display', () => {
    it('shows avatar image on profile page when player has an avatar', () => {
        interceptProfilePage(playerWithAvatar);
        cy.visit('/@player-test');

        cy.get('.avatar-img')
            .should('exist')
            .and('have.attr', 'src')
            .and('include', '/avatars/test-uuid.jpg');
    });

    it('shows person icon on profile page when player has no avatar', () => {
        interceptProfilePage(player);

        cy.visit('/@player-test');

        cy.get('.icon').should('exist');
        cy.get('.avatar-img').should('not.exist');
    });

    it('shows avatar thumbnail in header when player has an avatar', () => {
        interceptProfilePage(playerWithAvatar);
        cy.visit('/@player-test');

        cy.get('header .nav-avatar')
            .should('exist')
            .and('have.attr', 'src')
            .and('include', 'test-uuid_thumb.jpg');
    });

    it('shows person icon in header when player has no avatar', () => {
        interceptProfilePage(player);

        cy.visit('/@player-test');

        cy.get('header .nav-avatar-icon').should('exist');
    });
});

describe('Avatar upload', () => {
    it('shows upload label on own non-guest profile', () => {
        interceptProfilePage(player);

        cy.visit('/@player-test');

        cy.get('.avatar-upload-label').should('exist');
        cy.get('input[type=file]').should('exist');
    });

    it('does not show upload label on another player profile', () => {
        cy.intercept('/api/auth/me-or-guest', {
            body: { ...player, publicId: 'other-player-id', slug: 'other-player' },
        });
        cy.intercept('/api/players?slug=player-test', { body: player });
        cy.intercept(`/api/players/${PLAYER_ID}/active-games`, { body: [] });
        cy.intercept(`/api/players/${PLAYER_ID}/stats`, { body: null });
        cy.intercept(`/api/players/${PLAYER_ID}/current-ratings`, { body: [] });
        cy.intercept(`/api/games?*${PLAYER_ID}*`, { body: [], headers: { 'Content-Range': 'items 0-0/0' } });
        cy.intercept(`/api/players/${PLAYER_ID}/chat-restricted`, { body: false });

        cy.visit('/@player-test');

        cy.get('.avatar-upload-label').should('not.exist');
    });

    it('does not show upload label for guest players', () => {
        interceptProfilePage({ ...player, isGuest: true });

        cy.visit('/@player-test');

        cy.get('.avatar-upload-label').should('not.exist');
    });

    it('opens crop modal after selecting a file', () => {
        interceptProfilePage(player);

        cy.visit('/@player-test');

        cy.get('input[type=file]').selectFile(
            'cypress/fixtures/profile-page/test-avatar.jpg',
            { force: true },
        );

        cy.contains('.modal-title', 'Adjust avatar').should('be.visible');
    });

    it('uploads avatar, closes modal, and displays new avatar', () => {
        interceptProfilePage(player);
        cy.intercept('PUT', `/api/players/${PLAYER_ID}/avatar`, (req) => {
            req.reply({
                body: {
                    avatarPath: '/avatars/new-uuid.jpg',
                    avatarThumbnailPath: '/avatars/new-uuid_thumb.jpg',
                },
            });
        }).as('uploadAvatar');
        cy.intercept('/avatars/new-uuid.jpg*', { fixture: 'profile-page/test-avatar.jpg' });

        cy.visit('/@player-test');

        cy.get('input[type=file]').selectFile(
            'cypress/fixtures/profile-page/test-avatar.jpg',
            { force: true },
        );

        cy.contains('.modal-title', 'Adjust avatar').should('be.visible');
        cy.contains('button', 'Yes').should('not.be.disabled').click();

        cy.wait('@uploadAvatar');

        cy.get('.modal-title').should('not.exist');
        cy.get('.avatar-img')
            .should('exist')
            .and('have.attr', 'src')
            .and('include', '/avatars/new-uuid.jpg');
    });

    it('cancels upload when closing the crop modal', () => {
        interceptProfilePage(player);

        cy.visit('/@player-test');

        cy.get('input[type=file]').selectFile(
            'cypress/fixtures/profile-page/test-avatar.jpg',
            { force: true },
        );

        cy.contains('.modal-title', 'Adjust avatar').should('be.visible');
        cy.get('.modal-content .btn-close').click();

        cy.get('.modal-title').should('not.exist');
        cy.get('.avatar-img').should('not.exist');
    });
});
