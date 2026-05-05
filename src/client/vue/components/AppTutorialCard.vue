<script setup lang="ts">
import { useTutorialControls } from '../composables/tutorialControls.js';
import { IconRocketTakeOff } from '../icons.js';

const { shouldDisplayLink, dismissTutorial } = useTutorialControls();
</script>

<template>
    <div v-if="shouldDisplayLink" class="row g-3">
        <div class="col-md-6">
            <div class="card mb-3 border-info">
                <div class="card-body">
                    <button
                        class="btn btn-sm btn-outline-secondary float-end"
                        @click="dismissTutorial"
                        type="button"
                    >✕ {{ $t('dismiss') }}</button>

                    <h5 class="card-title">
                        {{ $t('tutorial.are_you_new_to_hex') }}
                    </h5>

                    <p>{{ $t('tutorial.learn_hex_in_1_minute') }}</p>

                    <router-link
                        :to="{ name: 'tutorial' }"
                        class="btn btn-info"
                    ><IconRocketTakeOff /> {{ $t('tutorial.label') }}</router-link>
                </div>
            </div>
        </div>
    </div>
</template>
