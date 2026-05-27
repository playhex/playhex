<script setup lang="ts">
import AppHeader from './components/layout/AppHeader.vue';
import AppFooter from './components/layout/AppFooter.vue';
import AppToasts from './components/layout/AppToasts.vue';
import AppPlayerModerationActionOverlayAll from './components/AppPlayerModerationActionOverlayAll.vue';
import { useRouter } from 'vue-router';
import { computed } from 'vue';

const { currentRoute } = useRouter();
const displayFooter = computed(() => currentRoute.value.meta.displayFooter !== false);
const fixFooterCls = computed(() => currentRoute.value.meta.fixFooterCls !== false);
</script>

<template>
    <div class="app-layout bg-body-tertiary">
        <header class="sticky-top">
            <AppHeader />
        </header>

        <main :class="{ 'fix-footer-cls': fixFooterCls }">
            <router-view />
        </main>

        <footer v-if="displayFooter">
            <AppFooter />
        </footer>

        <AppToasts />
        <AppPlayerModerationActionOverlayAll />
    </div>
</template>

<style lang="stylus" scoped>
.app-layout
    display flex
    flex-direction column
    min-height 100vh
    min-height 100dvh

    footer
        margin-top auto
        min-height 18em

main.fix-footer-cls
    min-height 100vh
</style>
