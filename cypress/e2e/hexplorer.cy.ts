const uuid = /\/hexplorer\/[0-9a-f-]{36}/;

// Not the button saving analysis as a JSON file
const saveStudyButton = /^\s*Save\s*$/;

/**
 * Adds a comment on root node, without creating a node.
 */
const commentRootNode = (comment: string): void => {
    cy.get('[aria-label="Comment"]').type(comment);
};

const commentShouldBe = (comment: string): void => {
    cy.get('[aria-label="Comment"]').should('have.value', comment);
};

const openFileTab = (): void => {
    cy.contains('.sidebar-nav-item', 'File').click();
};

describe('Hexplorer help', () => {
    it('is displayed first until dismissed, then opens on tree tab', () => {
        cy.viewport(1400, 800);
        cy.visit('/hexplorer');

        cy.contains('What is Hexplorer?', { timeout: 15000 });
        cy.contains('Move history').should('not.exist');

        cy.contains('button', 'Got it').click();
        cy.contains('Move history');

        cy.reload();
        cy.contains('Move history');
        cy.contains('What is Hexplorer?').should('not.exist');

        // Still available, without button
        cy.contains('.sidebar-nav-item', 'Help').click();
        cy.contains('What is Hexplorer?');
        cy.contains('button', 'Got it').should('not.exist');
    });
});

