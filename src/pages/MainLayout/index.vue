<template>
  <div class="main-layout">
    <NavigationTabs />
    <div class="content-area">
      <router-view />
    </div>
    <AppToastHost />
  </div>
</template>

<script setup lang="ts">
import NavigationTabs from '@/components/NavigationTabs/NavigationTabs.vue'
import AppToastHost from '@/components/AppToast/AppToastHost.vue'
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
  background: var(--bg-color1, #181818);
}

.content-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
