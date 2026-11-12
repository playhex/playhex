<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { onClickOutside, onKeyStroke } from '@vueuse/core';
import { createPopper } from '@popperjs/core';
import { format, formatDistanceToNowStrict } from 'date-fns';
import Player from '../../../shared/app/models/Player.js';
import GameOptions from '../../../shared/app/models/GameOptions.js';
import { PlayerOnlineStatus } from '../../../shared/app/Types.js';
import { getPlayer } from '../../apiClient.js';
import useAuthStore from '../../stores/authStore.js';
import { allowRankedBotGames, useCreateGameOverlay } from '../composables/useCreateGameOverlay.js';
import { IconPeople, IconTrophy } from '../icons.js';
import AppOnlineStatus from './AppOnlineStatus.vue';
import AppPlayerAvatar from './AppPlayerAvatar.vue';
import AppPlayerRating from './AppPlayerRating.vue';

const props = defineProps<{
    player: Player;
    trigger: HTMLButtonElement;
    onlineStatus: PlayerOnlineStatus | null;
}>();

const emit = defineEmits<{
    close: [];
}>();

const popover = useTemplateRef<HTMLElement>('popover');
const fetchedPlayer = ref<Player | null>(null);
const player = computed(() => fetchedPlayer.value ?? props.player);
const route = useRoute();
const { loggedInPlayer } = storeToRefs(useAuthStore());
const {
    create1v1RankedAndJoinGame,
    create1v1FriendlyAndJoinGame,
    create1vAIRankedAndJoinGame,
    create1vAIFriendlyAndJoinGame,
} = useCreateGameOverlay();

const challenge = (mode: 'ranked' | 'friendly'): void => {
    const opponent = player.value;
    const gameOptions = new GameOptions();
    gameOptions.opponentPublicId = opponent.publicId;

    emit('close');

    if (opponent.isBot) {
        const createGame = mode === 'ranked' ? create1vAIRankedAndJoinGame : create1vAIFriendlyAndJoinGame;
        void createGame(gameOptions);
    } else if (mode === 'ranked') {
        void create1v1RankedAndJoinGame(gameOptions, opponent);
    } else {
        void create1v1FriendlyAndJoinGame(gameOptions, opponent);
    }
};

onClickOutside(popover, () => emit('close'), { ignore: [props.trigger] });
onKeyStroke('Escape', event => {
    event.preventDefault();
    props.trigger.focus();
    emit('close');
});
watch(() => route.fullPath, () => emit('close'));

watch(popover, (element, _, onCleanup) => {
    if (!element) {
        return;
    }

    const popper = createPopper(props.trigger, element, {
        placement: 'bottom-start',
        strategy: 'fixed',
        modifiers: [
            { name: 'offset', options: { offset: [0, 8] } },
            { name: 'preventOverflow', options: { padding: 8 } },
        ],
    });

    // Refresh the position when the full player data or avatar changes its size.
    const observer = new ResizeObserver(() => { void popper.update(); });
    observer.observe(element);
    onCleanup(() => {
        observer.disconnect();
        popper.destroy();
    });
}, { flush: 'post' });

onMounted(async () => {
    popover.value?.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });

    // Chat messages and rating lists can contain only a partial player.
    if (props.player.createdAt && props.player.avatarPath !== undefined && props.player.currentRating !== undefined) {
        return;
    }

    if (!props.player.publicId || !props.player.slug) {
        return;
    }

    try {
        fetchedPlayer.value = await getPlayer(props.player.publicId);
    } catch {
        // Keep the available information if the player cannot be loaded (e.g. offline).
    }
});
</script>

<template>
    <div
        ref="popover"
        class="player-popover card shadow p-2 text-body"
        :class="{ 'player-popover-donor': player.isDonor }"
        role="dialog"
        :aria-label="player.pseudo"
        @click.stop
    >
        <div class="d-flex align-items-center gap-2">
            <span class="popover-avatar"><AppPlayerAvatar :player="player" thumbnail /></span>
            <div class="popover-identity">
                <div class="d-flex align-items-center">
                    <AppOnlineStatus :player="player" :status="onlineStatus" />
                    <RouterLink
                        v-if="player.slug"
                        :to="{ name: 'player', params: { slug: player.slug } }"
                        class="fw-bold text-body text-decoration-none popover-pseudo"
                        @click="emit('close')"
                    >
                        <span v-if="player.isGuest" class="fst-italic">{{ $t('guest') }}&nbsp;</span><template v-if="player.isDonor"><span class="donor-initial">{{ [...player.pseudo][0] }}</span>{{ [...player.pseudo].slice(1).join('') }}</template><template v-else>{{ player.pseudo }}</template>
                    </RouterLink>
                    <strong v-else class="popover-pseudo">{{ player.pseudo }}</strong>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span v-if="player.countryFlag">{{ player.countryFlag }}</span>
                    <AppPlayerRating :player="player" />
                </div>
                <p v-if="!player.isBot && player.pronouns" class="small text-body-secondary mb-0">
                    {{ $t('pronouns.' + player.pronouns) }}
                </p>
            </div>
        </div>

        <p v-if="!player.isBot && player.createdAt" class="small text-body-secondary mt-2 mb-0" :title="format(player.createdAt, 'PPP')">
            {{ $t('player_popover.on_playhex_since', { duration: formatDistanceToNowStrict(player.createdAt) }) }}
        </p>

        <div v-if="player.publicId !== loggedInPlayer?.publicId" class="d-flex gap-1 mt-2">
            <button v-if="!player.isBot || allowRankedBotGames" type="button" class="btn btn-sm btn-warning" @click="challenge('ranked')">
                <IconTrophy /> {{ $t('challenge_ranked') }}
            </button>
            <button type="button" class="btn btn-sm btn-success" @click="challenge('friendly')">
                <IconPeople /> {{ $t('challenge_friendly') }}
            </button>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.player-popover
    z-index 1100
    width max-content
    max-width calc(100vw - 16px)
    font-size 1rem

// Donor: flat golden background with a static, sharp-edged diagonal glint
.player-popover-donor
    border-color rgba(192, 138, 16, .45)
    background linear-gradient(115deg, transparent 62%, rgba(255, 255, 255, .5) 62%, rgba(255, 255, 255, .5) 68%, transparent 68%), #faefcd

[data-bs-theme=dark] .player-popover-donor
    border-color rgba(217, 180, 74, .35)
    background linear-gradient(115deg, transparent 62%, rgba(255, 230, 160, .06) 62%, rgba(255, 230, 160, .06) 68%, transparent 68%), #332a16

.popover-avatar
    display inline-flex
    flex-shrink 0
    width 5rem
    height 4.33rem

    :deep(img),
    :deep(svg)
        width 100%
        height 100%

.popover-identity
    min-width 0

.popover-pseudo
    overflow-wrap anywhere
</style>
