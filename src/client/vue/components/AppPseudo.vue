<script setup lang="ts">
import { PlayerData } from '@shared/app/Types';
import { PropType, toRefs } from 'vue';
import { RouterLink } from 'vue-router';

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
    <router-link
        v-if="playerData.slug"
        :to="{ name: 'player', params: { slug: playerData.slug } }"
        class="text-body text-decoration-none"
    >
        <component :is="is" :class="classes">
            <span v-if="playerData.isGuest" class="fst-italic">Guest&nbsp;</span>
            <span>{{ playerData.pseudo }}</span>
        </component>
    </router-link>

    <component v-else :is="is" :class="classes">
        <span v-if="playerData.isGuest" class="fst-italic">Guest&nbsp;</span>
        <span>{{ playerData.pseudo }}</span>
    </component>
</template>
