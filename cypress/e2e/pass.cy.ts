describe('Pass', () => {

    it('allows to pass', () => {
        cy.visit('/');

        cy.createAIGameWithRandom();

        cy.contains('.sidebar', 'Playing');
        cy.contains('.sidebar .btn', 'Pass').click();

        cy.wait(200); // Wait to make sure cypress capture js error and fail if any
    });

});
