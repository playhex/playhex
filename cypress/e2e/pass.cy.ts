describe('Pass', () => {

    it('allows to pass', () => {
        cy.visit('/');

        cy.createAIGameWithRandom();

        cy.contains('.sidebar', 'Playing');
        cy.get('[aria-label="Secondary actions"]').click();
        cy.contains('button', 'Pass').click();

        cy.contains('Pass my turn?');
        cy.contains('Yes, pass').click();

        cy.wait(200); // Wait to make sure cypress capture js error and fail if any
    });

});
