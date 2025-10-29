<template>
  <div
    class="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center relative overflow-hidden"
  >
    <div class="text-center z-10 relative">
      <div class="mb-6">
        <span class="text-8xl inline-block animate-bounce">😵</span>
      </div>

      <h1
        class="text-9xl font-bold text-red-500 dark:text-red-400 mb-4"
        style="text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1)"
      >
        {{ t("error.404.notFound") }}
      </h1>
      <h2 class="text-3xl font-semibold text-primary-800 dark:text-white mb-4">
        {{ t("error.404.title") }}
      </h2>
      <p class="text-lg text-primary-600 dark:text-primary-300 mb-8 max-w-md mx-auto">
        {{ t("error.404.description") }}
      </p>

      <div class="flex flex-col sm:flex-row gap-4 justify-center mb-12">
        <router-link
          to="/"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 bg-red-500 hover:bg-red-600 text-white shadow-lg"
        >
          <span class="text-lg">🏠</span>
          {{ t("error.404.backHome") }}
        </router-link>
      </div>
    </div>

    <div class="absolute inset-0 pointer-events-none">
      <div
        class="absolute text-4xl opacity-20 animate-float"
        v-for="i in 6"
        :key="i"
        :style="{
          animationDelay: `${i * 0.5}s`,
          top: i === 1 ? '10%' : i === 2 ? '20%' : i === 3 ? '60%' : i === 4 ? '70%' : i === 5 ? '40%' : '50%',
          left: i === 1 ? '10%' : i === 3 ? '5%' : i === 5 ? '20%' : 'auto',
          right: i === 2 ? '10%' : i === 4 ? '15%' : i === 6 ? '5%' : 'auto'
        }"
      >
        {{ getRandomEmoji() }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@/hooks/useI18n";

const { t } = useI18n();

const getRandomEmoji = () => {
  const emojis = ["🚀", "💻", "⚡", "🎯", "🌟", "💡", "🔧", "📱"];
  return emojis[Math.floor(Math.random() * emojis.length)];
};
</script>

<style scoped lang="scss">
@keyframes float {
  0%,
  100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}
</style>
