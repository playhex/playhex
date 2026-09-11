<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { onClickOutside, onKeyStroke } from '@vueuse/core';
import { defineOverlay } from '@overlastic/vue';
import i18n from 'i18next';
import useAuthStore from '../../../stores/authStore.js';
import usePlayerLocalSettingsStore from '../../../stores/playerLocalSettingsStore.js';
import usePlayerSettingsStore from '../../../stores/playerSettingsStore.js';
import useNotificationStore from '../../../stores/notificationStore.js';
import { availableLocales, getQuickLocales, setLocale } from '../../../../shared/app/i18n/index.js';
import { pseudoString } from '../../../../shared/app/pseudoUtils.js';
import AppPlayerAvatar from '../AppPlayerAvatar.vue';
import AppPseudo from '../AppPseudo.vue';
import AppRhombus from '../AppRhombus.vue';
import EnableNotificationsOverlay from '../overlay/EnableNotificationsOverlay.vue';
import {
    IconBell,
    IconBellCheckFill,
    IconBoxArrowRight,
    IconBrightnessHighFill,
    IconCaretDownFill,
    IconGear,
    IconMoonStarsFill,
    IconMuteOff,
    IconMuteOn,
    IconPersonUp,
    IconPlus,
} from '../../icons.js';

const router = useRouter();

const { loggedInPlayer } = storeToRefs(useAuthStore());

const playerLocalSettingsStore = usePlayerLocalSettingsStore();
const { localSettings } = storeToRefs(playerLocalSettingsStore);
const { switchTheme, displayedTheme } = playerLocalSettingsStore;

const toggleMuteAudio = (): void => {
    localSettings.value.muteAudio = !localSettings.value.muteAudio;
};

const playerSettingsStore = usePlayerSettingsStore();
const { playerSettings } = storeToRefs(playerSettingsStore);

/*
 * Open/close menu
 */
const showMenu = ref(false);
const menuElement = ref<HTMLElement>();

/**
 * Open on hover only on devices with a fine pointer,
 * else a tap on mobile would both open (hover) and toggle (click) the menu.
 */
const canHover = window.matchMedia('(hover: hover)').matches;

/**
 * Delay before closing on mouse leave, to let the pointer cross the
 * navbar padding between the player button and the menu below it.
 */
const CLOSE_ON_LEAVE_DELAY = 250;

let closeTimeout: null | ReturnType<typeof setTimeout> = null;

const cancelClose = (): void => {
    if (closeTimeout !== null) {
        clearTimeout(closeTimeout);
        closeTimeout = null;
    }
};

const hover = (show: boolean): void => {
    if (!canHover) {
        return;
    }

    cancelClose();

    if (show) {
        showMenu.value = true;
        return;
    }

    closeTimeout = setTimeout(() => showMenu.value = false, CLOSE_ON_LEAVE_DELAY);
};

onUnmounted(() => cancelClose());

const closeMenu = (): void => {
    cancelClose();
    showMenu.value = false;
};

const toggleMenu = (): void => {
    cancelClose();
    showMenu.value = !showMenu.value;
};

onClickOutside(menuElement, () => closeMenu());
onKeyStroke('Escape', () => closeMenu());

// Close menu when navigating to another page
watch(router.currentRoute, () => closeMenu());

/*
 * Notifications
 */
const { permission } = storeToRefs(useNotificationStore());
const { isNotificationSupported } = useNotificationStore();
const openEnableNotificationsOverlay = defineOverlay(EnableNotificationsOverlay);

const enableNotifications = async (): Promise<void> => {
    try {
        await openEnableNotificationsOverlay({});
    } catch {
        // dismissed
    }
};

/*
 * Language quick selector.
 * Locale labels are in the form "🇫🇷 Français (French)", so first word is the flag.
 */
const quickLocales = getQuickLocales();
const localeFlag = (locale: string): string => availableLocales[locale].label.split(' ')[0];
const localeName = (locale: string): string => availableLocales[locale].label.split('(')[0].trim();

// i18n.language is not reactive, keep a ref in sync to highlight current locale
const currentLocale = ref(i18n.language);
i18n.on('languageChanged', locale => currentLocale.value = locale);

/*
 * Board orientation.
 * Quick access to landscape orientation only, "flat 2" stays in settings page.
 * https://www.hexwiki.net/index.php/Conventions
 */
const landscapeOrientations = [
    { value: 0, labelTransKey: 'board_orientation.flat' },
    { value: 11, labelTransKey: 'board_orientation.diamond' },
];

/**
 * Unlike local settings, player settings are stored server side,
 * and the auto save watcher lives in the settings page, so save explicitly here.
 */
