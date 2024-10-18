import { reactive, Reactive } from 'vue';
import { defineStore } from 'pinia';
import { Player } from '../../shared/app/models';
import useSocketStore from './socketStore';
import { createInitialRating } from '../../shared/app/ratingUtils';

/**
 * Keep a same instance of players objects.
 * Used to use a same reactive instance everywhere,
 * and i.e update rating only here and update it on all places.
 *
 * I.e: usePlayersStore().playerRef(player) => returns a same ref used accross all views.
 */
const usePlayersStore = defineStore('playerstore', () => {

    const players: { [publicId: string]: Reactive<Player> } = {};

    const playerRef = (player: Player): Reactive<Player> => {
        const { publicId } = player;

        if (!players[publicId]) {
            players[publicId] = reactive(player);

            if (!players[publicId].currentRating) {
                players[publicId].currentRating = createInitialRating(players[publicId]);
            }
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
