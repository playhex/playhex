import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useHead } from '@unhead/vue';
import useAuthStore from './authStore.js';
import useSocketStore from './socketStore.js';
import { Game } from '../../shared/app/models/index.js';
import Rooms from '../../shared/app/Rooms.js';
import { PlayerIndex } from '../../shared/game-engine/index.js';
import { timeValueToMilliseconds } from '../../shared/time-control/TimeValue.js';
import { addMove, cancelGame, cloneGame, endGame, handleTimeControlUpdate, hasPlayer, isBotGame, isChallengeTargetOf } from '../../shared/app/gameUtils.js';
import { iAmInGame } from '../services/context-utils.js';
import { notifier } from '../services/notifications/notifier.js';

export type CurrentGame = {
    publicId: string;
    isMyTurn: boolean;
    myColor: null | PlayerIndex;
    game: Game;
};

/**
 * My current games.
 * Listens events on my games to:
 * - display "(1)" notification when I need to play a move
 * - send others front-side notifications, like sound notifications, or toast or browser notifications
 */
const useMyGamesStore = defineStore('myGamesStore', () => {

    const socketStore = useSocketStore();
    const { socket, joinRoom, leaveRoom } = socketStore;
    const authStore = useAuthStore();

    const myGames = ref<{ [key: string]: CurrentGame }>({});

    /**
     * Number of games where I'm in, created or playing.
     */
    const myGamesCount = computed((): number => {
        return Object.keys(myGames.value).length;
    });

    const isPlaying = (myGame: CurrentGame): boolean => {
        return myGame.game.state === 'playing';
    };

    /**
     * Whether this is a nominative challenge addressed to me, that I have not joined yet.
     */
    const isIncomingChallenge = (myGame: CurrentGame): boolean => {
        return isChallengeTargetOf(myGame.game, authStore.loggedInPlayer);
    };

    /**
     * Number of games where it's my turn to play, plus pending challenges addressed to me.
     */
    const myTurnCount = computed((): number => {
        const myTurnPlaying = Object.values(myGames.value)
            .filter(myGame =>
                isPlaying(myGame)
                && !isBotGame(myGame.game)
                && myGame.isMyTurn,
            )
            .length
        ;

        const incomingChallenges = Object.values(myGames.value)
            .filter(isIncomingChallenge)
            .length
        ;

        return myTurnPlaying + incomingChallenges;
    });

    const byMostUrgentFirst = (game0: CurrentGame, game1: CurrentGame): number => {
        if (game0.myColor === null || game1.myColor === null) {
            return 0;
        }

        if (isBotGame(game0.game) !== isBotGame(game1.game)) {
            return isBotGame(game0.game) ? 1 : -1;
        }

        if (game0.isMyTurn !== game1.isMyTurn) {
            return game0.isMyTurn ? -1 : 1;
        }

        const time0 = game0.game.timeControl?.players[game0.myColor].totalRemainingTime ?? Infinity;
        const time1 = game1.game.timeControl?.players[game1.myColor].totalRemainingTime ?? Infinity;
        const now = new Date();

        return timeValueToMilliseconds(time0, now) - timeValueToMilliseconds(time1, now);
    };

    /**
     * Playing games first (non-bot before bot), then pending challenges addressed to me,
     * so an incoming challenge appears after my playing games but before bot games.
     */
    const mySortedGames = computed((): CurrentGame[] => {
        const allGames = Object.values(myGames.value);

        const playingNonBot = allGames.filter(myGame => isPlaying(myGame) && !isBotGame(myGame.game)).sort(byMostUrgentFirst);
        const incomingChallenges = allGames.filter(isIncomingChallenge);
        const playingBot = allGames.filter(myGame => isPlaying(myGame) && isBotGame(myGame.game)).sort(byMostUrgentFirst);

        return [...playingNonBot, ...incomingChallenges, ...playingBot];
    });

    /**
     * Returns game id to redirect on when click on notification.
     * Most urgent is game where I should play first.
     * If there is no game where it is my turn to play,
     * returns the game where I have less remaining time.
     *
     * Or null if I have 0 current game.
     */
    const mostUrgentGame = computed((): null | CurrentGame => {
        const playingGames = mySortedGames.value
            .filter(myGame => !isBotGame(myGame.game))
        ;

        return playingGames[0] ?? null;
    });


    socket.on('gameCreated', (game: Game) => {
        if (!iAmInGame(game) && !isChallengeTargetOf(game, authStore.loggedInPlayer)) {
            return;
        }

        myGames.value[game.publicId] = {
            publicId: game.publicId,
            isMyTurn: false,
            myColor: null,
            game: cloneGame(game),
        };
    });

    socket.on('gameStarted', (game: Game) => {
        const { currentPlayerIndex, publicId } = game;
        const me = authStore.loggedInPlayer;

        if (me === null) {
            return;
        }

        if (!game.gameToPlayers.some(p => p.player.publicId === me.publicId)) {
            return;
        }

        if (!myGames.value[publicId]) {
            myGames.value[publicId] = {
                publicId,
                isMyTurn: false,
                myColor: null,
                game: cloneGame(game),
            };
        }

        const myColor = game.gameToPlayers[0].player.publicId === authStore.loggedInPlayer?.publicId ? 0 : 1;
        myGames.value[publicId].myColor = myColor;
        myGames.value[publicId].isMyTurn = game.gameToPlayers[currentPlayerIndex].player.publicId === authStore.loggedInPlayer?.publicId;
        myGames.value[publicId].game = game;

        notifier.emit('gameStart', game);
    });

    socket.on('moved', (gameId, timestampedMove, moveIndex, byPlayerIndex) => {
        if (!myGames.value[gameId] || myGames.value[gameId].myColor === null) {
            return;
        }

        addMove(myGames.value[gameId].game, timestampedMove, moveIndex, byPlayerIndex);

        myGames.value[gameId].isMyTurn = myGames.value[gameId].myColor !== byPlayerIndex;

        notifier.emit('move', myGames.value[gameId].game, timestampedMove);
    });

    socket.on('timeControlUpdate', (gameId, gameTimeData) => {
        if (!myGames.value[gameId]) {
            return;
        }

        handleTimeControlUpdate(myGames.value[gameId].game, gameTimeData);
    });

    socket.on('chat', (gameId, chatMessage) => {
        if (!myGames.value[gameId]) {
            return;
        }

        myGames.value[gameId].game.chatMessages.push(chatMessage);

        notifier.emit('chatMessage', myGames.value[gameId].game, chatMessage);
    });

    socket.on('ended', (gameId: string, winner, outcome, { date }) => {
        if (!myGames.value[gameId]) {
            return;
        }

        endGame(myGames.value[gameId].game, winner, outcome, date);

        notifier.emit('gameEnd', myGames.value[gameId].game);

        delete myGames.value[gameId];
    });

    socket.on('gameCanceled', (gameId: string, { date }) => {
        if (!myGames.value[gameId]) {
            return;
        }

        cancelGame(myGames.value[gameId].game, date);

        notifier.emit('gameEnd', myGames.value[gameId].game);

        delete myGames.value[gameId];
    });

    socket.on('playerGamesUpdate', (initialGames: Game[]) => {
        const me = authStore.loggedInPlayer;

        if (me === null) return;

        myGames.value = {};

        for (const game of initialGames) {
            const { publicId: id, currentPlayerIndex } = game;
            const iAmParticipant = hasPlayer(game, me);

            // I'm not in the game, and not the target of a pending challenge
            if (!iAmParticipant && !isChallengeTargetOf(game, me)) {
                continue;
            }

            // Game finished
            if (game.state === 'ended') {
                continue;
            }

            let isMyTurn = false;
            let myColor: null | PlayerIndex = null;

            if (iAmParticipant) {
                myColor = game.gameToPlayers[0].player.publicId === me.publicId ? 0 : 1;
                isMyTurn = game.gameToPlayers[currentPlayerIndex].player.publicId === me.publicId;
            }

            myGames.value[game.publicId] = { publicId: id, isMyTurn, myColor, game: cloneGame(game) };
        }
    });

    watch(
        [() => socketStore.connected, () => authStore.loggedInPlayer],
        ([connected, me], [, oldMe]) => {
            if (!connected) return;
            if (oldMe != null) {
                leaveRoom(Rooms.playerGames(oldMe.publicId));
            }
            if (me != null) {
                void joinRoom(Rooms.playerGames(me.publicId));
            }
        },
        { immediate: true },
    );

    // Show "(1) ..." in page title when I need to play
    useHead({
        titleTemplate: computed(() => myTurnCount.value > 0
            ? `(${myTurnCount.value}) %s`
            : '%s',
        ),
    });

    return {
        myGames,
        myGamesCount,
        myTurnCount,
        mostUrgentGame,
        mySortedGames,
    };
});

export default useMyGamesStore;
