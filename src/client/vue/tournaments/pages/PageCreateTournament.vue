<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import { RANKED_BOARDSIZE_MAX, RANKED_BOARDSIZE_MIN } from '../../../../shared/app/ratingUtils';
import { TournamentFormatStage1 } from '../../../../shared/app/tournamentUtils';
import { apiPostTournament } from '../../../apiClient';
import AppTimeControl from '../../components/AppTimeControl.vue';
import { useRouter } from 'vue-router';
import { AppValidationError, FailedProperties, toFailedProperties } from '../../../../shared/app/ValidationError';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError';
import i18next from 'i18next';
import Tournament, { createTournamentDefaultsCreate } from '../../../../shared/app/models/Tournament';
import { validate, ValidationError } from 'class-validator';
import TimeControlType from '../../../../shared/time-control/TimeControlType';
import { instanceToPlain, plainToInstance } from '../../../../shared/app/class-transformer-custom';
import { useHead } from '@unhead/vue';

const tournament = ref(createTournamentDefaultsCreate());

useHead({
    title: () => tournament.value.title ?? i18next.t('tournament_create'),
});

const timeControl = toRef(tournament.value.timeControl);
watch<TimeControlType>(timeControl, t => {
    tournament.value.timeControl = t;
});

// By default, make tournament starts at 20h
tournament.value.startsAt = new Date();
tournament.value.startsAt.setHours(20, 0, 0, 0);

if (tournament.value.startsAt < new Date()) {
    tournament.value.startsAt.setDate(tournament.value.startsAt.getDate() + 1);
}

const stage1Formats: {
    value: TournamentFormatStage1;
    label: string;
    image?: string;
}[] = [
    {
        value: 'single-elimination',
        label: 'Single elimination',
        image: '/images/tournament/single.svg',
    },
    {
        value: 'double-elimination',
        label: 'Double elimination',
        image: '/images/tournament/double.svg',
    },
    {
        value: 'swiss',
        label: 'Swiss',
        image: '/images/tournament/swiss.svg',
    },
    {
        value: 'round-robin',
        label: 'Round robin',
        image: '/images/tournament/round-robin.svg',
    },
];

/**
 * Convert startAt Date to "datetime-local" input format (e.g "2025-04-01T22:00")
 */
const startsAtDatetimeLocal = computed<string>({
    get(): string
    {
        return tournament.value.startsAt.toLocaleString('sv').replace(' ', 'T').substring(0, 16);
    },

    set(newValue: string): void
    {
        tournament.value.startsAt = new Date(newValue + ':00');
    },
});

const checkInBefore = ref(15);
const checkInBeforeUnit = ref<'min' | 'hours'>('min');

const toggleCheckInUnit = () => {
    checkInBeforeUnit.value = 'min' === checkInBeforeUnit.value
        ? 'hours'
        : 'min'
    ;
};

const router = useRouter();

const failedProperties = ref<FailedProperties>({});
const globalError = ref<null | string>(null);

const showFormErrors = (validationErrors: ValidationError[]): void => {
    failedProperties.value = toFailedProperties(validationErrors);

    // If there is an error on an input that has no dedicated error placeholder, display if globally.
    // Should not happen: should be displayed next to input.
    const otherErrors: string[] = [];

    for (const failedProperty in failedProperties.value) {
        if (['title'].includes(failedProperty)) {
            continue;
        }

        otherErrors.push(...failedProperties.value[failedProperty].map(e => failedProperty + ': ' + e));
    }

    globalError.value = otherErrors.join(', ');

    window.scrollTo(0, 0);
};

const cleanFormErrors = (): void => {
    failedProperties.value = {};
    globalError.value = null;
};

const createTournament = async (): Promise<void> => {
    tournament.value.checkInOpenOffsetMinutes = checkInBefore.value * { min: 1, hours: 60 }[checkInBeforeUnit.value];
    tournament.value = plainToInstance(Tournament, instanceToPlain(tournament.value)); // for time control, to transform from object to HostedGameOptionsTimeControl and prevent validation error

    cleanFormErrors();

    try {
        const errors = await validate(tournament.value, { groups: ['tournament:create'] });

        if (errors.length > 0) {
            showFormErrors(errors);
            return;
        }

        const created = await apiPostTournament(tournament.value);

        if (null === created) {
            globalError.value = 'Could not create tournament';
            throw new Error('Could not create tournament');
        }

        router.push({
            name: 'tournament',
            params: {
                slug: created.slug,
            },
        });
    } catch (e) {
        if (e instanceof AppValidationError) {
            showFormErrors(e.errors);
            return;
        }

        if (e instanceof DomainHttpError) {
            if (e.type === 'tournament_title_duplicate') {
                failedProperties.value = {
                    title: [i18next.t('tournament_title_duplicate')],
                };

                window.scrollTo(0, 0);
                return;
            }
        }

        globalError.value = e.message ?? 'Could not create tournament';
        throw e;
    }
};
</script>

