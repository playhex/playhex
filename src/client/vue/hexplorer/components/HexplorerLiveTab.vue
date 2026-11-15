<script setup lang="ts">
/*
 * Host side of a live session: stream analysis, share link, invite editors. Chat is below, see PageHexplorer.
 */
import { computed, inject, ref } from 'vue';
import { hexplorerLiveHostKey, useLoadingAction } from '../composables/useHexplorerLive.js';
import HexplorerLiveLink from './HexplorerLiveLink.vue';
import HexplorerLiveElsewhere from './HexplorerLiveElsewhere.vue';
import AppOpponentPlayerSelect from '../../components/overlay/create-game/AppOpponentPlayerSelect.vue';
import AppPseudo from '../../components/AppPseudo.vue';
import type { Player } from '../../../../shared/app/models/index.js';
import { IconBroadcast, IconPeople, IconPersonPlus, IconX } from '../../icons.js';

const { active, session, streaming, match, liveElsewhere, startStream, stopStream, inviteEditor, removeEditor } = inject(hexplorerLiveHostKey)!;
const { loading, run } = useLoadingAction();

/*
 * Editors
 */
const editors = computed(() => session.value?.editors ?? []);
const invitedPlayer = ref<null | Player>(null);

const invite = () => run(async () => {
    if (invitedPlayer.value === null) {
        return;
    }

    if (await inviteEditor(invitedPlayer.value.publicId)) {
        invitedPlayer.value = null;
    }
});

/**
 * Link must be shared to viewers, or to opponent to join.
 */
const showLink = computed(() => active.value && !liveElsewhere.value && (streaming.value || match.value?.state === 'waiting'));
</script>

<template>
    <div class="d-flex flex-column gap-3">
        <section>
            <h2 class="h6 d-flex align-items-center gap-2">
                <IconBroadcast />
                {{ $t('hexplorer_live.stream') }}
                <span v-if="streaming" class="badge text-bg-danger">{{ $t('hexplorer_live.live') }}</span>
            </h2>
            <p class="small text-body-secondary mb-2">{{ $t('hexplorer_live.stream_description') }}</p>

            <HexplorerLiveElsewhere v-if="liveElsewhere" />
            <template v-else>
                <button
                    v-if="!streaming"
                    type="button"
                    class="btn btn-danger btn-sm"
                    :disabled="loading"
                    @click="run(startStream)"
                ><IconBroadcast /> {{ $t('hexplorer_live.start_stream') }}</button>
                <button
                    v-else
                    type="button"
                    class="btn btn-outline-secondary btn-sm"
                    :disabled="loading"
                    @click="run(stopStream)"
                >{{ $t('hexplorer_live.stop_stream') }}</button>
            </template>
        </section>

        <HexplorerLiveLink v-if="showLink" />

        <section v-if="streaming && !liveElsewhere">
            <h2 class="h6 d-flex align-items-center gap-2">
                <IconPeople />
                {{ $t('hexplorer_live.editors') }}
            </h2>
            <p class="small text-body-secondary mb-2">{{ $t('hexplorer_live.editors_description') }}</p>

            <ul v-if="editors.length > 0" class="list-unstyled mb-2">
                <li v-for="editor in editors" :key="editor.publicId" class="d-flex align-items-center gap-2">
                    <AppPseudo :player="editor" />
                    <button
                        type="button"
                        class="btn btn-link btn-sm text-danger p-0"
                        :title="$t('hexplorer_live.remove_editor')"
                        :aria-label="$t('hexplorer_live.remove_editor')"
                        :disabled="loading"
                        @click="run(() => removeEditor(editor.publicId))"
                    ><IconX /></button>
                </li>
            </ul>

            <form class="d-flex flex-column gap-2" @submit.prevent="invite()">
                <AppOpponentPlayerSelect v-model="invitedPlayer" :placeholder="$t('hexplorer_live.invite_editor_placeholder')" />
                <div>
                    <button type="submit" class="btn btn-outline-primary btn-sm" :disabled="loading || invitedPlayer === null">
                        <IconPersonPlus /> {{ $t('hexplorer_live.invite_editor') }}
                    </button>
                </div>
            </form>
        </section>
    </div>
</template>
