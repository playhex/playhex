<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import useAuthStore from '../../../stores/authStore.js';
import { apiGetVideoMetadata, apiPostVideo } from '../../../apiClient.js';
import AppBreadcrumb from '../../components/AppBreadcrumb.vue';
import { videoSubmitBreadcrumb } from '../services/videoBreadcrumb.js';
import { formatVideoDuration, parseVideoDuration } from '../../../../shared/app/videos/duration.js';
import { isHttpUrl, isValidVideoPublishedAt, maxVideoPublishedAt, VIDEO_AUTHOR_NAME_MAX_LENGTH, VIDEO_KEYWORDS_MAX_LENGTH, VIDEO_TITLE_MAX_LENGTH, VIDEO_URL_MAX_LENGTH, validateVideoInput, type VideoInput } from '../../../../shared/app/videos/videoInput.js';
import { apiErrorMessage } from '../../../services/apiErrorMessage.js';

useHead({
    title: t('videos.submit'),
});

const { loggedInPlayer } = storeToRefs(useAuthStore());

/*
 * Prefill from a video link
 */
const prefilling = ref(false);
const prefillError = ref<null | string>(null);

const canPrefill = computed(() => isHttpUrl(url.value.trim()));

/*
 * Form
 */
const url = ref('');
const title = ref('');
const authorName = ref('');
const duration = ref('');
/**
 * "YYYY-MM-DD" from date input, empty if unknown.
 */
const publishedAt = ref('');
const keywords = ref('');

const thumbnailMode = ref<'url' | 'file'>('url');
const thumbnailUrl = ref('');
const thumbnailFile = ref<null | File>(null);
const thumbnailFilePreview = ref<null | string>(null);

const onThumbnailFileChange = (event: Event): void => {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;

    if (thumbnailFilePreview.value !== null) {
        URL.revokeObjectURL(thumbnailFilePreview.value);
    }

    thumbnailFile.value = file;
    thumbnailFilePreview.value = file === null ? null : URL.createObjectURL(file);
};

const thumbnailPreview = computed((): null | string => {
    if (thumbnailMode.value === 'file') {
        return thumbnailFilePreview.value;
    }

    return isHttpUrl(thumbnailUrl.value) ? thumbnailUrl.value : null;
});

/**
 * Fills form with what source provides, keeps other fields as they are.
 */
const prefill = async (): Promise<void> => {
    prefillError.value = null;
    prefilling.value = true;
    url.value = url.value.trim();

    try {
        const metadata = await apiGetVideoMetadata(url.value);

        url.value = metadata.url;

        if (metadata.title !== '') {
            title.value = metadata.title;
        }

        if (metadata.authorName !== '') {
            authorName.value = metadata.authorName;
        }

        if (metadata.durationSeconds !== null) {
            duration.value = formatVideoDuration(metadata.durationSeconds);
        }

        if (metadata.keywords !== '') {
            keywords.value = metadata.keywords;
        }

        if (metadata.publishedAt !== null) {
            publishedAt.value = metadata.publishedAt;
        }

        if (metadata.thumbnailUrl !== null) {
            thumbnailMode.value = 'url';
            thumbnailUrl.value = metadata.thumbnailUrl;
        }
    } catch (e) {
        prefillError.value = apiErrorMessage(e);
    } finally {
        prefilling.value = false;
    }
};

/*
 * Submit
 */
const submitting = ref(false);
const submitError = ref<null | string>(null);
const submitted = ref(false);

const durationSeconds = computed(() => parseVideoDuration(duration.value));

const input = computed((): VideoInput => ({
    url: url.value.trim(),
    title: title.value.trim(),
    authorName: authorName.value.trim(),
    durationSeconds: durationSeconds.value ?? 0,
    publishedAt: publishedAt.value === '' ? null : publishedAt.value,
    keywords: keywords.value.trim(),
}));

const hasThumbnail = computed(() => thumbnailMode.value === 'file'
    ? thumbnailFile.value !== null
    : isHttpUrl(thumbnailUrl.value),
);

const canSubmit = computed(() => validateVideoInput(input.value).length === 0 && hasThumbnail.value && !submitting.value);

const resetForm = (): void => {
    url.value = '';
    title.value = '';
    authorName.value = '';
    duration.value = '';
    publishedAt.value = '';
    keywords.value = '';
    thumbnailUrl.value = '';
    thumbnailFile.value = null;

    if (thumbnailFilePreview.value !== null) {
        URL.revokeObjectURL(thumbnailFilePreview.value);
        thumbnailFilePreview.value = null;
    }
};

const submit = async (): Promise<void> => {
    if (!canSubmit.value) {
        return;
    }

    submitError.value = null;
    submitting.value = true;

    try {
        await apiPostVideo(
            input.value,
            thumbnailMode.value === 'file' && thumbnailFile.value !== null
                ? { file: thumbnailFile.value }
                : { url: thumbnailUrl.value },
        );

        submitted.value = true;
        resetForm();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        submitError.value = apiErrorMessage(e);
    } finally {
        submitting.value = false;
    }
};
</script>

