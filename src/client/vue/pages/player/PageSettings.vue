<script lang="ts" setup>
import { BIconBrightnessHighFill, BIconMoonStarsFill, BIconCircleHalf, BIconPcDisplayHorizontal, BIconPhone, BIconLightningChargeFill, BIconAlarmFill, BIconCalendar, BIconAlphabet } from 'bootstrap-icons-vue';
import useDarkLightThemeStore from '../../../stores/darkLightThemeStore';
import { storeToRefs } from 'pinia';
import usePlayerSettingsStore from '../../../stores/playerSettingsStore';
import useAuthStore from '../../../stores/authStore';
import { ApiClientError } from '../../../apiClient';
import { watch, Ref, ref } from 'vue';
import { useSeoMeta } from '@unhead/vue';
import { InputValidation, toInputClass } from '../../../vue/formUtils';
import { authChangePassword } from '@client/apiClient';

useSeoMeta({
    robots: 'noindex',
    titleTemplate: title => `Settings - ${title}`,
});

const playerSettingsStore = usePlayerSettingsStore();

const { loggedInPlayer } = storeToRefs(useAuthStore());
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

const oldPassword = ref('');
const newPassword = ref('');
const newPasswordConfirmed = ref('');
const oldPasswordValidation: Ref<InputValidation> = ref(null);
const confirmPasswordValidation: Ref<InputValidation> = ref(null);
const changePasswordError: Ref<null | string> = ref(null);
const changePasswordSuccess: Ref<null | string> = ref(null);

const submitPasswordChange = async () => {
    oldPasswordValidation.value = null;
    confirmPasswordValidation.value = null;
    changePasswordError.value = null;
    changePasswordSuccess.value = null;

    if (newPasswordConfirmed.value !== newPassword.value) {
        confirmPasswordValidation.value = {
            ok: false,
            reason: 'Passwords do not match',
        };
        return;
    }

    try {
        await authChangePassword(oldPassword.value, newPassword.value);
        changePasswordSuccess.value = 'The password has been changed.';
        oldPassword.value = '';
        newPassword.value = '';
        newPasswordConfirmed.value = '';
    } catch (e) {
        if (!(e instanceof ApiClientError)) {
            throw e;
        }

        switch (e.type) {
            case 'invalid_password':
                oldPasswordValidation.value = { ok: false, reason: e.reason };
                break;

            default:
                changePasswordError.value = e.reason;
        }
    }
};
</script>

<template>
    <div class="container my-3">
        <h2>Settings</h2>

        <h3>Theme</h3>

        <div class="btn-group" role="group" aria-label="Dark or light theme switcher">
            <input type="radio" class="btn-check" v-model="selectedTheme" value="light" id="btn-theme-light" autocomplete="off">
            <label class="btn btn-outline-primary" for="btn-theme-light"><BIconBrightnessHighFill /> Light</label>

            <input type="radio" class="btn-check" v-model="selectedTheme" value="dark" id="btn-theme-dark" autocomplete="off">
            <label class="btn btn-outline-primary" for="btn-theme-dark"><BIconMoonStarsFill /> Dark</label>

            <input type="radio" class="btn-check" v-model="selectedTheme" value="auto" id="btn-theme-auto" autocomplete="off">
            <label class="btn btn-outline-primary" for="btn-theme-auto"><BIconCircleHalf /> Auto</label>
        </div>

        <h3>Confirm move</h3>

        <p>
            To prevent misclicks, you can require confirmation
            before submitting a move.
        </p>

        <template v-if="playerSettings">
            <div class="mb-3 row">
                <label for="confirm-move-blitz" class="col-sm-4 col-md-3 col-form-label"><BIconLightningChargeFill /> Blitz</label>
                <div class="col-sm-8 col-md-4">
                    <select v-model="playerSettings.confirmMoveBlitz" class="form-select" id="confirm-move-blitz">
                        <option :value="false">Send immediately</option>
                        <option :value="true">Ask confirmation</option>
                    </select>
                </div>
            </div>
            <div class="mb-3 row">
                <label for="confirm-move-normal" class="col-sm-4 col-md-3 col-form-label"><BIconAlarmFill /> Normal</label>
                <div class="col-sm-8 col-md-4">
                    <select v-model="playerSettings.confirmMoveNormal" class="form-select" id="confirm-move-normal">
                        <option :value="false">Send immediately</option>
                        <option :value="true">Ask confirmation</option>
                    </select>
                </div>
            </div>
            <div class="mb-3 row">
                <label for="confirm-move-correspondace" class="col-sm-4 col-md-3 col-form-label"><BIconCalendar /> Correspondence</label>
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
                <label class="col-sm-4 col-md-3 col-form-label"><BIconPcDisplayHorizontal /> Landscape</label>
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
                <label class="col-sm-4 col-md-3 col-form-label"><BIconPhone /> Portrait</label>
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
                <label class="form-check-label" for="show-coords-checkbox"><BIconAlphabet /> Show coordinates by default</label>
            </div>
        </template>

        <form v-if="loggedInPlayer && !loggedInPlayer.isGuest" @submit.prevent="submitPasswordChange">
            <h3>Change password</h3>
            <div class="mb-3 row">
                <label class="col-sm-4 col-md-3 col-form-label" for="change-password-old">Old password</label>
                <div class="col-sm-8 col-md-4">
                    <input v-model="oldPassword" required type="password" class="form-control" :class="toInputClass(oldPasswordValidation)" id="change-password-old">
                    <div class="invalid-feedback">
                        {{ oldPasswordValidation?.reason }}
                    </div>
                </div>
            </div>
            <div class="mb-3 row">
                <label class="col-sm-4 col-md-3 col-form-label" for="change-password-new">New password</label>
                <div class="col-sm-8 col-md-4">
                    <input v-model="newPassword" required type="password" class="form-control" id="change-password-new">
                </div>
            </div>
            <div class="mb-3 row">
                <label class="col-sm-4 col-md-3 col-form-label" for="change-password-new-confirm">Confirm new password</label>
                <div class="col-sm-8 col-md-4">
                    <input v-model="newPasswordConfirmed" required type="password" class="form-control" :class="toInputClass(confirmPasswordValidation)" id="change-password-new-confirm">
                    <div class="invalid-feedback">
                        {{ confirmPasswordValidation?.reason }}
                    </div>
                </div>
            </div>
            <p v-if="changePasswordError" class="text-danger">{{ changePasswordError }}</p>
            <p v-if="changePasswordSuccess" class="text-success">{{ changePasswordSuccess }}</p>
            <button type="submit" class="btn btn-outline-primary">Update password</button>
        </form>
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
