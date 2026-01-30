<script lang="ts" setup>
import { IconBrightnessHighFill, IconMoonStarsFill, IconCircleHalf, IconPcDisplayHorizontal, IconPhone, IconLightningChargeFill, IconAlarmFill, IconCalendar, IconAlphabet, IconDot, IconCheck, IconX, IconExclamationTriangleFill, IconMuteOn, IconMuteOff } from '../../icons.js';
import usePlayerLocalSettingsStore from '../../../stores/playerLocalSettingsStore.js';
import { storeToRefs } from 'pinia';
import usePlayerSettingsStore from '../../../stores/playerSettingsStore.js';
import useNotificationStore from '../../../stores/notificationStore.js';
import useAuthStore from '../../../stores/authStore.js';
import { apiPostPushTest } from '../../../apiClient.js';
import { watch, Ref, ref, onMounted, onUnmounted } from 'vue';
import { injectHead, useSeoMeta } from '@unhead/vue';
import { InputValidation, toInputClass } from '../../../vue/formUtils.js';
import { authChangePassword } from '../../../apiClient.js';
import { availableLocales, getQuickLocales, setLocale, getPlayerMissingLocale } from '../../../../shared/app/i18n/index.js';
import { allShadingPatterns } from '../../../../shared/pixi-board/shading-patterns/shading-patterns.js';
import i18n, { t } from 'i18next';
import { MoveSettings } from '../../../../shared/app/models/index.js';
import { simulateTargetPseudoClassHandler } from '../../../services/simulateTargetPseudoClassHandler.js';
import AppRhombus from '../../components/AppRhombus.vue';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';
import GameView from '../../../../shared/pixi-board/GameView.js';
import { PlayerSettingsFacade } from '../../../services/board-view-facades/PlayerSettingsFacade.js';

const head = injectHead();

const updateSeoMeta = () => useSeoMeta({
    robots: 'noindex',
    title: t('player_settings.title'),
}, { head });

updateSeoMeta();
i18n.on('languageChanged', () => updateSeoMeta());

const playerSettingsStore = usePlayerSettingsStore();

const { loggedInPlayer } = storeToRefs(useAuthStore());
const { localSettings } = storeToRefs(usePlayerLocalSettingsStore());
const { playerSettings } = storeToRefs(playerSettingsStore);

// Auto save when any setting changed
watch(
    playerSettings,
    (settings, oldSettings) => {
        // Do nothing if no settings, or on initial settings load
        if (settings === null || oldSettings === null) {
            return;
        }

        void playerSettingsStore.updatePlayerSettings();
    },
    { deep: true },
);

/*
 * Board orientation
 * https://www.hexwiki.net/index.php/Conventions
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
const changePasswordSuccess: Ref<boolean> = ref(false);

const submitPasswordChange = async () => {
    oldPasswordValidation.value = null;
    confirmPasswordValidation.value = null;
    changePasswordError.value = null;
    changePasswordSuccess.value = false;

    if (newPasswordConfirmed.value !== newPassword.value) {
        confirmPasswordValidation.value = {
            ok: false,
            reason: 'Passwords do not match',
        };
        return;
    }

    try {
        await authChangePassword(oldPassword.value, newPassword.value);
        changePasswordSuccess.value = true;
        oldPassword.value = '';
        newPassword.value = '';
        newPasswordConfirmed.value = '';
    } catch (e) {
        if (!(e instanceof DomainHttpError)) {
            throw e;
        }

        switch (e.type) {
            case 'invalid_password':
                oldPasswordValidation.value = { ok: false, reason: e.type };
                break;

            default:
                changePasswordError.value = e.type;
        }
    }
};

/*
 * Board preview
 */
const gameView = new GameView(14);
const shadingPatternPreview = ref<HTMLElement>();

new PlayerSettingsFacade(gameView);

onMounted(async () => {
    if (!shadingPatternPreview.value) {
        throw new Error('Missing element with ref="shadingPatternPreview"');
    }

    await gameView.mount(shadingPatternPreview.value);
});

/*
 * Workaround for :target css selector,
 * to highlight relevant section if i.e "#board-orientation" is in url hash.
 */