<template>
    <div class="container my-3">
        <AppBreadcrumb :items="videoSubmitBreadcrumb()" />

        <h1>{{ $t('videos.submit') }}</h1>

        <p class="text-body-secondary">{{ $t('videos.submit_description') }}</p>

        <div v-if="null === loggedInPlayer || loggedInPlayer.isGuest" class="alert alert-info">
            {{ $t('videos.must_be_logged_in') }}
            <router-link :to="{ name: 'login' }">{{ $t('log_in') }}</router-link>
            ·
            <router-link :to="{ name: 'signup' }">{{ $t('sign_up') }}</router-link>
        </div>

        <div v-else-if="submitted" class="alert alert-success">
            <p>{{ $t('videos.submitted') }}</p>
            <div class="d-flex flex-wrap gap-2">
                <button type="button" class="btn btn-success" @click="submitted = false">{{ $t('videos.submit_another') }}</button>
                <router-link :to="{ name: 'videos' }" class="btn btn-outline-secondary">{{ $t('videos.back_to_list') }}</router-link>
            </div>
        </div>

        <template v-else>
            <form @submit.prevent="submit">
                <div class="mb-3">
                    <label for="video-url" class="form-label">{{ $t('videos.field_url') }}</label>
                    <div class="input-group">
                        <input
                            id="video-url"
                            v-model="url"
                            type="url"
                            class="form-control"
                            required
                            :maxlength="VIDEO_URL_MAX_LENGTH"
                            placeholder="https://…"
                            aria-describedby="video-url-help"
                        />
                        <button type="button" class="btn btn-primary" :disabled="!canPrefill || prefilling" @click="prefill">
                            <span v-if="prefilling" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                            {{ $t('videos.prefill') }}
                        </button>
                    </div>
                    <small id="video-url-help" class="form-text">{{ $t('videos.prefill_help') }}</small>
                    <div v-if="prefillError" class="text-danger mt-1">{{ prefillError }}</div>
                </div>

                <div class="mb-3">
                    <label for="video-title" class="form-label">{{ $t('videos.field_title') }}</label>
                    <input id="video-title" v-model="title" type="text" class="form-control" required :maxlength="VIDEO_TITLE_MAX_LENGTH" />
                </div>

                <div class="row">
                    <div class="col-sm-6 mb-3">
                        <label for="video-author" class="form-label">{{ $t('videos.field_author') }}</label>
                        <input id="video-author" v-model="authorName" type="text" class="form-control" required :maxlength="VIDEO_AUTHOR_NAME_MAX_LENGTH" />
                    </div>

                    <div class="col-6 col-sm-3 mb-3">
                        <label for="video-duration" class="form-label">{{ $t('videos.field_duration') }}</label>
                        <input
                            id="video-duration"
                            v-model="duration"
                            type="text"
                            inputmode="numeric"
                            class="form-control"
                            :class="{ 'is-invalid': duration !== '' && (null === durationSeconds || durationSeconds < 1) }"
                            required
                            placeholder="h:mm:ss"
                        />
                    </div>

                    <div class="col-6 col-sm-3 mb-3">
                        <label for="video-published-at" class="form-label">{{ $t('videos.field_published_at') }} <small class="text-body-secondary">({{ $t('videos.optional') }})</small></label>
                        <input
                            id="video-published-at"
                            v-model="publishedAt"
                            type="date"
                            class="form-control"
                            :class="{ 'is-invalid': publishedAt !== '' && !isValidVideoPublishedAt(publishedAt) }"
                            :max="maxVideoPublishedAt()"
                        />
                    </div>
                </div>

                <div class="mb-3">
                    <label for="video-keywords" class="form-label">{{ $t('videos.field_keywords') }} <small class="text-body-secondary">({{ $t('videos.optional') }})</small></label>
                    <textarea id="video-keywords" v-model="keywords" class="form-control" rows="2" :maxlength="VIDEO_KEYWORDS_MAX_LENGTH" aria-describedby="video-keywords-help"></textarea>
                    <small id="video-keywords-help" class="form-text">{{ $t('videos.field_keywords_help') }}</small>
                </div>

                <fieldset class="mb-3">
                    <legend class="form-label fs-6">{{ $t('videos.field_thumbnail') }}</legend>

                    <div class="btn-group mb-2" role="group">
                        <input id="video-thumbnail-mode-url" v-model="thumbnailMode" value="url" type="radio" class="btn-check" autocomplete="off" />
                        <label for="video-thumbnail-mode-url" class="btn btn-sm btn-outline-secondary">{{ $t('videos.thumbnail_from_url') }}</label>

                        <input id="video-thumbnail-mode-file" v-model="thumbnailMode" value="file" type="radio" class="btn-check" autocomplete="off" />
                        <label for="video-thumbnail-mode-file" class="btn btn-sm btn-outline-secondary">{{ $t('videos.thumbnail_upload') }}</label>
                    </div>

                    <input
                        v-if="thumbnailMode === 'url'"
                        v-model="thumbnailUrl"
                        type="url"
                        class="form-control"
                        placeholder="https://…/image.jpg"
                        :aria-label="$t('videos.thumbnail_from_url')"
                    />
                    <input
                        v-else
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        class="form-control"
                        :aria-label="$t('videos.thumbnail_upload')"
                        @change="onThumbnailFileChange"
                    />

                    <div v-if="thumbnailPreview" class="thumbnail-preview ratio ratio-16x9 mt-2">
                        <img :src="thumbnailPreview" alt="" class="object-fit-cover rounded" />
                    </div>
                </fieldset>

                <div v-if="submitError" class="alert alert-danger">{{ submitError }}</div>

                <button type="submit" class="btn btn-success" :disabled="!canSubmit">{{ $t('videos.submit_button') }}</button>
            </form>
        </template>
    </div>
</template>

<style lang="stylus" scoped>
.thumbnail-preview
    max-width 320px
</style>
