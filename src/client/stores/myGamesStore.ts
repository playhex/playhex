import { defineStore, storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import useAuthStore from './authStore';
import useSocketStore from './socketStore';
import { HostedGame, Move } from '@shared/app/models';
import Rooms from '@shared/app/Rooms';
import { PlayerIndex } from '@shared/game-engine';
import { pseudoString } from '@shared/app/pseudoUtils';
import useLobbyStore from './lobbyStore';
import { timeValueToSeconds } from '@shared/time-control/TimeValue';
import { getGames } from '../apiClient';
import { useRouter } from 'vue-router';
import { sendNotification } from '../services/notifications';
import * as Notif from '../services/notifications';

export type CurrentGame = {
    id: string;
    isMyTurn: boolean;
    myColor: null | PlayerIndex;
    hostedGame: HostedGame;
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
    const router = useRouter();

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

        return timeValueToSeconds(time0, now) - timeValueToSeconds(time1, now);
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
        if (hostedGame.host.publicId !== loggedInPlayer.value?.publicId) {
            return;
        }

        myGames.value[hostedGame.id] = {
            id: hostedGame.id,
            isMyTurn: false,
            myColor: null,
            hostedGame: hostedGame,
        };

        mostUrgentGame.value = getMostUrgentGame();

        Notif.requestNotificationPermission();
    });

    socket.on('gameStarted', (hostedGame: HostedGame) => {
        const { gameData, id } = hostedGame;
        const me = loggedInPlayer.value;

        if (null === me || null === gameData) {
            return;
        }

        if (!hostedGame.hostedGameToPlayers.some(p => p.player.publicId === me.publicId)) {
            return;
        }

        if (!myGames.value[id]) {
            myGames.value[id] = {
                id,
                isMyTurn: false,
                myColor: null,
                hostedGame: hostedGame,
            };
        }

        const myColor = hostedGame.hostedGameToPlayers[0].player.publicId === loggedInPlayer.value?.publicId ? 0 : 1;
        myGames.value[id].myColor = myColor;
        myGames.value[id].isMyTurn = hostedGame.hostedGameToPlayers[gameData.currentPlayerIndex].player.publicId === loggedInPlayer.value?.publicId;
        myGames.value[id].hostedGame = hostedGame;

        if (!document.hasFocus()) {
            const opponent = hostedGame.hostedGameToPlayers[1 - myColor].player;

            sendNotification(
                { body: `Game with ${pseudoString(opponent, 'pseudo')} has started`
                , tag: Notif.tags.game
                },
                () => {
                    router.push({
                        name: 'online-game',
                        params: { gameId: id }
                    });
                }
            );
        }

        mostUrgentGame.value = getMostUrgentGame();
    });

    socket.on('moved', (gameId: string, move: Move, moveIndex: number, byPlayerIndex: PlayerIndex) => {
        if (!myGames.value[gameId] || null === myGames.value[gameId].myColor) {
            return;
        }

        const isMyTurn = myGames.value[gameId].myColor !== byPlayerIndex;
        myGames.value[gameId].isMyTurn = isMyTurn;

        if (isMyTurn && !document.hasFocus()) {
            const opponent =
                myGames
                .value[gameId]
                .hostedGame
                .hostedGameToPlayers[byPlayerIndex].player;

            sendNotification(
                { body: `${pseudoString(opponent, 'pseudo')} made a move`
                , tag: Notif.tags.game
                },
                () => {
                    router.push({
                        name: 'online-game',
                        params: { gameId }
                    });
                }
            );
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

        initialGames.forEach(hostedGame => {
            const { id, gameData } = hostedGame;

            // I'm not in the game
            if (!hostedGame.hostedGameToPlayers.some(p => p.player.publicId === me.publicId)) {
                return;
            }

            // Game finished
            if ('ended' === hostedGame.state) {
                return;
            }

            let isMyTurn = false;
            let myColor: null | PlayerIndex = null;

            if (null !== gameData) {
                myColor = hostedGame.hostedGameToPlayers[0].player.publicId === me.publicId ? 0 : 1;
                isMyTurn = hostedGame.hostedGameToPlayers[gameData.currentPlayerIndex].player.publicId === me.publicId;
            }

            myGames.value[hostedGame.id] = { id, isMyTurn, myColor, hostedGame: hostedGame };
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
