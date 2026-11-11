<script setup lang="ts">
import { useDisclosure } from '@overlastic/vue';
import { IconCheck, IconHeartFill, IconXLg } from '../../icons.js';

const { visible, confirm } = useDisclosure();
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block" @click="confirm()">
            <div class="modal-dialog modal-dialog-centered" @click="e => e.stopPropagation()">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ $t('matchmaking.title') }}</h5>
                        <button type="button" class="btn-close" :aria-label="$t('close')" @click="confirm()"></button>
                    </div>

                    <div class="modal-body">
                        <p class="mb-3">
                            <IconCheck class="text-success" /> {{ $t('matchmaking.legend_yes') }}
                            <span class="mx-2">·</span>
                            <IconHeartFill class="text-danger" /> {{ $t('matchmaking.legend_heart') }}
                            <span class="mx-2">·</span>
                            <IconXLg class="text-body-secondary opacity-50" /> {{ $t('matchmaking.legend_no') }}
                        </p>

                        <ul class="mb-0 ps-3">
                            <li>{{ $t('matchmaking.info.paint') }}</li>
                            <li>{{ $t('matchmaking.info.boardsize_pick') }}</li>
                            <li>{{ $t('matchmaking.info.stay_online') }}</li>
                            <li>{{ $t('matchmaking.info.rush_hour') }}</li>
                            <li>{{ $t('matchmaking.info.streak') }}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
