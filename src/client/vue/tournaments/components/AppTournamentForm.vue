<script setup lang="ts">
import { computed, onMounted, ref, toRefs, watchEffect } from 'vue';
import { validate, ValidationError } from 'class-validator';
import { Tournament } from '../../../../shared/app/models';
import { FailedProperties, toFailedProperties } from '../../../../shared/app/ValidationError';
import { availableStage1Formats, seedingMethods } from '../../../../shared/app/tournamentUtils';
import { RANKED_BOARDSIZE_MAX, RANKED_BOARDSIZE_MIN } from '../../../../shared/app/ratingUtils';
import AppTimeControl from '../../components/AppTimeControl.vue';
import { apiGetTournament } from '../../../apiClient';
import useToastsStore from '../../../stores/toastsStore';
import { Toast } from '../../../../shared/app/Toast';
import { cloneTournament } from '../../../../shared/app/models/Tournament';
import AppTournamentFormatImage from './AppTournamentFormatImage.vue';
import AppDurationInput from '../../components/AppDurationInput.vue';
import { instanceToPlain, plainToInstance } from '../../../../shared/app/class-transformer-custom';

const props = defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});

const { tournament } = toRefs(props);

/**
 * Convert startAt Date to "datetime-local" input format (e.g "2025-04-01T22:00")
 */
const startsAtDatetimeLocal = computed<string>({
    get(): string
    {
        return tournament.value.startOfficialAt?.toLocaleString('sv').replace(' ', 'T').substring(0, 16);
    },

    set(newValue: string): void
    {
        tournament.value.startOfficialAt = new Date(newValue + ':00');
    },
});

// Delay start
const startAutomaticallyRadioChoices = [
    'yes',
    'never',
    'delay',
] as const;

type StartAutomatically = typeof startAutomaticallyRadioChoices[number];

const startAutomatically = ref<StartAutomatically>('yes');
const delayStartInputSeconds = ref<number>(30);

const updateStartAutomatically = () => {
    if (tournament.value.startDelayInSeconds < 0) {
        startAutomatically.value = 'never';
    } else if (tournament.value.startDelayInSeconds > 0) {
        startAutomatically.value = 'delay';
        delayStartInputSeconds.value = tournament.value.startDelayInSeconds;
    } else {
        startAutomatically.value = 'yes';
    }
};

updateStartAutomatically();

// Update tournament.startDelayInSeconds when changing input yes/no/delay, or delay time.
watchEffect(() => {
    if (startAutomatically.value === 'delay') {
        tournament.value.startDelayInSeconds = delayStartInputSeconds.value;
    } else if (startAutomatically.value === 'never') {
        tournament.value.startDelayInSeconds = -1;
    } else {
        tournament.value.startDelayInSeconds = 0;
    }
});

// form errors handling
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

// Clone tournament
/**
 * Hack to mount AppTimeControl component only when tournament.timeControl is ready.
 * Either now, or if we pass #clone-..., wait for data fetch before mount,
 * because AppTimeControl won't update if we modify model later.
 */
const timeControlReady = ref(false);

onMounted(async () => {
    const { hash } = window.location;

    if (!hash.startsWith('#clone-')) {
        timeControlReady.value = true;
        return;
    }

    const sourceTournament = await apiGetTournament(hash.substring(7));

    if (sourceTournament === null) {
        useToastsStore().addToast(new Toast(
            `No tournaments with slug "${hash.substring(7)}"`,
            { level: 'warning' },
        ));

        timeControlReady.value = true;
        return;
    }

    cloneTournament(tournament.value, sourceTournament);
    updateStartAutomatically();
    timeControlReady.value = true;
});

/**
 * Validate and display errors in form.
 * Returns true if there is no errors.
 */
const validateTournament = async (): Promise<boolean> => {
    cleanFormErrors();

    Object.assign(tournament.value, plainToInstance(Tournament, instanceToPlain(tournament.value))); // for time control, to transform from object to HostedGameOptionsTimeControl and prevent validation error

    const errors = await validate(tournament.value, { groups: ['tournament:create'] });

    if (errors.length > 0) {
        showFormErrors(errors);
        return false;
    }

    return true;
};

defineExpose({
    validateTournament,
});
</script>

