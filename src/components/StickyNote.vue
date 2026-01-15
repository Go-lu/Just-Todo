<script setup>
import { ref, onMounted, watch, computed } from 'vue';
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
  'close'
]);

const getPinParam = () => {
  const searchParams = new URLSearchParams(window.location.search || '');
  const direct = searchParams.get('pin');
  if (direct !== null) return direct;
  const hash = window.location.hash || '';
  const idx = hash.indexOf('?');
  if (idx === -1) return null;
  const hashParams = new URLSearchParams(hash.slice(idx + 1));
  return hashParams.get('pin');
};

const pinParam = getPinParam();
const isAlwaysOnTop = ref(pinParam !== '0');
const opacity = ref(1);
const menuVisible = ref(false);
const buildTag = typeof __JUSTTODO_BUILD_TAG__ === 'string' ? __JUSTTODO_BUILD_TAG__ : 'dev';
const themeMode = ref('system');
const isSystemDark = ref(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
const colorFollowSystem = ref(false);
const presetColors = ['#f1f5f9', '#333333', '#FFF9C4', '#FFECB3', '#C8E6C9', '#BBDEFB', '#F8BBD0'];
const noteColor = ref(presetColors[2]);
const customColor = ref(presetColors[2]);
const customColors = ref([]);
const STICKY_SETTINGS_KEY = 'justtodo_sticky_settings';

// System theme listener
onMounted(() => {
  const mediaQuery = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  if (mediaQuery) {
    const handler = (e) => {
      isSystemDark.value = e.matches;
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
    }
    // Cleanup on unmount handled by Vue automatically? No, manual cleanup needed usually but onUnmounted not imported
    // We can import onUnmounted or just leave it as it's a main component
  }
});

try {
  const saved = localStorage.getItem('justtodo_custom_colors');
  if (saved) {
    customColors.value = JSON.parse(saved);
  }
} catch (e) {}

try {
  const raw = localStorage.getItem(STICKY_SETTINGS_KEY);
  if (raw) {
    const data = JSON.parse(raw);
    if (data && typeof data === 'object') {
      if (typeof data.themeMode === 'string') {
        themeMode.value = data.themeMode;
      }
      if (typeof data.colorFollowSystem === 'boolean') {
        colorFollowSystem.value = data.colorFollowSystem;
      }
      if (typeof data.noteColor === 'string') {
        noteColor.value = data.noteColor;
        customColor.value = data.noteColor;
      }
      if (typeof data.opacity === 'number') {
        opacity.value = data.opacity;
      }
      if (typeof data.isAlwaysOnTop === 'boolean') {
        isAlwaysOnTop.value = data.isAlwaysOnTop;
      }
    }
  }
} catch (e) {}

const persistStickySettings = () => {
  try {
    const data = {
      themeMode: themeMode.value,
      colorFollowSystem: colorFollowSystem.value,
      noteColor: noteColor.value,
      opacity: opacity.value,
      isAlwaysOnTop: isAlwaysOnTop.value
    };
    localStorage.setItem(STICKY_SETTINGS_KEY, JSON.stringify(data));
  } catch (e) {}
};

const effectiveTheme = computed(() => {
  if (themeMode.value === 'light') return 'light';
  if (themeMode.value === 'dark') return 'dark';
  return isSystemDark.value ? 'dark' : 'light';
});

// Sync global theme class for child components (TodoList, TaskModal, etc.)
watch(effectiveTheme, (theme) => {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');
  if (theme === 'light') {
    root.classList.add('theme-light');
  } else if (theme === 'dark') {
    root.classList.add('theme-dark');
  }
}, { immediate: true });

// Persist theme mode
watch(themeMode, (val) => {
  persistStickySettings();
});

watch([noteColor, colorFollowSystem, opacity, isAlwaysOnTop], () => {
  persistStickySettings();
});

const themeIndex = computed(() => {
  if (themeMode.value === 'light') return 0;
  if (themeMode.value === 'dark') return 1;
  return 2;
});

const currentBackgroundColor = computed(() => noteColor.value);
const currentAccentColor = computed(() => noteColor.value);
const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
};
const clamp = (n) => Math.max(0, Math.min(255, n));
const mix = (hex, target, amount) => {
  const src = hexToRgb(hex);
  const t = target === 'white' ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  const r = clamp(Math.round(src.r + (t.r - src.r) * amount));
  const g = clamp(Math.round(src.g + (t.g - src.g) * amount));
  const b = clamp(Math.round(src.b + (t.b - src.b) * amount));
  const out = (r << 16) + (g << 8) + b;
  return '#' + out.toString(16).padStart(6, '0');
};
const currentAxisColor = computed(() => {
  const theme = effectiveTheme.value;
  const base = noteColor.value;
  return theme === 'dark' ? mix(base, 'white', 0.5) : mix(base, 'black', 0.35);
});
const currentCardColor = computed(() => {
  const theme = effectiveTheme.value;
  if (theme === 'light') {
    return `rgba(255, 255, 255, 0.85)`;
  }
  return `rgba(0, 0, 0, 0.25)`;
});
const currentDotGlow = computed(() => {
  const theme = effectiveTheme.value;
  const mixed = theme === 'dark' ? mix(noteColor.value, 'white', 0.5) : mix(noteColor.value, 'black', 0.35);
  const rgb = hexToRgb(mixed);
  const alpha = theme === 'dark' ? 0.35 : 0.25;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
});
const isCustomSelected = computed(() => !presetColors.includes(noteColor.value));

