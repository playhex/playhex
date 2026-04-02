<template>
    <a class="btn btn-liberapay" href="https://liberapay.com/PlayHex/" target="_blank" rel="noopener noreferrer">
        <img src="images/liberapay_logo_black.svg" alt="Logo Liberapay" height="20" />
        {{ $t('donate') }}
    </a>
</template>


<style lang="stylus" scoped>
// https://fr.liberapay.com/about/logos
.btn-liberapay
    background-color #f6c915
    color #1a171b !important
    font-weight bold

    img
        vertical-align text-bottom
</style>
