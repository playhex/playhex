<script setup lang="ts">
import { computed, PropType, ref, toRefs, watchEffect } from 'vue';
import { intlFormat } from 'date-fns';
import { validate, ValidationError } from 'class-validator';
import TournamentSeries from '../../../../shared/app/models/TournamentSeries.js';
import {
    createTournamentSeriesScheduleDefaults,
    scheduleFrequencies,
    scheduleMonthlyModes,
    TournamentSeriesSchedule,
} from '../../../../shared/app/models/TournamentSeriesSchedule.js';
import {
    localScheduleCrossesDayBoundary,
    localScheduleToUtc,
    nextSeriesInstances,
    utcScheduleToLocal,
} from '../../../../shared/app/tournamentSeriesSchedule.js';
import { FailedProperties, toFailedProperties } from '../../../../shared/app/ValidationError.js';
import { autoLocale } from '../../../../shared/app/i18n/index.js';

const props = defineProps({
    /**
     * Editable series. Its autoCreate* fields are updated by this form.
     */
    tournamentSeries: {
        type: TournamentSeries,
        required: true,
    },

    /**
     * Number used for {n} in the next instance title, to simulate next instances names.
     */
    nextTournamentNumber: {
        type: Number,
        required: true,
    },

    /**
     * How many next instances to show in the simulation.
     */
    simulationCount: {
        type: Number as PropType<number>,
        default: 5,
    },
});

const { tournamentSeries } = toRefs(props);

const DEFAULT_OFFSET_DAYS = 40;

/**
 * Schedule as displayed in the form, in player timezone.
 * It is converted to UTC before being persisted.
 */
const localSchedule = ref<TournamentSeriesSchedule>(
    tournamentSeries.value.autoCreateSchedule
        ? utcScheduleToLocal(tournamentSeries.value.autoCreateSchedule)
        : createTournamentSeriesScheduleDefaults()
    ,
);

/**
 * autoCreateOffsetSeconds, but in days, as input by organizer.
 */
const offsetDays = ref<number>(
    tournamentSeries.value.autoCreateOffsetSeconds === null
        ? DEFAULT_OFFSET_DAYS
        : tournamentSeries.value.autoCreateOffsetSeconds / 86400
    ,
);

/**
 * Weekdays are unused, and hidden in the form, while frequency is "monthly",
 * but they must stay valid: organizer may have unselected them all in weekly mode.
 */
const withWeekday = (schedule: TournamentSeriesSchedule): TournamentSeriesSchedule => {
    if (schedule.frequency === 'monthly' && schedule.weekdays.length === 0) {
        return Object.assign(new TournamentSeriesSchedule(), schedule, {
            weekdays: createTournamentSeriesScheduleDefaults().weekdays,
        });
    }

    return schedule;
};

// Keep the series updated with what is displayed in the form
watchEffect(() => {
    tournamentSeries.value.autoCreateSchedule = localScheduleToUtc(withWeekday(localSchedule.value));
    tournamentSeries.value.autoCreateOffsetSeconds = Math.round(offsetDays.value * 86400);
});

/**
 * Start time, as "HH:MM", for the time input. In player timezone.
 */
const startTime = computed<string>({
    get(): string
    {
        return `${String(localSchedule.value.hour).padStart(2, '0')}:${String(localSchedule.value.minute).padStart(2, '0')}`;
    },

    set(newValue: string): void
    {
        const [hour, minute] = newValue.split(':').map(Number);

        if (!isNaN(hour) && !isNaN(minute)) {
            localSchedule.value.hour = hour;
            localSchedule.value.minute = minute;
        }
    },
});

/**
 * Same time, in UTC, displayed below the time input.
 */
const startTimeUtc = computed<string>(() => {
    const utc = localScheduleToUtc(localSchedule.value);

    return `${String(utc.hour).padStart(2, '0')}:${String(utc.minute).padStart(2, '0')}`;
});

/**
 * Whether the UTC time is not on the same day as the local one.
 * Days of a weekly schedule are shifted accordingly, but days of a monthly one cannot be:
 * they always refer to the UTC day, organizer must be warned.
 */
const showUtcDayWarning = computed<boolean>(() =>
    localSchedule.value.frequency === 'monthly' && localScheduleCrossesDayBoundary(localSchedule.value),
);

// Monday first, sunday last
const weekdays = [1, 2, 3, 4, 5, 6, 0];

