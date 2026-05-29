<script setup lang="ts">
import AppHeader from './components/layout/AppHeader.vue';
import AppFooter from './components/layout/AppFooter.vue';
import AppToasts from './components/layout/AppToasts.vue';
import AppPlayerModerationActionOverlayAll from './components/AppPlayerModerationActionOverlayAll.vue';
import { useRouter } from 'vue-router';
import { computed, ref } from 'vue';

const router = useRouter();
const { currentRoute } = router;

const displayFooter = computed(() => currentRoute.value.meta.displayFooter ?? true);

// Fix CLS on footer
const routeLoaded = ref(false);

router.beforeEach(() => { routeLoaded.value = false; });
router.afterEach(() => { routeLoaded.value = true; });
</script>

<template>
    <div class="app-layout bg-body-tertiary">
        <header class="sticky-top">
            <AppHeader />
        </header>

        <main>
            <router-view />
        </main>

        <footer v-if="routeLoaded && displayFooter">
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
        min-height 16em
</style>