watch(
  () => [effectiveTheme.value, colorFollowSystem.value],
  ([theme, follow]) => {
    if (!follow) return;
    noteColor.value = theme === 'dark' ? presetColors[1] : presetColors[0];
  }
);

const getCurrentWindow = () => {
  try {
    if (window.require) {
      const { remote } = window.require('electron');
      const win = remote?.getCurrentWindow?.();
      if (win) return win;
    }
  } catch (e) {}

  try {
    if (window.utools && window.utools.getCurrentBrowserWindow) {
      const win = window.utools.getCurrentBrowserWindow();
      if (win) return win;
    }
  } catch (e) {}

  return null;
};

const setWindowOpacity = (val) => {
  if (window.services && window.services.setOpacity) {
    window.services.setOpacity(val);
    return;
  }
  try {
    const win = getCurrentWindow();
    if (win && typeof win.setOpacity === 'function') win.setOpacity(val);
  } catch (e) {
    console.error('Failed to set opacity', e);
  }
};

const setWindowTop = (flag) => {
  let handled = false;
  if (window.services && window.services.setAlwaysOnTop) {
    try {
      const ok = window.services.setAlwaysOnTop(flag);
      handled = !!ok;
    } catch (e) {}
  }

  const win = getCurrentWindow();

  if (!win) {
    return handled;
  }

  try {
    if (flag) {
      try {
        win.setAlwaysOnTop(true, 'screen-saver');
      } catch (e) {}
      win.setAlwaysOnTop(true);
    } else {
      try {
        win.setAlwaysOnTop(false);
      } catch (e) {}
      try {
        setTimeout(() => {
          try {
            win.setAlwaysOnTop(false);
          } catch (e) {}
        }, 0);
      } catch (e) {}
    }
    return true;
  } catch (e) {
    console.error('Failed to set always on top via instance:', e);
    return handled;
  }
};

onMounted(() => {
   document.documentElement.style.backgroundColor = 'transparent';
   document.body.style.backgroundColor = 'transparent';
   if (isAlwaysOnTop.value) {
     setWindowTop(true);
   }
   try {
     if (window.matchMedia) {
       const m = window.matchMedia('(prefers-color-scheme: dark)');
       isSystemDark.value = !!m.matches;
       const handler = (e) => {
         isSystemDark.value = !!e.matches;
       };
       if (typeof m.addEventListener === 'function') {
         m.addEventListener('change', handler);
       } else if (typeof m.addListener === 'function') {
         m.addListener(handler);
       }
     }
   } catch (e) {}
});

const toggleMenu = () => {
  menuVisible.value = !menuVisible.value;
};

const handleClose = () => {
  window.close();
};

const setThemeMode = (mode) => {
  themeMode.value = mode;
};

const setNoteColor = (color) => {
  noteColor.value = color;
};

const toggleColorFollowSystem = () => {
  colorFollowSystem.value = !colorFollowSystem.value;
};

