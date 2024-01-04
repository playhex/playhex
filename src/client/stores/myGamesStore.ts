import { defineStore, storeToRefs } from 'pinia';
import { computed, ref } from 'vue';
import useAuthStore from './authStore';
import useSocketStore from './socketStore';
import { HostedGameData, MoveData } from '@shared/app/Types';
import Rooms from '@shared/app/Rooms';
import { PlayerIndex } from '@shared/game-engine';
import useLobbyStore from './lobbyStore';
import { timeValueToSeconds } from '@shared/time-control/TimeValue';

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
            .filter(game => isPlaying(game) && game.isMyTurn)
            .length
        ;
    });

    const byRemainingTime = (game0: CurrentGame, game1: CurrentGame): number => {
        if (null === game0.myColor || null === game1.myColor) {
            return 0;
        }

        const time0 = game0.hostedGameData.timeControl.values.players[game0.myColor].totalRemainingTime;
        const time1 = game1.hostedGameData.timeControl.values.players[game1.myColor].totalRemainingTime;

        return timeValueToSeconds(time0) - timeValueToSeconds(time1);
    };

    const isPlaying = (game: CurrentGame): boolean => {
        return game.hostedGameData.gameData?.state === 'playing'
            && !game.hostedGameData.canceled
        ;
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
            .sort(byRemainingTime)
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


    socket.on('gameCreated', (hostedGameData: HostedGameData) => {
        if (hostedGameData.host.id !== loggedInUser.value?.id) {
            return;
        }

        myGames.value[hostedGameData.id] = {
            id: hostedGameData.id,
            isMyTurn: false,
            myColor: null,
            hostedGameData,
        };

        mostUrgentGame.value = getMostUrgentGame();
    });

    socket.on('gameStarted', (hostedGameData: HostedGameData) => {
        const { gameData, id, host, opponent } = hostedGameData;
        const me = loggedInUser.value;

        if (null === me || null === gameData) {
            return;
        }

        if (host.id !== me.id && (null === opponent || opponent.id !== me.id)) {
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
        myGames.value[id].hostedGameData = hostedGameData;

        mostUrgentGame.value = getMostUrgentGame();
    });

    socket.on('moved', (gameId: string, move: MoveData, moveIndex: number, byPlayerIndex: PlayerIndex) => {
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
