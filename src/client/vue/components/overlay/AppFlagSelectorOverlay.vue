<script setup lang="ts">
import { useDisclosure } from '@overlastic/vue';
import { PropType } from 'vue';
import AppFlagSelector from '../AppFlagSelector.vue';

const { visible, confirm, cancel } = useDisclosure();

defineProps({
    modelValue: {
        type: [String, null] as PropType<string | null>,
        default: null,
    },
});
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block" @click="cancel()">
            <div class="modal-dialog modal-dialog-centered" @click="e => e.stopPropagation()">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ $t('country_flag.title') }}</h5>
                        <button type="button" class="btn-close" @click="cancel()"></button>
                    </div>
                    <div class="modal-body">
                        <p>{{ $t('country_flag.explain') }}</p>

                        <AppFlagSelector
                            :modelValue="modelValue"
                            @update:modelValue="flag => confirm(flag)"
                        />
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-backdrop show" @click="cancel()"></div>
    </div>
</template>
