<script lang="ts" setup>
const closed = defineModel<boolean>({
    required: true,
});

defineProps({
    disabled: {
        type: Boolean,
        default: false,
    },
});
</script>

<template>
    <div class="form-check">
        <input class="form-check-input" v-model="closed" type="checkbox" id="closedGame" :disabled>
        <label class="form-check-label" for="closedGame">
            {{ $t('closed_game') }}
        </label>
        <div class="form-text">{{ $t('closed_game_help') }}</div>
    </div>
</template>
