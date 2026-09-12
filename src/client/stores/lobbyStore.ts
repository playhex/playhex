import { defineStore } from 'pinia';
import { Game } from '../../shared/app/models/index.js';
import { getGame, getGames } from '../../client/apiClient.js';
import useSocketStore from './socketStore.js';
import { computed, ref, watchEffect } from 'vue';
import Rooms from '../../shared/app/Rooms.js';
import { cancelGame, hasPlayer, isChallengeGame, isChallengeTargetOf, matchSearchParams, updateGame } from '../../shared/app/gameUtils.js';
import SearchGamesParameters from '../../shared/app/SearchGamesParameters.js';
import { isCorrespondence, isLive, TimeControlCadency } from '../../shared/app/timeControlUtils.js';
import useAuthStore from './authStore.js';

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
    const authStore = useAuthStore();

    /**
     * List of games waiting for opponent, show on lobby in created section,
     * and keep track of updates.
     */
    const games = ref<{ [key: string]: Game & SoftRemovable }>({});

    /**
     * List of last ended games, show on lobby in ended games,
     * updates when an active game ends.
     */
    const endedGames = ref<Game[]>([]);

    const currentLobby = ref<TimeControlCadency>('live');

    const waitingGamesCount = computed<{ live: number, correspondence: number }>(() => {
        const count = { live: 0, correspondence: 0 };
        for (const publicId in games.value) {
            const game = games.value[publicId];
            if (isSoftRemoved(game)) continue;
            if (isLive(game)) ++count.live;
            else ++count.correspondence;
        }
        return count;
    });

    const currentLobbyGames = computed<(Game & SoftRemovable)[]>(() => {
        if (currentLobby.value === 'live') {
            return Object.values(games.value).filter(game => isLive(game));
        } else {
            return Object.values(games.value).filter(game => isCorrespondence(game));
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

        for (const id in games.value) {
            const game = games.value[id];

            if (game.softRemoved && (now > game.softRemoved || immediate)) {
                delete games.value[id];
            }
        }
    };

    const isSoftRemoved = (softRemovable: SoftRemovable): boolean => {
        return !!softRemovable.softRemoved;
    };

    const excludeSoftRemoved = (softRemovable: SoftRemovable): boolean => {
        return !softRemovable.softRemoved;
    };

    const getOrFetchGame = async (gameId: string): Promise<null | Game> => {
        return games.value[gameId] ?? await getGame(gameId);
    };

    /**
     * Join a game to play if there is a free slot.
     */
    const joinGame = async (gamePublicId: string): Promise<void> => {
        return await new Promise((resolve, reject) => {
            socket.emit('joinGame', gamePublicId, (answer: true | string) => {
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

        endedGames.value = results;
    };

    const listenLobbyEvents = (): void => {
        socket.on('lobbyUpdate', updatedGames => {
            // Sort newest first so initial games list, and any new game appearing in this batch,
            // are well ordered. Already known games keep their existing position (no sort here)
            // to avoid layout shift when a game already displayed gets updated.
            const sortedGames = [...updatedGames].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            for (const game of sortedGames) {
                if (games.value[game.publicId]) {
                    updateGame(games.value[game.publicId], game);
                } else {
                    games.value[game.publicId] = game;
                }

                if (games.value[game.publicId].state !== 'created') {
                    games.value[game.publicId].softRemoved = softRemoveDate();
                }
            }

            // Done after lobbyUpdate event received to make sure I don't miss an ended game
            // finished just before I receive the lobbyUpdate event.
            void updateLastEndedGames();
        });

        socket.on('lobbyGameCreated', (game: Game) => {
            // Nominative challenges are not part of the public lobby,
            // except for the host and the targeted player, who should still see it there.
            if (isChallengeGame(game)) {
                const player = authStore.loggedInPlayer;
                const isRelevantToMe = player !== null && (hasPlayer(game, player) || isChallengeTargetOf(game, player));

                if (!isRelevantToMe) {
                    return;
                }
            }

            games.value[game.publicId] = game;
        });

        socket.on('lobbyGameStarted', (game: Game) => {
            if (games.value[game.publicId]) {
                games.value[game.publicId].softRemoved = softRemoveDate();
            }
        });

        socket.on('gameCanceled', (gameId, { date }) => {
            if (games.value[gameId]) {
                cancelGame(games.value[gameId], date);

                games.value[gameId].softRemoved = softRemoveDate();
            }
        });

        socket.on('lobbyGameEnded', (game: Game) => {
            if (!matchSearchParams(game, lastEndedGamesParameters)) {
                return;
            }

            endedGames.value.unshift(game);

            while (endedGames.value.length > 5) {
                endedGames.value.pop();
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
        games,
        endedGames,
        currentLobby,
        currentLobbyGames,
        waitingGamesCount,
        joinGame,
        getOrFetchGame,
        clearSoftRemovedGames,
        isSoftRemoved,
        excludeSoftRemoved,
    };
});

export default useLobbyStore;