const updateOrientationLandscape = (orientation: number): void => {
    if (playerSettings.value === null) {
        return;
    }

    playerSettings.value.orientationLandscape = orientation;

    void playerSettingsStore.updatePlayerSettings();
};

/*
 * Logout
 */
const clickLogout = async (): Promise<void> => {
    closeMenu();

    const newPlayer = await useAuthStore().logout();

    void router.push({
        name: 'player',
        params: {
            slug: newPlayer.slug,
        },
    });
};
</script>

<template>
    <div
        ref="menuElement"
        class="nav-player-item"
        @mouseenter="hover(true)"
        @mouseleave="hover(false)"
    >
        <!-- Player button -->
        <button
            v-if="loggedInPlayer"
            type="button"
            class="btn btn-link player-button link-body-emphasis"
            aria-haspopup="menu"
            :aria-expanded="showMenu"
            :title="pseudoString(loggedInPlayer)"
            :aria-label="$t('player_menu.open_menu')"
            @click="toggleMenu()"
        >
            <span class="nav-avatar"><AppPlayerAvatar :player="loggedInPlayer" thumbnail /></span>

            <span class="nav-pseudo d-none d-sm-inline">
                <span v-if="loggedInPlayer.isGuest" class="fst-italic">{{ $t('guest') }}&nbsp;</span>
                <span>{{ loggedInPlayer.pseudo }}</span>
            </span>

            <IconCaretDownFill class="caret" />
        </button>

        <span v-else>{{ $t('logging_in') }}</span>

        <!-- Menu -->
        <div v-if="showMenu && loggedInPlayer" class="player-menu-container">
            <div class="card shadow player-menu">

                <!-- Account -->
                <div class="card-body pb-2">
                    <div class="account-header">
                        <span class="account-avatar"><AppPlayerAvatar :player="loggedInPlayer" thumbnail /></span>

                        <div class="account-identity">
                            <AppPseudo
                                :player="loggedInPlayer"
                                is="strong"
                                flag
                                rating
                                @click="closeMenu()"
                            />

                            <router-link
                                :to="{ name: 'player', params: { slug: loggedInPlayer.slug } }"
                                class="d-block small"
                                @click="closeMenu()"
                            >{{ loggedInPlayer.isGuest ? $t('player_menu.my_guest_account') : $t('player_menu.my_account') }}</router-link>
                        </div>
                    </div>

                    <div v-if="loggedInPlayer.isGuest" class="d-grid gap-2 mt-3">
                        <router-link
                            :to="{ name: 'login' }"
                            class="btn btn-sm btn-primary"
                            @click="closeMenu()"
                        >{{ $t('log_in') }}</router-link>

                        <router-link
                            :to="{ name: 'signup' }"
                            class="btn btn-sm btn-success"
                            @click="closeMenu()"
                        ><IconPersonUp /> {{ $t('create_account') }}</router-link>
                    </div>
                </div>

                <hr class="my-0">

                <!-- Quick settings -->
                <div class="card-body py-2">

                    <!-- Notifications -->
                    <div class="setting-row">
                        <button
                            v-if="isNotificationSupported && 'default' === permission"
                            type="button"
                            class="btn btn-sm btn-outline-primary w-100"
                            @click="enableNotifications()"
                        ><IconBell /> {{ $t('player_menu.enable_notifications') }}</button>

                        <p v-else-if="'granted' === permission" class="m-0 small text-success">
                            <IconBellCheckFill /> {{ $t('player_menu.notifications_enabled') }}
                        </p>

                        <router-link
                            v-else
                            :to="{ name: 'settings', hash: '#push-notifications' }"
                            class="small link-secondary"
                            @click="closeMenu()"
                        ><IconBell /> {{ $t('player_menu.notifications_blocked') }}</router-link>
                    </div>

                    <!-- Language -->
                    <div class="setting-row">
                        <span class="setting-label">{{ $t('language') }}</span>

                        <span class="setting-controls">
                            <button
                                v-for="locale of quickLocales"
                                :key="locale"
                                type="button"
                                class="btn btn-sm"
                                :class="locale === currentLocale ? 'btn-primary' : 'btn-outline-secondary'"
                                :title="localeName(locale)"
                                :aria-label="localeName(locale)"
                                @click="setLocale(locale)"
                            >{{ localeFlag(locale) }}</button>

                            <router-link
                                :to="{ name: 'settings', hash: '#language' }"
                                class="btn btn-sm btn-outline-secondary"
                                :title="$t('player_menu.more_languages')"
                                :aria-label="$t('player_menu.more_languages')"
                                @click="closeMenu()"
                            ><IconPlus /></router-link>
                        </span>
                    </div>

                    <!-- Theme -->
                    <div class="setting-row">
                        <span class="setting-label">{{ $t('background_theme.title') }}</span>

                        <span class="setting-controls">
                            <button
                                type="button"
                                class="btn btn-sm btn-outline-secondary"
                                :title="$t(`background_theme.${displayedTheme()}`)"
                                :aria-label="$t(`background_theme.${displayedTheme()}`)"
                                @click="switchTheme()"
                            >
                                <IconMoonStarsFill v-if="'dark' === displayedTheme()" />
                                <IconBrightnessHighFill v-else />
                            </button>
                        </span>
                    </div>

                    <!-- Audio -->
                    <div class="setting-row">
                        <span class="setting-label">{{ $t('audio') }}</span>

                        <span class="setting-controls">
                            <button
                                type="button"
                                class="btn btn-sm"
                                :class="localSettings.muteAudio
                                    ? 'btn-outline-secondary'
                                    : 'btn-outline-success'
                                "
                                :title="localSettings.muteAudio ? $t('muted.on') : $t('muted.off')"
                                :aria-label="localSettings.muteAudio ? $t('muted.on') : $t('muted.off')"
                                @click="toggleMuteAudio()"
                            >
                                <IconMuteOn v-if="localSettings.muteAudio" />
                                <IconMuteOff v-else />
                            </button>
                        </span>
                    </div>

                    <!-- Board orientation, landscape -->
                    <div v-if="playerSettings" class="setting-row">
                        <span class="setting-label">{{ $t('board_orientation.title') }}</span>

                        <span class="setting-controls orientation-controls">
                            <button
                                v-for="orientation of landscapeOrientations"
                                :key="orientation.value"
                                type="button"
                                class="btn orientation-button"
                                :class="{ active: playerSettings.orientationLandscape === orientation.value }"
                                :title="$t(orientation.labelTransKey)"
                                :aria-label="$t(orientation.labelTransKey)"
                                @click="updateOrientationLandscape(orientation.value)"
                            ><AppRhombus :orientation="orientation.value" /></button>
                        </span>
                    </div>

                    <!-- All settings -->
                    <div class="setting-row">
                        <router-link
                            :to="{ name: 'settings' }"
                            class="small"
                            @click="closeMenu()"
                        ><IconGear /> {{ $t('player_settings.title') }}</router-link>
                    </div>
                </div>

                <!-- Logout -->
                <template v-if="!loggedInPlayer.isGuest">
                    <hr class="my-0">

                    <div class="card-body py-2">
                        <button
                            type="button"
                            class="btn btn-sm btn-link link-danger p-0"
                            @click="clickLogout()"
                        ><IconBoxArrowRight /> {{ $t('log_out') }}</button>
                    </div>
                </template>

            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.nav-player-item
    font-size 1.1em
    // Stretch to the full header height so there is no gap between the button
    // and the menu below it, which would trigger mouseleave and close the menu
    align-self stretch
    display flex
    align-items center

