const daviesPublicId = (level: number) => `00000000-0000-4000-8000-00000000000${level}`;

const davies = (level: number) => ({
    engine: 'davies',
    label: `Davies ${level}`,
    description: null,
    relativeLevel: 1,
    boardsizeMin: 11,
    boardsizeMax: 11,
    config: { level },
    player: { publicId: daviesPublicId(level) },
});

const modal = () => cy.contains('h5', 'Play vs AI').closest('.modal-content');

const openOverlay = (availableLevels: number[], beatenLevels: number[]) => {
    cy.intercept('GET', '/api/ai-configs', [davies(1), davies(4), davies(7), davies(9)]);
    cy.intercept('GET', '/api/ai-availability', {
        availableAiPlayerPublicIds: availableLevels.map(daviesPublicId),
    });
    cy.intercept('GET', '/api/players/*/beaten-bots', {
        botPublicIds: beatenLevels.map(daviesPublicId),
    });

    cy.visit('/');
    cy.containsGuestPseudo('.menu-top');
    cy.contains('Play vs AI').click();
};

describe('Play vs AI difficulty buttons', () => {
    it('shows only difficulties until stronger AIs are unlocked', () => {
        openOverlay([1, 4, 7, 9], []);

        modal().contains('button', 'Easy');
        modal().contains('button', 'Medium');
        modal().contains('button', 'Hard');
        modal().contains('Davies 9').should('not.exist');
        modal().contains('More options').should('not.exist');
        modal().contains('Boardsize').should('not.exist');
        modal().find('button[type=submit]').should('not.exist');

        modal().contains('button', 'Show more AI options').should('have.class', 'btn-link').click();

        modal().contains('button', 'Easy').should('not.exist');
        modal().contains('Davies 9');
        modal().contains('More options').click();
        modal().contains('Live');
        modal().find('button[type=submit]');

        // Choice is remembered
        cy.reload();
        cy.containsGuestPseudo('.menu-top');
        cy.contains('Play vs AI').click();
        modal().contains('Davies 9');
        modal().contains('button', 'Easy').should('not.exist');
    });

    it('shows a warning and a message on click on unavailable AIs', () => {
        openOverlay([1, 4], []);

        modal().contains('button', 'Hard').should('have.attr', 'title', 'Not available right now').click();
        modal().contains('button', 'Hard').contains('small', 'Not available right now');
        cy.contains('h5', 'Play vs AI');

        modal().contains('button', 'Show more AI options').click();
        modal().contains('.form-check', 'Davies 9').find('button').click();
        modal().contains('.form-check', 'Davies 9').contains('small', 'Not available right now');
    });

    it('shows progression, and a readable unlock button when all difficulties are beaten', () => {
        openOverlay([1, 4, 7], [1]);

        modal().contains('button', 'Easy').find('svg');
        modal().contains('button', 'Medium').find('svg').should('not.exist');
        modal().contains('button', 'Show more AI options').should('have.class', 'btn-link');
    });

    it('turns unlock text to a button when all difficulties are beaten', () => {
        openOverlay([1, 4, 7], [1, 4, 7]);

        modal().contains('button', 'Show more AI options').should('have.class', 'btn-primary');
    });

    it('creates the game on click, without remembering default time control', () => {
        openOverlay([1, 4, 7], []);

        cy.intercept('POST', '/api/games', { statusCode: 500 }).as('postGame');

        modal().contains('button', 'Medium').click();

        cy.wait('@postGame').its('request.body').should('include', {
            opponentPublicId: daviesPublicId(4),
            boardsize: 11,
        });

        cy.window().then(win => {
            expect(win.localStorage.getItem('hex-last-custom-time-control-live')).to.equal(null);
        });
    });

    it('sends and remembers time control chosen in more options', () => {
        openOverlay([1, 4, 7, 9], []);

        cy.intercept('POST', '/api/games', { statusCode: 500 }).as('postGame');

        modal().contains('button', 'Show more AI options').click();
        modal().contains('More options').click();
        modal().contains('Long 10 + 20').click();
        modal().find('button[type=submit]').click();

        cy.wait('@postGame').its('request.body.timeControlType.options').should('deep.include', {
            initialTime: 600000,
            timeIncrement: 20000,
        });

        cy.window().then(win => {
            expect(win.localStorage.getItem('hex-last-custom-time-control-live')).to.not.equal(null);
        });
    });
});
