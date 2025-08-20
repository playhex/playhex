<script setup lang="ts">
import 'vue-multiselect/dist/vue-multiselect.css';
import Multiselect from 'vue-multiselect';
import { Player } from '../../../../shared/app/models';
import { ref } from 'vue';
import { getSearchPlayers } from '../../../apiClient';
import { t } from 'i18next';

defineModel<Player[]>({
    required: true,
});

defineProps({
    placeholder: {
        type: String,
        required: false,
        default: t('players'),
    },
});

const emit = defineEmits(['update:modelValue']);

const options = ref<Player[]>([]);
const loading = ref(false);

const searchPlayer = async (input: string) => {
    loading.value = true;

    const players = await getSearchPlayers({
        isBot: false,
        isGuest: false,
        nicknameLike: input,
        limit: 6,
    });

    options.value = players;
    loading.value = false;
};
</script>

<template>
    <Multiselect
        :modelValue
        @update:modelValue="(players: Player[]) => emit('update:modelValue', players)"
        trackBy="publicId"
        label="pseudo"
        :options
        @searchChange="searchPlayer"
        @open="searchPlayer('a')"
        :loading
        :multiple="true"
        :closeOnSelect="false"
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

    .multiselect__tag
        background var(--bs-success)

    .multiselect__option--selected
        background var(--bs-success)
        color var(--bs-light)

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
