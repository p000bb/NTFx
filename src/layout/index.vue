<template>
  <div>
    <!-- <Header /> -->
    <router-view v-slot="{ Component, route }">
      <transition name="el-fade-in" mode="out-in">
        <keep-alive :include="cachedViews">
          <component :is="Component" :key="route.path" class="app-container-grow" />
        </keep-alive>
      </transition>
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import Header from "./components/header.vue";

const route = useRoute();

const cachedViews = computed(() => {
  return route.matched.filter((item) => item.meta.keepAlive).map((item) => item.name);
}) as any;
</script>

<style scoped lang="scss"></style>
