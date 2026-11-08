<script setup lang="ts">
import { ref } from 'vue';
import type Player from '../../../shared/app/models/Player.js';
import { playerPronouns, type PlayerPronouns } from '../../../shared/app/playerPronouns.js';
import { apiUpdatePlayerPronouns } from '../../apiClient.js';
import useAuthStore from '../../stores/authStore.js';

// Forward id, aria-describedby and sizing classes to the select itself.
defineOptions({ inheritAttrs: false });
const props = defineProps<{ player: Player }>();
const saving = ref(false);
const error = ref(false);

const updatePronouns = async (event: Event): Promise<void> => {
    const select = event.target as HTMLSelectElement;
    const player = props.player;
    const pronouns = select.value === '' ? null : select.value as PlayerPronouns;
    saving.value = true;
    error.value = false;
    try {
        await apiUpdatePlayerPronouns(player.publicId, pronouns);
        player.pronouns = pronouns;
        const loggedInPlayer = useAuthStore().loggedInPlayer;
        if (loggedInPlayer?.publicId === player.publicId) {
            loggedInPlayer.pronouns = pronouns;
        }
    } catch {
        error.value = true;
    } finally {
        select.value = props.player.pronouns ?? '';
        saving.value = false;
    }
};
</script>

<template>
    <select
        v-bind="$attrs"
        class="form-select w-auto mw-100"
        :value="player.pronouns ?? ''"
        :disabled="saving"
        :aria-label="$t('pronouns.title')"
        @change="updatePronouns"
    >
        <option value="">{{ $t('pronouns.unspecified') }}</option>
        <option v-for="pronoun in playerPronouns" :key="pronoun" :value="pronoun">
            {{ $t('pronouns.' + pronoun) }}
        </option>
    </select>
    <p v-if="error" class="text-danger" role="alert">{{ $t('pronouns.save_error') }}</p>
</template>
