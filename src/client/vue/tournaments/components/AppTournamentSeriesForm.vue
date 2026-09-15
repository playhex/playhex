<script setup lang="ts">
import { computed, ref, toRefs, watchEffect } from 'vue';
import { validate, ValidationError } from 'class-validator';
import TournamentSeries from '../../../../shared/app/models/TournamentSeries.js';
import { FailedProperties, toFailedProperties } from '../../../../shared/app/ValidationError.js';
import { slugifyTournamentName } from '../../../../shared/app/tournamentUtils.js';
import { nextSeriesTitle } from '../../../../shared/app/tournamentSeriesUtils.js';
import { IconPencilSquare } from '../../icons.js';

const props = defineProps({
    tournamentSeries: {
        type: TournamentSeries,
        required: true,
    },
    validationGroup: {
        type: String,
        default: 'tournamentSeries:create',
    },
});

const { tournamentSeries } = toRefs(props);

// Slug auto/manual
const manualSlug = ref((tournamentSeries.value.slug ?? '') !== slugifyTournamentName(tournamentSeries.value.title));

watchEffect(() => {
    if (!manualSlug.value) {
        tournamentSeries.value.slug = slugifyTournamentName(tournamentSeries.value.title);
    }
});

// Live preview of the next instance title
const titlePreview = computed<string>(() => nextSeriesTitle(tournamentSeries.value, 42, new Date()));

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

    window.scrollTo(0, 0);
};

const validateTournamentSeries = async (): Promise<boolean> => {
    failedProperties.value = {};
    globalError.value = null;

    const errors = await validate(tournamentSeries.value, { groups: [props.validationGroup] });

    if (errors.length > 0) {
        showFormErrors(errors);
        return false;
    }

    return true;
};

defineExpose({
    validateTournamentSeries,
});
</script>

<template>
    <div class="mb-3">
        <label for="series-title" class="form-label">{{ $t('tournament_series_form.title') }}</label>
        <input
            v-model="tournamentSeries.title"
            type="text"
            class="form-control form-control-lg"
            :class="{ 'is-invalid': failedProperties.title }"
            id="series-title"
        >
        <div class="form-text mb-3">
            {{ $t('tournament_series_form.title_help') }}
            <code>/tournament-series/{{ slugifyTournamentName(tournamentSeries.slug ?? '') }}</code>,
            <a v-if="!manualSlug" href="#" @click.prevent="manualSlug = true"><IconPencilSquare /> {{ $t('tournament_series_form.change_url') }}</a>
            <a v-else href="#" @click.prevent="manualSlug = false">{{ $t('tournament_series_form.default_url') }}</a>
        </div>
        <div v-if="failedProperties.title" class="invalid-feedback">
            {{ failedProperties.title.join(', ') }}
        </div>
    </div>

    <div class="mb-3" v-if="manualSlug">
        <label for="series-slug" class="form-label">{{ $t('tournament_series_form.url_name') }}</label>
        <input
            v-model="tournamentSeries.slug"
            type="text"
            class="form-control form-control-sm"
            :class="{ 'is-invalid': failedProperties.slug }"
            id="series-slug"
        >
        <div v-if="failedProperties.slug" class="invalid-feedback">
            {{ failedProperties.slug.join(', ') }}
        </div>
    </div>

    <div class="mb-3">
        <label for="series-title-pattern" class="form-label">{{ $t('tournament_series_form.title_pattern') }}</label>
        <input
            v-model="tournamentSeries.titlePattern"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': failedProperties.titlePattern }"
            id="series-title-pattern"
            placeholder="Hex Monthly {n}"
        >
        <div class="form-text">{{ $t('tournament_series_form.title_pattern_help') }}</div>
        <p class="mb-0 mt-1">{{ $t('tournament_series_form.preview') }} <code>{{ titlePreview }}</code></p>
        <div v-if="failedProperties.titlePattern" class="invalid-feedback">
            {{ failedProperties.titlePattern.join(', ') }}
        </div>
    </div>

    <div class="mb-3">
        <label for="series-description" class="form-label">{{ $t('tournament_series_form.description') }}</label>
        <textarea
            v-model="tournamentSeries.description"
            class="form-control"
            id="series-description"
            rows="6"
        ></textarea>
    </div>

    <p class="text-danger" v-if="globalError">{{ globalError }}</p>
</template>
