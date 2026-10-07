<script setup lang="ts">
import { nextTick, onUnmounted, PropType, ref, watchEffect } from 'vue';
import { TimeValue, timeValueToMilliseconds } from '../../../../shared/time-control/TimeValue.js';
import { msToTime } from '../../../../shared/app/timeControlUtils.js';
import { PlayerIndex } from '../../../../shared/game-engine/index.js';
import { IconPencilSquare } from '../../icons.js';

/**
 * Player name, editable in place.
 */
const name = defineModel<string>('name', {
    required: true,
});

const props = defineProps({
    /**
     * Color played by this player: 0 is red, 1 is blue.
     */
    playerIndex: {
        type: Number as PropType<PlayerIndex>,
        required: true,
    },

    /**
     * Whether it is this player turn.
     */
    isCurrent: {
        type: Boolean,
        required: true,
    },

    /**
     * Display this bar upside down, for the player in front in tabletop mode.
     */
    flipped: {
        type: Boolean,
        default: false,
    },

    /**
     * Align content to the right, for a player displayed in a right corner.
     */
    alignRight: {
        type: Boolean,
        default: false,
    },

    /**
     * Name below chrono, for a player displayed in a bottom corner.
     */
    bottom: {
        type: Boolean,
        default: false,
    },

    /**
     * Remaining time of this player, or null if no time control.
     */
    timeValue: {
        type: [Date, Number] as PropType<null | TimeValue>,
        default: null,
    },
});

/*
 * In place name edition
 */
const editing = ref(false);
const editedName = ref('');
const nameInput = ref<HTMLInputElement>();

const startEditing = async (): Promise<void> => {
    editedName.value = name.value;
    editing.value = true;

    await nextTick();
    nameInput.value?.focus();
    nameInput.value?.select();
};

const submitName = (): void => {
    if (!editing.value) {
        return;
    }

    const trimmed = editedName.value.trim();

    if (trimmed !== '') {
        name.value = trimmed.substring(0, 32);
    }

    editing.value = false;
};

const cancelEditing = (): void => {
    editing.value = false;
};

/*
 * Chrono
 */
const chrono = ref<null | { time: string, ms?: string, warning: boolean }>(null);

const refreshChrono = (): void => {
    if (props.timeValue === null) {
        chrono.value = null;
        return;
    }

    const ms = Math.max(0, timeValueToMilliseconds(props.timeValue, new Date()));

    chrono.value = {
        time: msToTime(ms),
        ms: ms < 10000 ? `.${Math.floor((ms % 1000) / 100)}` : undefined,
        warning: ms < 10000,
    };
};

watchEffect(refreshChrono);

const chronoThread = setInterval(refreshChrono, 100);

onUnmounted(() => clearInterval(chronoThread));
</script>

<template>
    <div class="local-player-bar" :class="{ flipped, 'align-right': alignRight, bottom }">
        <div class="player">
            <span class="stone" :class="0 === playerIndex ? 'bg-danger' : 'bg-primary'"></span>

            <form v-if="editing" class="name-form" @submit.prevent="submitName">
                <input
                    ref="nameInput"
                    v-model="editedName"
                    class="form-control form-control-sm"
                    maxlength="32"
                    @blur="submitName"
                    @keydown.esc="cancelEditing"
                >
            </form>
            <button
                v-else
                type="button"
                class="btn btn-link name"
                :class="0 === playerIndex ? 'text-danger' : 'text-primary'"
                :title="$t('local_play.edit_name')"
                @click="startEditing"
            >{{ name }} <IconPencilSquare class="edit-icon" /></button>
        </div>

        <span
            v-if="chrono"
            class="chrono"
            :class="{ 'text-secondary': !isCurrent, 'text-warning': chrono.warning && isCurrent }"
        >{{ chrono.time }}<small v-if="chrono.ms">{{ chrono.ms }}</small></span>
    </div>
</template>

<style lang="stylus" scoped>
.local-player-bar
    // Displayed over a board corner: name, then chrono
    display flex
    flex-direction column
    align-items flex-start
    gap 0.25em
    max-width 100%
    padding 0.5em 0.75em
    background-color unquote('rgba(var(--bs-body-bg-rgb), 0.5)')

    &.align-right
        align-items flex-end

        .player
            flex-direction row-reverse

    &.bottom
        flex-direction column-reverse

    &.flipped
        transform rotate(180deg)

.player
    display flex
    align-items center
    gap 0.5em
    min-width 0
    max-width 100%

.stone
    flex-shrink 0
    width 1em
    height 1em
    border-radius 50%

.name
    padding 0
    font-weight bold
    text-decoration none
    white-space nowrap
    overflow hidden
    text-overflow ellipsis
    min-width 0

    .edit-icon
        font-size 0.75em
        opacity 0.5

.name-form
    min-width 0
    max-width 12em

.chrono
    flex-shrink 0
    font-family monospace
    font-size 1.75em
    line-height 1
</style>
