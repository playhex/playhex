<script setup lang="ts">
import { ref, toRefs, watch } from 'vue';
import { apiGetChannelMessagesCount } from '../../apiClient.js';
import { IconChatRight, IconChatRightText } from '../icons.js';

const props = defineProps({
    channel: {
        type: String,
        required: true,
    },
});

const { channel } = toRefs(props);
const messagesCount = ref<null | number>(null);

watch(channel, async () => {
    messagesCount.value = await apiGetChannelMessagesCount(channel.value);
}, { immediate: true });
</script>

<template>
    <span>
        <IconChatRightText v-if="(messagesCount ?? 0) > 0" />
        <IconChatRight v-else />
        {{ messagesCount === null ? '…' : messagesCount }}
    </span>
</template>
