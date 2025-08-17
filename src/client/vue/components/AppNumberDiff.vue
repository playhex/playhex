<script setup lang="ts">
import { IconCaretDownFill, IconCaretUpFill } from '../icons.js';

defineProps({
    n: {
        type: Number,
        required: false,
        default: null,
    },
    precision: {
        type: Number,
        required: false,
        default: 0,
    },
    colors: {
        type: Boolean,
        required: false,
        default: true,
    },
});

const { round, abs } = Math;
</script>

<template>
    <span v-if="null === n">
        -
    </span>
    <span v-else-if="n > 0" :class="{ 'text-success': colors }">
        <small><IconCaretUpFill /></small> {{ round(n * (10 ** precision)) / (10 ** precision) }}
    </span>
    <span v-else :class="{ 'text-danger': colors }">
        <small><IconCaretDownFill /></small> {{ abs(round(n * (10 ** precision)) / (10 ** precision)) }}
    </span>
</template>
