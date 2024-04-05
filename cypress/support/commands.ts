/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Cypress {
    interface Chainable {
        /**
         * Open AI game creation popin, select determinist bot.
         * Pass submit=false to keep game options popin open.
         */
        createAIGameWithRandom(submit?: boolean): Chainable<unknown>;

        /**
         * To use after createAIGameWithRandom(false),
         * submit game options and create game.
         */
        submitAIGame(): Chainable<unknown>;
    }
}

Cypress.Commands.add('createAIGameWithRandom', (submit = true) => {
    cy.contains('Play vs AI').click();

    cy
        .contains('Game options')
        .closest('.modal-content')
        .contains('random')
        .click()
    ;

    cy
        .contains('Game options')
        .closest('.modal-content')
        .contains('Determinist')
        .click()
    ;

    if (!submit) {
        return;
    }

    cy.submitAIGame();
});

Cypress.Commands.add('submitAIGame', () => {
    cy.contains('Game options')
        .closest('.modal-content')
        .contains('Play vs AI')
        .click()
    ;
});
