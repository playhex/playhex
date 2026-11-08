<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';

useSeoMeta({
    title: 'Engine use',
});
</script>

<template>
    <h1>Engine use</h1>

    <p>
        This page explains when you are allowed to use an engine during a game on PlayHex,
        and what happens in case of cheating.
    </p>

    <p>
        An engine is any outside help that suggests or evaluates moves:
        an AI, a solver, an analysis tool, another program,
        PlayHex's own tools like <router-link :to="{ name: 'hexplorer' }">Hexplorer</router-link> or game analysis,
        or another person helping you, including a spectator suggesting moves in the chat.
    </p>

    <h2>When can I use an engine?</h2>

    <ul>
        <li>
            <strong>Ranked 1v1 games: never.</strong>
            Ranked games are meant to be played by you alone.
            Using an engine is forbidden, even if both players agree to it.
        </li>
        <li>
            <strong>Friendly 1v1 games: only with mutual agreement.</strong>
            Both players must agree in the game chat, so it can be checked later.
        </li>
        <li>
            <strong>Games against bots: allowed.</strong>
            You can use any tool you want when playing against an AI.
        </li>
    </ul>

    <p>
        These rules are the same for live and correspondence games.
    </p>

    <p>
        In any game, using an engine is allowed once the game has ended
        (win, resignation, timeout, cancellation...).
        You can then freely analyze the game.
    </p>

    <h2>Opening books, game databases and personal notes</h2>

    <p>
        In correspondence games, you can use opening books, game databases and your own notes.
        This is not allowed in live games.
    </p>

    <h2>Consequences of cheating</h2>

    <ul>
        <li>
            The game is cancelled, the players concerned are informed,
            and the cheating account is temporarily blocked.
        </li>
        <li>
            Cheating in a <router-link :to="{ name: 'tournaments' }">tournament</router-link>
            also makes the player forfeit the rest of the tournament.
        </li>
        <li>
            Cheating in <router-link :to="{ name: 'ladder', params: { slug: 'main' } }">King of the Hill</router-link>
            leads to being excluded from the hill.
        </li>
        <li>
            Creating a new account and reoffending leads to an IP ban.
        </li>
    </ul>

    <p>
        See also the <router-link :to="{ name: 'guide-moderation' }">moderation</router-link> page.
    </p>
</template>
