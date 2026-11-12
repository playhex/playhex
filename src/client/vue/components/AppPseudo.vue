<script setup lang="ts">
import Player from '../../../shared/app/models/Player.js';
import { PropType, ref, useId, useTemplateRef, watch } from 'vue';
import AppOnlineStatus from './AppOnlineStatus.vue';
import AppPlayerRating from './AppPlayerRating.vue';
import { PlayerOnlineStatus } from '../../../shared/app/Types.js';
import AppPlayerPopover from './AppPlayerPopover.vue';

const emit = defineEmits<{
    'update:popoverOpen': [open: boolean];
}>();

const popoverOpen = ref(false);
const trigger = useTemplateRef<HTMLButtonElement>('trigger');
const popoverId = useId();

watch(popoverOpen, open => emit('update:popoverOpen', open));

const onClick = (event: MouseEvent): void => {
    event.stopPropagation();
    event.preventDefault();
    popoverOpen.value = !popoverOpen.value;
};

defineProps({
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
     * Whether to display a green/grey circle on username to show player presence/absence.
     * Pass a status to display it directly, instead of watching player status.
     */
    onlineStatus: {
        type: [Boolean, String] as PropType<boolean | PlayerOnlineStatus>,
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

    /**
     * Set to false when the nickname is inside a link or a button (e.g a game card):
     * renders plain text, without the player popover.
     */
    interactive: {
        type: Boolean,
        default: true,
    },
});
</script>

<template>
    <component
        :is="interactive ? 'button' : 'span'"
        ref="trigger"
        class="text-body text-decoration-none pseudo-link"
        :class="{ interactive }"
        :style="{ justifyContent: alignItems === 'right' ? 'flex-end' : 'flex-start' }"
        v-bind="interactive ? {
            type: 'button',
            'aria-haspopup': 'dialog',
            'aria-expanded': popoverOpen,
            'aria-controls': popoverOpen ? popoverId : undefined,
        } : {}"
        @click="interactive && onClick($event)"
    >
        <span class="nick-group">
            <span v-if="onlineStatus" class="status-icon">
                <AppOnlineStatus :player="player" :status="typeof onlineStatus === 'string' ? onlineStatus : null" />
            </span>

            <component :is="is" :class="classes" class="nick">
                <span v-if="player.isGuest" class="fst-italic">{{ $t('guest') }}&nbsp;</span>
                <span v-if="player.isDonor"><span class="donor-initial">{{ [...player.pseudo][0] }}</span>{{ [...player.pseudo].slice(1).join('') }}</span>
                <span v-else>{{ player.pseudo }}</span>
            </component>
        </span>

        <span v-if="(flag && player.countryFlag) || rating" class="meta-group">
            <small v-if="flag && player.countryFlag" aria-hidden="true">{{ player.countryFlag }}</small>

            <template v-if="rating">
                <!-- adds an invisible space between username and rating to make copy/paste and functionnal tests more readable -->
                <span class="invisible">&nbsp;</span>

                <AppPlayerRating :player="player" :full="rating === 'full'" />
            </template>
        </span>
        <Teleport v-if="interactive" to="body">
            <AppPlayerPopover
                v-if="popoverOpen && trigger"
                :key="player.publicId"
                :id="popoverId"
                :player="player"
                :trigger="trigger"
                :onlineStatus="typeof onlineStatus === 'string' ? onlineStatus : null"
                @close="popoverOpen = false"
            />
        </Teleport>
    </component>
</template>

<style lang="stylus" scoped>
.invisible
    font-size 0px

.pseudo-link
    border 0
    padding 0
    background none
    font inherit
    text-align inherit
    display inline-flex
    flex-wrap wrap
    align-items center
    justify-content flex-start
    column-gap 0.4em
    min-width 0
    max-width 100%

    &.interactive
        cursor pointer

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
