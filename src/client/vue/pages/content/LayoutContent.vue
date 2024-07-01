<template>
    <div class="row g-0">
        <div class="col-12 col-sm-4 col-md-3 bg-dark-subtle">
            <nav class="nav flex-sm-column my-sm-3">
                <router-link class="nav-link" :to="{ name: 'links' }">Hex resources</router-link>
                <router-link class="nav-link" :to="{ name: 'contribute' }">{{ $t('contribute') }}</router-link>
                <router-link class="nav-link" :to="{ name: 'analysis-details' }">How analysis are done</router-link>
                <router-link class="nav-link" :to="{ name: 'privacy' }">Privacy policy</router-link>
                <router-link class="nav-link" :to="{ name: 'license' }">License AGPL-3.0</router-link>
            </nav>
        </div>
        <div class="col-12 col-sm-8 col-md-9 col-lg-6">
            <div class="container my-3">
                <router-view />
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
:deep() h2, h3, h4, h5, h6
    margin-top 1em

.router-link-exact-active
    text-decoration underline

    @media (min-width: 576px)
        border-right 3px solid
</style>
