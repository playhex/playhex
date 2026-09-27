<script setup lang="ts">
import { nextTick, onUnmounted, PropType, ref, watchEffect } from 'vue';
import { TimeValue, timeValueToMilliseconds } from '../../../../shared/time-control/TimeValue.js';
import { msToTime } from '../../../../shared/app/timeControlUtils.js';
import { PlayerIndex } from '../../../../shared/game-engine/index.js';
import { IconArrowCounterclockwise, IconFlag, IconPencilSquare } from '../../icons.js';

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
     * Remaining time of this player, or null if no time control.
     */
    timeValue: {
        type: [Date, Number] as PropType<null | TimeValue>,
        default: null,
    },

    canPass: {
        type: Boolean,
        default: false,
    },

    canUndo: {
        type: Boolean,
        default: false,
    },

    canResign: {
        type: Boolean,
        default: false,
    },

    /**
     * Game is finished, show rematch button.
     */
    canRematch: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits<{
    pass: [];
    undo: [];
    resign: [];
    rematch: [];
}>();

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
    <div class="local-player-bar" :class="{ flipped }">
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

        <div class="actions">
            <button v-if="canUndo" type="button" class="btn btn-sm btn-warning" :title="$t('undo.undo_move')" @click="emit('undo')">
                <IconArrowCounterclockwise /><span class="hide-sm">{{ ' ' + $t('undo.undo_move') }}</span>
            </button>
            <button v-if="canPass" type="button" class="btn btn-sm btn-primary" @click="emit('pass')">{{ $t('pass') }}</button>
            <button
                v-if="canResign"
                type="button"
                class="btn btn-sm btn-outline-danger"
                :title="$t('resign')"
                :aria-label="$t('resign')"
                @click="emit('resign')"
            ><IconFlag /></button>
            <button v-if="canRematch" type="button" class="btn btn-sm btn-success" @click="emit('rematch')">{{ $t('rematch.label') }}</button>
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
    // Actions centered, player on the left, chrono on the right
    display grid
    grid-template-columns 1fr auto 1fr
    align-items center
    gap 0.5em
    height 3rem
    padding 0 0.75em

    &.flipped
        transform rotate(180deg)

.player
    display flex
    align-items center
    gap 0.5em
    min-width 0

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
    grid-column 3
    justify-self end
    font-family monospace
    font-size 1.5em
    line-height 1

.actions
    grid-column 2
    display flex
    gap 0.5em

.hide-sm
    @media (max-width: 575px)
        display none
</style>
