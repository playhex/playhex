<script setup lang="ts">
import AppHeader from '@client/vue/components/layout/AppHeader.vue';
import AppFooter from './components/layout/AppFooter.vue';
import { useRouter } from 'vue-router';

const { currentRoute } = useRouter();
const displayFooter = () => false !== currentRoute.value.meta.displayFooter;
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
            <div class="footer-min-space bg-dark-subtle">
                <app-footer></app-footer>
            </div>
        </footer>
    </div>
</template>

<style lang="stylus" scoped>
.app-layout
    display flex
    flex-direction column
    min-height 100vh

    footer
        margin-top auto

        .footer-min-space
            margin-top 4em
            padding 0.75em 0
</style>
