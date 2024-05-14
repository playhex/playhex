<script setup lang="ts">
/* eslint-env browser */
import { onUnmounted, ref } from 'vue';
import { BIconTrophy, BIconCircleFill } from 'bootstrap-icons-vue';
import { formatDistanceToNowStrict } from 'date-fns';

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

const startsInStr = (): string => formatDistanceToNowStrict(startDate, {
    addSuffix: true,
});

const tournamentStartsStr = ref(startsInStr());

const started = (): boolean => new Date().getTime() > startDate.getTime();

/**
 * Display card only 10 days before tournament start,
 * and hide it 2h after tournament started.
 */
const shouldDisplay = (): boolean => {
    const now = new Date().getTime();
    const start = startDate.getTime();

    return now > (start - 10 * 86400 * 1000)
        && now < (start + 2 * 3600 * 1000)
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
            <a v-else :href="registerLink" target="_blank" class="btn btn-link">{{ $t('see_progression_on_challonge') }}</a>
        </div>
    </div>
</template>
