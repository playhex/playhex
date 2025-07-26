<script setup lang="ts">
import { formatDistanceToNowStrict } from 'date-fns';
import { onUnmounted, PropType, ref, toRefs } from 'vue';

const props = defineProps({
    date: {
        type: [null, Date] as PropType<null | Date>,
        required: false,
        default: null,
    },
});

const { date } = toRefs(props);

const formatCountdown = (): string => {
    if (date.value === null) {
        return '';
    }

    if (date.value < new Date()) {
        return '';
    }

    return formatDistanceToNowStrict(date.value, { addSuffix: true });
};

const countdown = ref(formatCountdown());

const thread = setInterval(() => {
    countdown.value = formatCountdown();
}, 500);

onUnmounted(() => clearInterval(thread));
</script>

<template>
    <span v-if="null === date">-</span>
    <span v-else-if="date < new Date()" class="text-warning">{{ $t('tournament_start_imminent') }}</span>
    <span v-else>{{ countdown }}</span>
</template>
