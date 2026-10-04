const randomString = (): string => (1E24 * Math.random()).toString(36);

/**
 * Creates a puzzle as current player, on a 3x3 board solved by playing the center cell,
 * so it can be solved by clicking on the board center.
 *
 * @returns Puzzle publicId
 */
const createPuzzle = (title: string, options: { published?: boolean, collectionPublicId?: string } = {}): Cypress.Chainable<string> => {
    return cy
        .request('POST', '/api/puzzles', {
            title,
            boardsize: 3,
            redStones: ['a1'],
            blueStones: [],
            playerColor: 0,
            tree: { children: [{ move: 'b2' }] },
            published: options.published ?? true,
            collectionPublicId: options.collectionPublicId,
        })
        .its('body.publicId')
    ;
};

/**
 * @returns Collection publicId
 */
const createCollection = (name: string): Cypress.Chainable<string> => {
    return cy
        .request('POST', '/api/puzzle-collections', { name })
        .its('body.publicId')
    ;
};

/**
 * Plays the center cell of the 3x3 puzzle board, which solves it.
 *
 * Dispatches real PointerEvents: pixi does not detect a tap from cy.click().
 * Retried until solved, as board ignores taps until pixi is initialized,
 * and taps once solved are ignored as cell is occupied.
 */
const solvePuzzle = (): void => {
    cy.get('.puzzle-layout canvas').should($canvas => {
        const canvas = $canvas[0];
        const { left, top, width, height } = canvas.getBoundingClientRect();
        const PointerEvent = canvas.ownerDocument.defaultView!.PointerEvent;
        const init = { clientX: left + width / 2, clientY: top + height / 2, pointerId: 1, isPrimary: true, pointerType: 'mouse', button: 0, bubbles: true };

        canvas.dispatchEvent(new PointerEvent('pointerdown', { ...init, buttons: 1 }));
        canvas.dispatchEvent(new PointerEvent('pointerup', { ...init, buttons: 0 }));

        expect(canvas.ownerDocument.body.innerText).to.contain('Puzzle solved!');
    });
};

/**
 * Collection item in "My collections" or "Recently updated collections",
 * not a puzzle item having a collection badge.
 */
const collectionListItem = (name: string): Cypress.Chainable<JQuery<HTMLElement>> => {
    return cy.contains('a.list-group-item[href^="/puzzles/collections/"]', name);
};

