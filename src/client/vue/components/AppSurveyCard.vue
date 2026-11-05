<script setup lang="ts">
import { ref } from 'vue';
import { apiPostSurveyAnswer } from '../../apiClient.js';
import { IconQuestionCircle } from '../icons.js';

/**
 * Asks visitors what they miss the most on PlayHex.
 * Not displayed anymore on next page load once answered.
 */
const ANSWERED_KEY = 'survey-missing-feature-answered';

const alreadyAnswered = localStorage?.getItem(ANSWERED_KEY) === 'true';

const text = ref('');
const submitting = ref(false);
const submitted = ref(false);
const failed = ref(false);

const submit = async (): Promise<void> => {
    const answer = text.value.trim();

    if (answer === '' || submitting.value) {
        return;
    }

    submitting.value = true;
    failed.value = false;

    try {
        await apiPostSurveyAnswer(answer);

        localStorage?.setItem(ANSWERED_KEY, 'true');
        submitted.value = true;
    } catch {
        failed.value = true;
    } finally {
        submitting.value = false;
    }
};
</script>

<template>
    <div v-if="!alreadyAnswered" class="card text-bg-info mt-3 mb-3">
        <div class="card-body">
            <h5 class="card-title"><IconQuestionCircle /> {{ $t('lobby_survey_title') }}</h5>

            <p v-if="submitted" class="card-text">{{ $t('lobby_survey_thanks') }}</p>

            <form v-else @submit.prevent="submit">
                <label for="lobby-survey-input" class="form-label lead">{{ $t('lobby_survey_question') }}</label>

                <div class="input-group">
                    <input
                        id="lobby-survey-input"
                        v-model="text"
                        type="text"
                        class="form-control"
                        maxlength="1000"
                        required
                    >
                    <button type="submit" class="btn btn-primary" :disabled="submitting">{{ $t('lobby_survey_submit') }}</button>
                </div>

                <small v-if="failed" class="d-block text-bg-danger rounded px-2 py-1 mt-2">{{ $t('lobby_survey_error') }}</small>

                <small>{{ $t('lobby_survey_privacy') }}</small>
            </form>
        </div>
    </div>
</template>
