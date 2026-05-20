<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { countryCodeToFlag, getSuggestedFlags } from '../../services/flagUtils.js';
import { countryCodesISO3166 } from '../../../shared/app/codes.js';
import { autoLocale } from '../../../shared/app/i18n/index.js';

defineProps<{
    modelValue: string | null;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: string | null): void;
}>();

const search = ref('');
const suggestedFlags = ref<string[]>([]);

onMounted(() => {
    suggestedFlags.value = getSuggestedFlags();
});

const regionNames = new Intl.DisplayNames([autoLocale()], { type: 'region' });

const allCountries = computed(() =>
    countryCodesISO3166.map(code => ({
        code,
        flag: countryCodeToFlag(code),
        name: regionNames.of(code) ?? code,
    })),
);

const filteredCountries = computed(() => {
    const q = search.value.trim().toLowerCase();
    if (!q) return allCountries.value;
    return allCountries.value.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
});

const select = (flag: string | null) => {
    emit('update:modelValue', flag);
};
</script>

<template>
    <div class="root">
        <div v-if="suggestedFlags.length > 0" class="mb-2">
            <small class="text-body-secondary d-block mb-1">{{ $t('country_flag.suggestions') }}</small>
            <div class="d-flex flex-wrap gap-1">
                <button
                    v-for="flag in suggestedFlags"
                    :key="flag"
                    type="button"
                    class="btn btn-sm"
                    :class="modelValue === flag ? 'btn-primary' : 'btn-outline-secondary'"
                    @click="select(flag)"
                >{{ flag }}</button>
            </div>
        </div>

        <div class="mt-2">
            <small class="text-body-secondary d-block mb-1">{{ $t('country_flag.all_countries') }}</small>
            <input
                v-model="search"
                type="search"
                class="form-control form-control-sm mb-2"
                :placeholder="$t('country_flag.search_placeholder')"
            />
            <div v-if="search.length > 0" class="flag-grid">
                <button
                    v-for="country in filteredCountries"
                    :key="country.code"
                    type="button"
                    class="btn btn-sm flag-btn"
                    :class="modelValue === country.flag ? 'btn-primary' : 'btn-outline-secondary'"
                    :title="country.name"
                    @click="select(country.flag)"
                >{{ country.flag }}</button>
            </div>
        </div>

        <div v-if="modelValue" class="mt-2">
            <button type="button" class="btn btn-sm btn-outline-danger" @click="select(null)">
                {{ $t('country_flag.remove') }}
            </button>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.root
    max-width 35em

.flag-grid
    display flex
    flex-wrap wrap
    gap 0.25rem
    max-height 8rem
    overflow-y auto

.flag-btn
    font-size 1.25rem
    line-height 1
    padding 0.2rem 0.3rem
    border-color transparent
</style>
