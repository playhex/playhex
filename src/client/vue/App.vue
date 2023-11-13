<script setup lang="ts">
import AppMenuTop from '@client/vue/components/AppMenuTop.vue';
import AppFooter from './components/AppFooter.vue';
import { useRouter } from 'vue-router';

const { currentRoute } = useRouter();
const displayFooter = () => false !== currentRoute.value.meta.displayFooter;
</script>

<template>
    <div class="app-layout">
        <header>
            <app-menu-top></app-menu-top>
        </header>

        <main>
            <router-view></router-view>
        </main>

        <footer v-if="displayFooter()">
            <div class="footer-min-space">
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
            background-color rgba(0, 0, 0, 0.2)
            padding 0.75em 0
</style>
