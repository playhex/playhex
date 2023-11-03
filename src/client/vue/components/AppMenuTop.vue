<script setup lang="ts">
import useHexStore from '@client/stores/hexStore';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { getOtherTheme, switchTheme, themeSwitcherDispatcher } from '@client/DarkThemeSwitcher';

const { loggedInUser } = storeToRefs(useHexStore());

let otherTheme = ref(getOtherTheme());

themeSwitcherDispatcher.on('themeSwitched', () => {
    otherTheme.value = getOtherTheme();
});
</script>

<template>
    <div class="menu-top">
        <div class="container-fluid">
            <div class="d-flex">
                <router-link to="/"><i class="bi-house-fill"></i> Home</router-link>

                <p class="ms-auto me-4">
                    <template v-if="loggedInUser"><i class="bi-person-fill"></i> {{ loggedInUser.pseudo }}</template>
                    <template v-else>logging in…</template>
                </p>

                <i :class="otherTheme === 'light' ? 'bi-moon-stars-fill' : 'bi-brightness-high-fill'"></i>
                <a href="#" @click="switchTheme()" class="ms-1">
                    switch
                </a>
            </div>
        </div>
    </div>
</template>
