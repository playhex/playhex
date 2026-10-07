<script setup lang="ts">
import { PropType, computed, onUnmounted, ref, toRefs, watch } from 'vue';
import { ExternalGameImportJob, Player } from '../../../../shared/app/models/index.js';
import { littleGolemPlayerUrl } from '../../../../shared/app/little-golem/littleGolemUtils.js';
import { apiGetMyLastImport, apiImportLittleGolem, apiLinkLittleGolem, apiUnlinkLittleGolem } from '../../../apiClient.js';
import { apiErrorMessage } from '../../../services/apiErrorMessage.js';
import { IconCaretDownFill, IconCaretRight } from '../../icons.js';

/*
 * On my profile: link my Little Golem account, and import my Little Golem games.
 */

const props = defineProps({
    /**
     * Must be me.
     */
    player: {
        type: Object as PropType<Player>,
        required: true,
    },
});

const { player } = toRefs(props);

const emits = defineEmits<{
    /**
     * New games imported
     */
    updated: [];

    /**
     * Account linked, or unlinked (null), parent must update player.
     */
    accountChanged: [littleGolemPlid: null | number, littleGolemPseudo: null | string];
}>();

/**
 * Collapsed by default, few players have a Little Golem account.
 */
const expanded = ref(false);

const pseudoInput = ref('');
const error = ref<null | string>(null);
const loading = ref(false);

const linkAccount = async () => {
    error.value = null;
    loading.value = true;

    try {
        const { littleGolemPlid, littleGolemPseudo } = await apiLinkLittleGolem(pseudoInput.value);

        pseudoInput.value = '';
        emits('accountChanged', littleGolemPlid, littleGolemPseudo);
    } catch (e) {
        error.value = apiErrorMessage(e);
    } finally {
        loading.value = false;
    }
};

const unlinkAccount = async () => {
    error.value = null;

    try {
        await apiUnlinkLittleGolem();

        emits('accountChanged', null, null);
    } catch (e) {
        error.value = apiErrorMessage(e);
    }
};

/*
 * Import, and show progress
 */
const POLL_INTERVAL = 3000;

const importJob = ref<null | ExternalGameImportJob>(null);

const isImporting = computed(() => importJob.value !== null
    && (importJob.value.status === 'pending' || importJob.value.status === 'running'),
);

let pollTimeout: null | ReturnType<typeof setTimeout> = null;
let unmounted = false;

/**
 * Imported games count of last known job, to emit "updated" only when it changes.
 * Null until first job fetched.
 */
let lastImportedGames: null | number = null;

const stopPolling = (): void => {
    if (pollTimeout !== null) {
        clearTimeout(pollTimeout);
        pollTimeout = null;
    }
};

/**
 * Only place that schedules polling, so there is never more than one pending poll.
 */
const schedulePolling = (): void => {
    stopPolling();

    if (!unmounted && isImporting.value) {
        pollTimeout = setTimeout(() => void refreshImportJob(), POLL_INTERVAL);
    }
};

const refreshImportJob = async (): Promise<void> => {
    stopPolling();

    try {
        const job = await apiGetMyLastImport();

        if (unmounted) {
            return;
        }

        importJob.value = job;
    } catch (e) {
        if (!unmounted) {
            error.value = apiErrorMessage(e);
        }

        return;
    }

    const importedGames = importJob.value?.importedGames ?? 0;

    if (lastImportedGames !== null && importedGames !== lastImportedGames) {
        emits('updated');
    }

    lastImportedGames = importedGames;

    if (isImporting.value) {
        expanded.value = true;
    }

    schedulePolling();
};

const startImport = async () => {
    error.value = null;

    try {
        const job = await apiImportLittleGolem();

        if (unmounted) {
            return;
        }

        importJob.value = job;
        lastImportedGames = job.importedGames;
        schedulePolling();
    } catch (e) {
        error.value = apiErrorMessage(e);
    }
};

watch(() => player.value.littleGolemPlid, plid => {
    if (plid) {
        void refreshImportJob();
    }
}, { immediate: true });

onUnmounted(() => {
    unmounted = true;
    stopPolling();
});
</script>