describe('Puzzle collections', () => {
    beforeEach(() => {
        cy.request('POST', '/api/auth/me-or-guest');
    });

    it('creates a collection, adds, reorders and removes puzzles', () => {
        const collectionName = 'Collection ' + randomString();
        const puzzleA = 'Puzzle A ' + randomString();
        const puzzleB = 'Puzzle B ' + randomString();

        createPuzzle(puzzleA);
        createPuzzle(puzzleB);

        cy.visit('/puzzles/my-puzzles');
        cy.contains('a', 'Create a collection').click();

        cy.get('#collection-name').type(collectionName);
        cy.get('#collection-description').type('Some ladders');
        cy.contains('button', 'Save').click();

        cy.url().should('include', '/puzzles/collections/');
        cy.contains('h1', collectionName);
        cy.contains('Some ladders');
        cy.contains('No puzzles in this collection yet.');

        cy.get('.breadcrumb').contains('Puzzles');
        cy.get('.breadcrumb').contains(collectionName);

        // Add
        cy.get('select[aria-label="Add one of my puzzles…"]').select(puzzleA);
        cy.contains('button', 'Add').click();
        cy.get('ol.list-group li').should('have.length', 1);

        cy.get('select[aria-label="Add one of my puzzles…"]').select(puzzleB);
        cy.contains('button', 'Add').click();
        cy.get('ol.list-group li').should('have.length', 2);
        cy.get('ol.list-group li').eq(0).contains(puzzleA);
        cy.get('ol.list-group li').eq(1).contains(puzzleB);

        // Reorder, persisted
        cy.get('ol.list-group li').eq(1).find('[aria-label="Move up"]').click();
        cy.get('ol.list-group li').eq(0).contains(puzzleB);

        cy.reload();
        cy.get('ol.list-group li').eq(0).contains(puzzleB);
        cy.get('ol.list-group li').eq(1).contains(puzzleA);

        // Remove, puzzle can be added back
        cy.get('ol.list-group li').eq(1).find('[aria-label="Remove from collection"]').click();
        cy.get('ol.list-group li').should('have.length', 1);
        cy.get('select[aria-label="Add one of my puzzles…"]').contains('option', puzzleA);

        // Listed in my collections
        cy.visit('/puzzles/my-puzzles');
        collectionListItem(collectionName).contains('1 puzzle');
    });

    it('plays collection puzzles in order, then goes back to collection', () => {
        const collectionName = 'Collection ' + randomString();
        const puzzle1 = 'Puzzle 1 ' + randomString();
        const puzzle2 = 'Puzzle 2 ' + randomString();

        createCollection(collectionName).then(collectionPublicId => {
            // Puzzles are added at the end of collection
            createPuzzle(puzzle1, { collectionPublicId });
            createPuzzle(puzzle2, { collectionPublicId });

            cy.visit('/puzzles/collections/' + collectionPublicId);
        });

        cy.contains('a', 'Start').click();

        cy.contains('h1', puzzle1);
        cy.get('.puzzle-breadcrumb').contains(collectionName);
        cy.contains('a', 'Next puzzle').should('not.exist');

        solvePuzzle();
        cy.contains('a', 'Next puzzle').click();

        cy.contains('h1', puzzle2);
        solvePuzzle();
        cy.contains('a', 'Next puzzle').should('not.exist');
        cy.contains('a', 'Back to collection').click();

        cy.contains('h1', collectionName);
    });

    it('moves a puzzle to a collection from puzzle editor', () => {
        const collectionName = 'Collection ' + randomString();
        const puzzleTitle = 'Puzzle ' + randomString();

        createCollection(collectionName);
        createPuzzle(puzzleTitle).then(puzzlePublicId => {
            cy.visit(`/puzzles/${puzzlePublicId}/edit`);
        });

        cy.contains('button', '3. Publish').click();
        cy.get('#puzzle-collection').contains('option', collectionName);
        cy.get('#puzzle-collection').select(collectionName);
        cy.contains('button', /^\s*Save\s*$/).click();

        cy.contains('h1', puzzleTitle);
        cy.get('.puzzle-breadcrumb').contains(collectionName).click();

        cy.contains('h1', collectionName);
        cy.get('ol.list-group li').should('have.length', 1).contains(puzzleTitle);
    });

    it('lists a collection publicly only once it has a published puzzle', () => {
        const collectionName = 'Collection ' + randomString();
        const listedCollectionName = 'Collection ' + randomString();

        createCollection(collectionName).then(collectionPublicId => {
            createPuzzle('Draft ' + randomString(), { collectionPublicId, published: false }).as('draftPublicId');
        });

        // Another collection, to know when collections list is loaded
        createCollection(listedCollectionName).then(collectionPublicId => {
            createPuzzle('Puzzle ' + randomString(), { collectionPublicId });
        });

        cy.visit('/puzzles');
        collectionListItem(listedCollectionName);
        cy.contains(collectionName).should('not.exist');

        cy.get<string>('@draftPublicId').then(draftPublicId => {
            cy.request('POST', `/api/puzzles/${draftPublicId}/publish`);
        });

        cy.reload();
        collectionListItem(collectionName).contains('1 puzzle');
    });

    it('shows only published puzzles to other players, who cannot edit the collection', () => {
        const collectionName = 'Collection ' + randomString();
        const publishedTitle = 'Published ' + randomString();
        const draftTitle = 'Draft ' + randomString();

        createCollection(collectionName).then(collectionPublicId => {
            createPuzzle(publishedTitle, { collectionPublicId });
            createPuzzle(draftTitle, { collectionPublicId, published: false }).as('draftPublicId');
            cy.wrap(collectionPublicId).as('collectionPublicId');
        });

        // Author sees drafts
        cy.get<string>('@collectionPublicId').then(collectionPublicId => {
            cy.visit('/puzzles/collections/' + collectionPublicId);
        });

        cy.get('ol.list-group li').should('have.length', 2);
        cy.contains('ol.list-group li', draftTitle).contains('Draft');

        // Another player
        cy.clearCookies();
        cy.request('POST', '/api/auth/me-or-guest');

        cy.get<string>('@collectionPublicId').then(collectionPublicId => {
            cy.visit('/puzzles/collections/' + collectionPublicId);
        });

        cy.contains('h1', collectionName);
        cy.get('ol.list-group li').should('have.length', 1).contains(publishedTitle);
        cy.contains(draftTitle).should('not.exist');
        cy.get('main').contains('a', 'Edit').should('not.exist');
        cy.get('select[aria-label="Add one of my puzzles…"]').should('not.exist');

        cy.get<string>('@collectionPublicId').then(collectionPublicId => {
            cy.visit(`/puzzles/collections/${collectionPublicId}/edit`);
            cy.contains('Only the author can edit this collection.');

            // Server also rejects edits
            cy.request({
                method: 'PUT',
                url: `/api/puzzle-collections/${collectionPublicId}`,
                body: { name: 'Hacked' },
                failOnStatusCode: false,
            }).its('status').should('eq', 403);

            cy.request({
                method: 'PUT',
                url: `/api/puzzle-collections/${collectionPublicId}/puzzles`,
                body: { puzzlePublicIds: [] },
                failOnStatusCode: false,
            }).its('status').should('eq', 403);

            cy.request({
                method: 'DELETE',
                url: `/api/puzzle-collections/${collectionPublicId}`,
                failOnStatusCode: false,
            }).its('status').should('eq', 403);
        });

        // Cannot add own puzzle to someone else collection
        cy.get<string>('@collectionPublicId').then(collectionPublicId => {
            cy.request({
                method: 'POST',
                url: '/api/puzzles',
                body: {
                    boardsize: 3,
                    redStones: ['a1'],
                    blueStones: [],
                    playerColor: 0,
                    tree: { children: [{ move: 'b2' }] },
                    published: true,
                    collectionPublicId,
                },
                failOnStatusCode: false,
            }).its('status').should('eq', 403);
        });

        // Cannot add someone else puzzle to own collection
        createCollection('Collection ' + randomString()).then(ownCollectionPublicId => {
            cy.get<string>('@draftPublicId').then(draftPublicId => {
                cy.request({
                    method: 'PUT',
                    url: `/api/puzzle-collections/${ownCollectionPublicId}/puzzles`,
                    body: { puzzlePublicIds: [draftPublicId] },
                    failOnStatusCode: false,
                }).its('status').should('eq', 403);
            });
        });
    });

    it('deletes a collection, and keeps its puzzles', () => {
        const collectionName = 'Collection ' + randomString();
        const puzzleTitle = 'Puzzle ' + randomString();

        createCollection(collectionName).then(collectionPublicId => {
            createPuzzle(puzzleTitle, { collectionPublicId });
            cy.wrap(collectionPublicId).as('collectionPublicId');
            cy.visit(`/puzzles/collections/${collectionPublicId}/edit`);
        });

        cy.get('#collection-name').should('have.value', collectionName);
        cy.contains('button', 'Delete collection').click(); // confirm() is accepted by Cypress

        cy.url().should('include', '/puzzles/my-puzzles');
        cy.contains('.list-group-item', puzzleTitle).contains(collectionName).should('not.exist');
        cy.contains(collectionName).should('not.exist');

        cy.get<string>('@collectionPublicId').then(collectionPublicId => {
            cy.request({
                url: `/api/puzzle-collections/${collectionPublicId}`,
                failOnStatusCode: false,
            }).its('status').should('eq', 404);
        });
    });
});
