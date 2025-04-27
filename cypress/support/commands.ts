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

const { socketIoMock } = require('./socketIoMock');
const { plainToInstance } = require('../../src/shared/app/class-transformer-custom');
const { HostedGame, OnlinePlayers } = require('../../src/shared/app/models');

/*
 * To add a command, also add declaration in ./index.d.ts
 */

Cypress.Commands.add('createAIGameWithRandom', (submit = true) => {
    cy.contains('Play vs AI').click();

    cy
        .contains('h5', 'Play vs AI')
        .closest('.modal-content')
        .contains('button', 'random')
        .click()
    ;

    cy
        .contains('h5', 'Play vs AI')
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
    cy
        .contains('h5', 'Play vs AI')
        .closest('.modal-content')
        .contains('button', 'Play vs AI')
        .click()
    ;
});

Cypress.Commands.add('play', (x, y) => {
    cy.get('canvas');
    cy.wait(50);
    cy.get('body').click(x, y);
});

Cypress.Commands.add('openGameSidebar', () => {
    cy
        .get('[aria-label="Open game sidebar and chat"]')
        .click()
    ;
});

Cypress.Commands.add('closeGameSidebar', () => {
    cy
        .contains('.block-close', 'Close')
        .click()
    ;
});

beforeEach(() => {
    Cypress.env('socketIoMocked', false);
});

Cypress.Commands.add('mockSocketIO', () => {
    cy.on('window:before:load', (window) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).io = () => socketIoMock;
    });

    Cypress.env('socketIoMocked', true);
});

Cypress.Commands.add('receiveSocketIoMessage', (type, ...args) => {
    if (!Cypress.env('socketIoMocked')) {
        throw new Error('Cannot emit mocked socket message, must call "cy.mockSocketIO()" at the beginning of the test');
    }

    Cypress.log({
        name: 'receiveSocketIoMessage',
        message: type,
        consoleProps: () => ({
            eventName: type,
            args,
        }),
    });

    socketIoMock.emit(type, ...args);
});

Cypress.Commands.add('receiveGameUpdate', fixtureFile => {
    cy.fixture(fixtureFile).then((fixture: unknown) => {
        const hostedGame = plainToInstance(HostedGame, fixture);

        cy.receiveSocketIoMessage('gameUpdate', hostedGame.publicId, plainToInstance(HostedGame, fixture));
    });
});

Cypress.Commands.add('receiveLobbyUpdate', fixtureFile => {
    cy.fixture(fixtureFile).then((fixtures: unknown[]) => {
        cy.receiveSocketIoMessage('lobbyUpdate', fixtures.map(fixture => plainToInstance(HostedGame, fixture)));
    });
});

Cypress.Commands.add('receivePlayerGamesUpdate', fixtureFile => {
    cy.fixture(fixtureFile).then((fixtures: unknown[]) => {
        const hostedGames = fixtures.map(fixture => plainToInstance(HostedGame, fixture));

        cy.receiveSocketIoMessage('lobbyUpdate', hostedGames);
        cy.receiveSocketIoMessage('playerGamesUpdate', hostedGames);
    });
});

Cypress.Commands.add('receiveOnlinePlayersUpdate', fixtureFile => {
    cy.fixture(fixtureFile).then((fixture: unknown[]) => {
        cy.receiveSocketIoMessage('onlinePlayersUpdate', plainToInstance(OnlinePlayers, fixture));
    });
});
