<script setup lang="ts">
import { PlayerData } from '@shared/app/Types';
import { PropType, toRefs } from 'vue';
import AppPseudo from './AppPseudo.vue';
import AppOnlineStatus from './AppOnlineStatus.vue';

const props = defineProps({
    playerData: {
        type: Object as PropType<PlayerData>,
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

const { playerData, is, classes } = toRefs(props);
</script>

<template>
    <app-online-status :player-data="playerData" />
    <app-pseudo :player-data="playerData" :is="is" :classes="classes" />
</template>
