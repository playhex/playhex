<script setup lang="ts">
import Player from '../../../shared/app/models/Player.js';
import { PropType } from 'vue';
import { glicko2Settings, isRatingConfident } from '../../../shared/app/ratingUtils.js';

defineProps({
    player: {
        type: Object as PropType<Player>,
        required: true,
    },

    /**
     * How to display rating:
     * - `<AppPlayerRating />` rating is shown in minimalist form, like "1500" or "~1500" depending on confidence
     * - `<AppPlayerRating full />` rating is fully shown, like "1500 ±140"
     */
    full: {
        type: Boolean,
        default: false,
    },
});

const { round } = Math;
</script>

<template>
    <small class="text-body-secondary d-inline-block">
        <template v-if="full">
            {{ round(player.currentRating?.rating ?? glicko2Settings.rating) }} ±{{ round((player.currentRating?.deviation ?? glicko2Settings.rd) * 2) }}
        </template>
        <template v-else>
            <template v-if="player.currentRating ? !isRatingConfident(player.currentRating) : true">~</template>{{ round(player.currentRating?.rating ?? glicko2Settings.rating) }}
        </template>
    </small>
</template>
