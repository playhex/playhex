<script setup lang="ts">
/* eslint-env browser */
import { onUnmounted, ref } from 'vue';
import { IconTrophy, IconCircleFill } from '../icons';
import { formatDistanceToNowStrict, intlFormat } from 'date-fns';
import { autoLocale } from '../../../shared/app/i18n/index.js';

const props = defineProps({
    name: {
        type: String,
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
});

const { name, startDate } = props;

const startsInStr = (): string => intlFormat(
    startDate,
    { day: 'numeric', month: 'long', hour: 'numeric', minute: 'numeric' },
    { locale: autoLocale() },
)
    + ' ('
    + formatDistanceToNowStrict(startDate, { addSuffix: true })
    + ')'
;

const tournamentStartsStr = ref(startsInStr());

const started = (): boolean => new Date().getTime() > startDate.getTime();

/**
 * Display card only 2h before tournament start,
 * and hide it 30min after tournament started.
 */
const shouldDisplay = (): boolean => {
    const now = new Date().getTime();
    const start = startDate.getTime();

    return now > (start - 2 * 3600 * 1000)
        && now < (start + 0.5 * 3600 * 1000)
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
        <IconTrophy style="top: 1rem; right: 0.5rem; font-size: 8rem" class="text-warning" />
        <div class="card-body">
            <h6 class="card-subtitle mb-2 text-body-secondary">{{ $t('tournament') }}</h6>
            <h4 class="card-title">{{ name }}</h4>

            <p v-if="!started()" :class="isReallySoon() ? 'text-warning lead' : 'text-body-secondary'">{{ tournamentStartsStr }}</p>
            <p v-else class="m-0"><IconCircleFill class="text-danger" /> <span class="lead">{{ $t('now!') }}</span></p>

            <a href="https://www.playok.com/en/hex/" target="_blank" class="btn btn-playok">PlayOk</a>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.btn-playok
    background-color #2060c8
</style>