const handleCustomColorChange = (e) => {
  const value = e.target.value;
  if (typeof value === 'string' && value) {
    customColor.value = value;
    noteColor.value = value;

    if (!presetColors.includes(value) && !customColors.value.includes(value)) {
      customColors.value.push(value);
      try {
        localStorage.setItem('justtodo_custom_colors', JSON.stringify(customColors.value));
      } catch (e) {}
    }
  }
};

const togglePin = () => {
  const next = !isAlwaysOnTop.value;
  isAlwaysOnTop.value = next;
  persistStickySettings();

  const currentWin = getCurrentWindow();
  const currentBounds = currentWin && typeof currentWin.getBounds === 'function' ? currentWin.getBounds() : undefined;

  try {
    const hash = window.location.hash || '';
    const idx = hash.indexOf('?');
    if (idx !== -1) {
      const base = hash.slice(0, idx);
      const params = new URLSearchParams(hash.slice(idx + 1));
      params.set('pin', next ? '1' : '0');
      const newHash = `${base}?${params.toString()}`;
      window.history.replaceState({}, '', window.location.pathname + window.location.search + newHash);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('pin', next ? '1' : '0');
      window.history.replaceState({}, '', url.toString());
    }
  } catch (e) {}

  if (next) {
    setWindowTop(true);
    try {
      setTimeout(() => {
        try {
          const win = getCurrentWindow();
          const canCheck = win && (typeof win.isAlwaysOnTop === 'function' || typeof win.getAlwaysOnTopLevel === 'function');
          let shouldRecreate = !canCheck;
          if (win && canCheck) {
            const level = typeof win.getAlwaysOnTopLevel === 'function' ? win.getAlwaysOnTopLevel() : '';
            const stillNotOnTop = !(typeof win.isAlwaysOnTop === 'function' && win.isAlwaysOnTop()) && (!level || level === 'normal');
            shouldRecreate = !!stillNotOnTop;
          }

          if (!shouldRecreate) return;

          if (window.utools && typeof window.utools.createBrowserWindow === 'function') {
            const width = currentBounds?.width ?? 320;
            const height = currentBounds?.height ?? 500;

            const options = {
              width,
              height,
              x: typeof currentBounds?.x === 'number' ? currentBounds.x : undefined,
              y: typeof currentBounds?.y === 'number' ? currentBounds.y : undefined,
              title: '待办便签',
              useContentSize: true,
              frame: false,
              transparent: true,
              backgroundColor: '#00000000',
              resizable: true,
              minimizable: false,
              maximizable: false,
              alwaysOnTop: false,
              skipTaskbar: true,
              show: false,
              webPreferences: {
                preload: 'preload/services.js',
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true,
                backgroundThrottling: false
              }
            };

            const url = `sticky.html?pin=1&nonce=${Date.now().toString(36)}`;
            let newWin = null;
            newWin = window.utools.createBrowserWindow(url, options, () => {
              try {
                if (newWin && typeof newWin.show === 'function') newWin.show();
              } catch (e) {}
              try {
                if (newWin && typeof newWin.setAlwaysOnTop === 'function') {
                  try { newWin.setAlwaysOnTop(true, 'floating'); } catch (e) {}
                  try { newWin.setAlwaysOnTop(true, 'screen-saver'); } catch (e) {}
                  try { newWin.setAlwaysOnTop(true); } catch (e) {}
                }
              } catch (e) {}
              try {
                if (newWin && typeof newWin.moveTop === 'function') newWin.moveTop();
              } catch (e) {}
              try {
                if (newWin && typeof newWin.focus === 'function') newWin.focus();
              } catch (e) {}
              try {
                setTimeout(() => {
                  try {
                    if (currentWin && typeof currentWin.destroy === 'function') currentWin.destroy();
                    else if (currentWin && typeof currentWin.close === 'function') currentWin.close();
                    else window.close();
                  } catch (e) {
                    try { window.close() } catch (e2) {}
                  }
                }, 0);
              } catch (e) {}
            });
          }
        } catch (e) {}
      }, 120);
    } catch (e) {}
    return;
  }

  setWindowTop(false);

  try {
    if (window.utools && typeof window.utools.createBrowserWindow === 'function') {
      const width = currentBounds?.width ?? 320;
      const height = currentBounds?.height ?? 500;

      const options = {
        width,
        height,
        x: typeof currentBounds?.x === 'number' ? currentBounds.x : undefined,
        y: typeof currentBounds?.y === 'number' ? currentBounds.y : undefined,
        title: '待办便签',
        useContentSize: true,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        resizable: true,
        minimizable: false,
        maximizable: false,
        alwaysOnTop: false,
        skipTaskbar: true,
        show: false,
        webPreferences: {
          preload: 'preload/services.js',
          nodeIntegration: true,
          contextIsolation: false,
          enableRemoteModule: true,
          backgroundThrottling: false
        }
      };

      const url = `sticky.html?pin=0&nonce=${Date.now().toString(36)}`;
      let newWin = null;
      newWin = window.utools.createBrowserWindow(url, options, () => {
        try {
          if (newWin && typeof newWin.show === 'function') newWin.show();
        } catch (e) {}
        try {
          if (newWin && typeof newWin.setAlwaysOnTop === 'function') {
            try { newWin.setAlwaysOnTop(false); } catch (e) {}
            try { newWin.setAlwaysOnTop(false, 'normal'); } catch (e) {}
          }
        } catch (e) {}
        try {
          setTimeout(() => {
            try {
              if (currentWin && typeof currentWin.destroy === 'function') currentWin.destroy();
              else if (currentWin && typeof currentWin.close === 'function') currentWin.close();
              else window.close();
            } catch (e) {
              try { window.close() } catch (e2) {}
            }
          }, 0);
        } catch (e) {}
      });
      return;
    }
  } catch (e) {}

  try {
    const ok = !!(window.services && window.services.recreateStickyWindow && window.services.recreateStickyWindow(false, currentBounds));
    if (ok) {
      try {
        setTimeout(() => {
          try { window.close() } catch (e) {}
        }, 0);
      } catch (e) {}
    }
  } catch (e) {}
};

