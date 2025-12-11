<script setup lang="ts">
import { intlFormat } from 'date-fns';
import { Tournament } from '../../../../shared/app/models/index.js';
import { autoLocale } from '../../../../shared/app/i18n/index.js';
import { PropType } from 'vue';

const props = defineProps({
    /**
     * Which tournament start date to display
     */
    tournament: {
        type: Tournament,
        required: true,
    },

    format: {
        type: String as PropType<'long' | 'short'>,
        required: false,
        default: 'long',
    },
});

/**
 * Format tournament startDate
 */
const tournamentFormatStartsAtDate = (tournament: Tournament): string => {
    return intlFormat(tournament.startOfficialAt, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        weekday: props.format === 'long' ? 'long' : undefined,
    }, {
        locale: autoLocale(),
    });
};
</script>

<template>
    <time :datetime="tournament.startOfficialAt.toISOString()">
        {{ tournamentFormatStartsAtDate(tournament) }}
    </time>
</template>
