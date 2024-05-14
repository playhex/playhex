<script lang="ts" setup>
import { useRouter } from 'vue-router';
import useAuthStore from '../../../stores/authStore';
import { Ref, ref } from 'vue';
import { ApiClientError } from '../../../apiClient';
import { InputValidation, toInputClass } from '../../../vue/formUtils';
import { useSeoMeta } from '@unhead/vue';

useSeoMeta({
    titleTemplate: title => `Log in - ${title}`,
    description: 'Log in to your PlayHex account.',
});

const pseudo = ref('');
const password = ref('');

const pseudoValidation: Ref<InputValidation> = ref(null);
const passwordValidation: Ref<InputValidation> = ref(null);
const globalError: Ref<null | string> = ref(null);

const router = useRouter();

const onSubmit = async () => {
    pseudoValidation.value = null;
    passwordValidation.value = null;
    globalError.value = null;

    try {
        await useAuthStore().login(pseudo.value, password.value);

        router.push({ name: 'home' });
    } catch (e) {
        if (!(e instanceof ApiClientError)) {
            throw e;
        }

        switch (e.type) {
            case 'pseudo_already_taken':
            case 'pseudo_too_short':
            case 'pseudo_too_long':
            case 'pseudo_not_existing':
                pseudoValidation.value = { ok: false, reason: e.reason };
                break;

            case 'invalid_password':
                pseudoValidation.value = { ok: true };
                passwordValidation.value = { ok: false, reason: e.reason };
                break;

            default:
                globalError.value = e.reason;
        }
    }
};
</script>

<template>
    <div class="container">
        <div class="row">
            <div class="col-sm-8 offset-sm-2 col-md-6 offset-md-3 col-lg-4 offset-lg-4">
                <form @submit="e => { e.preventDefault(); onSubmit(); }">
                    <h2 class="mt-4 text-center">{{ $t('log_in') }}</h2>

                    <div class="mb-3">
                        <label for="form-pseudo" class="form-label">{{ $t('username') }}</label>
                        <input v-model="pseudo" required class="form-control form-control-lg" :class="toInputClass(pseudoValidation)" id="form-pseudo" aria-describedby="emailHelp">
                        <div class="invalid-feedback">
                            {{ pseudoValidation?.reason }}
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="form-password" class="form-label">{{ $t('password') }}</label>
                        <input v-model="password" required type="password" class="form-control form-control-lg" :class="toInputClass(passwordValidation)" id="form-password">
                        <div class="invalid-feedback">
                            {{ passwordValidation?.reason }}
                        </div>
                    </div>

                    <p v-if="globalError" class="text-danger">{{ globalError }}</p>

                    <div class="text-center mt-4">
                        <button type="submit" class="btn btn-lg btn-primary">{{ $t('log_in') }}</button>
                    </div>
                </form>

                <div class="mt-4 text-center">
                    <i18next :translation="$t('no_account_sign_up_instead')">
                        <template #signUp>
                            <router-link :to="{ name: 'signup' }">{{ $t('no_account_sign_up_instead_link_label') }}</router-link>
                        </template>
                    </i18next>
                </div>
            </div>
        </div>
    </div>
</template>
