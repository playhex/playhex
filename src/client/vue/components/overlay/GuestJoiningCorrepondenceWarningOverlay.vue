<script setup lang="ts">
import { useExtendOverlay } from '@overlastic/vue';

const { visible, resolve, reject } = useExtendOverlay();
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block" @click="reject()">
            <div class="modal-dialog" @click="e => e.stopPropagation()">
                <form class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Correspondence game</h5>
                        <button type="button" class="btn-close" @click="reject()"></button>
                    </div>
                    <div class="modal-body">
                        <p>
                            You are about to join a <strong>correspondence</strong> game,
                            it will last for days.
                            However, you are currently using a <strong>guest</strong> session,
                            which is not reliable: you may lose it.
                        </p>
                        <p class="lead">
                            You may want to <router-link :to="{ name: 'login' }" @click="reject()">login</router-link>,
                            or <router-link :to="{ name: 'signup' }" @click="reject()">create an account</router-link> first.
                        </p>
                    </div>
                    <div class="modal-footer justify-content-center">
                        <button
                            type="button"
                            class="btn btn-outline-primary"
                            @click="reject()"
                        >Cancel</button>
                        <router-link
                            :to="{ name: 'login' }"
                            @click="reject()"
                            class="btn btn-outline-success"
                        >Login</router-link>
                        <button
                            type="button"
                            class="btn btn-warning"
                            @click="resolve()"
                        >Join anyway</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
