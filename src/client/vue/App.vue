<script setup lang="ts">
import AppHeader from '@client/vue/components/layout/AppHeader.vue';
import AppFooter from './components/layout/AppFooter.vue';
import { useRouter } from 'vue-router';

const { currentRoute } = useRouter();
const displayFooter = () => false !== currentRoute.value.meta.displayFooter;
Notification.requestPermission();
</script>

<template>
    <div class="app-layout">
        <header>
            <app-header></app-header>
        </header>

        <main>
            <router-view></router-view>
        </main>

        <footer v-if="displayFooter()">
            <app-footer></app-footer>
        </footer>
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
