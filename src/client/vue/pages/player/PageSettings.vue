<script lang="ts" setup>
import { BIconBrightnessHighFill, BIconMoonStarsFill, BIconCircleHalf, BIconPcDisplayHorizontal, BIconPhone, BIconLightningChargeFill, BIconAlarmFill, BIconCalendar, BIconAlphabet, BIconDot } from 'bootstrap-icons-vue';
import useDarkLightThemeStore from '../../../stores/darkLightThemeStore';
import { storeToRefs } from 'pinia';
import usePlayerSettingsStore from '../../../stores/playerSettingsStore';
import useAuthStore from '../../../stores/authStore';
import { ApiClientError } from '../../../apiClient';
import { watch, Ref, ref, onMounted } from 'vue';
import { useSeoMeta } from '@unhead/vue';
import { InputValidation, toInputClass } from '../../../vue/formUtils';
import { authChangePassword } from '@client/apiClient';
import { availableLocales, setLocale } from '../../../../shared/app/i18n';
import { allShadingPatterns } from '../../../../shared/app/shading-patterns';
import i18n from 'i18next';
import GameView from '../../../pixi-board/GameView';
import { Game } from '../../../../shared/game-engine';
import { Player } from '../../../../shared/app/models';
import AppBoard from '../../components/AppBoard.vue';
import i18next from 'i18next';

const updateSeoMeta = () => useSeoMeta({
    robots: 'noindex',
    titleTemplate: title => `${i18next.t('player_settings.title')} - ${title}`,
});

updateSeoMeta();
i18next.on('languageChanged', () => updateSeoMeta());

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

/*
 * Board preview
 */
const boardContainer = ref<HTMLElement>();
const gameView = ref<null | GameView>(null);
const game = new Game(14);

const players = ['A', 'B'].map(pseudo => {
    const player = new Player();

    player.pseudo = pseudo;
    player.createdAt = new Date();
    player.isBot = false;
    player.isGuest = false;
    player.publicId = 'nope';

    return player;
});

onMounted(() => {
    if (!boardContainer.value) {
        throw new Error('Missing element with ref="boardContainer"');
    }

    gameView.value = new GameView(game, boardContainer.value);
});
</script>

<template>
    <div class="container my-3">
        <h2>{{ $t('player_settings.title') }}</h2>

        <h3>{{ $t('language') }}</h3>

        <div class="row">
            <div class="col-sm-8 col-md-4">
                <select class="form-select" @change="e => e.target && setLocale((e.target as HTMLSelectElement).value)">
                    <option
                        v-for="(label, locale) in availableLocales"
                        :key="locale"
                        :value="locale"
                        :selected="locale === i18n.language"
                    >{{ label }}</option>
                </select>
            </div>
        </div>

        <p class="mt-1"><small>
            <i18next :translation="$t('add_your_language')">
                <template #link>
                    <a href="https://hosted.weblate.org/engage/playhex/" target="_blank">{{ $t('add_your_language_link') }}</a>
                </template>
            </i18next>
        </small></p>

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
                    <select v-model="playerSettings.confirmMoveCorrespondence" class="form-select" id="confirm-move-correspondace">
                        <option :value="false">{{ $t('confirm_move.send_immediately') }}</option>
                        <option :value="true">{{ $t('confirm_move.ask_confirmation') }}</option>
                    </select>
                </div>
            </div>
        </template>

        <h3>{{ $t('game.board') }}</h3>

        <template v-if="playerSettings">
            <div class="form-check form-switch my-3">
                <input class="form-check-input" type="checkbox" v-model="playerSettings.showCoords" role="switch" id="show-coords-checkbox">
                <label class="form-check-label" for="show-coords-checkbox"><BIconAlphabet /> {{ $t('show_coords_by_default') }}</label>
            </div>

            <div class="form-check form-switch my-3">
                <input class="form-check-input" type="checkbox" v-model="playerSettings.show44dots" role="switch" id="show-board-dots">
                <label class="form-check-label" for="show-board-dots"><BIconDot /> {{ $t('show_44_dots') }}</label>
            </div>
        </template>

        <h4>{{ $t('board_orientation.title') }}</h4>

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
                    <div class="form-text mb-3" v-html="i18n.t('shading_patterns.help_custom')"></div>
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

        <div class="board-container" ref="boardContainer">
            <AppBoard
                v-if="gameView"
                :gameView="(gameView as GameView)"
                :players="players"
            />
        </div>

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
h3, h4
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

.board-container
    width 300px
    height 300px
</style>
