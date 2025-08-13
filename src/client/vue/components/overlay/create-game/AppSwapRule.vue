<script lang="ts" setup>
const swapRule = defineModel<boolean>({
    required: true,
});
</script>

<template>
    <h6>{{ $t('swap_rule') }}</h6>

    <div class="form-check">
        <input class="form-check-input" v-model="swapRule" type="checkbox" id="swap-rule">
        <label class="form-check-label" for="swap-rule">
            {{ $t('enable_swap_rule') }}
        </label>
    </div>
</template>
