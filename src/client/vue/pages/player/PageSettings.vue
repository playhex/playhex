<script lang="ts" setup>
import { BIconBrightnessHighFill, BIconMoonStarsFill, BIconCircleHalf } from 'bootstrap-icons-vue';
import useDarkLightThemeStore from '../../../stores/darkLightThemeStore';
import { storeToRefs } from 'pinia';
import usePlayerSettingsStore from '../../../stores/playerSettingsStore';
import { watch } from 'vue';

const playerSettingsStore = usePlayerSettingsStore();

const { selectedTheme } = storeToRefs(useDarkLightThemeStore());
const { playerSettings } = storeToRefs(playerSettingsStore);

watch(
    playerSettings,
    (settings, oldSettings) => {
        // Do nothing if no settings, or on initial settings load
        if (null === settings || null === oldSettings) {
            return;
        }

        playerSettingsStore.updatePlayerSettings();
    },
    { deep: true },
);
</script>

<template>
    <div class="container">
        <h2>Settings</h2>

        <h3>Theme</h3>

        <div class="btn-group" role="group" aria-label="Dark or light theme switcher">
            <input type="radio" class="btn-check" v-model="selectedTheme" value="light" id="btn-theme-light" autocomplete="off">
            <label class="btn btn-outline-primary" for="btn-theme-light"><b-icon-brightness-high-fill /> Light</label>

            <input type="radio" class="btn-check" v-model="selectedTheme" value="dark" id="btn-theme-dark" autocomplete="off">
            <label class="btn btn-outline-primary" for="btn-theme-dark"><b-icon-moon-stars-fill /> Dark</label>

            <input type="radio" class="btn-check" v-model="selectedTheme" value="auto" id="btn-theme-auto" autocomplete="off">
            <label class="btn btn-outline-primary" for="btn-theme-auto"><b-icon-circle-half /> Auto</label>
        </div>

        <h3>Confirm move before submit</h3>

        <p>
            To prevent misclick, you can confirm your move
            before actually submitting your move.
        </p>

        <template v-if="playerSettings">
            <div class="mb-3 row">
                <label for="confirm-move-blitz" class="col-sm-4 col-md-3 col-form-label">Blitz</label>
                <div class="col-sm-8 col-md-4">
                    <select v-model="playerSettings.confirmMoveBlitz" class="form-select" id="confirm-move-blitz">
                        <option :value="false">Send immediately</option>
                        <option :value="true">Ask confirmation</option>
                    </select>
                </div>
            </div>
            <div class="mb-3 row">
                <label for="confirm-move-normal" class="col-sm-4 col-md-3 col-form-label">Normal</label>
                <div class="col-sm-8 col-md-4">
                    <select v-model="playerSettings.confirmMoveNormal" class="form-select" id="confirm-move-normal">
                        <option :value="false">Send immediately</option>
                        <option :value="true">Ask confirmation</option>
                    </select>
                </div>
            </div>
            <div class="mb-3 row">
                <label for="confirm-move-correspondace" class="col-sm-4 col-md-3 col-form-label">Correspondance</label>
                <div class="col-sm-8 col-md-4">
                    <select v-model="playerSettings.confirmMoveCorrespondance" class="form-select" id="confirm-move-correspondace">
                        <option :value="false">Send immediately</option>
                        <option :value="true">Ask confirmation</option>
                    </select>
                </div>
            </div>
        </template>
    </div>
</template>

<style lang="stylus">
h3
    margin 1em 0 0.5em 0
</style>
