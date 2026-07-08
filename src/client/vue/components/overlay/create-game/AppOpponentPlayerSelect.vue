<script setup lang="ts">
import 'vue-multiselect/dist/vue-multiselect.css';
import Multiselect from 'vue-multiselect';
import { Player } from '../../../../../shared/app/models/index.js';
import { ref } from 'vue';
import { getSearchPlayers } from '../../../../apiClient.js';
import { t } from 'i18next';

const model = defineModel<null | Player>({
    required: true,
});

defineProps({
    placeholder: {
        type: String,
        required: false,
        default: t('challenge_player'),
    },
});

const options = ref<Player[]>([]);
const loading = ref(false);

const searchPlayer = async (input: string) => {
    loading.value = true;

    const players = await getSearchPlayers({
        isBot: false,
        nicknameLike: input,
        limit: 6,
    });

    options.value = players;
    loading.value = false;
};
</script>

<template>
    <Multiselect
        v-model="model"
        trackBy="publicId"
        label="pseudo"
        :options
        @searchChange="searchPlayer"
        @open="searchPlayer('a')"
        :loading
        :multiple="false"
        :closeOnSelect="true"
        :placeholder
        :aria-label="placeholder"
    />
</template>

<style lang="stylus" scoped>
.multiselect :deep()
    .multiselect__tags
        background var(--bs-body-bg)
        color var(--bs-body-color)

    .multiselect__content-wrapper
        background var(--bs-body-bg)
        border var(--bs-border-width) solid var(--bs-border-color)
        color var(--bs-body-color)

    .multiselect__input
        background var(--bs-body-bg)
        color var(--bs-body-color)

    .multiselect__single
        background var(--bs-body-bg)
        color var(--bs-body-color)

    .multiselect__tags
        border var(--bs-border-width) solid var(--bs-border-color)

    .multiselect__option--highlight,
    .multiselect__option--highlight::after
        background var(--bs-secondary-bg)
        color var(--bs-body-color)

    .multiselect__option--selected.multiselect__option--highlight,
    .multiselect__option--selected.multiselect__option--highlight::after
        background var(--bs-danger)
        color var(--bs-light)

    .multiselect__spinner
        background var(--bs-body-bg)
</style>
