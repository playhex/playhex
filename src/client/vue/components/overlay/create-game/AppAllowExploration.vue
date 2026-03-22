<script lang="ts" setup>
const allowExploration = defineModel<boolean>({
    required: true,
});
</script>

<template>
    <div class="form-check">
        <input class="form-check-input" v-model="allowExploration" type="checkbox" id="exploration">
        <label class="form-check-label" for="exploration">
            {{ $t('allow_exploration') }}
        </label>
        <div class="form-text">{{ $t('allow_exploration_help') }}</div>
    </div>
</template>
