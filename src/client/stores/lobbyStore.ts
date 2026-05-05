import { defineStore } from 'pinia';
import { HostedGame } from '../../shared/app/models/index.js';
import { getGame, getGames } from '../../client/apiClient.js';
import useSocketStore from './socketStore.js';
import { computed, ref, watchEffect } from 'vue';
import Rooms from '../../shared/app/Rooms.js';
import { cancelGame, matchSearchParams, updateHostedGame } from '../../shared/app/hostedGameUtils.js';
import SearchGamesParameters from '../../shared/app/SearchGamesParameters.js';
import { isCorrespondence, isLive } from '../../shared/app/timeControlUtils.js';

/**
 * Do not hide games directly from lobby when game started or canceled,
 * first make it unavailable, and delete only when we are sure
 * that it won't make player misclick (prevent CLS).
 */
type SoftRemovable = {

    /**
     * Whether game is no longer available to join.
     * Should be displayed as greyed out on lobby.
     * Will be deleted later, not before the Date, when misclick-safe.
     */
    softRemoved?: Date;
};

/**
 * In milliseconds, keep the soft removed item for at least this time.
 */
const REMOVE_AFTER = 3000;

const softRemoveDate = () => new Date(new Date().getTime() + REMOVE_AFTER);

/**
 * State synced with server, and methods to handle games and players.
 */
const useLobbyStore = defineStore('lobbyStore', () => {

    const socketStore = useSocketStore();
    const { socket, joinRoom } = socketStore;

    /**
     * List of games waiting for opponent, show on lobby in created section,
     * and keep track of updates.
     */
    const hostedGames = ref<{ [key: string]: HostedGame & SoftRemovable }>({});

    /**
     * List of last ended games, show on lobby in ended games,
     * updates when an active game ends.
     */
    const endedHostedGames = ref<HostedGame[]>([]);

    const currentLobby = ref<'live' | 'correspondence'>('live');

    const currentLobbyHostedGames = computed<(HostedGame & SoftRemovable)[]>(() => {
        if (currentLobby.value === 'live') {
            return Object.values(hostedGames.value).filter(hostedGame => isLive(hostedGame));
        } else {
            return Object.values(hostedGames.value).filter(hostedGame => isCorrespondence(hostedGame));
        }
    });

    /**
     * Remove all softRemoved games now.
     * Should be called when player is not hovering games list.
     *
     * @param immediate If true, will not wait REMOVE_AFTER delay. Used when we come back
     */
    const clearSoftRemovedGames = (immediate = false): void => {
        const now = new Date();

        for (const id in hostedGames.value) {
            const game = hostedGames.value[id];

            if (game.softRemoved && (now > game.softRemoved || immediate)) {
                delete hostedGames.value[id];
            }
        }
    };

    const isSoftRemoved = (softRemovable: SoftRemovable): boolean => {
        return !!softRemovable.softRemoved;
    };

    const excludeSoftRemoved = (softRemovable: SoftRemovable): boolean => {
        return !softRemovable.softRemoved;
    };

    const getOrFetchHostedGame = async (gameId: string): Promise<null | HostedGame> => {
        return hostedGames.value[gameId] ?? await getGame(gameId);
    };

    /**
     * Join a game to play if there is a free slot.
     */
    const joinGame = async (hostedGamePublicId: string): Promise<void> => {
        return await new Promise((resolve, reject) => {
            socket.emit('joinGame', hostedGamePublicId, (answer: true | string) => {
                if (answer === true) {
                    resolve();
                    return;
                }

                reject(new Error(answer));
            });
        });
    };

    const lastEndedGamesParameters: SearchGamesParameters = {
        endedAtSort: 'desc',
        opponentType: 'player',
        states: ['ended'],
        paginationPageSize: 5,
    };

    const updateLastEndedGames = async () => {
        const { results } = await getGames(lastEndedGamesParameters);

        endedHostedGames.value = results;
    };

    const listenLobbyEvents = (): void => {
        socket.on('lobbyUpdate', games => {
            for (const hostedGame of games) {
                if (hostedGames.value[hostedGame.publicId]) {
                    updateHostedGame(hostedGames.value[hostedGame.publicId], hostedGame);
                } else {
                    hostedGames.value[hostedGame.publicId] = hostedGame;
                }

                if (hostedGames.value[hostedGame.publicId].state !== 'created') {
                    hostedGames.value[hostedGame.publicId].softRemoved = softRemoveDate();
                }
            }

            // Done after lobbyUpdate event received to make sure I don't miss an ended game
            // finished just before I receive the lobbyUpdate event.
            void updateLastEndedGames();
        });

        socket.on('lobbyGameCreated', (hostedGame: HostedGame) => {
            hostedGames.value[hostedGame.publicId] = hostedGame;
        });

        socket.on('lobbyGameStarted', (hostedGame: HostedGame) => {
            if (hostedGames.value[hostedGame.publicId]) {
                hostedGames.value[hostedGame.publicId].softRemoved = softRemoveDate();
            }
        });

        socket.on('gameCanceled', (gameId, { date }) => {
            if (hostedGames.value[gameId]) {
                cancelGame(hostedGames.value[gameId], date);

                hostedGames.value[gameId].softRemoved = softRemoveDate();
            }
        });

        socket.on('lobbyGameEnded', (hostedGame: HostedGame) => {
            if (!matchSearchParams(hostedGame, lastEndedGamesParameters)) {
                return;
            }

            endedHostedGames.value.unshift(hostedGame);

            while (endedHostedGames.value.length > 5) {
                endedHostedGames.value.pop();
            }
        });
    };

    // Listen lobby event to update state on change
    listenLobbyEvents();

    // Get lobby updates
    watchEffect(() => {
        if (!socketStore.connected) {
            return;
        }

        void joinRoom(Rooms.lobby);
    });

    return {
        hostedGames,
        endedHostedGames,
        currentLobby,
        currentLobbyHostedGames,
        joinGame,
        getOrFetchHostedGame,
        clearSoftRemovedGames,
        isSoftRemoved,
        excludeSoftRemoved,
    };
});

export default useLobbyStore;
