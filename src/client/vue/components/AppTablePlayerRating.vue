<script setup lang="ts">
import { PropType } from 'vue';
import { Rating } from '../../../shared/app/models';
import { glicko2Settings, isRatingConfident } from '@shared/app/ratingUtils';

defineProps({
    rating: {
        type: Object as PropType<Rating>,
        default: null,
    },
});

const { round } = Math;
</script>

<template>
    <span v-if="rating" :class="{ 'text-secondary': !isRatingConfident(rating) }">
        {{ round(rating.rating) }}
        <small class="ms-2">±{{ round((rating.deviation ?? glicko2Settings.rd) * 2) }}</small>
    </span>
    <span v-else>-</span>
</template>
