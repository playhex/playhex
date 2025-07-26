const randomString = (): string => (1E24 * Math.random()).toString(36);
const tournamentSlug = (tournamentTitle: string): string => tournamentTitle.toLocaleLowerCase().replace(/ /g, '-');

describe('Tournaments', () => {
    it('can create, check-in, and edit a tournament', () => {
        cy.visit('/');
        cy.get('.menu-top').contains('Tournaments').click();

        // Create tournament
        cy.contains('Create tournament').click();

        const tournamentTitle = 'Tournament test ' + randomString();

        cy
            .contains('Tournament name')
            .click()
            .type(tournamentTitle)
        ;

        cy
            .contains('Double elimination')
            .click()
        ;

        cy
            .contains('Start date')
            .click()
            .type('2025-01-02T20:30')
        ;

        cy
            .contains('button', 'Create tournament')
            .click()
        ;

        cy.contains('Tournament created successfully');
        cy.url().should('include', '/tournaments/' + tournamentSlug(tournamentTitle));
        cy.contains('h1', tournamentTitle);

        cy.get('h5').contains('Thursday, January 2, 2025 at 8:30 PM');
        cy.contains('Imminent!');

        cy.get('h5').contains('Double elimination');
        cy.contains('11×11');

        // Check-in
        cy.contains('0 people are interested');
        cy.contains('Check-in now to play this tournament!');
        cy.contains('button', 'Check-in').click();
        cy.contains('1 person is interested');
        cy.contains('Your participation is confirmed!');

        // Unsubscribe
        cy.contains('button', 'I am interested!').click();
        cy.contains('0 people are interested');
        cy.contains('Check-in now to play this tournament!');

        // Change tournament format to Swiss
        cy.contains('Manage').click();

        cy
            .contains('Swiss')
            .click()
        ;

        cy
            .contains('button', 'Submit modification')
            .click()
        ;

        cy.contains('Tournament updated successfully');
        cy.contains('h5', 'Swiss');
        cy.contains('Rounds: based on participants number');

        // Change tournament start delay
        cy.contains('Tournament will start automatically');
        cy.contains('Manage').click();

        cy
            .contains('Never')
            .click()
        ;

        cy
            .contains('button', 'Submit modification')
            .click()
        ;

        cy.contains('Tournament updated successfully');
        cy.contains('Tournament will be started manually by organizer only.');

        // Change tournament title: I should be redirected to new url (slug changed)
        cy.contains('Manage').click();

        const tournamentTitle2 = 'Tournament edited ' + randomString();

        cy
            .contains('Tournament name')
            .click()
            .type(tournamentTitle2)
        ;

        cy
            .contains('button', 'Submit modification')
            .click()
        ;

        cy.contains('Tournament updated successfully');
        cy.url().should('include', '/tournaments/' + tournamentSlug(tournamentTitle2));
        cy.contains('h1', tournamentTitle2);
    });
});
