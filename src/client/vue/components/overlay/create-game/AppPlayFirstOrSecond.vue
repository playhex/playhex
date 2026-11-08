<script lang="ts" setup>
import { computed } from 'vue';
import useAuthStore from '../../../../stores/authStore.js';
import { playerGender } from '../../../../../shared/app/playerPronouns.js';

const gender = computed(() => playerGender(useAuthStore().loggedInPlayer));
const firstPlayer = defineModel<null | 0 | 1>({
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
    <h6>{{ $t('i_play.title') }}</h6>

    <div class="btn-group btn-group-min-width" role="group">
        <input type="radio" name="firstPlayer-radio" class="btn-check" v-model="firstPlayer" :value="null" id="first-random" :disabled="disabled">
        <label class="btn btn-outline-secondary" for="first-random">{{ $t('i_play.random') }}</label>

        <input type="radio" name="firstPlayer-radio" class="btn-check" v-model="firstPlayer" :value="0" id="first-0" :disabled="disabled">
        <label class="btn btn-outline-danger" for="first-0">{{ $t('i_play.first', { context: gender }) }}</label>

        <input type="radio" name="firstPlayer-radio" class="btn-check" v-model="firstPlayer" :value="1" id="first-1" :disabled="disabled">
        <label class="btn btn-outline-primary" for="first-1">{{ $t('i_play.second', { context: gender }) }}</label>
    </div>
</template>

<style lang="stylus" scoped>
.btn-group-min-width
    .btn
        min-width 6em
</style>