describe('Hexplorer', () => {
    beforeEach(() => {
        cy.viewport(1400, 800);

        cy.on('window:before:load', win => {
            win.localStorage.setItem('hex-local-settings', JSON.stringify({ hexplorerHelpDismissed: true }));
        });
    });

    it('has file and tree tabs, with setup mode under the tree', () => {
        cy.visit('/hexplorer');

        cy.contains('Move history');
        cy.get('.resizable-sidebar [title="Setup mode"]').should('be.visible');
        cy.contains('Import any Hex game').should('not.exist');

        openFileTab();

        cy.contains('Import any Hex game');
        cy.contains('Move history').should('not.exist');
    });

    it('has same default sidebar width as puzzle editor', () => {
        cy.visit('/hexplorer');

        cy.get('.resizable-sidebar').invoke('outerWidth').then(width => {
            cy.visit('/puzzles/new');
            cy.get('.resizable-sidebar').invoke('outerWidth').should('eq', width);
        });
    });

    it('shows study title on top of sidebar', () => {
        cy.visit('/hexplorer');

        cy.contains('.sidebar-nav', 'Hexplorer');
        cy.contains('.sidebar-nav', 'Untitled study');
        openFileTab();
        cy.contains('button', 'Fork').should('be.disabled');
        cy.contains('button', 'Share this study').should('be.disabled');
        cy.contains('Save this study to fork or share it.');
        cy.get('[title="Delete this study"]').should('be.disabled');
        cy.get('[aria-label="Study title"]').type('Some title');
        cy.contains('.sidebar-nav', 'Some title');
        cy.title().should('match', /^Some title - Hexplorer/);
    });

    it('shows clearly how to leave setup mode', () => {
        cy.visit('/hexplorer');

        cy.get('[title="Setup mode"]').click();

        cy.get('[title="Setup mode"]').should('not.exist');
        cy.contains('.resizable-sidebar button', 'Save');
        cy.contains('.resizable-sidebar button', 'Cancel').click();
        cy.get('[title="Setup mode"]').should('exist');
    });

    it('has only main setup tools under the board on small screens, and all in sidebar', () => {
        cy.viewport(400, 700);
        cy.visit('/hexplorer');

        cy.get('.bottom-menu [title="Setup mode"]').should('not.exist');
        cy.get('.resizable-sidebar [title="Setup mode"]').click();

        cy.get('.resizable-sidebar [title="Mark with a triangle"]').should('exist');
        cy.get('.bottom-menu [title="Mark with a cross"]').should('exist');
        cy.get('.bottom-menu [title="Highlight cell"]').should('exist');
        cy.get('.bottom-menu [title="Mark with a triangle"]').should('not.exist');
        cy.get('.bottom-menu [title="Add label"]').should('not.exist');
    });

    it('saves checkboxes', () => {
        cy.visit('/hexplorer');

        cy.get('#policy-show-numbers').check();
        cy.get('.color-settings tbody tr:first-child input[type=checkbox]').eq(1).uncheck();
        cy.get('.color-settings tbody tr:last-child input[type=checkbox]').eq(2).check();

        openFileTab();
        cy.contains('Unsaved changes');
        cy.contains('button', saveStudyButton).click();
        cy.location('pathname').should('match', uuid);
        cy.contains('Unsaved changes').should('not.exist');

        cy.reload();

        cy.get('#policy-show-numbers').should('be.checked');
        cy.get('.color-settings tbody tr:first-child input[type=checkbox]').eq(1).should('not.be.checked');
        cy.get('.color-settings tbody tr:last-child input[type=checkbox]').eq(2).should('be.checked');
    });

    it('resizes sidebar', () => {
        cy.visit('/hexplorer');

        cy.get('.resizable-sidebar').then($sidebar => {
            const initialWidth = $sidebar.width() as number;

            cy.get('.sidebar-resize-handle')
                .trigger('pointerdown', { pointerId: 1, force: true })
                .then($handle => { $handle[0].setPointerCapture = () => undefined; })
                .trigger('pointermove', { pointerId: 1, clientX: 500, force: true })
                .trigger('pointerup', { pointerId: 1, force: true })
            ;

            cy.get('.resizable-sidebar').invoke('width').should('be.gte', initialWidth);
        });
    });

    it('saves a study, restores it from its link, and forks it as another player', () => {
        cy.visit('/hexplorer');

        commentRootNode('Interesting opening');

        openFileTab();
        cy.get('[aria-label="Study title"]').type('My study');
        cy.contains('button', saveStudyButton).click();

        cy.location('pathname').should('match', uuid);
        cy.contains('Unsaved changes').should('not.exist');
        cy.contains('.list-group-item', 'My study').contains('0 nodes');

        // Only comment of a saved study needs to come back
        cy.reload();
        commentShouldBe('Interesting opening');

        openFileTab();
        cy.get('[aria-label="Study title"]').should('have.value', 'My study');

        // Author can update, then has unsaved changes after an edit
        cy.get('[aria-label="Study title"]').type(' v2');
        cy.contains('Unsaved changes');
        cy.contains('button', saveStudyButton).click();
        cy.contains('Unsaved changes').should('not.exist');

        cy.location('pathname').then(studyPath => {
            cy.clearCookies();
            cy.visit(studyPath);

            commentShouldBe('Interesting opening');

            openFileTab();
            cy.get('[aria-label="Study title"]').should('have.value', 'My study v2').and('be.disabled');
            cy.contains('button', saveStudyButton).should('be.disabled');
            cy.get('[title="Delete this study"]').should('be.disabled');

            cy.contains('button', 'Fork').click();

            cy.location('pathname').should('match', uuid).and('not.eq', studyPath);
            cy.contains('Forked from');

            // Fork belongs to this player, who can delete it
            cy.get('[title="Delete this study"]').click();
            cy.location('pathname').should('eq', '/hexplorer');

            cy.visit(studyPath);
            openFileTab();
            cy.get('[aria-label="Study title"]').should('have.value', 'My study v2');
        });
    });

    it('saves study with ctrl+S, even while typing a comment', () => {
        cy.visit('/hexplorer');

        commentRootNode('Saved with shortcut');
        cy.get('[aria-label="Comment"]').type('{ctrl}s');

        cy.location('pathname').should('match', uuid);
        commentShouldBe('Saved with shortcut');

        cy.get('[aria-label="Comment"]').type(' again{ctrl}s');
        openFileTab();
        cy.contains('Unsaved changes').should('not.exist');

        cy.reload();
        commentShouldBe('Saved with shortcut again');
    });

    it('opens file tab on ctrl+S when study cannot be saved', () => {
        cy.visit('/hexplorer');

        cy.get('[title="Setup mode"]').click();
        cy.get('body').type('{ctrl}s');

        cy.contains('Finish setup mode to save the study.');
        cy.location('pathname').should('eq', '/hexplorer');
    });

    it('asks before losing changes when leaving page or opening another study', () => {
        const confirmStub = cy.stub().as('confirm').returns(false);

        cy.on('window:confirm', confirmStub);

        cy.visit('/hexplorer');
        openFileTab();
        cy.get('[aria-label="Study title"]').type('First');
        cy.contains('button', saveStudyButton).click();
        cy.location('pathname').should('match', uuid);

        // Nothing to lose
        cy.contains('button', 'New').click();
        cy.get('@confirm').should('not.have.been.called');
        cy.location('pathname').should('eq', '/hexplorer');

        cy.get('[aria-label="Study title"]').type('Second');
        cy.contains('button', saveStudyButton).click();
        cy.location('pathname').should('match', uuid);
        cy.contains('.list-group-item', 'Second');
        cy.get('[aria-label="Study title"]').type(' changed');

        // Refused: stays on study
        cy.location('pathname').then(studyPath => {
            cy.contains('.list-group-item', 'First').click();
            cy.get('@confirm').should('have.been.calledOnce');
            cy.location('pathname').should('eq', studyPath);

            cy.contains('a', 'Puzzles').click();
            cy.get('@confirm').should('have.been.calledTwice');
            cy.location('pathname').should('eq', studyPath);

            cy.contains('button', 'New').click();
            cy.get('@confirm').should('have.been.calledThrice');
            cy.location('pathname').should('eq', studyPath);
        });

        // Accepted
        cy.then(() => confirmStub.returns(true));
        cy.contains('.list-group-item', 'First').click();
        cy.get('[aria-label="Study title"]').should('have.value', 'First');
    });

    it('does not ask anything when leaving a position only opened', () => {
        const confirmStub = cy.stub().as('confirm').returns(false);

        cy.on('window:confirm', confirmStub);

        cy.visit('/hexplorer#5c1,a1');
        cy.contains('a', 'Puzzles').click();

        cy.location('pathname').should('eq', '/puzzles');
        cy.get('@confirm').should('not.have.been.called');
    });

    it('does not ask before deleting a study without nodes', () => {
        const confirmStub = cy.stub().as('confirm').returns(true);

        cy.on('window:confirm', confirmStub);

        cy.visit('/hexplorer');
        openFileTab();
        cy.contains('button', saveStudyButton).click();
        cy.location('pathname').should('match', uuid);
        cy.get('[title="Delete this study"]').click();
        cy.location('pathname').should('eq', '/hexplorer');
        cy.get('@confirm').should('not.have.been.called');
    });

    it('asks before deleting a study with nodes', () => {
        const confirmStub = cy.stub().as('confirm').returns(true);

        cy.on('window:confirm', confirmStub);

        cy.visit('/hexplorer#5c1,a1');
        openFileTab();
        cy.contains('button', saveStudyButton).click();
        cy.location('pathname').should('match', uuid);
        cy.get('[title="Delete this study"]').click();
        cy.location('pathname').should('eq', '/hexplorer');
        cy.get('@confirm').should('have.been.calledOnce');
    });

    it('tells when a study does not exist', () => {
        cy.visit('/hexplorer/00000000-0000-0000-0000-000000000000');

        cy.contains('This study does not exist');
    });

    it('sorts and paginates my studies', () => {
        cy.intercept('GET', '/api/hexplorer/studies?*', req => {
            const { sortBy, sortDirection, paginationPage } = req.query;

            req.reply({
                headers: { 'Content-Range': 'studies 0-20/25' },
                body: [{
                    publicId: '00000000-0000-0000-0000-000000000000',
                    title: `${sortBy} ${sortDirection} page ${paginationPage}`,
                    nodesCount: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }],
            });
        });

        cy.visit('/hexplorer');
        openFileTab();

        cy.contains('.list-group-item', 'date desc page 0');
        cy.contains('Page 1 / 2');
        cy.contains('button', 'Previous').should('be.disabled');

        cy.contains('button', 'Next').click();
        cy.contains('.list-group-item', 'date desc page 1');
        cy.contains('Page 2 / 2');
        cy.contains('button', 'Next').should('be.disabled');

        // Goes back to first page
        cy.get('[aria-label="Sort studies"]').select('Name Z–A');
        cy.contains('.list-group-item', 'title desc page 0');
        cy.contains('Page 1 / 2');
    });
});
