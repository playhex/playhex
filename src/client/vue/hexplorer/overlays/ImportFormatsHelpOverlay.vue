<script setup lang="ts">
import { ref, PropType } from 'vue';
import { useDisclosure } from '@overlastic/vue';

const { visible, confirm, cancel } = useDisclosure();

const props = defineProps({
    onImport: {
        type: Function as PropType<(source: string) => Promise<{ ok: true } | { ok: false, error: string }>>,
        required: true,
    },
});

const importInput = ref('');
const importError = ref<string | null>(null);
const importLoading = ref(false);

const doImport = async () => {
    const source = importInput.value.trim();
    if (!source) return;

    importError.value = null;
    importLoading.value = true;

    const result = await props.onImport(source);

    importLoading.value = false;

    if (result.ok) {
        confirm();
    } else {
        importError.value = result.error;
    }
};
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block" @click="cancel()">
            <div class="modal-dialog" @click="e => e.stopPropagation()">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ $t('hexplorer.import_a_game') }}</h5>
                        <button type="button" class="btn-close" @click="cancel()"></button>
                    </div>
                    <div class="modal-body">
                        <textarea
                            v-model="importInput"
                            class="form-control mb-2"
                            rows="4"
                            :placeholder="$t('hexplorer.import_placeholder')"
                            autofocus
                            @keydown.ctrl.enter.prevent="doImport()"
                        ></textarea>
                        <div v-if="importError" class="text-danger small mb-2">{{ importError }}</div>
                        <button
                            class="btn btn-outline-info btn-sm w-100"
                            :disabled="importLoading || !importInput.trim()"
                            @click="doImport()"
                        >{{ importLoading ? $t('loading') : $t('hexplorer.import') }}</button>

                        <hr>

                        <h6>{{ $t('hexplorer.formats_supported') }}</h6>

                        <dl class="formats-list mb-0">
                            <dt>{{ $t('hexplorer.move_list') }}</dt>
                            <dd class="text-muted small">a5 swap-pieces d4 f7</dd>

                            <dt>SGF</dt>
                            <dd class="text-muted small">(;FF[4]...;B[f3];W[swap-pieces];B[d4]...)</dd>

                            <dt>SGF (Little Golem ".hsgf")</dt>
                            <dd class="text-muted small">(;FF[4]...;B[ii];W[swap];B[dc]...)</dd>

                            <dt>{{ $t('hexplorer.playhex_link') }}</dt>
                            <dd class="text-muted small">https://playhex.org/games/0d1f8e8c-3000-49ff-831a-84c20e514528</dd>

                            <dt>{{ $t('hexplorer.hexworld_link') }}</dt>
                            <dd class="text-muted small">https://hexworld.org/board/#11r9c1,b4:sh4g8i8h3g4g3i3j1j3k1i2i1</dd>

                            <dt>{{ $t('hexplorer.abstract_play_url') }}</dt>
                            <dd class="text-muted small">https://play.abstractplay.com/move/hex/1/ea92a01f-3000-49ff-831a-84c20e514528</dd>

                            <dt>{{ $t('hexplorer.abstract_play_debug') }}</dt>
                            <dd class="text-muted small">{"game":"hex","numplayers":2,...}</dd>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>

<style lang="stylus" scoped>
.formats-list
    margin 0

    dt
        font-weight 600
        margin-top 0.6rem

        &:first-child
            margin-top 0

    dd
        margin 0 0 0.2rem 0
</style>
