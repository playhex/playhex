<template>
    <div class="row g-0">
        <div class="col-12 col-sm-4 col-md-3 bg-dark-subtle">
            <nav class="nav flex-sm-column mt-sm-4">
                <router-link :to="{ name: 'links' }" class="nav-link">Hex resources</router-link>
                <router-link :to="{ name: 'license' }" class="nav-link">License AGPL-3.0</router-link>
            </nav>
        </div>
        <div class="col-12 col-sm-8 col-md-9">
            <div class="container">
                <router-view></router-view>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.router-link-exact-active
    text-decoration underline

    @media (min-width: 576px)
        border-right 3px solid
</style>
