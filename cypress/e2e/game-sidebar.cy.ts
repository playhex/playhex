const sidebarMustBeVisible = (cy: Cypress.cy): void => {
    cy.get('.sidebar').then($sidebar => {
        if (!$sidebar.is(':visible')) {
            throw new Error('Sidebar must be visible');
        }
    });
};

const sidebarMustBeHidden = (cy: Cypress.cy): void => {
    cy.get('.sidebar').then($sidebar => {
        if ($sidebar.is(':visible')) {
            throw new Error('Sidebar must be hidden');
        }
    });
};

describe('Game sidebar', () => {
    beforeEach(() => {
        cy.visit('/');
        cy.get('.menu-top').contains(/Guest \d+/);
    });

    it('is open by default', () => {
        cy.createAIGameWithRandom();
        sidebarMustBeVisible(cy);
    });

    it('is hidden on small screen by default', () => {
        cy.viewport(400, 500);
        cy.createAIGameWithRandom();
        sidebarMustBeHidden(cy);
    });

    it('stays closed when I refresh', () => {
        cy.createAIGameWithRandom();
        cy.closeGameSidebar();
        cy.reload();
        sidebarMustBeHidden(cy);
    });

    it('is hidden on small screen, even if I expressely made it open', () => {
        cy.viewport(400, 500);
        cy.createAIGameWithRandom();
        cy.openGameSidebar();
        cy.reload();
        sidebarMustBeHidden(cy);
    });
});
