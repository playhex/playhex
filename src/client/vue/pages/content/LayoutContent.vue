<template>
    <div class="row g-0">
        <div class="col-12 col-sm-4 col-md-3 bg-dark-subtle">
            <nav class="nav flex-sm-column my-sm-3">
                <router-link :to="{ name: 'links' }" class="nav-link">Hex resources</router-link>
                <router-link :to="{ name: 'contribute' }" class="nav-link">{{ $t('contribute') }}</router-link>
                <router-link :to="{ name: 'privacy' }" class="nav-link">Privacy policy</router-link>
                <router-link :to="{ name: 'license' }" class="nav-link">License AGPL-3.0</router-link>
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
>>> h2, h3, h4, h5, h6
    margin-top 1em

.router-link-exact-active
    text-decoration underline

    @media (min-width: 576px)
        border-right 3px solid
</style>
