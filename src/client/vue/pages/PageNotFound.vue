<template>
    <div class="text-center">
        <h1 class="mt-4">Not found</h1>

        <p class="lead mt-4">
            <a href="#" @click="$router.back()"><i class="bi-sign-turn-left"></i> Go back</a>
        </p>

        <p class="lead mt-4">
            <router-link :to="{ name: 'home' }">Go to home</router-link>
        </p>
    </div>
</template>