<template>
    <div class="container my-3">
        <h1>Host Tournament</h1>

        <form @submit.prevent="createTournament">
            <div class="mb-3">
                <label for="name" class="form-label">Tournament name</label>
                <input
                    v-model="tournament.title"
                    type="text"
                    class="form-control form-control-lg"
                    :class="{ 'is-invalid': failedProperties.title }"
                    id="name"
                >
                <div v-if="failedProperties.title" class="invalid-feedback">
                    {{ failedProperties.title.join(', ') }}
                </div>
            </div>

            <div class="mb-3">
                <div class="row">
                    <div v-for="stage1Format in stage1Formats" :key="stage1Format.value" class="col-6 col-sm-3">
                        <input
                            type="radio"
                            class="btn-check"
                            v-model="tournament.stage1Format"
                            :value="stage1Format.value"
                            :id="'format-stage1-' + stage1Format.value"
                            autocomplete="off"
                        >
                        <label class="btn tournament-format-label" :for="'format-stage1-' + stage1Format.value">
                            <img
                                v-if="stage1Format.image"
                                :src="stage1Format.image"
                                :alt="stage1Format.label"
                                class="img-fluid"
                            />
                            <span>{{ stage1Format.label }}</span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="mb-3" v-if="'single-elimination' === tournament.stage1Format">
                <div class="form-check">
                    <input
                        v-model="tournament.consolation"
                        type="checkbox"
                        class="form-check-input"
                        id="tournament-consolation"
                    >
                    <label class="form-check-label" for="tournament-consolation">Consolation</label>
                    <div class="form-text mb-3">Add a loosers final to determine third place.</div>
                </div>
            </div>

            <div class="mb-3" v-if="'swiss' === tournament.stage1Format">
                <label for="max-players" class="form-label">Rounds</label>
                <input
                    v-model="tournament.stage1Rounds"
                    type="number"
                    class="form-control"
                    id="max-players"
                    min="0"
                >
                <div class="form-text mb-3">Custom number of rounds. Let empty to automatically define number of rounds based on the number of players.</div>
            </div>

            <div class="mb-3">
                <label for="startDate" class="form-label">Start date</label>
                <input
                    type="datetime-local"
                    class="form-control form-control-lg"
                    id="startDate"
                    v-model="startsAtDatetimeLocal"
                >
            </div>

            <div class="row">
                <div class="col-sm-6 col-lg-4">
                    <label for="checkInTimeWindow" class="form-label">Check-in Opens</label>
                    <div class="input-group">
                        <input
                            type="number"
                            class="form-control"
                            id="checkInTimeWindow"
                            v-model="checkInBefore"
                        >
                        <button
                            @click="toggleCheckInUnit"
                            class="btn btn-outline-primary"
                            type="button"
                        >{{ { min: 'minutes before', hours: 'hours before' }[checkInBeforeUnit] }}</button>
                    </div>
                    <div class="form-text mb-3">Players will need to confirm their participation before tournament starts, within this time window.</div>
                </div>
            </div>

            <div class="form-check">
                <input
                    v-model="tournament.accountRequired"
                    type="checkbox"
                    class="form-check-input"
                    id="require-account"
                >
                <label class="form-check-label" for="require-account">Require account</label>
                <div class="form-text mb-3">If checked, players need an account to join, so guests players are disallowed.</div>
            </div>

            <h3>Games format</h3>

            <div class="mb-3">
                <label for="boardsize" class="form-label">Board size</label>
                <input
                    v-model="tournament.boardsize"
                    :min="RANKED_BOARDSIZE_MIN"
                    :max="RANKED_BOARDSIZE_MAX"
                    type="number"
                    class="form-control form-control-lg"
                    id="boardsize"
                >
            </div>

            <div class="mb-3">
                <label class="form-label">Time control</label>
                <AppTimeControl v-model="timeControl" />
            </div>

            <div class="mb-3">
                <div class="form-check">
                    <input
                        v-model="tournament.ranked"
                        type="checkbox"
                        class="form-check-input"
                        id="tournament-ranked"
                    >
                    <label class="form-check-label" for="tournament-ranked">Ranked</label>
                </div>
            </div>

            <p class="text-danger" v-if="globalError">{{ globalError }}</p>

            <button type="submit" class="btn btn-success">Create tournament</button>
        </form>
    </div>
</template>

<style lang="stylus" scoped>
.tournament-format-label
    width 100%

    img
        height 12vw
        max-height 150px

    img + span
        display block
        margin-top 0.5em

[data-bs-theme=light]
    .tournament-format-label img
        filter invert(95%) sepia(11%) saturate(78%) hue-rotate(169deg) brightness(92%) contrast(99%)

[data-bs-theme=dark]
    .tournament-format-label img
        filter invert(12%) sepia(11%) saturate(78%) hue-rotate(169deg) brightness(97%) contrast(94%)
</style>
