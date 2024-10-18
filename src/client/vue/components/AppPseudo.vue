<script setup lang="ts">
import Player from '../../../shared/app/models/Player';
import { PropType } from 'vue';
import { RouterLink } from 'vue-router';
import AppOnlineStatus from './AppOnlineStatus.vue';
import { glicko2Settings, isRatingConfident } from '../../../shared/app/ratingUtils';
import usePlayersStore from '../../stores/playersStore';

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
        type: [String, Array, Object] as PropType<null | string | { [className: string]: boolean } | string[]>,
        default: null,
    },

    /**
     * Whether to display a green/grey circle on username to show player presence/absence
     */
    onlineStatus: {
        type: Boolean,
        default: false,
    },

    /**
     * How to display rating:
     * - `<AppPseudo />` If not set, rating is not shown.
     * - `<AppPseudo rating />` rating is shown in minimalist form, like "1500" or "~1500" depending on confidence
     * - `<AppPseudo rating="full" />` rating is fully shown, like "1500 ±140"
     */
    rating: {
        type: [Boolean, String] as PropType<boolean | 'full'>,
        default: false,
    },
});

const { round } = Math;
const p = usePlayersStore().playerRef(props.player);
</script>

<template>
    <AppOnlineStatus v-if="onlineStatus" :player="p" />

    <RouterLink
        :to="p.slug ? { name: 'player', params: { slug: p.slug } } : ''"
        class="text-body text-decoration-none"
    >
        <component :is="is" :class="classes">
            <span v-if="p.isGuest" class="fst-italic">{{ $t('guest') }}&nbsp;</span>
            <span>{{ p.pseudo }}</span>
        </component>

        <template v-if="rating">
            <!-- adds an invisible space between username and rating to make copy/paste and functionnal tests more readable -->
            <span class="small">&nbsp;</span>

            <small class="text-body-secondary ms-2 d-inline-block">
                <template v-if="'full' === rating">
                    {{ round(p.currentRating?.rating ?? glicko2Settings.rating) }} ±{{ round((p.currentRating?.deviation ?? glicko2Settings.rd) * 2) }}
                </template>
                <template v-else>
                    <template v-if="p.currentRating ? !isRatingConfident(p.currentRating) : true">~</template>{{ round(p.currentRating?.rating ?? glicko2Settings.rating) }}
                </template>
            </small>
        </template>
    </RouterLink>
</template>

<style lang="stylus" scoped>
.small
    font-size 0px
</style>