const weekdayLabel = (weekday: number): string => new Intl.DateTimeFormat(autoLocale(), {
    weekday: 'long',
    timeZone: 'UTC',
}).format(new Date(Date.UTC(2024, 0, 7 + weekday))); // 2024-01-07 is a sunday

const toggleWeekday = (weekday: number): void => {
    const selected = localSchedule.value.weekdays;

    localSchedule.value.weekdays = selected.includes(weekday)
        ? selected.filter(day => day !== weekday)
        : [...selected, weekday].sort()
    ;
};

const daysOfMonth = Array.from({ length: 31 }, (_, i) => i + 1);
const nths = [1, 2, 3, 4, -1];

/**
 * Next instances that will be created with current form values.
 */
const simulation = computed(() => {
    const schedule = localScheduleToUtc(localSchedule.value);

    if (schedule.frequency === 'weekly' && schedule.weekdays.length === 0) {
        return [];
    }

    return nextSeriesInstances(
        tournamentSeries.value,
        schedule,
        Math.round(offsetDays.value * 86400),
        props.nextTournamentNumber,
        new Date(),
        props.simulationCount,
    );
});

const formatDate = (date: Date): string => intlFormat(date, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
}, {
    locale: autoLocale(),
});

const formatDateUtc = (date: Date): string => date.toISOString().substring(0, 16).replace('T', ' ') + ' UTC';

/**
 * Day only, no time: tournaments are checked periodically,
 * so they are created a few hours around this date.
 */
const formatDay = (date: Date): string => intlFormat(date, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
}, {
    locale: autoLocale(),
});

// form errors handling
const failedProperties = ref<FailedProperties>({});
const globalError = ref<null | string>(null);

const showFormErrors = (validationErrors: ValidationError[]): void => {
    failedProperties.value = toFailedProperties(validationErrors);

    const otherErrors: string[] = [];

    for (const failedProperty in failedProperties.value) {
        otherErrors.push(...failedProperties.value[failedProperty].map(e => failedProperty + ': ' + e));
    }

    globalError.value = otherErrors.join(', ');
};

const validateAutoCreate = async (): Promise<boolean> => {
    failedProperties.value = {};
    globalError.value = null;

    const errors = await validate(tournamentSeries.value, { groups: ['tournamentSeries:autoCreate'] });

    if (errors.length > 0) {
        showFormErrors(errors);
        return false;
    }

    return true;
};

defineExpose({
    validateAutoCreate,
});
</script>

