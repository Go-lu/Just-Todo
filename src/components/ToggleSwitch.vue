<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const toggle = () => {
  if (props.disabled) return;
  const next = !props.modelValue;
  emit('update:modelValue', next);
  emit('change', next);
};
</script>

<template>
  <button
    class="toggle-switch"
    :class="{ active: modelValue, disabled }"
    type="button"
    @click="toggle"
    :aria-pressed="modelValue ? 'true' : 'false'"
    :disabled="disabled"
  >
    <span class="toggle-knob"></span>
  </button>
</template>

<style scoped lang="less">
.toggle-switch {
  width: 36px;
  height: 20px;
  background: #e0e0e0;
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s ease;
  border: 0;
  padding: 0;
  display: inline-flex;
  align-items: center;

  &:hover {
    background: #d8d8d8;
  }

  &.active {
    background: #1890ff;

    &:hover {
      background: #1677ff;
    }
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.toggle-knob {
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.toggle-switch.active .toggle-knob {
  transform: translateX(16px);
}
</style>
