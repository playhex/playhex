declare namespace Cypress {
    interface Chainable {
        /**
         * Open AI game creation popin, select determinist bot.
         * Pass submit=false to keep game options popin open.
         */
        createAIGameWithRandom(submit?: boolean): Chainable;

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
         * Simulate a "playerGamesUpdate" message with a fixture file (will be denormalized).
         */
        receivePlayerGamesUpdate(fixtureFile: string): Chainable;

        /**
         * Simulate a "onlinePlayersUpdate" message with a fixture file (will be denormalized).
         */
        receiveOnlinePlayersUpdate(fixtureFile: string): Chainable;
    }
}
