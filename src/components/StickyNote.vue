<script setup>
import { ref, onMounted, watch } from 'vue';
import TodoList from './TodoList.vue';

const props = defineProps({
  todos: {
    type: Array,
    default: () => []
  },
  categories: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits([
  'update:todos', 
  'open-add-task', 
  'update-todo', 
  'context-menu', 
  'item-click',
  'close' // For closing the window
]);

const isAlwaysOnTop = ref(true);
const opacity = ref(1);
const menuVisible = ref(false);

// Helper functions for window control
const setWindowOpacity = (val) => {
  // 1. Try preload service
  if (window.services && window.services.setOpacity) {
    window.services.setOpacity(val);
    return;
  }
  // 2. Try direct electron access
  try {
    if (window.require) {
        const { remote } = window.require('electron');
        if (remote) remote.getCurrentWindow().setOpacity(val);
    }
  } catch (e) {
    console.error('Failed to set opacity', e);
  }
};

const setWindowTop = (flag) => {
  // 1. Try preload service
  if (window.services && window.services.setAlwaysOnTop) {
    window.services.setAlwaysOnTop(flag);
    return;
  }
  // 2. Try direct electron access
  try {
     if (window.require) {
         const { remote } = window.require('electron');
         if (remote) remote.getCurrentWindow().setAlwaysOnTop(flag);
     }
  } catch (e) {
      console.error('Failed to set always on top', e);
      // 3. Fallback to uTools API (mostly for main window, but worth a try)
      if (window.utools && window.utools.setAlwaysOnTop) {
          window.utools.setAlwaysOnTop(flag);
      }
  }
};

// Initialize window state if possible
onMounted(() => {
   document.documentElement.style.backgroundColor = 'transparent';
   document.body.style.backgroundColor = 'transparent';
   // setWindowOpacity(opacity.value);
   setWindowTop(isAlwaysOnTop.value);
});

const toggleMenu = () => {
  menuVisible.value = !menuVisible.value;
};

const handleClose = () => {
  window.close(); // Close this window
};

const togglePin = () => {
  isAlwaysOnTop.value = !isAlwaysOnTop.value;
  setWindowTop(isAlwaysOnTop.value);
};

const updateOpacity = (e) => {
  const val = parseFloat(e.target.value);
  opacity.value = val;
  // setWindowOpacity(val);
};

// Close menu when clicking outside
const closeMenu = (e) => {
    if (!e.target.closest('.menu-container') && !e.target.closest('.menu-btn')) {
        menuVisible.value = false;
    }
}

onMounted(() => {
    document.addEventListener('click', closeMenu);
})

</script>

<template>
  <div class="sticky-note" :style="{ opacity: opacity }">
    <div class="sticky-header">
      <div class="drag-handle">
        <i class="ri-sticky-note-line"></i> 待办便签
      </div>
      <div class="window-controls">
        <button class="icon-btn menu-btn" @click.stop="toggleMenu" title="设置">
          <i class="ri-more-fill"></i>
        </button>
        <button class="icon-btn close-btn" @click="handleClose" title="关闭">
          <i class="ri-close-line"></i>
        </button>
      </div>
      
      <!-- Independent Menu -->
      <div class="menu-popup" v-if="menuVisible" @click.stop>
        <div class="menu-item">
          <span>置顶</span>
          <div class="toggle-switch" :class="{ active: isAlwaysOnTop }" @click="togglePin">
            <div class="toggle-knob"></div>
          </div>
        </div>
        <div class="menu-item opacity-item">
          <span>透明度</span>
          <div class="slider-wrapper">
            <input 
              type="range" 
              min="0.05" 
              max="1" 
              step="0.01" 
              :value="opacity" 
              @input="updateOpacity"
              class="slider"
              :style="{ '--percent': (opacity - 0.05) / 0.95 }"
            >
          </div>
          <span class="value-text">{{ Math.round(opacity * 100) }}%</span>
        </div>
      </div>
    </div>
    
    <div class="sticky-body">
       <TodoList 
         :todos="todos" 
         :categories="categories"
         categoryId="all"
         :sortState="{ field: 'default', order: 'asc' }"
         @update:todos="(val) => emit('update:todos', val)"
         @update-todo="(val) => emit('update-todo', val)"
         @open-add-task="emit('open-add-task')"
         @context-menu="(val) => emit('context-menu', val)"
         @item-click="(val) => emit('item-click', val)"
       />
    </div>
  </div>
</template>

<style scoped lang="less">
.sticky-note {
  width: 100vw;
  height: 100vh;
  background-color: #fff; /* Changed to white for better TodoList contrast */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border: 1px solid #e0e0e0;
}

.sticky-header {
  height: 32px;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  border-bottom: 1px solid #e0e0e0;
  position: relative;
  flex-shrink: 0;
  
  .drag-handle {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: center;
    font-size: 12px;
    color: #666;
    gap: 6px;
    -webkit-app-region: drag; /* Electron drag region */
    user-select: none;
    cursor: default;
  }
  
  .window-controls {
    display: flex;
    gap: 4px;
    -webkit-app-region: no-drag;
  }
}

.icon-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #666;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: rgba(0,0,0,0.05);
    color: #333;
  }
  
  &.close-btn:hover {
    background-color: #ff4d4f;
    color: white;
  }
}

.sticky-body {
  flex: 1;
  overflow: hidden; /* TodoList handles scrolling */
  position: relative;
  
  /* Override TodoList padding if necessary via deep selector or wrapper */
  :deep(.todo-list-container) {
    padding: 0;
    
    .timeline-content {
      padding: 10px 8px; /* Reduce padding */
    }
  }
}

.menu-popup {
  position: absolute;
  top: 36px;
  right: 8px;
  width: 180px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  padding: 8px;
  z-index: 1000;
  border: 1px solid #eee;
  animation: fadeIn 0.2s ease;
  
  .menu-item {
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    color: #333;
    
    &.opacity-item {
      justify-content: flex-start;
      gap: 12px;
    }

    .slider-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
    }

    .value-text {
      min-width: 36px;
      text-align: right;
      font-feature-settings: "tnum";
    }
  }
}

.toggle-switch {
  width: 36px;
  height: 20px;
  background: #e0e0e0;
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  transition: background 0.3s;
  
  .toggle-knob {
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform 0.3s;
    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
  }
  
  &.active {
    background: #1890ff;
    
    .toggle-knob {
      transform: translateX(16px);
    }
  }
}

.slider {
  width: 100%;
  height: 12px;
  padding: 0;
  margin: 0;
  background: transparent;
  background-image: linear-gradient(#1890ff, #1890ff), linear-gradient(#e0e0e0, #e0e0e0);
  background-repeat: no-repeat;
  background-size: calc((100% - 12px) * var(--percent)) 2px, calc(100% - 12px) 2px;
  background-position: 6px center, 6px center;
  border: none;
  outline: none;
  box-shadow: none;
  -webkit-appearance: none;
  cursor: pointer;

  /* Hide default track */
  &::-webkit-slider-runnable-track {
    background: transparent;
    border: none;
  }

  &:focus, &:active, &:hover {
    outline: none;
    border: none;
    box-shadow: none;
  }
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    background: #1890ff;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: none;
    margin-top: 0;
    transition: transform 0.2s;
    position: relative;
    z-index: 2;

    &:hover {
      transform: scale(1.2);
    }
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
