describe('Create game', () => {
    describe('Boardsize', () => {
        it('predefined sizes are reactive with custom input in create AI game form', () => {
            cy.visit('/');
            cy.get('.menu-top').contains(/Guest \d+/);

            cy.contains('Play vs AI').click();
            cy.contains('label', 'TestBot Determinist instant').click();

            // open custom boardsize input
            cy.contains('[for="size-custom"]', 'Custom').click();

            // assert it is 11
            cy.contains('[for="size-11"]', '11').click();
            cy.contains('[for="size-custom"]', 'Custom')
                .closest('.btn-group')
                .next('div')
                .find('input')
                .should('have.value', '11');
            ;

            // assert it changes to 13
            cy.contains('[for="size-13"]', '13').click();
            cy.contains('[for="size-custom"]', 'Custom')
                .closest('.btn-group')
                .next('div')
                .find('input')
                .should('have.value', '13');
            ;

            // assert typing 19 highlight predefined 19
            cy.contains('[for="size-custom"]', 'Custom')
                .closest('.btn-group')
                .next('div')
                .find('input')
                .clear()
                .type('19')
            ;
            cy.get('input#size-19')
                .should('be.checked')
            ;
        });

        it('predefined sizes are reactive with custom input in create 1v1 game form', () => {
            cy.visit('/');
            cy.get('.menu-top').contains(/Guest \d+/);

            cy.get('.play-buttons').contains('Ranked').click();

            // open custom boardsize input
            cy.contains('[for="size-custom"]', 'Custom').click();

            // assert it is 11
            cy.contains('[for="size-11"]', '11').click();
            cy.contains('[for="size-custom"]', 'Custom')
                .closest('.btn-group')
                .next('div')
                .find('input')
                .should('have.value', '11');
            ;

            // assert it changes to 13
            cy.contains('[for="size-13"]', '13').click();
            cy.contains('[for="size-custom"]', 'Custom')
                .closest('.btn-group')
                .next('div')
                .find('input')
                .should('have.value', '13');
            ;

            // assert typing 19 highlight predefined 19
            cy.contains('[for="size-custom"]', 'Custom')
                .closest('.btn-group')
                .next('div')
                .find('input')
                .clear()
                .type('19')
            ;
            cy.get('input#size-19')
                .should('be.checked')
            ;
        });
    });
});