const updateOpacity = (e) => {
  const val = parseFloat(e.target.value);
  opacity.value = val;
};

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
  <div :class="['sticky-note', `theme-${effectiveTheme}`]" :style="{ opacity: opacity, '--sticky-bg': currentBackgroundColor, '--sticky-accent': currentAccentColor, '--sticky-axis': currentAxisColor, '--sticky-card-bg': currentCardColor, '--sticky-dot-glow': currentDotGlow }">
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
        <div class="menu-item theme-item">
          <span class="theme-label">主题</span>
          <div class="theme-control">
            <div class="theme-segment">
              <div class="theme-segment-track" :style="{ transform: `translateX(${themeIndex * 100}%)` }"></div>
              <button
                type="button"
                class="theme-segment-option"
                :class="{ active: themeMode === 'light' }"
                @click="setThemeMode('light')"
              >
                白天
              </button>
              <button
                type="button"
                class="theme-segment-option"
                :class="{ active: themeMode === 'dark' }"
                @click="setThemeMode('dark')"
              >
                夜间
              </button>
              <button
                type="button"
                class="theme-segment-option"
                :class="{ active: themeMode === 'system' }"
                @click="setThemeMode('system')"
              >
                系统
              </button>
            </div>
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
        <div class="menu-item color-item">
          <span>颜色</span>
          <div class="color-follow">
            <span class="color-follow-label">系统</span>
            <div class="toggle-switch" :class="{ active: colorFollowSystem }" @click="toggleColorFollowSystem">
              <div class="toggle-knob"></div>
            </div>
          </div>
          <div class="color-palette" :class="{ disabled: colorFollowSystem }">
            <div class="color-section">
              <div class="color-section-header">预设</div>
              <div class="color-section-body">
                <button
                  v-for="color in presetColors"
                  :key="color"
                  type="button"
                  class="color-swatch"
                  :class="{ active: noteColor === color && !colorFollowSystem }"
                  :style="{ backgroundColor: color }"
                  @click="!colorFollowSystem && setNoteColor(color)"
                ></button>
              </div>
            </div>
            <div class="color-section">
              <div class="color-section-header">自定义</div>
              <div class="color-section-body">
                <button
                  v-for="color in customColors"
                  :key="color"
                  type="button"
                  class="color-swatch"
                  :class="{ active: noteColor === color && !colorFollowSystem }"
                  :style="{ backgroundColor: color }"
                  @click="!colorFollowSystem && setNoteColor(color)"
                ></button>
                <label
                  class="color-swatch custom-swatch"
                  title="添加自定义颜色"
                >
                  <span class="custom-plus">+</span>
                  <input
                    class="color-input"
                    type="color"
                    :value="customColor"
                    @change="!colorFollowSystem && handleCustomColorChange($event)"
                  >
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="sticky-body">
       <TodoList 
         :todos="todos" 
         :categories="categories"
         categoryId="all"
         :stickyMode="true"
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
  background-color: var(--sticky-bg, #fff);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border: 1px solid #e0e0e0;
}

