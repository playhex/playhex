<script setup lang="ts">
/* eslint-env browser */
import { onUnmounted, ref } from 'vue';
import { BIconTrophy, BIconCircleFill } from 'bootstrap-icons-vue';
import { formatDistanceToNowStrict, intlFormat } from 'date-fns';
import { autoLocale } from '../../../shared/app/i18n';

const props = defineProps({
    name: {
        type: String,
        required: true,
    },
    registerLink: {
        type: String,
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
});

const { name, registerLink, startDate } = props;

const startsInStr = (): string => intlFormat(
    startDate,
    { day: 'numeric', month: 'long', hour: 'numeric', minute: 'numeric' },
    { locale: autoLocale() }
)
    + ' ('
    + formatDistanceToNowStrict(startDate, { addSuffix: true })
    + ')'
;

const tournamentStartsStr = ref(startsInStr());

const started = (): boolean => new Date().getTime() > startDate.getTime();

/**
 * Display card only 10 days before tournament start,
 * and hide it 4h after tournament started.
 */
const shouldDisplay = (): boolean => {
    const now = new Date().getTime();
    const start = startDate.getTime();

    return now > (start - 10 * 86400 * 1000)
        && now < (start + 4 * 3600 * 1000)
    ;
};

if (shouldDisplay() && !started()) {
    const thread = setInterval(() => {
        tournamentStartsStr.value = startsInStr();
    }, 500);

    onUnmounted(() => clearInterval(thread));
}

/**
 * If tournament starts in 15min
 */
const isReallySoon = (): boolean => {
    const now = new Date().getTime();
    const start = startDate.getTime();

    return now > (start - 15 * 60 * 1000);
};
</script>

<template>
    <div v-if="shouldDisplay()" class="card card-bg-icon border-warning mb-4">
        <BIconTrophy style="top: 1rem; right: 0.5rem; font-size: 8rem" class="text-warning" />
        <div class="card-body">
            <h6 class="card-subtitle mb-2 text-body-secondary">{{ $t('tournament') }}</h6>
            <h4 class="card-title">{{ name }}</h4>

            <p v-if="!started()" :class="isReallySoon() ? 'text-warning lead' : 'text-body-secondary'">{{ tournamentStartsStr }}</p>
            <p v-else class="m-0"><BIconCircleFill class="text-danger" /> <span class="lead">{{ $t('now!') }}</span></p>

            <a v-if="!started()" :href="registerLink" target="_blank" class="btn btn-warning">{{ $t('register_on_challonge') }}</a>
            <a v-else :href="registerLink" target="_blank" class="btn btn-link px-0">{{ $t('see_progression_on_challonge') }}</a>

            <p v-if="!started()" class="mb-0 mt-2">
                <a href="#create-hex-monthly-1vAI-friendly" class="btn btn-sm btn-outline-primary mt-2 me-2">Train with AI</a>
                <a href="#create-hex-monthly-1v1-friendly" class="btn btn-sm btn-outline-primary mt-2">Create 1v1</a>
            </p>
            <p v-else class="mb-0">
                <a href="#create-hex-monthly" class="btn btn-sm btn-warning mt-2">Create Hex Monthly game</a>
            </p>
        </div>
    </div>
</template>
