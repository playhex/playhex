<script lang="ts" setup>
const opponentMustBeRegistered = defineModel<boolean>({
    required: true,
});
</script>

<template>
    <div class="form-check">
        <input class="form-check-input" v-model="opponentMustBeRegistered" type="checkbox" id="opponentMustBeRegistered">
        <label class="form-check-label" for="opponentMustBeRegistered">
            {{ $t('opponent_must_be_registered') }}
        </label>
        <div class="form-text">{{ $t('opponent_must_be_registered_help') }}</div>
    </div>
</template>
