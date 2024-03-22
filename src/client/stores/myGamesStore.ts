import { defineStore, storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import useAuthStore from './authStore';
import useSocketStore from './socketStore';
import { HostedGameData } from '@shared/app/Types';
import Player from '@shared/models/Player';
import { MoveData } from '@shared/game-engine/Types';
import Rooms from '@shared/app/Rooms';
import { PlayerIndex } from '@shared/game-engine';
import useLobbyStore from './lobbyStore';
import { timeValueToSeconds } from '@shared/time-control/TimeValue';
import { getGames } from '../apiClient';

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

    const { socket, joinRoom, leaveRoom } = useSocketStore();
    const { loggedInPlayer } = storeToRefs(useAuthStore());
    const { initialGamesPromise } = useLobbyStore();

    const myGames = ref<{ [key: string]: CurrentGame }>({});
    const mostUrgentGame = ref<null | CurrentGame>(null);
    const opponentName = (opponent: Player) => (opponent.isGuest ? "Guest " : "") + opponent.pseudo;

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

        const time0 = game0.hostedGameData.timeControl.players[game0.myColor].totalRemainingTime;
        const time1 = game1.hostedGameData.timeControl.players[game1.myColor].totalRemainingTime;

        return timeValueToSeconds(time0) - timeValueToSeconds(time1);
    };

    const isPlaying = (game: CurrentGame): boolean => {
        return game.hostedGameData.state === 'playing';
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
        if (hostedGameData.host.publicId !== loggedInPlayer.value?.publicId) {
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
        const { gameData, id } = hostedGameData;
        const me = loggedInPlayer.value;

        if (null === me || null === gameData) {
            return;
        }

        if (!hostedGameData.players.some(p => p.publicId === me.publicId)) {
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

        const myColor = hostedGameData.players[0].publicId === loggedInPlayer.value?.publicId ? 0 : 1;
        myGames.value[id].myColor = myColor
        myGames.value[id].isMyTurn = hostedGameData.players[gameData.currentPlayerIndex].publicId === loggedInPlayer.value?.publicId;
        myGames.value[id].hostedGameData = hostedGameData;

        if (!document.hasFocus()) {
            const opponent = hostedGameData.players[1 - myColor]

            new Notification(`PlayHex`, { body: `Game with ${opponentName(opponent)} has started` })
                .onclick = function() {
                    window.location.pathname = `/games/${id}`;
                    focus(window);
                    this.close()
                };
        }

        mostUrgentGame.value = getMostUrgentGame();
    });

    socket.on('moved', (gameId: string, move: MoveData, moveIndex: number, byPlayerIndex: PlayerIndex) => {
        if (!myGames.value[gameId] || null === myGames.value[gameId].myColor) {
            return;
        }

        const isMyTurn = myGames.value[gameId].myColor !== byPlayerIndex;
        myGames.value[gameId].isMyTurn = isMyTurn;

        if (isMyTurn && !document.hasFocus()) {
            const opponent =
                myGames
                .value[gameId]
                .hostedGameData
                .players[byPlayerIndex]

            new Notification(`PlayHex`, { body: `${opponentName(opponent)} made a move` })
                .onclick = function() {
                    window.location.pathname = `/games/${gameId}`;
                    focus(window);
                    this.close()
                };
        }

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
    let initialized = false;

    watch(storeToRefs(useAuthStore()).loggedInPlayer, async (me, oldMe) => {
        myGames.value = {};
        mostUrgentGame.value = null;

        if (null !== oldMe) {
            leaveRoom(Rooms.playerGames(oldMe.publicId));
        }

        if (null === me) {
            return;
        }

        joinRoom(Rooms.playerGames(me.publicId));

        // On page load, reuse same initial games list load.
        // For next player changements, reload games list.
        const initialGames = await (initialized ? getGames() : initialGamesPromise);

        initialized = true;

        initialGames.forEach(hostedGameData => {
            const { id, gameData } = hostedGameData;

            // I'm not in the game
            if (!hostedGameData.players.some(p => p.publicId === me.publicId)) {
                return;
            }

            // Game finished
            if ('ended' === hostedGameData.state) {
                return;
            }

            let isMyTurn = false;
            let myColor: null | PlayerIndex = null;

            if (null !== gameData) {
                myColor = hostedGameData.players[0].publicId === me.publicId ? 0 : 1;
                isMyTurn = hostedGameData.players[gameData.currentPlayerIndex].publicId === me.publicId;
            }

            myGames.value[hostedGameData.id] = { id, isMyTurn, myColor, hostedGameData };
        });

        mostUrgentGame.value = getMostUrgentGame();
    });


    return {
        myGames,
        myGamesCount,
        myTurnCount,
        mostUrgentGame,
    };
});

export default useMyGamesStore;
