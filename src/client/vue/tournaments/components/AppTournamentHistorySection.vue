<script setup lang="ts">
import { intlFormat } from 'date-fns';
import { Tournament } from '../../../../shared/app/models/index.js';
import { autoLocale } from '../../../../shared/app/i18n/index.js';

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
    <div class="card">
        <div class="card-header">
            <h2 class="card-title m-0">{{ $t('tournament_history_logs') }}</h2>
        </div>

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

        <p v-else class="m-3"><i>{{ $t('tournament_history_logs_empty') }}</i></p>
    </div>
</template>
