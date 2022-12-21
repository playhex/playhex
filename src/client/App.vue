<template>
  <ul>
    <li>
      <router-link to="/">Home</router-link>
    </li>
    <li>
      <router-link to="/play-vs-ai">Play vs AI</router-link>
    </li>
    <li>
      <router-link to="/play-1v1-same-screen">Play 1v1 same screen</router-link>
    </li>
  </ul>
  <router-view></router-view>
</template>

<script>
export default {};
</script>

<style>
</style>
