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
import { availableLocales, setLocale } from '../../../../shared/app/i18n';
import i18next from 'i18next';

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
    { value: 0, labelTransKey: 'board_orientation.flat' },
    { value: 10, labelTransKey: 'board_orientation.flat_2' },
    { value: 11, labelTransKey: 'board_orientation.diamond' },
];
const portraitOrientations = [
    { value: 1, labelTransKey: 'board_orientation.flat' },
    { value: 9, labelTransKey: 'board_orientation.flat_2' },
    { value: 2, labelTransKey: 'board_orientation.diamond' },
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
        <h2>{{ $t('player_settings.title') }}</h2>

        <h3>{{ $t('language') }}</h3>

        <div class="row">
            <div class="col-sm-8 col-md-4">
                <select class="form-select">
                    <option
                        v-for="(label, locale) in availableLocales"
                        :key="locale"
                        @click="() => setLocale(locale)"
                        :selected="locale === i18next.language"
                    >{{ label }}</option>
                </select>
            </div>
        </div>

        <h3>{{ $t('background_theme.title') }}</h3>

        <div class="btn-group" role="group" aria-label="Dark or light theme switcher">
            <input type="radio" class="btn-check" v-model="selectedTheme" value="light" id="btn-theme-light" autocomplete="off">
            <label class="btn btn-outline-primary" for="btn-theme-light"><BIconBrightnessHighFill /> {{ $t('background_theme.light') }}</label>

            <input type="radio" class="btn-check" v-model="selectedTheme" value="dark" id="btn-theme-dark" autocomplete="off">
            <label class="btn btn-outline-primary" for="btn-theme-dark"><BIconMoonStarsFill /> {{ $t('background_theme.dark') }}</label>

            <input type="radio" class="btn-check" v-model="selectedTheme" value="auto" id="btn-theme-auto" autocomplete="off">
            <label class="btn btn-outline-primary" for="btn-theme-auto"><BIconCircleHalf /> {{ $t('background_theme.auto') }}</label>
        </div>

        <h3>{{ $t('confirm_move.title') }}</h3>

        <p>{{ $t('confirm_move.description') }}</p>

        <template v-if="playerSettings">
            <div class="mb-3 row">
                <label for="confirm-move-blitz" class="col-sm-4 col-md-3 col-form-label"><BIconLightningChargeFill /> {{ $t('game_candency.blitz') }}</label>
                <div class="col-sm-8 col-md-4">
                    <select v-model="playerSettings.confirmMoveBlitz" class="form-select" id="confirm-move-blitz">
                        <option :value="false">{{ $t('confirm_move.send_immediately') }}</option>
                        <option :value="true">{{ $t('confirm_move.ask_confirmation') }}</option>
                    </select>
                </div>
            </div>
            <div class="mb-3 row">
                <label for="confirm-move-normal" class="col-sm-4 col-md-3 col-form-label"><BIconAlarmFill /> {{ $t('game_candency.normal') }}</label>
                <div class="col-sm-8 col-md-4">
                    <select v-model="playerSettings.confirmMoveNormal" class="form-select" id="confirm-move-normal">
                        <option :value="false">{{ $t('confirm_move.send_immediately') }}</option>
                        <option :value="true">{{ $t('confirm_move.ask_confirmation') }}</option>
                    </select>
                </div>
            </div>
            <div class="mb-3 row">
                <label for="confirm-move-correspondace" class="col-sm-4 col-md-3 col-form-label"><BIconCalendar /> {{ $t('game_candency.correspondence') }}</label>
                <div class="col-sm-8 col-md-4">
                    <select v-model="playerSettings.confirmMoveCorrespondance" class="form-select" id="confirm-move-correspondace">
                        <option :value="false">{{ $t('confirm_move.send_immediately') }}</option>
                        <option :value="true">{{ $t('confirm_move.ask_confirmation') }}</option>
                    </select>
                </div>
            </div>
        </template>

        <h3>{{ $t('board_orientation.title') }}</h3>

        <template v-if="playerSettings">
            <div class="mb-3 row">
                <label class="col-sm-4 col-md-3 col-form-label"><BIconPcDisplayHorizontal /> {{ $t('landscape') }}</label>
                <div class="col-sm-8 col-md-9">
                    <div class="btn-group" role="group">
                        <template v-for="orientation in landscapeOrientations" :key="orientation.value">
                            <input type="radio" class="btn-check" v-model="playerSettings.orientationLandscape" :value="orientation.value" :id="'landscape-radio-' + orientation.value" autocomplete="off">
                            <label class="btn" :for="'landscape-radio-' + orientation.value">
                                <div class="rhombus" :style="`transform: rotate(${orientation.value * 30}deg)`"></div>
                                <br>
                                {{ $t(orientation.labelTransKey) }}
                            </label>
                        </template>
                    </div>
                </div>
            </div>

            <div class="mb-3 row">
                <label class="col-sm-4 col-md-3 col-form-label"><BIconPhone /> {{ $t('portrait') }}</label>
                <div class="col-sm-8 col-md-9">
                    <div class="btn-group" role="group">
                        <template v-for="orientation in portraitOrientations" :key="orientation.value">
                            <input type="radio" class="btn-check" v-model="playerSettings.orientationPortrait" :value="orientation.value" :id="'portrait-radio-' + orientation.value" autocomplete="off">
                            <label class="btn" :for="'portrait-radio-' + orientation.value">
                                <div class="rhombus" :style="`transform: rotate(${orientation.value * 30}deg)`"></div>
                                <br>
                                {{ $t(orientation.labelTransKey) }}
                            </label>
                        </template>
                    </div>
                </div>
            </div>
        </template>

        <h3>{{ $t('board') }}</h3>

        <template v-if="playerSettings">
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" v-model="playerSettings.showCoords" role="switch" id="show-coords-checkbox">
                <label class="form-check-label" for="show-coords-checkbox"><BIconAlphabet /> Show coordinates by default</label>
            </div>
        </template>

        <form v-if="loggedInPlayer && !loggedInPlayer.isGuest" @submit.prevent="submitPasswordChange">
            <h3>{{ $t('change_password') }}</h3>
            <div class="mb-3 row">
                <label class="col-sm-4 col-md-3 col-form-label" for="change-password-old">{{ $t('old_password') }}</label>
                <div class="col-sm-8 col-md-4">
                    <input v-model="oldPassword" required type="password" class="form-control" :class="toInputClass(oldPasswordValidation)" id="change-password-old">
                    <div class="invalid-feedback">
                        {{ oldPasswordValidation?.reason }}
                    </div>
                </div>
            </div>
            <div class="mb-3 row">
                <label class="col-sm-4 col-md-3 col-form-label" for="change-password-new">{{ $t('new_password') }}</label>
                <div class="col-sm-8 col-md-4">
                    <input v-model="newPassword" required type="password" class="form-control" id="change-password-new">
                </div>
            </div>
            <div class="mb-3 row">
                <label class="col-sm-4 col-md-3 col-form-label" for="change-password-new-confirm">{{ $t('confirm_new_password') }}</label>
                <div class="col-sm-8 col-md-4">
                    <input v-model="newPasswordConfirmed" required type="password" class="form-control" :class="toInputClass(confirmPasswordValidation)" id="change-password-new-confirm">
                    <div class="invalid-feedback">
                        {{ confirmPasswordValidation?.reason }}
                    </div>
                </div>
            </div>
            <p v-if="changePasswordError" class="text-danger">{{ changePasswordError }}</p>
            <p v-if="changePasswordSuccess" class="text-success">{{ changePasswordSuccess }}</p>
            <button type="submit" class="btn btn-outline-primary">{{ $t('update_password') }}</button>
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
