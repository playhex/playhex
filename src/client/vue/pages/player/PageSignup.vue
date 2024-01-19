<script lang="ts" setup>
import { useRouter } from 'vue-router';
import useAuthStore from '../../../stores/authStore';
import { Ref, ref } from 'vue';
import { ApiClientError } from '../../../apiClient';
import { InputValidation, toInputClass } from '../../../vue/formUtils';

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
        if (!(e instanceof ApiClientError)) {
            throw e;
        }

        switch (e.type) {
            case 'pseudo_already_taken':
            case 'pseudo_too_short':
            case 'pseudo_too_long':
            case 'invalid_pseudo':
                pseudoValidation.value = { ok: false, details: e.details };
                break;

            default:
                globalError.value = e.details;
        }
    }
};
</script>

<template>
    <div class="container">
        <div class="row">
            <div class="col-sm-8 offset-sm-2 col-md-6 offset-md-3 col-lg-4 offset-lg-4">
                <form @submit="e => { e.preventDefault(); onSubmit(); }">
                    <h2 class="mt-4 text-center">Create an account</h2>

                    <div class="mb-3">
                        <label for="form-pseudo" class="form-label">Pseudo</label>
                        <input v-model="pseudo" required class="form-control form-control-lg" :class="toInputClass(pseudoValidation)" id="form-pseudo" aria-describedby="emailHelp">
                        <div class="invalid-feedback">
                            {{ pseudoValidation?.details }}
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="form-password" class="form-label">Password</label>
                        <input v-model="password" required type="password" class="form-control form-control-lg" id="form-password">
                    </div>

                    <p v-if="globalError" class="text-danger">{{ globalError }}</p>

                    <div class="text-center mt-4">
                        <button type="submit" class="btn btn-lg btn-success">Create account</button>
                    </div>
                </form>

                <div class="mt-4 text-center">
                    <p>Already have an account ? <router-link :to="{ name: 'login' }">Login instead</router-link></p>
                </div>
            </div>
        </div>
    </div>
</template>
