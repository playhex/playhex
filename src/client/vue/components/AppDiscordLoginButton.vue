<script lang="ts" setup>
import { computed } from 'vue';
import { IconDiscord } from '../icons.js';

const props = defineProps<{
    /**
     * Where to go after successful login.
     */
    redirect?: null | string;
}>();

const isEnabled = DISCORD_LOGIN_ENABLED;

const href = computed((): string => {
    const params = new URLSearchParams({ intent: 'login' });

    if (props.redirect) {
        params.set('redirect', props.redirect);
    }

    return `/auth/discord?${params.toString()}`;
});
</script>

<template>
    <div v-if="isEnabled" class="text-center">
        <p class="text-body-secondary my-3">{{ $t('or') }}</p>
        <a :href class="btn btn-discord"><IconDiscord /> {{ $t('log_in_with_discord') }}</a>
    </div>
</template>

<style lang="stylus" scoped>
.btn-discord
    color white
    background-color #5865F2
    border-color #5865F2

    &:hover, &:focus
        color white
        background-color #4752C4
        border-color #4752C4
</style>
