import { defineStore, storeToRefs } from 'pinia';
import { computed, ref } from 'vue';
import useAuthStore from './authStore';
import useSocketStore from './socketStore';
import { HostedGameData, MoveData } from '@shared/app/Types';
import Rooms from '@shared/app/Rooms';
import { PlayerIndex } from '@shared/game-engine';
import useLobbyStore from './lobbyStore';
import { timeValueToSeconds } from '@shared/time-control/TimeControlInterface';

export type CurrentGame = {
    id: string;
    isMyTurn: boolean;
    myColor: null | PlayerIndex;
    hostedGameData: HostedGameData;
};

/**
 * My current games.
 */
const useMyGamesStore = defineStore('myGamesStore', () => {

    const { socket, joinRoom } = useSocketStore();
    const { loggedInUser } = storeToRefs(useAuthStore());
    const { loggedInUserPromise } = useAuthStore();
    const { initialGamesPromise } = useLobbyStore();

    const myGames = ref<{ [key: string]: CurrentGame }>({});
    const mostUrgentGame = ref<null | CurrentGame>(null);

    loggedInUserPromise.then(loggedInUser => joinRoom(Rooms.playerGames(loggedInUser.id)));

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
            .filter(game => game.isMyTurn)
            .length
        ;
    });

    const byRemainingTime = (game0: CurrentGame, game1: CurrentGame): number => {
        if (null === game0.myColor || null === game1.myColor) {
            return 0;
        }

        const time0 = game0.hostedGameData.timeControlValues.players[game0.myColor].totalRemainingTime;
        const time1 = game1.hostedGameData.timeControlValues.players[game1.myColor].totalRemainingTime;

        return timeValueToSeconds(time0) - timeValueToSeconds(time1);
    };

    /**
     * Returns game id to redirect on when click on notification.
     * Most urgent is game where I should play first,
     * or should watch first if not game where I must play.
     *
     * Or null if I have 0 current game.
     */
    const getMostUrgentGame = (): null | CurrentGame => {
        if (0 === Object.values(myGames.value).length) {
            return null;
        }

        const myTurnGames = Object.values(myGames.value)
            .filter(game => game.isMyTurn)
            .sort(byRemainingTime)
        ;

        // My turn, less remaining time
        if (myTurnGames.length > 0) {
            return myTurnGames[0];
        }

        // Not my turn, but game is playing and less remaining time
        const notMyTurnLessTime = Object.values(myGames.value)
            .filter(game => game.hostedGameData.gameData?.state === 'playing')
            .sort(byRemainingTime)
        ;

        if (notMyTurnLessTime.length > 0) {
            return notMyTurnLessTime[0];
        }

        return Object.values(myGames.value)[0];
    };


    socket.on('gameCreated', (hostedGameData: HostedGameData) => {
        if (hostedGameData.host.id === loggedInUser.value?.id) {
            myGames.value[hostedGameData.id] = {
                id: hostedGameData.id,
                isMyTurn: false,
                myColor: null,
                hostedGameData,
            };

            mostUrgentGame.value = getMostUrgentGame();
        }
    });

    socket.on('gameStarted', (hostedGameData: HostedGameData) => {
        const { gameData, id } = hostedGameData;

        if (!gameData) {
            return;
        }

        if (!myGames.value[id]) {
            myGames.value[id] = {
                id,
                isMyTurn: false,
                myColor: null,
                hostedGameData,
            };
        }

        myGames.value[id].myColor = gameData.players[0].id === loggedInUser.value?.id ? 0 : 1;
        myGames.value[id].isMyTurn = gameData.players[gameData.currentPlayerIndex].id === loggedInUser.value?.id;

        mostUrgentGame.value = getMostUrgentGame();
    });

    socket.on('moved', (gameId: string, move: MoveData, byPlayerIndex: PlayerIndex) => {
        if (!myGames.value[gameId] || null === myGames.value[gameId].myColor) {
            return;
        }

        myGames.value[gameId].isMyTurn = myGames.value[gameId].myColor !== byPlayerIndex;

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

    /**
     * Initialize notification
     */
    (async () => {
        const [me, initialGames] = await Promise.all([
            loggedInUserPromise,
            initialGamesPromise,
        ]);

        initialGames.forEach(hostedGameData => {
            const { id, gameData, host, opponent } = hostedGameData;

            // I'm not in the game
            if (host.id !== me.id && (null === opponent || opponent.id !== me.id)) {
                return;
            }

            // Game finished
            if (null !== gameData && gameData.state === 'ended') {
                return;
            }

            let isMyTurn = false;
            let myColor: null | PlayerIndex = null;

            if (null !== gameData) {
                myColor = gameData.players[0].id === me.id ? 0 : 1;
                isMyTurn = gameData.players[gameData.currentPlayerIndex].id === me.id;
            }

            myGames.value[hostedGameData.id] = { id, isMyTurn, myColor, hostedGameData };
        });

        mostUrgentGame.value = getMostUrgentGame();
    })();


    return {
        myGames,
        myGamesCount,
        myTurnCount,
        mostUrgentGame,
    };
});

export default useMyGamesStore;
