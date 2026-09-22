declare namespace Cypress {
    interface Chainable {
        /**
         * Assert that a guest pseudo, i.e "Guest 1234", is displayed, and yield the element containing it.
         * Useful to wait for the page to be loaded and the player logged in.
         *
         * cy.containsGuestPseudo(); // anywhere in the page
         * cy.containsGuestPseudo('.menu-top'); // inside an element matching this selector
         * cy.containsGuestPseudo('.sidebar', /GUEST wins!/); // with surrounding text, "GUEST" being the guest pseudo
         * cy.containsGuestPseudo(null, /GUEST wins!/); // anywhere in the page, with surrounding text
         */
        containsGuestPseudo(selector?: null | string, pattern?: RegExp): Chainable<JQuery<HTMLElement>>;

        /**
         * Open the player menu from the top menu, and yield it.
         */
        openPlayerMenu(): Chainable<JQuery<HTMLElement>>;

        /**
         * Open player menu from top menu, then go to my profile page.
         * Yields the pseudo heading of the profile page.
         */
        goToMyProfilePage(): Chainable<JQuery<HTMLElement>>;

        /**
         * Open AI game creation popin, select determinist bot.
         *
         * @param submit Pass submit=false to keep game options popin open. Defaults to true.
         * @param wait Pass wait=true to make bot wait 1s before play. Defaults to false
         */
        createAIGameWithRandom(submit?: boolean, wait?: boolean): Chainable;

        /**
         * To use after createAIGameWithRandom(false),
         * submit game options and create game.
         */
        submitAIGame(): Chainable;

        /**
         * Click on screen to play a move.
         * x and y are coords of pixel on screen.
         */
        play(x: number, y: number): Chainable;

        /**
         * When on game page, open game sidebar.
         */
        openGameSidebar(): Chainable;

        /**
         * When on game page, close game sidebar.
         */
        closeGameSidebar(): Chainable;

        /**
         * Add this at the beginning of the test in order to received mocked socket io messages.
         */
        mockSocketIO(): Chainable;

        /**
         * Simulate a websocket message received from socket.io.
         * Warning: payload is not denormalized, so will be raw objects, string instead of js Date, ...
         */
        receiveSocketIoMessage(type: string, ...args: unknown[]): Chainable;

        /**
         * Simulate a "gameUpdate" message, for a gameId, and a fixture file (will be denormalized).
         */
        receiveGameUpdate(fixtureFile: string): Chainable;

        /**
         * Simulate a "lobbyUpdate" message with a fixture file (will be denormalized).
         */
        receiveLobbyUpdate(fixtureFile: string): Chainable;

        /**
         * Simulate a "lobbyGameCreated" message with a fixture file (single game, will be denormalized).
         */
        receiveLobbyGameCreated(fixtureFile: string): Chainable;

        /**
         * Simulate a "playerGamesUpdate" message with a fixture file (will be denormalized).
         * Also emits the same games as a "lobbyUpdate" message.
         */
        receivePlayerGamesUpdate(fixtureFile: string): Chainable;

        /**
         * Simulate a "playerGamesUpdate" message only (no "lobbyUpdate"), with a fixture file (will be denormalized).
         */
        receiveMyGamesUpdate(fixtureFile: string): Chainable;

        /**
         * Simulate a "onlinePlayersUpdate" message with a fixture file (will be denormalized).
         */
        receiveOnlinePlayersUpdate(fixtureFile: string): Chainable;

        /**
         * Simulate a "gameStarted" message with a fixture file (will be denormalized).
         */
        receiveGameStarted(fixtureFile: string): Chainable;

        /**
         * Simulate a "moved" message for a game.
         */
        receiveMoved(gameId: string, move: string, moveIndex: number, byPlayerIndex: number): Chainable;

        /**
         * Set up a one-time handler that acks the next "sendChannelChat" socket emit with success,
         * then broadcasts "channelChatMessagePosted" back so the message appears in the UI.
         * Pass the player object to include in the broadcasted message.
         */
        mockSendChannelChat(player: object): Chainable;

        /**
         * When creating a game, slide to select initial time to the given value.
         * Ex: slidePrimaryTimeControl(10, 'minutes')
         * Ex: slidePrimaryTimeControl(3, 'days')
         */
        slidePrimaryTimeControl(value: number, unit: 's' | 'min' | 'h' | 'd'): Chainable;

        /**
         * When creating a game, slide to select time increment (or byo yomi period) to the given value.
         * Ex: slideSecondaryTimeControl(10, 'seconds')
         * Ex: slideSecondaryTimeControl(1, 'day')
         */
        slideSecondaryTimeControl(value: number, unit: 's' | 'min' | 'h' | 'd'): Chainable;
    }
}
