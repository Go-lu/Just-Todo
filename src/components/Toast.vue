<script setup>
defineProps({
  visible: Boolean,
  message: String,
  type: {
    type: String,
    default: 'success'
  }
});
</script>

<template>
  <transition name="toast-fade">
    <div v-if="visible" class="toast-container" :class="type">
      <i class="ri-checkbox-circle-fill" v-if="type === 'success'"></i>
      <i class="ri-error-warning-fill" v-if="type === 'error'"></i>
      <span>{{ message }}</span>
    </div>
  </transition>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 60px; /* Below header */
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-secondary);
  color: var(--text-color);
  padding: 10px 24px;
  border-radius: 50px; /* Capsule shape */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 9999;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid var(--border-color);
}

.toast-container.success i {
  color: var(--success-color);
  font-size: 18px;
}

.toast-container.error i {
  color: var(--danger-color);
  font-size: 18px;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style>
