<script setup lang="ts">
import { PropType } from 'vue';
import { Player } from '../../../../shared/app/models/index.js';
import AppLittleGolemAccount from './AppLittleGolemAccount.vue';
import { IconBoxArrowUpRight } from '../../icons.js';
import { littleGolemPlayerUrl } from '../../../../shared/app/little-golem/littleGolemUtils.js';

/*
 * Accounts of a player on other platforms.
 * On my profile, can link them to import games played there.
 */

defineProps({
    player: {
        type: Object as PropType<Player>,
        required: true,
    },

    /**
     * True on my profile: can link/unlink accounts and import games.
     * Else only show linked accounts.
     */
    editable: {
        type: Boolean,
        default: false,
    },
});

const emits = defineEmits<{
    /**
     * New games imported
     */
    updated: [];

    /**
     * Little Golem account linked, or unlinked (null), parent must update player.
     */
    littleGolemAccountChanged: [littleGolemPlid: null | number, littleGolemPseudo: null | string];
}>();
</script>

<template>
    <div class="card">
        <div class="card-body pb-2">
            <h5 class="card-title mb-1">{{ $t('external_games.accounts.title') }}</h5>
            <p v-if="editable" class="card-text text-body-secondary mb-0"><small>{{ $t('external_games.accounts.description') }}</small></p>
        </div>
        <ul class="list-group list-group-flush">
            <li v-if="editable" class="list-group-item py-3">
                <AppLittleGolemAccount
                    :player
                    @updated="emits('updated')"
                    @accountChanged="(plid, pseudo) => emits('littleGolemAccountChanged', plid, pseudo)"
                />
            </li>
            <li v-else-if="player.littleGolemPlid" class="list-group-item py-3 d-flex align-items-center">
                <img src="/images/external/little-golem.png" alt="" class="site-logo me-2">
                <span class="fw-semibold">{{ $t('external_games.little_golem.title') }}</span>
                <a
                    :href="littleGolemPlayerUrl(player.littleGolemPlid)"
                    target="_blank"
                    rel="noopener"
                    class="ms-2"
                >{{ player.littleGolemPseudo ?? player.littleGolemPlid }} <IconBoxArrowUpRight /></a>
            </li>
        </ul>
    </div>
</template>

<style lang="stylus" scoped>
.site-logo
    width 1.25em
    height 1.25em
</style>
