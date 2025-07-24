<script setup lang="ts">
import { intlFormat } from 'date-fns';
import { Tournament } from '../../../../shared/app/models';
import { autoLocale } from '../../../../shared/app/i18n';

defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});

const formatHistoryLogDate = (date: Date): string => {
    return intlFormat(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
    }, {
        locale: autoLocale(),
    });
};
</script>

<template>
    <h3>{{ $t('tournament_history_logs') }}</h3>

    <ul v-if="tournament.history.length > 0" class="list-group list-group-flush">
        <li
            v-for="history, key in tournament.history"
            :key
            class="list-group-item"
        >
            <small class="text-secondary">{{ formatHistoryLogDate(history.date) }}</small>
            -
            {{ $t('tournament_history.' + history.type, history.parameters) }}
        </li>
    </ul>

    <p v-else><i>{{ $t('tournament_history_logs_empty') }}</i></p>
</template>
