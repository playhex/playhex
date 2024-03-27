<script setup lang="ts">
import Player from '../../../shared/app/models/Player';
import { PropType, toRefs } from 'vue';
import AppPseudo from './AppPseudo.vue';
import AppOnlineStatus from './AppOnlineStatus.vue';

const props = defineProps({
    player: {
        type: Object as PropType<Player>,
        required: true,
    },
    is: {
        type: String,
        default: 'span',
    },
    classes: {
        type: String,
        default: null,
    },
});

const { player, is, classes } = toRefs(props);
</script>

<template>
    <span class="text-nowrap">
        <AppOnlineStatus :player="player" />
        <AppPseudo :player="player" :is="is" :classes="classes" />
    </span>
</template>
