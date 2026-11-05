<script lang="ts" setup>
import { computed } from 'vue';
import { IconDash, IconHandicap, IconPlus } from '../../../icons.js';
import { HANDICAP_STEP, MAX_HANDICAP, toValidPresetHandicap } from '../../../../../shared/app/handicap.js';

const presetHandicap = defineModel<number>({
    required: true,
});

defineProps({
    /**
     * Who gets the advantage when value is negative, already translated.
     */
    opponentLabel: {
        type: String,
        required: true,
    },
});

const inputValue = computed<number>({
    get: () => presetHandicap.value,
    set: value => presetHandicap.value = toValidPresetHandicap(value),
});
</script>

<template>
    <h6><IconHandicap /> {{ $t('handicap.title') }}</h6>

    <div class="input-group handicap-input">
        <button
            type="button"
            class="btn btn-outline-secondary"
            :aria-label="$t('handicap.decrease')"
            :disabled="presetHandicap <= -MAX_HANDICAP"
            @click="inputValue = presetHandicap - HANDICAP_STEP"
        ><IconDash /></button>

        <input
            type="number"
            class="form-control text-center"
            :aria-label="$t('handicap.title')"
            :min="-MAX_HANDICAP"
            :max="MAX_HANDICAP"
            :step="HANDICAP_STEP"
            v-model.lazy.number="inputValue"
        >

        <button
            type="button"
            class="btn btn-outline-secondary"
            :aria-label="$t('handicap.increase')"
            :disabled="presetHandicap >= MAX_HANDICAP"
            @click="inputValue = presetHandicap + HANDICAP_STEP"
        ><IconPlus /></button>
    </div>

    <div class="form-text">
        <template v-if="0 === presetHandicap">{{ $t('handicap.none') }}</template>
        <template v-else>{{ $t('handicap.handicap_for_player', { n: Math.abs(presetHandicap), player: presetHandicap > 0 ? $t('handicap.you') : opponentLabel }) }}</template>
    </div>
</template>

<style lang="stylus" scoped>
.handicap-input
    max-width 12em
</style>
