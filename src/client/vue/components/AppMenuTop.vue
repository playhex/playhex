<script setup lang="ts">
import useHexClient from '@client/hexClient';
import { storeToRefs } from 'pinia';

const { loggedInUser } = storeToRefs(useHexClient());
</script>

<template>
    <div class="menu-top">
        <div class="container-fluid">
            <ul class="list-inline">
                <li class="list-inline-item"><router-link to="/">Home</router-link></li>
                <li class="list-inline-item float-end">{{ loggedInUser?.pseudo || 'logging in...' }}</li>
            </ul>
        </div>
    </div>
</template>

<style scoped lang="stylus">
.menu-top
    padding 0.2em 0

    ul
        margin 0
</style>
