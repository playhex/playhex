<template>
    <div class="card mt-3 mb-3 chill-card text-white">
        <img src="/images/playhex-chill.jpg" alt="" class="card-img" loading="lazy">
        <span class="badge text-bg-warning experimental">{{ $t('experimental') }}</span>
        <div class="card-img-overlay d-flex flex-column justify-content-end p-0">
            <div class="caption p-2">
                <a href="https://chill.playhex.org/" class="stretched-link text-white text-decoration-none fw-semibold">PlayHex Chill</a>
                <p class="m-0"><small>{{ $t('playhex_chill_description') }}</small></p>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.chill-card
    overflow hidden

    .card-img
        aspect-ratio 480 / 252
        object-fit cover

    .experimental
        position absolute
        top 0.5rem
        right 0.5rem

    .caption
        background linear-gradient(transparent, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.6) 100%)
        padding-top 1rem !important
</style>
