<script setup lang="ts">
import { useDisclosure } from '@overlastic/vue';

const { visible, confirm, cancel } = useDisclosure();
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block" @click="cancel()">
            <div class="modal-dialog" @click="e => e.stopPropagation()">
                <form class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Correspondence game</h5>
                        <button type="button" class="btn-close" @click="cancel()"></button>
                    </div>
                    <div class="modal-body">
                        <p>
                            You are about to join a <strong>correspondence</strong> game,
                            it will last for days.
                            However, you are currently using a <strong>guest</strong> session,
                            which is not reliable: you may lose it.
                        </p>
                        <p class="lead">
                            You may want to <router-link :to="{ name: 'login' }" @click="cancel()">login</router-link>,
                            or <router-link :to="{ name: 'signup' }" @click="cancel()">create an account</router-link> first.
                        </p>
                    </div>
                    <div class="modal-footer justify-content-center">
                        <button
                            type="button"
                            class="btn btn-outline-primary"
                            @click="cancel()"
                        >Cancel</button>
                        <router-link
                            :to="{ name: 'login' }"
                            @click="cancel()"
                            class="btn btn-outline-success"
                        >Login</router-link>
                        <button
                            type="button"
                            class="btn btn-warning"
                            @click="confirm()"
                        >Join anyway</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
