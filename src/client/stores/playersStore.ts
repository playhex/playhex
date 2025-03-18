import { reactive, Reactive } from 'vue';
import { defineStore } from 'pinia';
import { Player } from '../../shared/app/models/index.js';
import useSocketStore from './socketStore.js';
import { createInitialRating } from '../../shared/app/ratingUtils.js';

/**
 * Keep a same instance of players objects.
 * Used to use a same reactive instance everywhere,
 * and i.e update rating only here and update it on all places.
 *
 * I.e: usePlayersStore().playerRef(player) => returns a same ref used accross all views.
 */
const usePlayersStore = defineStore('playersStore', () => {

    const players: { [publicId: string]: Reactive<Player> } = {};

    const playerRef = (player: Player, update = false): Reactive<Player> => {
        const { publicId } = player;

        if (!players[publicId]) {
            players[publicId] = reactive(player);

            if (!players[publicId].currentRating) {
                players[publicId].currentRating = createInitialRating(players[publicId]);
            }
        } else if (update) {
            Object.assign(players[publicId], player);
        }

        return players[publicId];
    };

    useSocketStore().socket.on('ratingsUpdated', (gameId, ratings) => {
        for (const rating of ratings) {
            if (rating.category !== 'overall') {
                continue;
            }

            const { publicId } = rating.player;

            if (!players[publicId]) {
                players[publicId] = reactive(rating.player);
            }

            players[publicId].currentRating = rating;
        }
    });

    return {
        playerRef,
    };

});

export default usePlayersStore;
