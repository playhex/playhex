<script lang="ts" setup>
import HostedGameOptions from '../../../../../shared/app/models/HostedGameOptions';
import { PropType, toRefs } from 'vue';

const props = defineProps({
    gameOptions: {
        type: Object as PropType<HostedGameOptions>,
        required: true,
    },
});

const { gameOptions } = toRefs(props);
</script>

<template>
    <h6>{{ $t('swap_rule') }}</h6>

    <div class="form-check">
        <input class="form-check-input" v-model="gameOptions.swapRule" type="checkbox" id="swap-rule">
        <label class="form-check-label" for="swap-rule">
            {{ $t('enable_swap_rule') }}
        </label>
    </div>
</template>
