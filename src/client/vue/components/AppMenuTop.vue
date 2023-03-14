<script setup lang="ts">
import useHexClient from '@client/hexClient';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { getOtherTheme, switchTheme, themeSwitcherDispatcher } from '@client/DarkThemeSwitcher';

const { loggedInUser } = storeToRefs(useHexClient());

let otherTheme = ref(getOtherTheme());

themeSwitcherDispatcher.on('themeSwitched', () => {
    otherTheme.value = getOtherTheme();
});
</script>

<template>
    <div class="top-down-menu menu-top">
        <div class="container-fluid">
            <div class="d-flex">
                <router-link to="/">Home</router-link>
                <p class="ms-auto me-2">{{ loggedInUser?.pseudo || 'logging in...' }}</p>
                <a href="#" @click="switchTheme()">{{ otherTheme }}</a>
            </div>
        </div>
    </div>
</template>
