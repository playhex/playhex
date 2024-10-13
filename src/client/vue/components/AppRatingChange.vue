<script setup lang="ts">
import { BIconCaretDownFill, BIconCaretUpFill } from 'bootstrap-icons-vue';

const props = defineProps({
    ratingChange: {
        type: Number,
        required: true,
    },
});

const { round, abs } = Math;
</script>

<template>
    <span v-if="!props.ratingChange">
        -
    </span>
    <span v-else-if="props.ratingChange > 0" class="text-success">
        <small><BIconCaretUpFill /></small> {{ round(props.ratingChange) }}
    </span>
    <span v-else class="text-danger">
        <small><BIconCaretDownFill /></small> {{ abs(round(props.ratingChange)) }}
    </span>
</template>
