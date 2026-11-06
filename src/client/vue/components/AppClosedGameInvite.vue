<script setup lang="ts">
import { useRouter } from 'vue-router';
import { shareUrl } from '../../services/shareUrl.js';
import { useShareLink } from '../composables/useShareLink.js';
import { IconCheck, IconShareFill } from '../icons.js';
import AppHexQrCode from './AppHexQrCode.vue';

const props = defineProps({
    gameId: {
        type: String,
        required: true,
    },
});

const router = useRouter();

const link = shareUrl(new URL(router.resolve({ name: 'online-game', params: { gameId: props.gameId } }).href, location.origin).href);

const { copiedResult, shareLink } = useShareLink(link);

const selectAll = (event: FocusEvent): void => {
    (event.target as HTMLInputElement).select();
};
</script>

<template>
    <div class="closed-game-invite">
        <div class="card invite-card">
            <div class="card-body invite-content">
                <div class="invite-details">
                    <label for="closedGameLink" class="form-label mb-0">{{ $t('closed_game_invite.link_label') }}</label>

                    <div class="input-group">
                        <input id="closedGameLink" class="form-control" type="text" readonly :value="link" @focus="selectAll">
                        <button type="button" class="btn btn-primary" :aria-label="$t('closed_game_invite.share')" @click="shareLink()">
                            <IconCheck v-if="true === copiedResult" />
                            <IconShareFill v-else />
                            <span class="invite-share-label">{{ ' ' }}{{ true === copiedResult ? $t('copied!') : $t('closed_game_invite.share') }}</span>
                        </button>
                    </div>

                    <small v-if="false === copiedResult" class="text-warning">{{ $t('not_copied') }}</small>
                </div>

                <AppHexQrCode :text="link" class="invite-qr-code" />
            </div>
        </div>
    </div>
</template>

<style scoped>
/*
 * Takes the space left below the text, the board stays visible around the card.
 * Sizes depend on this container and not on the screen, because the sidebar may take a part of it.
 */
.closed-game-invite {
    flex: 1;
    min-height: 0;
    display: flex;
    overflow-y: auto;
    padding: 0.5rem;
    container-type: size;
}

.invite-card {
    margin: 0 auto auto;
    width: 100%;
    max-width: 22rem;
    pointer-events: auto;
}

.invite-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
}

.invite-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
    min-width: 0;
}

.invite-details .form-control {
    min-width: 0;
}

.invite-qr-code {
    flex-shrink: 0;
    width: min(100cqw - 2rem - 2px, 100cqh - 7.75rem, 20rem); /* minus card padding, border, and link */
    height: auto;
}

/* Phones in landscape: side by side, there is not enough height to stack */
@container (max-height: 300px) {
    .invite-card {
        max-width: 36rem;
    }

    .invite-content {
        flex-direction: row;
        padding: 0.5rem;
    }

    .invite-details {
        flex: 1;
    }

    .invite-qr-code {
        width: min(55cqw, 100cqh - 1rem - 2px);
    }
}

/* Not enough width for both the link and the button label */
@container (max-height: 300px) and (max-width: 400px) {
    .invite-share-label {
        display: none;
    }
}
</style>