<template>
    <div>
        <button
            type="button"
            class="btn-account d-flex align-items-center w-100 border-0 bg-transparent p-0 text-start"
            :aria-expanded="expanded"
            @click="expanded = !expanded"
        >
            <img src="/images/external/little-golem.png" alt="" class="site-logo me-2">
            <span class="fw-semibold">{{ $t('external_games.little_golem.title') }}</span>
            <small class="text-body-secondary ms-2">
                <template v-if="player.littleGolemPlid">{{ player.littleGolemPseudo ?? player.littleGolemPlid }}</template>
                <template v-else>{{ $t('external_games.little_golem.not_linked') }}</template>
            </small>
            <component :is="expanded ? IconCaretDownFill : IconCaretRight" class="ms-auto text-body-secondary" />
        </button>

        <div v-if="expanded" class="pt-3">
            <!-- Not linked -->
            <form v-if="!player.littleGolemPlid" class="row g-2 align-items-center" @submit.prevent="linkAccount()">
                <div class="col-12">
                    <p class="mb-1"><small>{{ $t('external_games.little_golem.link_description') }}</small></p>
                </div>
                <div class="col">
                    <label for="little-golem-pseudo" class="visually-hidden">{{ $t('external_games.little_golem.pseudo') }}</label>
                    <input
                        v-model="pseudoInput"
                        id="little-golem-pseudo"
                        type="text"
                        class="form-control form-control-sm"
                        maxlength="255"
                        required
                        :placeholder="$t('external_games.little_golem.pseudo')"
                    >
                </div>
                <div class="col-auto">
                    <button type="submit" class="btn btn-sm btn-primary" :disabled="loading || pseudoInput.trim() === ''">{{ $t('external_games.little_golem.link') }}</button>
                </div>
            </form>

            <!-- Linked -->
            <template v-else>
                <p class="mb-2">
                    <small>
                        {{ $t('external_games.little_golem.linked_to') }}
                        <a :href="littleGolemPlayerUrl(player.littleGolemPlid)" target="_blank" rel="noopener">{{ player.littleGolemPseudo ?? player.littleGolemPlid }}</a>
                    </small>
                    <button type="button" class="btn btn-sm btn-link text-secondary" @click="unlinkAccount()">{{ $t('external_games.little_golem.unlink') }}</button>
                </p>

                <button v-if="!isImporting" type="button" class="btn btn-sm btn-outline-primary" @click="startImport()">{{ $t('external_games.little_golem.import') }}</button>

                <p v-if="importJob" class="mt-2 mb-0">
                    <small>
                        <template v-if="importJob.status === 'pending'">{{ $t('external_games.import.pending') }}</template>
                        <template v-else-if="importJob.status === 'running' && null === importJob.totalGames">{{ $t('external_games.import.listing') }}</template>
                        <template v-else-if="importJob.status === 'failed'"><span class="text-danger">{{ $t('external_games.import.failed') }}</span> <code v-if="importJob.lastError">{{ importJob.lastError }}</code></template>
                        <template v-else>
                            <span v-if="importJob.status === 'done'" class="text-success">{{ $t('external_games.import.done') }}</span>
                            <span v-else>{{ $t('external_games.import.running') }}</span>
                            {{ ' ' }}
                            {{ $t('external_games.import.progress', {
                                imported: importJob.importedGames,
                                skipped: importJob.skippedGames,
                                failed: importJob.failedGames,
                                notFinished: importJob.notFinishedGames,
                                total: importJob.totalGames,
                            }) }}
                        </template>
                    </small>
                </p>

                <div v-if="isImporting && importJob && importJob.totalGames" class="progress mt-2" role="progressbar" :aria-valuenow="importJob.importedGames + importJob.skippedGames + importJob.failedGames + importJob.notFinishedGames" aria-valuemin="0" :aria-valuemax="importJob.totalGames">
                    <div class="progress-bar" :style="{ width: (100 * (importJob.importedGames + importJob.skippedGames + importJob.failedGames + importJob.notFinishedGames) / importJob.totalGames) + '%' }"></div>
                </div>
            </template>

            <p v-if="error" class="text-danger mt-2 mb-0"><small>{{ error }}</small></p>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.site-logo
    width 1.25em
    height 1.25em
</style>