<template>
    <!-- Frequency -->
    <div class="mb-3">
        <label class="form-label">{{ $t('tournament_series_auto_create.frequency') }}</label>
        <div>
            <template v-for="frequency in scheduleFrequencies" :key="frequency">
                <input
                    v-model="localSchedule.frequency"
                    type="radio"
                    class="btn-check"
                    :value="frequency"
                    :id="`frequency-${frequency}`"
                >
                <label class="btn btn-outline-primary me-2" :for="`frequency-${frequency}`">
                    {{ $t(`tournament_series_auto_create.frequency_${frequency}`) }}
                </label>
            </template>
        </div>
    </div>

    <!-- Weekly: days of week -->
    <div v-if="'weekly' === localSchedule.frequency" class="mb-3">
        <label class="form-label">{{ $t('tournament_series_auto_create.weekdays') }}</label>
        <div>
            <template v-for="weekday in weekdays" :key="weekday">
                <input
                    type="checkbox"
                    class="btn-check"
                    :checked="localSchedule.weekdays.includes(weekday)"
                    :id="`weekday-${weekday}`"
                    @change="toggleWeekday(weekday)"
                >
                <label class="btn btn-outline-primary me-2 mb-2" :for="`weekday-${weekday}`">
                    {{ weekdayLabel(weekday) }}
                </label>
            </template>
        </div>
        <div v-if="failedProperties['autoCreateSchedule.weekdays']" class="text-danger">
            {{ failedProperties['autoCreateSchedule.weekdays'].join(', ') }}
        </div>
    </div>

    <!-- Monthly: day of month, or nth weekday -->
    <template v-else>
        <div class="mb-3">
            <label class="form-label">{{ $t('tournament_series_auto_create.monthly_mode') }}</label>
            <div>
                <template v-for="monthlyMode in scheduleMonthlyModes" :key="monthlyMode">
                    <input
                        v-model="localSchedule.monthlyMode"
                        type="radio"
                        class="btn-check"
                        :value="monthlyMode"
                        :id="`monthly-mode-${monthlyMode}`"
                    >
                    <label class="btn btn-outline-primary me-2" :for="`monthly-mode-${monthlyMode}`">
                        {{ $t(`tournament_series_auto_create.monthly_mode_${monthlyMode}`) }}
                    </label>
                </template>
            </div>
        </div>

        <div v-if="'dayOfMonth' === localSchedule.monthlyMode" class="mb-3">
            <label for="auto-create-day-of-month" class="form-label">{{ $t('tournament_series_auto_create.day_of_month') }}</label>
            <select v-model.number="localSchedule.dayOfMonth" class="form-select w-auto" id="auto-create-day-of-month">
                <option v-for="day in daysOfMonth" :key="day" :value="day">{{ day }}</option>
            </select>
            <div class="form-text">{{ $t('tournament_series_auto_create.day_of_month_help') }}</div>
        </div>

        <div v-else class="mb-3 d-flex gap-2 flex-wrap">
            <div>
                <label for="auto-create-nth" class="form-label">{{ $t('tournament_series_auto_create.nth') }}</label>
                <select v-model.number="localSchedule.nth" class="form-select w-auto" id="auto-create-nth">
                    <option v-for="nth in nths" :key="nth" :value="nth">
                        {{ $t(`tournament_series_auto_create.nth_${nth === -1 ? 'last' : nth}`) }}
                    </option>
                </select>
            </div>
            <div>
                <label for="auto-create-weekday" class="form-label">{{ $t('tournament_series_auto_create.weekday') }}</label>
                <select v-model.number="localSchedule.weekday" class="form-select w-auto" id="auto-create-weekday">
                    <option v-for="weekday in weekdays" :key="weekday" :value="weekday">{{ weekdayLabel(weekday) }}</option>
                </select>
            </div>
        </div>
    </template>

    <!-- Start time -->
    <div class="mb-3">
        <label for="auto-create-time" class="form-label">{{ $t('tournament_series_auto_create.start_time') }}</label>
        <input
            v-model="startTime"
            type="time"
            class="form-control w-auto"
            id="auto-create-time"
        >
        <div class="form-text">{{ $t('tournament_series_auto_create.start_time_utc', { time: startTimeUtc }) }}</div>
        <div v-if="showUtcDayWarning" class="form-text text-warning">
            {{ $t('tournament_series_auto_create.utc_day_warning') }}
        </div>
    </div>

    <!-- Create how long before -->
    <div class="mb-3">
        <label for="auto-create-offset-days" class="form-label">{{ $t('tournament_series_auto_create.offset_days') }}</label>
        <input
            v-model.number="offsetDays"
            type="number"
            min="0"
            max="365"
            class="form-control w-auto"
            :class="{ 'is-invalid': failedProperties.autoCreateOffsetSeconds }"
            id="auto-create-offset-days"
        >
        <div class="form-text">{{ $t('tournament_series_auto_create.offset_days_help') }}</div>
        <div v-if="failedProperties.autoCreateOffsetSeconds" class="invalid-feedback">
            {{ failedProperties.autoCreateOffsetSeconds.join(', ') }}
        </div>
    </div>

    <!-- Simulation -->
    <h3 class="h5">{{ $t('tournament_series_auto_create.simulation') }}</h3>
    <p class="text-body-secondary"><small>{{ $t('tournament_series_auto_create.simulation_help') }}</small></p>

    <p v-if="!tournamentSeries.autoCreate" class="text-warning">
        {{ $t('tournament_series_auto_create.simulation_disabled') }}
    </p>

    <p v-if="simulation.length === 0" class="text-warning">{{ $t('tournament_series_auto_create.simulation_empty') }}</p>

    <div v-else class="table-responsive">
        <table class="table table-sm align-middle">
            <thead>
                <tr>
                    <th scope="col">{{ $t('tournament_series_auto_create.simulation_title') }}</th>
                    <th scope="col">{{ $t('tournament_series_auto_create.simulation_starts_at') }}</th>
                    <th scope="col">{{ $t('tournament_series_auto_create.simulation_created_at') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="instance in simulation" :key="instance.startsAt.toISOString()">
                    <td>{{ instance.title }}</td>
                    <td>
                        {{ formatDate(instance.startsAt) }}
                        <br><small class="text-body-secondary">{{ formatDateUtc(instance.startsAt) }}</small>
                    </td>
                    <td>{{ formatDay(instance.createdAt) }}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <p class="text-danger" v-if="globalError">{{ globalError }}</p>
</template>
