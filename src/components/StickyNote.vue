<script setup>
import { ref, onMounted, watch } from 'vue';

const noteContent = ref('');
const isAlwaysOnTop = ref(true);
const opacity = ref(1);
const menuVisible = ref(false);

const emit = defineEmits(['close']);

// Load content
onMounted(() => {
  const saved = localStorage.getItem('sticky-note-content');
  if (saved) noteContent.value = saved;
  
  // Initialize window state if possible
  if (window.utools) {
    // Attempt to set initial state
    // window.utools.setAlwaysOnTop(true); 
    // Opacity is usually set on window creation, but can be updated
  }
});

// Auto-save
watch(noteContent, (val) => {
  localStorage.setItem('sticky-note-content', val);
});

const toggleMenu = () => {
  menuVisible.value = !menuVisible.value;
};

const handleClose = () => {
  window.close(); // Close this window
};

const togglePin = () => {
  isAlwaysOnTop.value = !isAlwaysOnTop.value;
  if (window.utools) {
    // Try standard uTools API if available, or Electron way
    try {
        // This works if we are in a proper BrowserWindow created by uTools with node integration
        const { remote } = require('electron');
        const win = remote.getCurrentWindow();
        win.setAlwaysOnTop(isAlwaysOnTop.value);
    } catch (e) {
        console.error('Failed to set always on top', e);
    }
  }
};

const updateOpacity = (e) => {
  const val = parseFloat(e.target.value);
  opacity.value = val;
  if (window.utools) {
    try {
        const { remote } = require('electron');
        const win = remote.getCurrentWindow();
        win.setOpacity(val);
    } catch (e) {
        console.error('Failed to set opacity', e);
    }
  }
};

// Close menu when clicking outside
const closeMenu = (e) => {
    if (!e.target.closest('.menu-container')) {
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
        <i class="ri-sticky-note-line"></i> 便签
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
        <div class="menu-item column">
          <div class="row-between">
            <span>透明度</span>
            <span>{{ Math.round(opacity * 100) }}%</span>
          </div>
          <input 
            type="range" 
            min="0.2" 
            max="1" 
            step="0.1" 
            :value="opacity" 
            @input="updateOpacity"
            class="slider"
          >
        </div>
      </div>
    </div>
    
    <div class="sticky-body">
      <textarea 
        v-model="noteContent" 
        placeholder="记录点什么..."
        class="note-textarea"
      ></textarea>
    </div>
  </div>
</template>

<style scoped lang="less">
.sticky-note {
  width: 100vw;
  height: 100vh;
  background-color: #fff7d1; /* Classic Sticky Note Yellow */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border: 1px solid #e6dfb8;
  
  /* Dark mode support logic can be added here if needed, 
     but sticky notes are traditionally yellow. 
     We can add a subtle dark theme override. */
}

.sticky-header {
  height: 32px;
  background-color: #f5eeb5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  border-bottom: 1px solid #e6dfb8;
  position: relative;
  
  .drag-handle {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: center;
    font-size: 12px;
    color: #8c865d;
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
  color: #8c865d;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: rgba(0,0,0,0.05);
    color: #5c5840;
  }
  
  &.close-btn:hover {
    background-color: #ff4d4f;
    color: white;
  }
}

.sticky-body {
  flex: 1;
  padding: 0;
  
  .note-textarea {
    width: 100%;
    height: 100%;
    border: none;
    resize: none;
    background: transparent;
    padding: 12px;
    font-size: 14px;
    line-height: 1.6;
    color: #4a4a4a;
    font-family: inherit;
    outline: none;
    
    &::placeholder {
      color: rgba(74, 74, 74, 0.4);
    }
    
    /* Custom Scrollbar for the textarea */
    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-thumb {
      background-color: rgba(0,0,0,0.1);
      border-radius: 3px;
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
    
    &.column {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }
    
    .row-between {
      display: flex;
      justify-content: space-between;
      width: 100%;
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
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: #1890ff;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