<template>
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
            <div v-for="stage1Format in availableStage1Formats" :key="stage1Format" class="col-6 col-sm-3">
                <input
                    type="radio"
                    class="btn-check"
                    v-model="tournament.stage1Format"
                    :value="stage1Format"
                    :id="'format-stage1-' + stage1Format"
                    autocomplete="off"
                >
                <label class="btn tournament-format-label" :for="'format-stage1-' + stage1Format">
                    <AppTournamentFormatImage :format="stage1Format" />
                    <span>{{ $t('tournament_format.' + stage1Format) }}</span>
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
        <p class="mb-0 mt-1">UTC date: <code>{{ tournament.startOfficialAt?.toISOString().substring(0, '2025-07-26T09:00'.length).replace('T', ' ') ?? '-' }}</code></p>
        <div class="form-text mb-3">When tournament officially starts, in your current timezone. May start sooner or later if you decide to.</div>
    </div>

    <div class="row">
        <div class="col-sm-6 col-lg-4">
            <label for="checkInTimeWindow" class="form-label">Check-in Opens</label>
            <div class="input-group">
                <AppDurationInput
                    class="form-control"
                    id="checkInTimeWindow"
                    v-model="tournament.checkInOpenOffsetSeconds"
                />
                <span class="input-group-text">before</span>
            </div>
            <div class="form-text mb-3">Players will need to confirm their participation before tournament starts, within this time window.</div>
        </div>
    </div>

    <p class="m-1">Start tournament automatically</p>

    <div class="input-group" role="group">
        <template v-for="choice in startAutomaticallyRadioChoices" :key="choice">
            <input type="radio" class="btn-check" v-model="startAutomatically" :value="choice" :id="'start-automatically-' + choice" autocomplete="off">
            <label class="btn btn-outline-primary" :for="'start-automatically-' + choice">{{ $t('tournament_start_delay_choice.' + choice) }}</label>
        </template>
        <template v-if="'delay' === startAutomatically">
            <AppDurationInput
                class="form-control"
                id="delayStart"
                v-model="delayStartInputSeconds"
                min="0"
            />
        </template>
    </div>
    <div class="form-text mb-3">{{ $t(`tournament_start_delay_choice.${startAutomatically}_help`) }}</div>

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
        <AppTimeControl v-if="timeControlReady" v-model="tournament.timeControlType" />
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

    <h3>Description, rules</h3>

    <p class="text-body-secondary mb-1"><small>Markdown format is supported.</small></p>

    <textarea
        v-model="tournament.description"
        class="form-control mb-3"
        id="tournament-description"
        rows="8"
    ></textarea>

    <h3>Tournament options</h3>

    <h4>Players seeding</h4>

    <p>
        How players are placed in their first round.
        You can choose whether their rating should be taken into account,
        or place them randomly.
    </p>

    <ul class="list-group seeding-methods mb-4">
        <li v-for="seedingMethod in seedingMethods" :key="seedingMethod" class="list-group-item">
            <input class="form-check-input me-2" type="radio" v-model="tournament.seedingMethod" :value="seedingMethod" :id="'input-' + seedingMethod">
            <label class="form-check-label stretched-link" :for="'input-' + seedingMethod">
                {{ $t('tournament_seeding_methods.' + seedingMethod) }}
                <br>
                <small class="text-body-secondary">{{ $t('tournament_seeding_methods.' + seedingMethod + '_help') }}</small>
            </label>
        </li>
    </ul>

    <h3>{{ $t('tournament_admins') }}</h3>

    <p>
        Admins can do the same things than organizer.
        You can add admins to manage tournament
        in case you are not here, or playing a tournament game.
    </p>

    <p>
        You will be able to add admins after tournament is created,
        on Manage tournament page.
        <!-- Yeah, this easier like that. -->
        <!-- Having a single controller that handle add/remove players instead adding a one to many in PATCH tournament. -->
    </p>

    <!-- Global errors on form. -->
    <!-- Should be display near submit button to make sure we see the error before submit. -->
    <p class="text-danger" v-if="globalError">{{ globalError }}</p>
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

// fix "Start tournament automatically" border radius of radio button in input-group
.input-group > label:first-of-type
    border-top-left-radius var(--bs-btn-border-radius) !important
    border-bottom-left-radius var(--bs-btn-border-radius) !important

.seeding-methods
    label
        width 80%
    label, label::after
        cursor pointer
</style>
