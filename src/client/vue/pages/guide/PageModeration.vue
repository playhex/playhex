<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import AppPlayerModerationActionOverlay from '../../components/AppPlayerModerationActionOverlay.vue';
import { ref } from 'vue';
import PlayerModerationAction from '../../../../shared/app/models/PlayerModerationAction.js';
import Player from '../../../../shared/app/models/Player.js';
import ChatMessage from '../../../../shared/app/models/ChatMessage.js';
import { t } from 'i18next';

useSeoMeta({
    title: t('moderation'),
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
        PlayHex moderation team checks new chat messages and nicknames,
        and can take actions in case content is not appropriate.
    </p>

    <h2>Policy</h2>

    <p>
        All chat messages and nicknames are public, everyone can see them, even children.
        So just do not post content that is inappropriate.
    </p>

    <p>
        It is obvious for 99% of players, but for the 1% who need more explanation, do not post:
    </p>

    <ul>
        <li>insults</li>
        <li>hate speech</li>
        <li>harassment in any form</li>
        <li>racism, discrimination</li>
        <li>sexism</li>
        <li>sexual content</li>
        <li>spam</li>
    </ul>

    <p>
        Moderation will tolerate things, like if you are obviously friends and insult each other,
        or insulting bots, or just testing the moderation reactivity.
        But when in doubt, you may receive a warning.
    </p>

    <p>
        You will always receive a warning first, unless you post truly inappropriate content.
        If you repeat behavior you have already been warned about,
        you won't be able to post new chat messages for a variable period.
    </p>

    <p>
        If you create a new account and reoffend, you'll be IP-banned.
    </p>

    <h2>Moderation action</h2>

    <p>A moderation action can be one of the following:</p>

    <ul>
        <li>
            <strong>Warning</strong>: a reminder that certain behavior is not acceptable.
            No restriction is applied, but repeated violations may lead to stronger measures.
            <button class="btn btn-sm btn-outline-primary" @click.prevent="currentExample = warningExample">See&nbsp;example</button>.
        </li>
        <li>
            <strong>Chat restriction</strong>: the player cannot send chat messages until a specified date.
            They can still play games normally.
            <button class="btn btn-sm btn-outline-primary" @click.prevent="currentExample = restrictionExample">See&nbsp;example</button>.
        </li>
        <li>
            <strong>Nickname moderation</strong>: if inappropriate, will be changed to "moderated XXX".
            At this time, it's not yet possible to change your nickname, so you'll be stuck with "moderated XXX"
            until I develop the ability to change your nickname.
        </li>
        <li>
            <strong>Avatar moderation</strong>: if inappropriate, will be deleted.
            Avatar deletion may also be followed by being unable to set a new avatar for a period.
        </li>
        <li>
            <strong>IP ban</strong>, until a specified date.
            Don't burn your IPs: attempting to evade an IP ban
            (for example through VPNs or alternate IPs) may result in longer or permanent bans.
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

    <p>
        Messages that are fully deleted by moderation are replaced with
        <em>Message deleted by moderation</em>.
    </p>

    <h2>Shadow deletion</h2>

    <p>
        Some messages may be <em>shadow-deleted</em> by a moderator.
        A shadow-deleted message is hidden from everyone except its author,
        who still sees it as if it were normal.
        This allows moderators to remove inappropriate content discreetly.
    </p>

    <AppPlayerModerationActionOverlay
        v-if="currentExample"
        :action="currentExample"
        @acknowledge="currentExample = null"
    />
</template>
