<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useSeoMeta } from '@unhead/vue';
import useAuthStore from '../../../stores/authStore.js';
import { apiGetOAuthInteraction, apiPostOAuthInteraction } from '../../../apiClient.js';
import { isOAuthScope, type OAuthInteractionDetails } from '../../../../shared/app/oauth.js';
import AppPseudo from '../../components/AppPseudo.vue';
import AppPlayerAvatar from '../../components/AppPlayerAvatar.vue';
import { IconCheck, IconExclamationTriangleFill } from '../../icons.js';

useSeoMeta({
    robots: 'noindex',
    title: 'Authorize application',
});

const route = useRoute();
const uid = String(route.params.uid);

const { loggedInPlayer } = storeToRefs(useAuthStore());

const interaction = ref<null | OAuthInteractionDetails>(null);
const error = ref<null | 'expired' | 'unknown'>(null);
const submitting = ref(false);

/**
 * Current page, to come back here after login or signup.
 */
const redirectQuery = computed(() => ({ redirect: route.fullPath }));

/**
 * "openid" is always displayed, other scopes only if requested.
 */
const displayedScopes = computed(() => {
    if (interaction.value === null) {
        return [];
    }

    const scopes = interaction.value.scopes.filter(isOAuthScope);

    return [
        'openid' as const,
        ...(['read', 'write', 'offline_access'] as const).filter(scope => scopes.includes(scope)),
    ];
});

const toError = (e: unknown): 'expired' | 'unknown' => (e as Error)?.message === 'oauth_interaction_expired'
    ? 'expired'
    : 'unknown'
;

const load = async () => {
    try {
        interaction.value = await apiGetOAuthInteraction(uid);
    } catch (e) {
        error.value = toError(e);
    }
};

void load();

const submit = async (action: 'confirm' | 'abort') => {
    submitting.value = true;

    try {
        window.location.href = await apiPostOAuthInteraction(uid, action);
    } catch (e) {
        submitting.value = false;
        error.value = toError(e);
    }
};
</script>

<template>
    <div class="container my-4">
        <div class="row">
            <div class="col-sm-10 offset-sm-1 col-md-8 offset-md-2 col-lg-6 offset-lg-3">

                <div v-if="error" class="alert alert-warning">
                    <IconExclamationTriangleFill />
                    {{ $t(error === 'expired' ? 'oauth.error_expired' : 'oauth.error_unknown') }}
                </div>

                <div v-else-if="interaction">
                    <!-- Application ··· player -->
                    <div class="oauth-header mb-4">
                        <div class="oauth-party">
                            <img :src="interaction.client.logoUri" :alt="interaction.client.name" class="oauth-logo rounded mb-2">
                            <h2 class="h5 mb-1">{{ interaction.client.name }}</h2>
                            <p class="text-secondary small mb-0">
                                {{ $t('oauth.by_author', { author: interaction.client.author }) }}
                                <template v-if="interaction.client.websiteUri">
                                    <br>
                                    <a :href="interaction.client.websiteUri" target="_blank" rel="noopener noreferrer nofollow">{{ interaction.client.websiteUri }}</a>
                                </template>
                            </p>
                        </div>

                        <div class="oauth-link text-secondary">···</div>

                        <div v-if="loggedInPlayer" class="oauth-party">
                            <span class="oauth-avatar mb-2"><AppPlayerAvatar :player="loggedInPlayer" /></span>
                            <h2 class="h5 mb-1">
                                <AppPseudo :player="loggedInPlayer" />
                                <span v-if="loggedInPlayer.isGuest" class="badge text-bg-secondary ms-1">{{ $t('guest') }}</span>
                            </h2>
                            <p class="small mb-0">
                                <template v-if="loggedInPlayer.isGuest">
                                    <router-link :to="{ name: 'login', query: redirectQuery }">{{ $t('log_in') }}</router-link>
                                    ·
                                    <router-link :to="{ name: 'signup', query: redirectQuery }">{{ $t('sign_up') }}</router-link>
                                </template>
                                <router-link v-else :to="{ name: 'login', query: redirectQuery }">{{ $t('oauth.use_another_account') }}</router-link>
                            </p>
                        </div>
                    </div>

                    <p v-if="interaction.client.description" class="text-secondary">{{ interaction.client.description }}</p>

                    <div v-if="interaction.userCode" class="alert alert-info text-center">
                        {{ $t('oauth.check_device_code') }}
                        <div class="fs-3 font-monospace mt-1">{{ interaction.userCode }}</div>
                    </div>

                    <p class="lead">{{ $t('oauth.wants_access') }}</p>

                    <ul class="list-unstyled">
                        <li v-for="scope in displayedScopes" :key="scope" class="mb-2">
                            <IconCheck class="text-success" />
                            <strong>{{ $t(`oauth.scope.${scope}.title`) }}</strong>
                            <br>
                            <small class="text-secondary">{{ $t(`oauth.scope.${scope}.description`) }}</small>
                        </li>
                    </ul>

                    <p class="small text-secondary">{{ $t('oauth.revoke_anytime') }}</p>

                    <div class="d-flex gap-2 justify-content-end">
                        <button type="button" class="btn btn-outline-secondary" :disabled="submitting" @click="submit('abort')">{{ $t('oauth.deny') }}</button>
                        <button type="button" class="btn btn-primary" :disabled="submitting || !loggedInPlayer" @click="submit('confirm')">{{ $t('oauth.authorize') }}</button>
                    </div>
                </div>

                <p v-else class="text-center text-secondary">{{ $t('loading') }}</p>

            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.oauth-header
    display flex
    align-items flex-start
    justify-content center
    gap 1rem

.oauth-party
    flex 1 1 0
    min-width 0
    text-align center
    overflow-wrap anywhere

.oauth-link
    font-size 2rem
    line-height 64px

.oauth-logo
    width 64px
    height 64px
    object-fit contain

// Player avatar, or default icon if none
.oauth-avatar
    display inline-flex
    font-size 64px
    line-height 1

    :deep(.player-avatar)
        width 64px
        height 64px
</style>
