<script setup lang="ts">
import { IconPhone, IconTabletLandscape } from '../../icons.js';

/**
 * Switch between normal mode (pass and play) and tabletop mode.
 */
const tabletop = defineModel<boolean>({
    required: true,
});

defineProps({
    /**
     * Display explanation of selected mode below.
     */
    explain: {
        type: Boolean,
        default: false,
    },
});
</script>

<template>
    <div>
        <div class="btn-group w-100" role="group">
            <template v-for="{ value, label } in [
                { value: false, label: 'local_play.pass_and_play' },
                { value: true, label: 'local_play.tabletop' },
            ] as const" :key="label">
                <input
                    v-model="tabletop"
                    type="radio"
                    class="btn-check"
                    :value="value"
                    :id="'local-display-mode-' + value"
                    autocomplete="off"
                >
                <label class="btn btn-outline-primary local-choice-card" :for="'local-display-mode-' + value">
                    <IconTabletLandscape v-if="value" class="fs-3" />
                    <IconPhone v-else class="fs-3" />
                    <span>{{ $t(label) }}</span>
                </label>
            </template>
        </div>

        <p v-if="explain" class="text-secondary mt-1 mb-0">
            <small>{{ tabletop ? $t('local_play.tabletop_explain') : $t('local_play.pass_and_play_explain') }}</small>
        </p>
    </div>
</template>

<style lang="stylus" scoped>
.local-choice-card
    display flex
    flex-direction column
    align-items center
    gap 0.25em
</style>
