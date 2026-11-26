<script setup lang="ts">
import { PropType } from 'vue';
import { Player } from '../../../../shared/app/models/index.js';
import AppPseudo from '../../components/AppPseudo.vue';

defineProps({
    player: {
        type: Object as PropType<Player>,
        required: true,
    },
    position: {
        type: [Number, null] as PropType<null | number>,
        default: null,
    },
    bold: {
        type: Boolean,
        default: false,
    },
});
</script>

<template>
    <span>
        <small class="text-secondary me-1">#{{ position }}</small>
        <AppPseudo :player :class="{ 'fw-bold': bold }" />
    </span>
</template>
