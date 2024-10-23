import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import useAuthStore from './authStore';
import useSocketStore from './socketStore';
import { HostedGame, Move } from '@shared/app/models';
import Rooms from '@shared/app/Rooms';
import { PlayerIndex } from '@shared/game-engine';
import { timeValueToMilliseconds } from '@shared/time-control/TimeValue';
import { requestBrowserNotificationPermission } from '../services/notifications';

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
    const mostUrgentGame = ref<null | CurrentGame>(null);

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
            .filter(game => isPlaying(game) && game.isMyTurn)
            .length
        ;
    });

    const byRemainingTime = (now: Date) => (game0: CurrentGame, game1: CurrentGame): number => {
        if (null === game0.myColor || null === game1.myColor) {
            return 0;
        }

        const time0 = game0.hostedGame.timeControl.players[game0.myColor].totalRemainingTime;
        const time1 = game1.hostedGame.timeControl.players[game1.myColor].totalRemainingTime;

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
    const getMostUrgentGame = (): null | CurrentGame => {
        if (isEmpty()) {
            return null;
        }

        const playingGames = Object.values(myGames.value)
            .filter(game => isPlaying(game))
            .sort(byRemainingTime(new Date()))
        ;

        if (0 === playingGames.length) {
            return null;
        }

        return playingGames

            // My turn, less remaining time
            .find(game => game.isMyTurn)

            // Not my turn, but game is playing and less remaining time
            ?? playingGames[0]
        ;
    };


    socket.on('gameCreated', (hostedGame: HostedGame) => {
        if (hostedGame.host.publicId !== authStore.loggedInPlayer?.publicId) {
            return;
        }

        myGames.value[hostedGame.publicId] = {
            publicId: hostedGame.publicId,
            isMyTurn: false,
            myColor: null,
            hostedGame: hostedGame,
        };

        mostUrgentGame.value = getMostUrgentGame();

        requestBrowserNotificationPermission();
    });

    socket.on('gameStarted', (hostedGame: HostedGame) => {
        const { gameData, publicId } = hostedGame;
        const me = authStore.loggedInPlayer;

        if (null === me || null === gameData) {
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
        myGames.value[publicId].isMyTurn = hostedGame.hostedGameToPlayers[gameData.currentPlayerIndex].player.publicId === authStore.loggedInPlayer?.publicId;
        myGames.value[publicId].hostedGame = hostedGame;

        mostUrgentGame.value = getMostUrgentGame();
    });

    socket.on('moved', (gameId: string, move: Move, moveIndex: number, byPlayerIndex: PlayerIndex) => {
        if (!myGames.value[gameId] || null === myGames.value[gameId].myColor) {
            return;
        }

        const isMyTurn = myGames.value[gameId].myColor !== byPlayerIndex;
        myGames.value[gameId].isMyTurn = isMyTurn;

        mostUrgentGame.value = getMostUrgentGame();
    });

    socket.on('ended', (gameId: string) => {
        delete myGames.value[gameId];

        mostUrgentGame.value = getMostUrgentGame();
    });

    socket.on('gameCanceled', (gameId: string) => {
        delete myGames.value[gameId];

        mostUrgentGame.value = getMostUrgentGame();
    });

    socket.on('playerGamesUpdate', (initialGames: HostedGame[]) => {
        const me = authStore.loggedInPlayer;

        if (null === me) return;

        myGames.value = {};
        mostUrgentGame.value = null;

        for (const hostedGame of initialGames) {
            const { publicId: id, gameData } = hostedGame;

            // I'm not in the game
            if (!hostedGame.hostedGameToPlayers.some(p => p.player.publicId === me.publicId)) {
                continue;
            }

            // Game finished
            if ('ended' === hostedGame.state) {
                continue;
            }

            let isMyTurn = false;
            let myColor: null | PlayerIndex = null;

            if (null !== gameData) {
                myColor = hostedGame.hostedGameToPlayers[0].player.publicId === me.publicId ? 0 : 1;
                isMyTurn = hostedGame.hostedGameToPlayers[gameData.currentPlayerIndex].player.publicId === me.publicId;
            }

            myGames.value[hostedGame.publicId] = { publicId: id, isMyTurn, myColor, hostedGame: hostedGame };
        }

        mostUrgentGame.value = getMostUrgentGame();
    });

    watch(
        [() => socketStore.connected, () => authStore.loggedInPlayer],
        ([connected, me], [, oldMe]) => {
            if (!connected) return;
            if (null != oldMe) {
                leaveRoom(Rooms.playerGames(oldMe.publicId));
            }
            if (null != me) {
                joinRoom(Rooms.playerGames(me.publicId));
            }
        },
        { immediate: true },
    );

    return {
        myGames,
        myGamesCount,
        myTurnCount,
        mostUrgentGame,
    };
});

export default useMyGamesStore;
