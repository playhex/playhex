<script setup lang="ts">
import Player from '../../../shared/app/models/Player.js';
import { PropType } from 'vue';
import { RouterLink } from 'vue-router';
import AppOnlineStatus from './AppOnlineStatus.vue';
import usePlayersStore from '../../stores/playersStore.js';
import { ref } from 'vue';
import { watchEffect } from 'vue';
import AppPlayerRating from './AppPlayerRating.vue';

const props = defineProps({
    player: {
        type: Object as PropType<Player>,
        required: true,
    },
    is: {
        type: String,
        default: 'span',
    },

    /**
     * CSS classes to apply to nickname text (e.g red or blue color)
     */
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
     * Whether to display the player's country flag emoji next to the nickname
     */
    flag: {
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

    alignItems: {
        type: String as PropType<'left' | 'right'>,
        default: 'left',
    },
});

const p = ref();
watchEffect(() => {
    p.value = usePlayersStore().playerRef(props.player);
});
</script>

<template>
    <RouterLink
        :to="p.slug ? { name: 'player', params: { slug: p.slug } } : ''"
        class="text-body text-decoration-none pseudo-link"
        :style="{ justifyContent: alignItems === 'right' ? 'flex-end' : 'flex-start' }"
    >
        <span class="nick-group">
            <span v-if="onlineStatus" class="status-icon">
                <AppOnlineStatus :player="p" />
            </span>

            <component :is="is" :class="classes" class="nick">
                <span v-if="p.isGuest" class="fst-italic">{{ $t('guest') }}&nbsp;</span>
                <span>{{ p.pseudo }}</span>
            </component>
        </span>

        <span v-if="(flag && p.countryFlag) || rating" class="meta-group">
            <small v-if="flag && p.countryFlag" aria-hidden="true">{{ p.countryFlag }}</small>

            <template v-if="rating">
                <!-- adds an invisible space between username and rating to make copy/paste and functionnal tests more readable -->
                <span class="invisible">&nbsp;</span>

                <AppPlayerRating :player="p" :full="rating === 'full'" />
            </template>
        </span>
    </RouterLink>
</template>

<style lang="stylus" scoped>
.invisible
    font-size 0px

.pseudo-link
    display inline-flex
    flex-wrap wrap
    align-items center
    justify-content flex-start
    column-gap 0.4em
    min-width 0
    max-width 100%

.nick-group
    display inline-flex
    align-items center
    min-width 0
    overflow hidden

.status-icon
    font-size 1rem
    flex-shrink 0
    line-height 1

.nick
    white-space nowrap
    overflow hidden
    text-overflow ellipsis
    min-width 0

.meta-group
    display inline-flex
    align-items center
    gap 0.1em
</style>
