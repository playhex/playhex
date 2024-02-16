<script lang="ts" setup>
import { BIconBrightnessHighFill, BIconMoonStarsFill, BIconCircleHalf, BIconPcDisplayHorizontal, BIconPhone, BIconLightningChargeFill, BIconAlarmFill, BIconCalendar, BIconAlphabet } from 'bootstrap-icons-vue';
import useDarkLightThemeStore from '../../../stores/darkLightThemeStore';
import { storeToRefs } from 'pinia';
import usePlayerSettingsStore from '../../../stores/playerSettingsStore';
import { watch } from 'vue';
import { useSeoMeta } from '@unhead/vue';

useSeoMeta({
    robots: 'noindex',
    titleTemplate: title => `Settings - ${title}`,
});

const playerSettingsStore = usePlayerSettingsStore();

const { selectedTheme } = storeToRefs(useDarkLightThemeStore());
const { playerSettings } = storeToRefs(playerSettingsStore);

// Auto save when any setting changed
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

/*
 * Board orientation
 */
const landscapeOrientations = [
    { value: 0, label: 'Flat' },
    { value: 10, label: 'Flat 2' },
    { value: 11, label: 'Diamond' },
];
const portraitOrientations = [
    { value: 1, label: 'Flat' },
    { value: 9, label: 'Flat 2' },
    { value: 2, label: 'Diamond' },
];
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
                <label for="confirm-move-blitz" class="col-sm-4 col-md-3 col-form-label"><b-icon-lightning-charge-fill /> Blitz</label>
                <div class="col-sm-8 col-md-4">
                    <select v-model="playerSettings.confirmMoveBlitz" class="form-select" id="confirm-move-blitz">
                        <option :value="false">Send immediately</option>
                        <option :value="true">Ask confirmation</option>
                    </select>
                </div>
            </div>
            <div class="mb-3 row">
                <label for="confirm-move-normal" class="col-sm-4 col-md-3 col-form-label"><b-icon-alarm-fill /> Normal</label>
                <div class="col-sm-8 col-md-4">
                    <select v-model="playerSettings.confirmMoveNormal" class="form-select" id="confirm-move-normal">
                        <option :value="false">Send immediately</option>
                        <option :value="true">Ask confirmation</option>
                    </select>
                </div>
            </div>
            <div class="mb-3 row">
                <label for="confirm-move-correspondace" class="col-sm-4 col-md-3 col-form-label"><b-icon-calendar /> Correspondance</label>
                <div class="col-sm-8 col-md-4">
                    <select v-model="playerSettings.confirmMoveCorrespondance" class="form-select" id="confirm-move-correspondace">
                        <option :value="false">Send immediately</option>
                        <option :value="true">Ask confirmation</option>
                    </select>
                </div>
            </div>
        </template>

        <h3>Board orientation</h3>

        <template v-if="playerSettings">
            <div class="mb-3 row">
                <label class="col-sm-4 col-md-3 col-form-label"><b-icon-pc-display-horizontal /> Landscape</label>
                <div class="col-sm-8 col-md-9">
                    <div class="btn-group" role="group">
                        <template v-for="orientation in landscapeOrientations" :key="i">
                            <input type="radio" class="btn-check" v-model="playerSettings.orientationLandscape" :value="orientation.value" :id="'landscape-radio-' + orientation.value" autocomplete="off">
                            <label class="btn" :for="'landscape-radio-' + orientation.value">
                                <div class="rhombus" :style="`transform: rotate(${orientation.value * 30}deg)`"></div>
                                <br>
                                {{ orientation.label }}
                            </label>
                        </template>
                    </div>
                </div>
            </div>

            <div class="mb-3 row">
                <label class="col-sm-4 col-md-3 col-form-label"><b-icon-phone /> Portrait</label>
                <div class="col-sm-8 col-md-9">
                    <div class="btn-group" role="group">
                        <template v-for="orientation in portraitOrientations" :key="i">
                            <input type="radio" class="btn-check" v-model="playerSettings.orientationPortrait" :value="orientation.value" :id="'portrait-radio-' + orientation.value" autocomplete="off">
                            <label class="btn" :for="'portrait-radio-' + orientation.value">
                                <div class="rhombus" :style="`transform: rotate(${orientation.value * 30}deg)`"></div>
                                <br>
                                {{ orientation.label }}
                            </label>
                        </template>
                    </div>
                </div>
            </div>
        </template>

        <h3>Board</h3>

        <template v-if="playerSettings">
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" v-model="playerSettings.showCoords" role="switch" id="show-coords-checkbox">
                <label class="form-check-label" for="show-coords-checkbox"><b-icon-alphabet /> Show coords by default</label>
            </div>
        </template>
    </div>
</template>

<style lang="stylus" scoped>
h3
    margin 1em 0 0.5em 0

.rhombus::before
    content ''
    display block
    border 0.5em solid
    border-color #dc3545 #0d6efd
    border-radius 0.2em
    width 2.5em
    height 2.5em
    transform skew(30deg)

.rhombus
    display inline-block
    margin 1em
    transform rotate(150deg)
</style>
