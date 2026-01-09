import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useHead } from '@unhead/vue';
import useAuthStore from './authStore.js';
import useSocketStore from './socketStore.js';
import { HostedGame } from '../../shared/app/models/index.js';
import Rooms from '../../shared/app/Rooms.js';
import { PlayerIndex } from '../../shared/game-engine/index.js';
import { timeValueToMilliseconds } from '../../shared/time-control/TimeValue.js';
import { isBotGame } from '../../shared/app/hostedGameUtils.js';
import { iAmInGame } from '../services/notifications/context-utils.js';

export type CurrentGame = {
    publicId: string;
    isMyTurn: boolean;
    myColor: null | PlayerIndex;
    hostedGame: HostedGame;
};

/**
 * My current games.
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

    /**
     * Number of games where it's my turn to play.
     */
    const myTurnCount = computed((): number => {
        return Object.values(myGames.value)
            .filter(game =>
                isPlaying(game)
                && !isBotGame(game.hostedGame)
                && game.isMyTurn,
            )
            .length
        ;
    });

    const byRemainingTime = (now: Date) => (game0: CurrentGame, game1: CurrentGame): number => {
        if (game0.myColor === null || game1.myColor === null) {
            return 0;
        }

        const time0 = game0.hostedGame.timeControl?.players[game0.myColor].totalRemainingTime ?? Infinity;
        const time1 = game1.hostedGame.timeControl?.players[game1.myColor].totalRemainingTime ?? Infinity;

        return timeValueToMilliseconds(time0, now) - timeValueToMilliseconds(time1, now);
    };

    const isPlaying = (game: CurrentGame): boolean => {
        return game.hostedGame.state === 'playing';
    };

    const isEmpty = (): boolean => {
        for (const _ in myGames.value) {
            return false;
        }

        return true;
    };

    /**
     * Returns game id to redirect on when click on notification.
     * Most urgent is game where I should play first.
     * If there is no game where it is my turn to play,
     * returns the game where I have less remaining time.
     *
     * Or null if I have 0 current game.
     */
    const mostUrgentGame = computed((): null | CurrentGame => {
        if (isEmpty()) {
            return null;
        }

        const playingGames = Object.values(myGames.value)
            .filter(game =>
                isPlaying(game)
                && !isBotGame(game.hostedGame),
            )
            .sort(byRemainingTime(new Date()))
        ;

        if (playingGames.length === 0) {
            return null;
        }

        return playingGames

            // My turn, less remaining time
            .find(game => game.isMyTurn)

            // Not my turn, but game is playing and less remaining time
            ?? playingGames[0]
        ;
    });


    socket.on('gameCreated', (hostedGame: HostedGame) => {
        if (!iAmInGame(hostedGame)) {
            return;
        }

        myGames.value[hostedGame.publicId] = {
            publicId: hostedGame.publicId,
            isMyTurn: false,
            myColor: null,
            hostedGame: hostedGame,
        };
    });

    socket.on('gameStarted', (hostedGame: HostedGame) => {
        const { currentPlayerIndex, publicId } = hostedGame;
        const me = authStore.loggedInPlayer;

        if (me === null) {
            return;
        }

        if (!hostedGame.hostedGameToPlayers.some(p => p.player.publicId === me.publicId)) {
            return;
        }

        if (!myGames.value[publicId]) {
            myGames.value[publicId] = {
                publicId,
                isMyTurn: false,
                myColor: null,
                hostedGame: hostedGame,
            };
        }

        const myColor = hostedGame.hostedGameToPlayers[0].player.publicId === authStore.loggedInPlayer?.publicId ? 0 : 1;
        myGames.value[publicId].myColor = myColor;
        myGames.value[publicId].isMyTurn = hostedGame.hostedGameToPlayers[currentPlayerIndex].player.publicId === authStore.loggedInPlayer?.publicId;
        myGames.value[publicId].hostedGame = hostedGame;
    });

    socket.on('moved', (gameId, timestampedMove, moveIndex, byPlayerIndex) => {
        if (!myGames.value[gameId] || myGames.value[gameId].myColor === null) {
            return;
        }

        const isMyTurn = myGames.value[gameId].myColor !== byPlayerIndex;
        myGames.value[gameId].isMyTurn = isMyTurn;
    });

    socket.on('ended', (gameId: string) => {
        delete myGames.value[gameId];
    });

    socket.on('gameCanceled', (gameId: string) => {
        delete myGames.value[gameId];
    });

    socket.on('playerGamesUpdate', (initialGames: HostedGame[]) => {
        const me = authStore.loggedInPlayer;

        if (me === null) return;

        myGames.value = {};

        for (const hostedGame of initialGames) {
            const { publicId: id, currentPlayerIndex } = hostedGame;

            // I'm not in the game
            if (!hostedGame.hostedGameToPlayers.some(p => p.player.publicId === me.publicId)) {
                continue;
            }

            // Game finished
            if (hostedGame.state === 'ended') {
                continue;
            }

            let isMyTurn = false;
            let myColor: null | PlayerIndex = null;

            myColor = hostedGame.hostedGameToPlayers[0].player.publicId === me.publicId ? 0 : 1;
            isMyTurn = hostedGame.hostedGameToPlayers[currentPlayerIndex].player.publicId === me.publicId;

            myGames.value[hostedGame.publicId] = { publicId: id, isMyTurn, myColor, hostedGame: hostedGame };
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
                joinRoom(Rooms.playerGames(me.publicId));
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
    };
});

export default useMyGamesStore;