.sticky-note.theme-light {
  color: #333;
}

.sticky-note.theme-dark {
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  border-color: #333;
  color: #f5f5f5;
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

.sticky-note.theme-dark .sticky-header {
  background-color: #2a2a2a;
  border-bottom-color: #333;
}

.sticky-note.theme-dark .sticky-header .drag-handle {
  color: #ccc;
}

.sticky-note.theme-dark .sticky-header .window-controls .icon-btn {
  color: #ccc;
}

.sticky-note.theme-dark .sticky-header .window-controls .icon-btn:hover {
  background-color: rgba(255,255,255,0.08);
  color: #fff;
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
  -webkit-app-region: no-drag;
  
  .menu-item {
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    color: #333;
    -webkit-app-region: no-drag;
    
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

  .theme-item {
    /* flex-direction: column; removed to keep single line */
    /* align-items: flex-start; removed */
    gap: 8px;
  }
  
  .theme-label {
    flex-shrink: 0;
  }

  .theme-control {
    flex: 1;
    min-width: 0; /* Allow shrinking */
  }

  .theme-segment {
    position: relative;
    display: flex;
    width: 100%;
    height: 24px;
    border-radius: 6px;
    background-color: rgba(0,0,0,0.06); /* Dynamic bg based on context */
    overflow: hidden;
  }

  .theme-segment-track {
    position: absolute;
    top: 2px;
    bottom: 2px;
    width: 33.3333%;
    border-radius: 4px;
    background-color: #fff;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    transform: translateX(0%);
    transition: transform 0.2s ease;
  }

  .theme-segment-option {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 11px; /* Smaller font */
    color: #666;
    cursor: pointer;
    z-index: 1;
    padding: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .theme-segment-option.active {
    color: #333;
    font-weight: 500;
  }

  .color-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .color-follow {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }

  .color-follow-label {
    font-size: 12px;
    color: #666;
  }

  .color-palette {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .color-palette.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .color-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
  }

  .color-section-header {
    font-size: 12px;
    color: #666;
  }

  .color-section-body {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .color-swatch {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 1px solid rgba(0,0,0,0.1);
    padding: 0;
    cursor: pointer;
    background-clip: padding-box;
    box-sizing: border-box;
  }

  .color-swatch.active {
    border-color: #1890ff;
    box-shadow: 0 0 0 1px #1890ff;
  }

  .custom-swatch {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    position: relative;
    border: 1px dashed rgba(0,0,0,0.3);
    border-radius: 4px;
    width: 18px;
    height: 18px;
    overflow: hidden;
    background-color: transparent;
  }

  .custom-plus {
    font-size: 14px;
    line-height: 1;
    color: #999;
    pointer-events: none;
  }

  .color-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
}

.sticky-note.theme-dark .menu-popup {
  background: #2a2a2a;
  border-color: #444;
}

.sticky-note.theme-dark .menu-popup .menu-item {
  color: #f5f5f5;
}

/* Theme segment dark mode styles */
.sticky-note.theme-dark .menu-popup .theme-segment {
  background-color: rgba(255,255,255,0.1);
}

.sticky-note.theme-dark .menu-popup .theme-segment-track {
  background-color: #444;
  box-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.sticky-note.theme-dark .menu-popup .theme-segment-option {
  color: #aaa;
}

.sticky-note.theme-dark .menu-popup .theme-segment-option.active {
  color: #fff;
}

.sticky-note.theme-dark .menu-popup .color-swatch {
  border-color: rgba(255,255,255,0.2);
}

.toggle-switch {
  width: 36px;
  height: 20px;
  background: #e0e0e0;
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  transition: background 0.3s;
  -webkit-app-region: no-drag;
  
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
