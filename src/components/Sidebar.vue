<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import draggable from 'vuedraggable';
import dayjs from 'dayjs';

const props = defineProps({
  categories: {
    type: Array,
    required: true
  },
  currentCategoryId: {
    type: String,
    required: true
  },
  todos: {
    type: Array,
    default: () => []
  },
  themeMode: {
    type: String,
    default: 'system'
  }
});

const emit = defineEmits(['select', 'update:categories', 'add-category', 'context-menu', 'theme-change', 'open-settings']);

const dragging = ref(false);

const categoriesList = computed({
  get: () => props.categories,
  set: (val) => emit('update:categories', val)
});

const onSelect = (id) => {
  emit('select', id);
};

const onContextMenu = (e, category) => {
  e.preventDefault();
  emit('context-menu', { event: e, type: 'category', item: category });
};

const onAddCategory = () => {
  emit('add-category');
};

const getSmartCount = (type) => {
  if (!props.todos) return 0;
  if (type === 'all') return props.todos.filter(t => !t.isCompleted).length;
  if (type === 'today') {
    return props.todos.filter(t => !t.isCompleted && t.dueDate && dayjs(t.dueDate).isSame(dayjs(), 'day')).length;
  }
  if (type === 'plan') {
    return props.todos.filter(t => !t.isCompleted && t.dueDate && dayjs(t.dueDate).isAfter(dayjs(), 'day')).length;
  }
  if (type === 'urgent') {
    return props.todos.filter(t => !t.isCompleted && (t.priority === 'high' || t.priority === 'medium' || t.priority === 'low')).length;
  }
  if (type === 'completed') {
    return props.todos.filter(t => t.isCompleted).length;
  }
  return 0;
};

const handleDragEnd = () => {
  dragging.value = false;
};

const themeIndex = computed(() => props.themeMode === 'light' ? 0 : props.themeMode === 'dark' ? 1 : 2);
const sliderLeft = computed(() => `${themeIndex.value * 33.333}%`);
const setTheme = (mode) => emit('theme-change', mode);
const openSettings = () => emit('open-settings');