.player-button
    display flex
    align-items center
    gap 0.35em
    text-decoration none
    padding 0

    .caret
        font-size 0.6em

// AppPlayerAvatar has a multi-root template, so a class set on it does not
// reach the inner img: size it from a wrapper instead.
avatar-size(width)
    display inline-flex
    flex-shrink 0
    width width
    height width * 0.866 // cos(30)

    :deep(img),
    :deep(svg)
        width 100%
        height 100%

.nav-avatar
    avatar-size(1.9rem)

.account-header
    display flex
    align-items center
    gap 0.6em

    a
        text-decoration none

.account-avatar
    avatar-size(2.75rem)

.account-identity
    min-width 0
    overflow hidden
    text-overflow ellipsis

.setting-row
    display flex
    align-items center
    justify-content space-between
    gap 0.5em
    min-height 2.2em

    & + .setting-row
        margin-top 0.25em

.setting-label
    font-size 0.9em
    color var(--bs-secondary-color)

.setting-controls
    display flex
    align-items center
    gap 0.25em

.orientation-controls
    gap 0.75em

// Borderless, the selected one is the opaque one
.orientation-button
    border 0
    box-shadow none
    padding 0
    opacity 0.3

    &.active,
    &:hover,
    &:focus-visible
        opacity 1

    // AppRhombus is sized for the settings page, shrink it for this menu
    :deep(.rhombus)
        margin 0.7em
        font-size 0.7em

.player-menu-container
    position absolute
    width 20em
    max-width 100%
    top 100% // glued under the header, so the hover zone stays continuous
    inset-inline-end 0
    z-index 500
    font-size 1rem

    .player-menu
        max-height 80vh
        overflow-y auto
        border 0
        border-radius 0
</style>
