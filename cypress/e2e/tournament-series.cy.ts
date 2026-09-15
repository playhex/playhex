const randomString = (): string => (1E24 * Math.random()).toString(36);
const slugify = (title: string): string => title.toLocaleLowerCase().replace(/ /g, '-');

describe('Tournament series', () => {
    it('can create a series, create an instance from it, and cannot delete a non empty series', () => {
        const seriesTitle = 'Series test ' + randomString();

        cy.visit('/');
        cy.get('.menu-top').contains('Tournaments').click();

        // Create series
        cy.contains('See all series').click();
        cy.url().should('include', '/tournament-series');

        cy.contains('Create series').click();

        cy
            .contains('Series name')
            .click()
            .type(seriesTitle)
        ;

        cy
            .contains('Instance name pattern')
            .click()
            .type(seriesTitle + ' {{}n}')
        ;

        // Preview uses 42 as instance number
        cy.contains('code', seriesTitle + ' 42');

        cy.contains('button', 'Create series').click();

        cy.contains('Tournament series created successfully');
        cy.url().should('include', '/tournament-series/' + slugify(seriesTitle));
        cy.contains('h1', seriesTitle);

        // Breadcrumb: Home > Tournaments > Series > <series>
        cy.get('.breadcrumb').contains('Home');
        cy.get('.breadcrumb').contains('Tournaments');
        cy.get('.breadcrumb').contains('Series');

        // No tournament yet
        cy.contains('No tournament has been played in this series yet.');
        cy.contains('code', seriesTitle + ' 1');

        // Create first instance, title is prefilled from the pattern
        cy.contains('Create next instance').click();
        cy.get('#name').should('have.value', seriesTitle + ' 1');
        cy.contains('This tournament will be an instance of');

        cy
            .contains('Start date')
            .click()
            .type('2027-01-02T20:30')
        ;

        cy.contains('button', 'Create tournament').click();

        cy.contains('Tournament created successfully');
        cy.contains('h1', seriesTitle + ' 1');

        // Breadcrumb on a tournament of a series shows the series, and is clickable
        cy.get('.breadcrumb').contains(seriesTitle).click();
        cy.url().should('include', '/tournament-series/' + slugify(seriesTitle));

        // Series now lists its instance, and next one is numbered 2
        cy.contains(seriesTitle + ' 1');
        cy.contains('code', seriesTitle + ' 2');

        // Cannot delete a series having tournaments
        cy.contains('Edit series').click();
        cy.get('nav').contains('button', 'Delete series').click();
        cy.get('section').contains('button', 'Delete series').click();
        cy.get('.modal').contains('button', 'Delete series').click();

        cy.contains('This series cannot be deleted because it has tournaments.');
    });
});
