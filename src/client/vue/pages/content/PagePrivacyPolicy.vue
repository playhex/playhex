<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';

useSeoMeta({
    titleTemplate : title => `Privacy policy - ${title}`,
});
</script>

<template>
    <h1>Privacy policy</h1>

    <p><strong>Last update: 5 May 2024</strong></p>

    <p>
        PlayHex.org is an online website to play Hex.
        You will find below the PlayHex Privacy Policy
        - the explanation of our practices and our commitments
        with regard to the processing of your personal data.
    </p>

    <h2>Which personal data is collected, how and why</h2>

    <p>
        Data is kept until you ask for account deletion
        to provided contact information in this privacy policy.
    </p>

    <p>
        Here is the list of collected personal data:
    </p>

    <ul>
        <li><strong>Username</strong>: to login and identify you in your games and lobby.</li>
        <li><strong>Account creation date</strong>: displayed on your player page.</li>
        <li><strong>Chat messages</strong>: displayed games and to other players.</li>
        <li><strong>Your games</strong>: actions you make on games: creation, moves.</li>
    </ul>

    <h2>Who is responsible for processing your personal data?</h2>

    <p>
        To get a copy of your personal data or ask for deletion,
        email me at: julien.maulny@protonmail.com
    </p>
</template>
