<script setup lang="ts">
import { PropType } from 'vue';
import { intlFormat } from 'date-fns';
import { autoLocale } from '../../../../shared/app/i18n/index.js';
import { TournamentSeriesListItemDto } from '../../../../shared/app/models/TournamentSeriesDto.js';
import { IconRecordFill, IconTrophyFill } from '../../icons.js';

defineProps({
    tournamentSeries: {
        type: Object as PropType<TournamentSeriesListItemDto>,
        required: true,
    },

    /**
     * Heading level of the series title, to keep page outline consistent.
     */
    headingLevel: {
        type: Number,
        default: 2,
    },
});

const formatDate = (date: Date): string => intlFormat(date, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
}, {
    locale: autoLocale(),
});
</script>

<template>
    <div class="card h-100">
        <div class="card-body">
            <component :is="`h${headingLevel}`" class="card-title h5">
                <router-link
                    :to="{ name: 'tournament-series-show', params: { slug: tournamentSeries.slug } }"
                    class="text-body stretched-link"
                >{{ tournamentSeries.title }}</router-link>
            </component>

            <p class="card-text text-body-secondary mb-1"><small>
                {{ $t('tournament_series_page.host', { player: tournamentSeries.host.pseudo }) }}
            </small></p>

            <p class="card-text mb-1">{{ $t('n_tournaments', { count: tournamentSeries.tournamentsCount }) }}</p>

            <p v-if="tournamentSeries.runningTournament" class="card-text mb-1">
                <IconRecordFill class="text-danger" />
                <strong>{{ tournamentSeries.runningTournament.title }}</strong>
            </p>

            <p v-if="tournamentSeries.nextTournament" class="card-text mb-1">
                {{ $t('tournament_series_list_page.next') }}
                <strong>{{ tournamentSeries.nextTournament.title }}</strong>
                <span v-if="tournamentSeries.nextTournament.startOfficialAt">
                    ({{ formatDate(new Date(tournamentSeries.nextTournament.startOfficialAt)) }})
                </span>
            </p>

            <p v-if="tournamentSeries.lastTournament?.rank1Participant" class="card-text mb-0">
                {{ $t('tournament_series_list_page.last_winner') }}
                <IconTrophyFill class="text-warning" />
                {{ tournamentSeries.lastTournament.rank1Participant.pseudo }}
                <small class="text-body-secondary">({{ tournamentSeries.lastTournament.title }})</small>
            </p>
        </div>
    </div>
</template>