onMounted(() => {
    simulateTargetPseudoClassHandler();
    window.addEventListener('hashchange', simulateTargetPseudoClassHandler);
});

onUnmounted(() => {
    window.removeEventListener('hashchange', simulateTargetPseudoClassHandler);
});

/*
 * Custom message for player when his locale is not yet translated
 */
const playerMissingLocale = getPlayerMissingLocale();

/**
 * For "fr", will show: 'French ("français")'
 */
const getLocaleName = (locale: string): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const languageNamesLocale = new (Intl as any).DisplayNames([locale], { type: 'language' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const languageNamesEn = new (Intl as any).DisplayNames(['en'], { type: 'language' });

    return `${languageNamesEn.of(locale)} ("${languageNamesLocale.of(locale)}")`;
};

/*
 * Push notification
 */
const {
    permission,
    subscribed,
} = storeToRefs(useNotificationStore());

const {
    requestPermission,
} = useNotificationStore();

const isNotificationSupported = typeof Notification !== 'undefined';
</script>

<template>
    <div class="container">
        <h2 class="mt-3">{{ $t('player_settings.title') }}</h2>
    </div>

    <section id="language">
        <div class="container">
            <h3>{{ $t('language') }}</h3>

            <div class="row">
                <div class="col-sm-8 col-md-4">

                    <!-- Quick selector -->
                    <!-- should probably be moved in future player menu -->
                    <small>Quick selector:</small>
                    {{ ' ' }}
                    <button
                        class="btn btn-sm btn-link ps-0"
                        v-for="locale of getQuickLocales()"
                        :key="locale"
                        @click="setLocale(locale)"
                    >{{ availableLocales[locale].label.split('(')[0].trim() }}</button>

                    <select class="form-select" @change="e => e.target && setLocale((e.target as HTMLSelectElement).value)">
                        <option
                            v-for="({ label }, locale) in availableLocales"
                            :key="locale"
                            :value="locale"
                            :selected="locale === i18n.language"
                        >{{ label }}</option>
                    </select>
                </div>
            </div>

            <p v-if="null === playerMissingLocale" class="mt-1">
                <small>
                    <i18next :translation="$t('add_your_language')">
                        <template #link>
                            <a href="https://hosted.weblate.org/engage/playhex/" target="_blank">{{ $t('add_your_language_link') }}</a>
                        </template>
                    </i18next>
                </small>
            </p>

            <p v-else>
                <small>
                    Sorry, <strong>{{ getLocaleName(playerMissingLocale) }}</strong> translation doesn't exist yet.
                    <a href="https://hosted.weblate.org/engage/playhex/" target="_blank">Add it with Weblate</a>!
                </small>
            </p>
        </div>
    </section>

    <section id="theme">
        <div class="container">
            <h3>{{ $t('background_theme.title') }}</h3>

            <div class="btn-group" role="group" aria-label="Dark or light theme switcher">
                <input type="radio" class="btn-check" v-model="localSettings.selectedTheme" value="light" id="btn-theme-light" autocomplete="off">
                <label class="btn btn-outline-primary" for="btn-theme-light"><IconBrightnessHighFill /> {{ $t('background_theme.light') }}</label>

                <input type="radio" class="btn-check" v-model="localSettings.selectedTheme" value="dark" id="btn-theme-dark" autocomplete="off">
                <label class="btn btn-outline-primary" for="btn-theme-dark"><IconMoonStarsFill /> {{ $t('background_theme.dark') }}</label>

                <input type="radio" class="btn-check" v-model="localSettings.selectedTheme" value="auto" id="btn-theme-auto" autocomplete="off">
                <label class="btn btn-outline-primary" for="btn-theme-auto"><IconCircleHalf /> {{ $t('auto') }}</label>
            </div>
        </div>
    </section>

    <section id="audio">
        <div class="container">
            <h3>Audio</h3>
            <div class="btn-group" role="group" aria-label="Mute audio switcher">
                <input type="radio" class="btn-check" v-model="localSettings.muteAudio" :value="true" id="btn-mute-on" autocomplete="off">
                <label class="btn btn-outline-primary" for="btn-mute-on">
                    <IconMuteOn /> {{ $t('muted.on') }}
                </label>

                <input type="radio" class="btn-check" v-model="localSettings.muteAudio" :value="false" id="btn-mute-off" autocomplete="off">
                <label class="btn btn-outline-primary" for="btn-mute-off">
                    <IconMuteOff /> {{ $t('muted.off') }}
                </label>
            </div>
        </div>
    </section>

    <section id="move-settings">
        <div class="container">
            <h3>{{ $t('move_settings.title') }}</h3>

            <template v-if="playerSettings">
                <div class="mb-3 row">
                    <label for="move-settings-blitz" class="col-md-3 col-xl-2 col-form-label"><IconLightningChargeFill /> {{ $t('time_cadency.blitz') }}</label>
                    <div class="col-md-9">
                        <div class="btn-group" role="group">
                            <input v-model="playerSettings.moveSettingsBlitz" :value="MoveSettings.PREMOVE" type="radio" class="btn-check" id="move-settings-blitz-1" autocomplete="off">
                            <label class="btn btn-outline-primary" for="move-settings-blitz-1">{{ $t('premove.title') }}</label>

                            <input v-model="playerSettings.moveSettingsBlitz" :value="MoveSettings.SEND_IMMEDIATELY" type="radio" class="btn-check" id="move-settings-blitz-2" autocomplete="off">
                            <label class="btn btn-outline-primary" for="move-settings-blitz-2">{{ $t('confirm_move.send_immediately') }}</label>

                            <input v-model="playerSettings.moveSettingsBlitz" :value="MoveSettings.MUST_CONFIRM" type="radio" class="btn-check" id="move-settings-blitz-3" autocomplete="off">
                            <label class="btn btn-outline-primary" for="move-settings-blitz-3">{{ $t('confirm_move.ask_confirmation') }}</label>
                        </div>
                    </div>
                </div>
                <div class="mb-3 row">
                    <label for="move-settings-normal" class="col-md-3 col-xl-2 col-form-label"><IconAlarmFill /> {{ $t('time_cadency.normal') }}</label>
                    <div class="col-md-9">
                        <div class="btn-group" role="group">
                            <input v-model="playerSettings.moveSettingsNormal" :value="MoveSettings.PREMOVE" type="radio" class="btn-check" id="move-settings-normal-1" autocomplete="off">
                            <label class="btn btn-outline-primary" for="move-settings-normal-1">{{ $t('premove.title') }}</label>

                            <input v-model="playerSettings.moveSettingsNormal" :value="MoveSettings.SEND_IMMEDIATELY" type="radio" class="btn-check" id="move-settings-normal-2" autocomplete="off">
                            <label class="btn btn-outline-primary" for="move-settings-normal-2">{{ $t('confirm_move.send_immediately') }}</label>

                            <input v-model="playerSettings.moveSettingsNormal" :value="MoveSettings.MUST_CONFIRM" type="radio" class="btn-check" id="move-settings-normal-3" autocomplete="off">
                            <label class="btn btn-outline-primary" for="move-settings-normal-3">{{ $t('confirm_move.ask_confirmation') }}</label>
                        </div>
                    </div>
                </div>
                <div class="mb-3 row">
                    <label for="move-settings-correspondace" class="col-md-3 col-xl-2 col-form-label"><IconCalendar /> {{ $t('time_cadency.correspondence') }}</label>
                    <div class="col-md-9">
                        <div class="btn-group" role="group">
                            <input v-model="playerSettings.moveSettingsCorrespondence" :value="MoveSettings.PREMOVE" type="radio" class="btn-check" id="move-settings-correspondence-1" autocomplete="off">
                            <label class="btn btn-outline-primary" for="move-settings-correspondence-1">{{ $t('premove.title') }}</label>

                            <input v-model="playerSettings.moveSettingsCorrespondence" :value="MoveSettings.SEND_IMMEDIATELY" type="radio" class="btn-check" id="move-settings-correspondence-2" autocomplete="off">
                            <label class="btn btn-outline-primary" for="move-settings-correspondence-2">{{ $t('confirm_move.send_immediately') }}</label>

                            <input v-model="playerSettings.moveSettingsCorrespondence" :value="MoveSettings.MUST_CONFIRM" type="radio" class="btn-check" id="move-settings-correspondence-3" autocomplete="off">
                            <label class="btn btn-outline-primary" for="move-settings-correspondence-3">{{ $t('confirm_move.ask_confirmation') }}</label>
                        </div>
                    </div>
                </div>
            </template>

            <dl class="row move-settings-help">
                <dt class="col-md-3 col-xl-2">{{ $t('premove.title') }}</dt>
                <dd class="col-md-9">{{ $t('premove.description') }}</dd>

                <dt class="col-md-3 col-xl-2">{{ $t('confirm_move.send_immediately') }}</dt>
                <dd class="col-md-9">{{ $t('confirm_move.send_immediately_description') }}</dd>

                <dt class="col-md-3 col-xl-2">{{ $t('confirm_move.ask_confirmation') }}</dt>
                <dd class="col-md-9">{{ $t('confirm_move.description') }}</dd>
            </dl>

        </div>
    </section>

    <section id="board">
        <div class="container">
            <h3>{{ $t('game.board') }}</h3>

            <template v-if="playerSettings">
                <div class="form-check form-switch my-3">
                    <input class="form-check-input" type="checkbox" v-model="playerSettings.showCoords" role="switch" id="show-coords-checkbox">
                    <label class="form-check-label" for="show-coords-checkbox"><IconAlphabet /> {{ $t('show_coords_by_default') }}</label>
                </div>

                <div class="form-check form-switch my-3">
                    <input class="form-check-input" type="checkbox" v-model="playerSettings.show44dots" role="switch" id="show-board-dots">
                    <label class="form-check-label" for="show-board-dots"><IconDot /> {{ $t('show_44_dots') }}</label>
                </div>
            </template>
        </div>
    </section>

    <section id="board-orientation">
        <div class="container">
            <h4>{{ $t('board_orientation.title') }}</h4>

            <p>{{ $t('board_orientation.description') }}</p>

            <template v-if="playerSettings">
                <div class="mb-3 row">
                    <label class="col-sm-4 col-md-3 col-form-label"><IconPcDisplayHorizontal /> {{ $t('landscape') }}</label>
                    <div class="col-sm-8 col-md-9">
                        <div class="btn-group" role="group">
                            <template v-for="orientation in landscapeOrientations" :key="orientation.value">
                                <input type="radio" class="btn-check" v-model="playerSettings.orientationLandscape" :value="orientation.value" :id="'landscape-radio-' + orientation.value" autocomplete="off">
                                <label class="btn" :for="'landscape-radio-' + orientation.value">
                                    <AppRhombus :orientation="orientation.value" />
                                    <br>
                                    {{ $t(orientation.labelTransKey) }}
                                </label>
                            </template>
                        </div>
                    </div>
                </div>

                <div class="mb-3 row">
                    <label class="col-sm-4 col-md-3 col-form-label"><IconPhone /> {{ $t('portrait') }}</label>
                    <div class="col-sm-8 col-md-9">
                        <div class="btn-group" role="group">
                            <template v-for="orientation in portraitOrientations" :key="orientation.value">
                                <input type="radio" class="btn-check" v-model="playerSettings.orientationPortrait" :value="orientation.value" :id="'portrait-radio-' + orientation.value" autocomplete="off">
                                <label class="btn" :for="'portrait-radio-' + orientation.value">
                                    <AppRhombus :orientation="orientation.value" />
                                    <br>
                                    {{ $t(orientation.labelTransKey) }}
                                </label>
                            </template>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </section>

    <section id="shading-pattern">
        <div class="container">
            <h4>{{ $t('shading_patterns.title') }}</h4>

            <template v-if="playerSettings">
                <div class="row">
                    <div class="col-md-6">
                        <select class="form-select" v-model="playerSettings.boardShadingPattern">
                            <option
                                v-for="shadingPattern in allShadingPatterns"
                                :key="shadingPattern ?? 'null'"
                                :value="shadingPattern"
                            >{{ $t(`shading_patterns.types.${shadingPattern ?? 'null'}`) }}</option>
                        </select>
                    </div>
                </div>

                <div class="row" v-if="'custom' === (playerSettings.boardShadingPattern ?? 'null')">
                    <div class="col-md-6">
                        <!-- eslint-disable-next-line vue/no-v-html translated content comes from translation files, that should be reviewed -->
                        <div class="form-text mb-3" v-html="t('shading_patterns.help_custom')"></div>
                        <label for="shading-pattern-option" class="form-label">{{ $t(`shading_patterns.custom_expression`) }}</label>
                        <textarea
                            class="form-control font-monospace"
                            v-model="playerSettings.boardShadingPatternOption"
                            maxlength="255"
                            id="shading-pattern-option"
                            rows="3"
                        ></textarea>
                    </div>
                </div>

                <div class="row mt-3">
                    <div class="col-6 col-md-3">
                        <label for="shading-pattern-visibility" class="form-label">{{ $t(`shading_patterns.visibility`) }}</label>
                        <input
                            type="range"
                            v-model.number="playerSettings.boardShadingPatternIntensity"
                            min="0"
                            max="1"
                            step="0.1"
                            class="form-range"
                            id="shading-pattern-visibility"
                        >
                    </div>
                </div>
            </template>

            <h5>{{ $t('preview') }}</h5>

            <div ref="shadingPatternPreview" class="board-container">
            </div>
        </div>
    </section>

    <section id="push-notifications">
        <div class="container">
            <h3>Notifications</h3>

            <p v-if="!isNotificationSupported"><IconExclamationTriangleFill class="text-warning" /> It seems that this browser does not support notifications.</p>

            <p v-if="'granted' === permission"><IconCheck class="text-success" /> Notifications granted</p>
            <button
                v-else-if="'default' === permission"
                class="btn btn-outline-success"
                @click="requestPermission"
            >Allow notifications</button>
            <p v-else><IconX class="text-danger" /> Notifications denied. You need to allow them in your browser.</p>

            <p v-if="subscribed"><IconCheck class="text-success" /> Subscribed to push notifications.</p>
            <p v-else><IconX class="text-danger" /> Not subscribed to push notifications.</p>

            <button
                class="btn btn-sm btn-info"
                :disabled="!subscribed"
                @click="apiPostPushTest"
            >Test push notification</button>
        </div>
    </section>

    <section id="change-password">
        <div class="container">
            <form v-if="loggedInPlayer && !loggedInPlayer.isGuest" @submit.prevent="submitPasswordChange">
                <h3>{{ $t('change_password') }}</h3>
                <div class="mb-3 row">
                    <label class="col-sm-4 col-md-3 col-form-label" for="change-password-old">{{ $t('old_password') }}</label>
                    <div class="col-sm-8 col-md-4">
                        <input v-model="oldPassword" required type="password" class="form-control" :class="toInputClass(oldPasswordValidation)" id="change-password-old">
                        <div v-if="oldPasswordValidation?.reason" class="invalid-feedback">
                            {{ $t(oldPasswordValidation.reason) }}
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
                        <div v-if="confirmPasswordValidation?.reason" class="invalid-feedback">
                            {{ $t(confirmPasswordValidation.reason) }}
                        </div>
                    </div>
                </div>
                <p v-if="changePasswordError" class="text-danger">{{ $t(changePasswordError) }}</p>
                <p v-if="changePasswordSuccess" class="text-success">{{ $t('password_changed_success') }}</p>
                <button type="submit" class="btn btn-outline-primary">{{ $t('update_password') }}</button>
            </form>
        </div>
    </section>
</template>

<style lang="stylus" scoped>
h3, h4
    margin 0 0 0.5em 0

.board-container
    width 400px
    max-width 100%
    height 300px

@css {
    :target, .pseudo-target {
        background-color: rgba(var(--bs-warning-rgb), 0.08);
    }
}

section
    padding 1em 0

    &:last-child
        margin-bottom 3em

.move-settings-help
    font-size 0.9em
    margin-top 2.5em
</style>
