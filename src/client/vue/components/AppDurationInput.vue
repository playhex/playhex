<script setup lang="ts">
import parse from 'parse-duration';
import { PropType, ref, toRefs, watch, watchEffect } from 'vue';

/*
 * Component that takes a duration as seconds as model,
 * and allow edit this duration with natural language,
 * like "15 minutes", "10min 30s", "1h30", "1 day 12 hrs", ...
 *
 * Uses https://github.com/jkroso/parse-duration
 */

const props = defineProps({
    /**
     * Duration in seconds
     */
    modelValue: {
        type: [null, Number] as PropType<null | number>,
        required: false,
        default: null,
    },
});

const emit = defineEmits(['update:modelValue']);

const validFormat = ref(true);

/**
 * For initial input, returns e.g "10 minutes" for 600
 */
const toReadableText = (seconds: number): string => {
    let text = '';

    if (seconds >= 86400) {
        const days = Math.floor(seconds / 86400);
        text = `${text} ${days} day`;
        if (days !== 1) {
            text += 's';
        }
        seconds -= days * 86400;
    }

    if (seconds >= 3600) {
        const hours = Math.floor(seconds / 3600);
        text = `${text} ${hours} hour`;
        if (hours !== 1) {
            text += 's';
        }
        seconds -= hours * 3600;
    }

    if (seconds >= 60) {
        const minutes = Math.floor(seconds / 60);
        text = `${text} ${minutes} minute`;
        if (minutes !== 1) {
            text += 's';
        }
        seconds -= minutes * 60;
    }

    if (seconds > 0) {
        text = `${text} ${seconds} second`;
        if (seconds !== 1) {
            text += 's';
        }
    }

    return text.trim();
};

const { modelValue } = toRefs(props);

const displayedValue = ref(toReadableText(modelValue.value ?? 0));

// Update text when parent update model value
watch(modelValue, (newValue) => {
    if (newValue === null) {
        return;
    }

    const parsedSeconds = parse(displayedValue.value, 's');

    if (parsedSeconds !== newValue) {
        displayedValue.value = toReadableText(newValue);
    }
});

watchEffect(() => {
    const parsedSeconds = parse(displayedValue.value, 's');

    if (parsedSeconds === null || isNaN(parsedSeconds)) {
        validFormat.value = false;
        return;
    }

    validFormat.value = true;
    emit('update:modelValue', parsedSeconds);
});
</script>

<template>
    <input
        type="text"
        v-model="displayedValue"
        :class="{ 'is-invalid': !validFormat }"
    />
</template>
