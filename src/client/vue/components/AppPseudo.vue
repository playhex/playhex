<script setup lang="ts">
import Player from '../../../shared/app/models/Player';
import { PropType, toRefs } from 'vue';
import { RouterLink } from 'vue-router';

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
    <RouterLink
        v-if="player.slug"
        :to="{ name: 'player', params: { slug: player.slug } }"
        class="text-body text-decoration-none"
    >
        <component :is="is" :class="classes">
            <span v-if="player.isGuest" class="fst-italic">{{ $t('guest') }}&nbsp;</span>
            <span>{{ player.pseudo }}</span>
        </component>
    </RouterLink>

    <component v-else :is="is" :class="classes">
        <span v-if="player.isGuest" class="fst-italic">{{ $t('guest') }}&nbsp;</span>
        <span>{{ player.pseudo }}</span>
    </component>
</template>