// Keyboard Navigation
const handleKeyNav = (e) => {
  // Only handle if no modal/drawer is open (simple check: if body has no modal-open class, or just check standard keys)
  // We can rely on standard behavior, but maybe check if input is focused
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    
    const smartIds = ['today', 'plan', 'all', 'urgent', 'completed'];
    const categoryIds = props.categories.map(c => c.id);
    const allIds = [...smartIds, ...categoryIds];
    
    const currentIndex = allIds.indexOf(props.currentCategoryId);
    let nextIndex = currentIndex;

    if (e.key === 'ArrowUp') {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) nextIndex = allIds.length - 1;
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= allIds.length) nextIndex = 0;
    }

    onSelect(allIds[nextIndex]);
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyNav);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyNav);
});
</script>

 <template>
  <div class="sidebar">
    <div class="smart-lists-grid">
      <div 
        class="smart-item" 
        :class="{ active: currentCategoryId === 'today' }"
        @click="onSelect('today')"
      >
        <span class="smart-icon" style="color: #1890ff"><i class="ri-calendar-check-line"></i></span>
        <span class="smart-name">今日待办</span>
        <span class="smart-count" v-if="getSmartCount('today')">{{ getSmartCount('today') }}</span>
      </div>
      <div 
        class="smart-item" 
        :class="{ active: currentCategoryId === 'plan' }"
        @click="onSelect('plan')"
      >
        <span class="smart-icon" style="color: #722ed1"><i class="ri-calendar-todo-line"></i></span>
        <span class="smart-name">计划</span>
        <span class="smart-count" v-if="getSmartCount('plan')">{{ getSmartCount('plan') }}</span>
      </div>
      <div 
        class="smart-item" 
        :class="{ active: currentCategoryId === 'all' }"
        @click="onSelect('all')"
      >
        <span class="smart-icon" style="color: #52c41a"><i class="ri-inbox-line"></i></span>
        <span class="smart-name">全部</span>
        <span class="smart-count" v-if="getSmartCount('all')">{{ getSmartCount('all') }}</span>
      </div>
      <div 
        class="smart-item" 
        :class="{ active: currentCategoryId === 'urgent' }"
        @click="onSelect('urgent')"
      >
        <span class="smart-icon" style="color: #f5222d"><i class="ri-flag-2-fill"></i></span>
        <span class="smart-name">优先级</span>
        <span class="smart-count" v-if="getSmartCount('urgent')">{{ getSmartCount('urgent') }}</span>
      </div>
      <div 
        class="smart-item full-width" 
        :class="{ active: currentCategoryId === 'completed' }"
        @click="onSelect('completed')"
      >
        <span class="smart-icon" style="color: #19803F"><i class="ri-checkbox-circle-line"></i></span>
        <span class="smart-name">已完成</span>
        <span class="smart-count" v-if="getSmartCount('completed')">{{ getSmartCount('completed') }}</span>
      </div>
    </div>

    <div class="divider"></div>
    
    <div class="my-lists-header">
      <span>我的列表</span>
      <div class="add-btn-small" @click="onAddCategory" title="新建清单">
        <i class="ri-add-line" style="margin-right: 2px;"></i> 添加分类
      </div>
    </div>

    <div class="category-list">
      <draggable 
        v-model="categoriesList" 
        item-key="id"
        @start="dragging = true" 
        @end="handleDragEnd"
        class="drag-area"
      >
        <template #item="{ element }">
          <div 
            class="category-item" 
            :class="{ active: element.id === currentCategoryId }"
            @click="onSelect(element.id)"
            @contextmenu="onContextMenu($event, element)"
          >
            <span class="category-icon" :style="{ color: element.color || '#666' }">
              <i :class="element.icon || 'ri-list-check'"></i>
            </span>
            <span class="category-name">{{ element.name }}</span>
            <span v-if="element.isDefault" class="default-badge" title="默认分类">
              <i class="ri-pushpin-2-fill"></i>
            </span>
            <span class="category-count" v-if="element.count">{{ element.count }}</span>
          </div>
        </template>
      </draggable>
    </div>

    <div class="sidebar-footer">
      <button class="settings-btn" title="设置" @click="openSettings">
        <i class="ri-settings-3-line"></i>
      </button>
      <div class="theme-switch">
        <div class="switch-track">
          <div class="switch-slider" :style="{ left: sliderLeft }"></div>
          <div class="switch-item" :class="{ active: props.themeMode === 'light' }" @click="setTheme('light')">
            <i class="ri-sun-line"></i><span>白天</span>
          </div>
          <div class="switch-item" :class="{ active: props.themeMode === 'dark' }" @click="setTheme('dark')">
            <i class="ri-moon-line"></i><span>黑夜</span>
          </div>
          <div class="switch-item" :class="{ active: props.themeMode === 'system' }" @click="setTheme('system')">
            <i class="ri-computer-line"></i><span>系统</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.sidebar {
  width: 240px;
  background-color: var(--bg-color);
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
  height: 100%;
  user-select: none;
  font-size: 14px;

  .user-info {
    padding: 15px 15px;
    .app-title {
      font-weight: bold;
      font-size: 16px;
      color: var(--text-color);
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .smart-lists-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 15px;
    
    .smart-item {
      background: var(--bg-secondary);
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      padding: 12px;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
      
      &:hover {
        background-color: var(--hover-bg);
        transform: translateY(-1px);
        box-shadow: var(--shadow-sm);
      }
      
      &.active {
        background-color: var(--active-bg);
        color: var(--primary-color);
        
        .smart-name {
          color: var(--primary-color);
        }
      }
      
      .smart-icon {
        font-size: 20px;
        margin-bottom: 8px;
        transition: transform 0.2s;
      }

      &:hover .smart-icon {
        transform: scale(1.1);
      }
      
      .smart-name {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-color);
      }
      
      .smart-count {
        position: absolute;
        top: 10px;
        right: 10px;
        font-size: 16px;
        color: var(--secondary-text);
        font-weight: 600;
        opacity: 0.6;
      }

      &.full-width {
        grid-column: span 2;
        flex-direction: row;
        align-items: center;
        padding: 12px 16px;
        
        .smart-icon {
          margin-bottom: 0;
          margin-right: 12px;
        }
        
        .smart-count {
          top: 50%;
          transform: translateY(-50%);
        }
      }
    }
  }
  
  .divider {
    height: 1px;
    background-color: var(--border-color);
    margin: 5px 20px;
    opacity: 0.6;
  }
  
  .my-lists-header {
      padding: 15px 20px 8px;
      font-size: 12px;
      font-weight: 600;
      color: var(--secondary-text);
      display: flex;
      justify-content: space-between;
      align-items: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      
      .add-btn-small {
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        color: var(--secondary-text);
        transition: all 0.2s;
        
        &:hover {
          background-color: var(--hover-bg);
          color: var(--primary-color);
        }
      }
    }

  .category-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 10px;
  }

  .drag-area {
    min-height: 50px;
    padding-bottom: 20px;
  }

  .category-item {
    padding: 10px 12px;
    margin-bottom: 4px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    color: var(--text-color);
    transition: all 0.2s;
    border: 1px solid transparent;

    &:hover {
      background-color: var(--hover-bg);
    }

    &.active {
      background-color: var(--active-bg);
      font-weight: 500;
      color: var(--primary-color);
      
      .category-icon {
        filter: grayscale(0);
      }
    }

    .category-icon {
      margin-right: 10px;
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      font-size: 12px;
      color: var(--text-color);
    }

    .category-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .default-badge {
        margin-right: 8px;
        color: var(--primary-color);
        font-size: 14px;
        transform: rotate(45deg);
      }
      
      .category-count {
        font-size: 12px;
      color: var(--secondary-text);
      background: var(--hover-bg);
      padding: 2px 8px;
      border-radius: 10px;
    }
  }
  
  .sidebar-footer {
    padding: 10px;
    border-top: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .settings-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    color: var(--secondary-text);
    transition: all 0.2s;
    border: 1px solid transparent;
    background: var(--bg-secondary);
    
    &:hover {
      background-color: var(--hover-bg);
      color: var(--primary-color);
    }
  }

  .theme-switch {
    flex: 1;
  }

  .switch-track {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .switch-item {
    position: relative;
    text-align: center;
    padding: 6px 0;
    font-size: 12px;
    color: var(--secondary-text);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    z-index: 1;
    
    &:hover {
      color: var(--text-color);
      background: var(--hover-bg);
    }
    
    &.active {
      color: var(--text-color);
      font-weight: 600;
    }
  }

  .switch-slider {
    position: absolute;
    top: 0;
    left: 0;
    width: 33.333%;
    height: 100%;
    background: var(--active-bg);
    transition: left 0.25s ease;
    z-index: 0;
  }
}
</style>
