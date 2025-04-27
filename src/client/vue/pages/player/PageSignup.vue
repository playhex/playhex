<script lang="ts" setup>
import { useRouter } from 'vue-router';
import useAuthStore from '../../../stores/authStore.js';
import { Ref, ref } from 'vue';
import { InputValidation, toInputClass } from '../../../vue/formUtils.js';
import { useSeoMeta } from '@unhead/vue';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';

useSeoMeta({
    title: 'Sign up',
    description: 'Create an account to keep the history of Hex games you played.',
});

const pseudo = ref('');
const password = ref('');

const pseudoValidation: Ref<InputValidation> = ref(null);
const globalError: Ref<null | string> = ref(null);

const router = useRouter();

const onSubmit = async () => {
    pseudoValidation.value = null;
    globalError.value = null;

    try {
        await useAuthStore().signup(pseudo.value, password.value);

        router.push({ name: 'home' });
    } catch (e) {
        if (!(e instanceof DomainHttpError)) {
            throw e;
        }

        switch (e.type) {
            case 'pseudo_already_taken':
            case 'pseudo_too_short':
            case 'pseudo_too_long':
            case 'invalid_pseudo':
                pseudoValidation.value = { ok: false, reason: e.type };
                break;

            default:
                globalError.value = e.type;
        }
    }
};
</script>

<template>
    <div class="container">
        <div class="row">
            <div class="col-sm-8 offset-sm-2 col-md-6 offset-md-3 col-lg-4 offset-lg-4">
                <form @submit="e => { e.preventDefault(); onSubmit(); }">
                    <h2 class="mt-4 text-center">{{ $t('create_account') }}</h2>

                    <div class="mb-3">
                        <label for="form-pseudo" class="form-label">{{ $t('username') }}</label>
                        <input v-model="pseudo" required class="form-control form-control-lg" :class="toInputClass(pseudoValidation)" id="form-pseudo" aria-describedby="usernameHelp usernameEmailWarning">
                        <div v-if="pseudoValidation?.reason" id="usernameHelp" class="invalid-feedback">
                            {{ $t(pseudoValidation.reason) }}
                        </div>
                        <div id="usernameEmailWarning" class="form-text text-warning">
                            <span v-if="pseudo.match(/@/)">{{ $t('username_not_an_email_warning') }}</span>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="form-password" class="form-label">{{ $t('password') }}</label>
                        <input v-model="password" required type="password" class="form-control form-control-lg" id="form-password">
                    </div>

                    <p v-if="globalError" class="text-danger">{{ globalError }}</p>

                    <div class="text-center mt-4">
                        <button type="submit" class="btn btn-lg btn-success">{{ $t('sign_up') }}</button>
                    </div>
                </form>

                <div class="mt-4 text-center">
                    <p>
                        <i18next :translation="$t('already_have_account_login_instead')">
                            <template #login>
                                <router-link :to="{ name: 'login' }">{{ $t('already_have_account_login_instead_link_label') }}</router-link>
                            </template>
                        </i18next>
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>
