<script setup lang="ts">
import AppHeader from './components/layout/AppHeader.vue';
import AppFooter from './components/layout/AppFooter.vue';
import AppToasts from './components/layout/AppToasts.vue';
import { useRouter } from 'vue-router';

const { currentRoute } = useRouter();
const displayFooter = () => currentRoute.value.meta.displayFooter !== false;
</script>

<template>
    <div class="app-layout">
        <header>
            <AppHeader />
        </header>

        <main>
            <router-view />
        </main>

        <footer v-if="displayFooter()">
            <AppFooter />
        </footer>

        <AppToasts />
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
</style>
