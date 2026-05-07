<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import AppPlayerModerationActionOverlay from '../../components/AppPlayerModerationActionOverlay.vue';
import { ref } from 'vue';
import PlayerModerationAction from '../../../../shared/app/models/PlayerModerationAction.js';
import Player from '../../../../shared/app/models/Player.js';
import ChatMessage from '../../../../shared/app/models/ChatMessage.js';

useSeoMeta({
    title: 'Moderation',
});

const examplePlayer = Object.assign(new Player(), {
    pseudo: 'NewPlayer',
    publicId: 'aaaaaaaa-0000-0000-0000-000000000001',
    isGuest: false,
    isBot: false,
    slug: 'yourname',
    createdAt: new Date('2024-03-05T10:00:00.000Z'),
});

const exampleMessage0 = Object.assign(new ChatMessage(), {
    publicId: 'bbbbbbbb-0000-0000-0000-000000000001',
    content: "you're a total noob",
    createdAt: new Date(new Date().getTime() - 60000 * 15),
    player: examplePlayer,
    hostedGame: { publicId: '00000000-0000-0000-0000-000000000042' },
    shadowDeleted: false,
    deletedByModeration: true,
});

const exampleMessage1 = Object.assign(new ChatMessage(), {
    publicId: 'bbbbbbbb-0000-0000-0000-000000000002',
    content: 'go play with bots you noob',
    createdAt: new Date(new Date().getTime() - 60000 * 16),
    player: examplePlayer,
    hostedGame: { publicId: '00000000-0000-0000-0000-000000000042' },
    shadowDeleted: false,
    deletedByModeration: true,
});

const warningExample = Object.assign(new PlayerModerationAction(), {
    publicId: 'cccccccc-0000-0000-0000-000000000001',
    player: examplePlayer,
    reason: 'moderation_reason.chat_insults',
    reasonDetails: 'You called your opponent inappropriate names.',
    chatBlockedUntil: null,
    acknowledgedAt: null,
    createdAt: new Date(),
    relatedChatMessages: [exampleMessage0, exampleMessage1],
});

const restrictionExample = Object.assign(new PlayerModerationAction(), {
    publicId: 'cccccccc-0000-0000-0000-000000000001',
    player: examplePlayer,
    reason: 'moderation_reason.chat_insults',
    reasonDetails: 'You called your opponent inappropriate names.',
    chatBlockedUntil: new Date(new Date().getTime() + 86400000 * 14),
    acknowledgedAt: null,
    createdAt: new Date(),
    relatedChatMessages: [exampleMessage0, exampleMessage1],
});

const currentExample = ref<null | PlayerModerationAction>(null);
</script>

<template>
    <h1>Moderation</h1>

    <p>
        PlayHex moderators may take action against players who engage in inappropriate behavior,
        such as insults, harassment, or spam in the chat.
    </p>

    <p>
        Moderators regularly check posted messages in all games to take such measures.
    </p>

    <h2>Moderation actions</h2>

    <p>A moderation action can be one of the following:</p>

    <ul>
        <li>
            <strong>Warning</strong>: a reminder that certain behavior is not acceptable.
            No restriction is applied, but repeated violations may lead to stronger measures.
            <a href="#" @click.prevent="currentExample = warningExample">See&nbsp;example</a>.
        </li>
        <li>
            <strong>Chat restriction</strong>: the player cannot send chat messages until a specified date.
            They can still play games normally.
            <a href="#" @click.prevent="currentExample = restrictionExample">See&nbsp;example</a>.
        </li>
    </ul>

    <h2>Being notified of a moderation action</h2>

    <p>
        If you receive a moderation action, a full-screen notice will appear the next time you visit the site.
        It shows the reason, any additional details the moderator provided, and any chat messages
        that were considered inappropriate.
        You must acknowledge it before continuing to use the site.
    </p>

    <p>
        If one of your opponents has received a moderation action, you will see a notice
        in the notifications panel (the mailbox icon in the header).
    </p>

    <h2>Chat restriction notice in games</h2>

    <p>
        When a player in a game is chat-restricted, a notice is shown in the chat area to
        all participants, so everyone knows why that player is not responding in chat.
    </p>

    <h2>Shadow deletion</h2>

    <p>
        Some messages may be <em>shadow-deleted</em> by a moderator.
        A shadow-deleted message is hidden from everyone except its author,
        who still sees it as if it were normal.
        This allows moderators to remove inappropriate content discreetly.
    </p>

    <p>
        Messages that are fully deleted by moderation are replaced with
        <em>Message deleted by moderation</em> for all players, including the author.
    </p>

    <AppPlayerModerationActionOverlay
        v-if="currentExample"
        :action="currentExample"
        @acknowledge="currentExample = null"
    />
</template>
