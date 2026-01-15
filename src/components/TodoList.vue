<script setup>
import { ref, nextTick, onMounted, onUnmounted, computed, watch } from 'vue';
import draggable from 'vuedraggable';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

const props = defineProps({
  todos: {
    type: Array,
    required: true
  },
  categoryId: String,
  showInput: Boolean,
  categories: {
    type: Array,
    default: () => []
  },
  sortState: {
    type: Object,
    default: () => ({ field: 'default', order: 'asc' })
  },
  stickyMode: {
    type: Boolean,
    default: false
  }
});

// Explicitly define emits to avoid warnings
const emit = defineEmits([
  'update:todos', 
  'open-add-task', 
  'update-todo', 
  'context-menu', 
  'item-click'
]);

// Attachment Logic
const hoveredAttachmentId = ref(null);
const hoveredAttachmentsList = ref([]);
const dropdownPosition = ref({ top: '0px', right: '0px' });
let attachmentHoverTimeout = null;

const showAttachments = (id, attachments, event) => {
  if (attachmentHoverTimeout) clearTimeout(attachmentHoverTimeout);
  hoveredAttachmentId.value = id;
  hoveredAttachmentsList.value = attachments || [];
  
  // Calculate position
  const target = event.target.closest('.attachment-icon-wrapper');
  if (target) {
    const rect = target.getBoundingClientRect();
    dropdownPosition.value = {
        top: `${rect.bottom + 4}px`,
        right: `${window.innerWidth - rect.right}px`
    };
  }
};

const hideAttachments = () => {
  attachmentHoverTimeout = setTimeout(() => {
    hoveredAttachmentId.value = null;
    hoveredAttachmentsList.value = [];
  }, 200);
};

const cancelHideAttachments = () => {
  if (attachmentHoverTimeout) clearTimeout(attachmentHoverTimeout);
};

const getAttachmentIcon = (att) => {
  const type = att.type || '';
  if (type.startsWith('image/')) return 'ri-image-line';
  if (type.startsWith('text/')) return 'ri-file-text-line';
  if (type.includes('pdf')) return 'ri-file-pdf-line';
  return 'ri-file-line';
};

// Preview Logic
const previewVisible = ref(false);
const previewAttachment = ref(null);
const previewText = ref('');
const previewEncoding = ref('utf-8');
const previewBytes = ref(null);

const encodingOptions = [
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'gbk', label: 'GBK' },
  { value: 'gb18030', label: 'GB18030' },
  { value: 'iso-8859-1', label: 'ISO-8859-1' },
];

const dataUrlToUint8Array = (dataUrl) => {
  const idx = (dataUrl || '').indexOf(',');
  if (idx === -1) return new Uint8Array();
  const header = dataUrl.slice(0, idx);
  const base64 = dataUrl.slice(idx + 1);
  const isBase64 = header.includes(';base64');
  if (!isBase64) {
    const text = decodeURIComponent(base64);
    return new TextEncoder().encode(text);
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const isImageAttachment = (att) => {
  const mime = att?.mimeType || '';
  if (mime.startsWith('image/')) return true;
  const name = (att?.name || '').toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name);
};

const isTextAttachment = (att) => {
  const mime = att?.mimeType || '';
  if (mime.startsWith('text/')) return true;
  const name = (att?.name || '').toLowerCase();
  return /\.(txt|md|json|js|ts|vue|html|css|log|yml|yaml|xml|csv)$/.test(name);
};

const openPreview = async (att) => {
  previewAttachment.value = att;
  previewText.value = '';
  previewEncoding.value = 'utf-8';
  previewBytes.value = null;
  
  if (isTextAttachment(att) && att?.dataUrl) {
    try {
      const bytes = dataUrlToUint8Array(att.dataUrl);
      previewBytes.value = bytes;
      previewText.value = new TextDecoder(previewEncoding.value).decode(bytes);
    } catch (e) {
      previewText.value = '预览失败';
    }
  }
  
  previewVisible.value = true;
  // Hide dropdown
  hoveredAttachmentId.value = null;
};

const changeEncoding = () => {
  if (previewBytes.value) {
    try {
      previewText.value = new TextDecoder(previewEncoding.value).decode(previewBytes.value);
    } catch (e) {
      previewText.value = '解码失败';
    }
  }
};

const closePreview = () => {
  previewVisible.value = false;
  previewAttachment.value = null;
  previewText.value = '';
};

const downloadAttachment = (att) => {
  if (!att || !att.dataUrl) return;
  const bytes = dataUrlToUint8Array(att.dataUrl);
  const mime = att.mimeType || 'application/octet-stream';
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = att.name || 'attachment';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const todosList = computed({
  get: () => props.todos,
  set: (val) => emit('update:todos', val)
});

// For collapsed states
const collapsedGroups = ref({});
const timelineRef = ref(null);
const axisStyle = ref({ top: '0px', height: '0px' });
const updateAxisBounds = () => {
  nextTick(() => {
    const el = timelineRef.value;
    if (!el) return;
    const containerRect = el.getBoundingClientRect();
    const visibleHeaders = Array.from(el.querySelectorAll('.group-section .group-header')).filter(h => h.offsetParent);
    const visibleItems = Array.from(el.querySelectorAll('.group-list .todo-item')).filter(i => i.offsetParent);
    if (visibleHeaders.length === 0 || visibleItems.length === 0) {
      axisStyle.value = { top: '0px', height: '0px' };
      return;
    }
    const firstHeaderRect = visibleHeaders[0].getBoundingClientRect();
    const lastItemRect = visibleItems[visibleItems.length - 1].getBoundingClientRect();
    const top = firstHeaderRect.top - containerRect.top + firstHeaderRect.height / 2;
    const bottom = lastItemRect.bottom - containerRect.top;
    const height = Math.max(0, bottom - top);
    axisStyle.value = { top: `${top}px`, height: `${height}px` };
  });
};

const toggleGroup = (groupId) => {
  collapsedGroups.value[groupId] = !collapsedGroups.value[groupId];
  updateAxisBounds();
  updateScrollState();
};

const formatRepeatRule = (todo) => {
  if (!todo.repeatRule || todo.repeatRule === 'none') return '';
  const date = todo.dueDate ? dayjs(todo.dueDate) : dayjs();
  
  switch (todo.repeatRule) {
    case 'daily': return '每天';
    case 'weekly': return `每周 (${date.format('dddd')})`;
    case 'monthly': return `每月 (${date.format('D')}日)`;
    case 'yearly': return `每年 (${date.format('MM月DD日')})`;
    default: return todo.repeatRule;
  }
};

const getSubtaskProgress = (todo) => {
  if (!todo.subtasks || todo.subtasks.length === 0) return null;
  const completed = todo.subtasks.filter(s => s.isCompleted).length;
  return `${completed}/${todo.subtasks.length}`;
};

const getCategoryName = (id) => {
  if (id === 'default') return '默认清单';
  const cat = props.categories.find(c => c.id === id);
  return cat ? cat.name : '未分类';
};

// Helper for Overdue
    const isOverdue = (todo) => {
      if (!todo.dueDate || todo.isCompleted) return false;
      // If has time (length > 10, e.g., "YYYY-MM-DD HH:mm"), compare exact time
      if (todo.dueDate.length > 10) {
        return dayjs(todo.dueDate).isBefore(dayjs());
      }
      // If date only, compare day
      return dayjs(todo.dueDate).isBefore(dayjs(), 'day');
    };

    const formatDueDate = (dueDate) => {
      if (!dueDate) return '';
      // If has time, show MM-DD HH:mm
      if (dueDate.length > 10) {
        return dayjs(dueDate).format('MM-DD HH:mm');
      }
      // Date only
      return dayjs(dueDate).format('MM-DD');
    };
    
    // Grouping Logic
const displayGroups = computed(() => {
  const groups = [];
  const list = props.todos;
  
  // 1. If custom sort is active (and not default), show single list (or maybe separate active/completed?)
  // User asked for sorting. If sorting is enabled, grouping might still be relevant?
  // User request: "Plan module group by date", "All/Completed/Today group by category", "My List active + completed collapsed".
  // Let's assume grouping takes precedence, and sort applies WITHIN groups.
  
  if (props.stickyMode && props.categoryId === 'all') {
    const todayItems = [];
    const urgentItems = [];

    const now = dayjs();

    list.forEach(t => {
      if (!t || !t.id) return;
      if (!t.isCompleted && t.dueDate && dayjs(t.dueDate).isSameOrBefore(now, 'day')) {
        todayItems.push(t);
      }
      if (!t.isCompleted && (t.priority === 'high' || t.priority === 'medium' || t.priority === 'low')) {
        urgentItems.push(t);
      }
    });

    if (todayItems.length > 0) {
      groups.push({
        id: 'sticky-today',
        title: '今日待办',
        items: todayItems,
        isCollapsible: true,
        count: todayItems.length
      });
    }

    if (urgentItems.length > 0) {
      groups.push({
        id: 'sticky-urgent',
        title: '紧急待办',
        items: urgentItems,
        isCollapsible: true,
        count: urgentItems.length
      });
    }

    const map = new Map();
    list.forEach(t => {
      if (!t || !t.id) return;
      const catId = t.categoryId || 'default';
      if (!map.has(catId)) {
        map.set(catId, { id: catId, title: getCategoryName(catId), items: [] });
      }
      map.get(catId).items.push(t);
    });

    const sortedGroups = [];
    if (map.has('default')) sortedGroups.push(map.get('default'));
    props.categories.forEach(c => {
      if (c.id !== 'default' && map.has(c.id)) {
        sortedGroups.push(map.get(c.id));
      }
    });
    map.forEach((val, key) => {
      if (key !== 'default' && !props.categories.find(c => c.id === key)) {
        sortedGroups.push(val);
      }
    });

    groups.push(...sortedGroups);
  } else if (props.categoryId === 'urgent') {
    // Priority Grouping
    const priorities = [
      { id: 'high', name: '高', color: '#ff4d4f' },
      { id: 'medium', name: '中', color: '#faad14' },
      { id: 'low', name: '低', color: '#52c41a' },
      { id: 'normal', name: '无', color: 'var(--secondary-text)' }
    ];
    
    priorities.forEach(p => {
      const items = list.filter(t => (t.priority || 'normal') === p.id);
      if (items.length > 0) {
        groups.push({
          id: p.id,
          title: p.name,
          color: p.color,
          items: items, // Sort is already applied by App.vue or default
          isCollapsible: true,
          count: items.length
        });
      }
    });
    
  } else if (props.categoryId === 'plan') {
    // Date Grouping
    // Sort by date first (App.vue does this)
    const map = new Map();
    list.forEach(t => {
      let key = 'no-date';
      let title = '无日期';
      let sortKey = 9999999999999;
      
      if (t.dueDate) {
        const d = dayjs(t.dueDate);
        key = d.format('YYYY-MM-DD');
        if (d.isSame(dayjs(), 'day')) title = '今天';
        else if (d.isSame(dayjs().add(1, 'day'), 'day')) title = '明天';
        else if (d.isBefore(dayjs(), 'day') && !t.isCompleted) title = '已过期'; // Plan view filters out completed usually? Ah, Plan filters !completed.
        else title = d.format('MM月DD日 dddd');
        sortKey = d.valueOf();
      }
      
      if (!map.has(key)) {
        map.set(key, { id: key, title, items: [], sortKey });
      }
      map.get(key).items.push(t);
    });
    
    // Convert to array and sort groups
    const sortedGroups = Array.from(map.values()).sort((a, b) => a.sortKey - b.sortKey);
    groups.push(...sortedGroups);
    
  } else if (['all', 'today', 'completed'].includes(props.categoryId)) {
    // Category Grouping
    const map = new Map();
    list.forEach(t => {
      const catId = t.categoryId || 'default';
      if (!map.has(catId)) {
        map.set(catId, { id: catId, title: getCategoryName(catId), items: [] });
      }
      map.get(catId).items.push(t);
    });
    
    // Sort groups by category order maybe?
    // Using props.categories order
    const sortedGroups = [];
    // First default
    if (map.has('default')) sortedGroups.push(map.get('default'));
    // Then others in order
    props.categories.forEach(c => {
      if (c.id !== 'default' && map.has(c.id)) {
        sortedGroups.push(map.get(c.id));
      }
    });
    // Any remaining (orphaned?)
    map.forEach((val, key) => {
      if (key !== 'default' && !props.categories.find(c => c.id === key)) {
        sortedGroups.push(val);
      }
    });
    
    groups.push(...sortedGroups);
    
  } else {
    // Custom Category (My List)
    // Active Tasks
    const active = list.filter(t => !t.isCompleted);
    // Completed Tasks
    const completed = list.filter(t => t.isCompleted);
    
    if (active.length > 0 || completed.length > 0) {
      if (active.length > 0 || completed.length === 0) {
        groups.push({
          id: 'active',
          title: '待办',
          items: active,
          isCollapsible: true,
          count: active.length
        });
      }
      
      if (completed.length > 0) {
        groups.push({
          id: 'completed',
          title: '已完成',
          items: completed,
          isCollapsible: true,
          defaultCollapsed: true, // Collapsed by default? User said "Collapsible card... put completed in it". Usually implies separated.
          count: completed.length
        });
      }
    }
  }
  
  return groups;
});

const isCustomSort = computed(() => props.sortState.field !== 'default');
watch(displayGroups, () => updateAxisBounds());
watch(() => props.todos.length, () => updateAxisBounds());
watch(displayGroups, () => updateScrollState());
watch(() => props.todos.length, () => updateScrollState());

// Logic for Priority View default collapsed state
const urgentInitialized = ref(false);
const stickyInitialized = ref(false);

const checkAndInitUrgent = () => {
  if (props.categoryId === 'urgent' && !urgentInitialized.value && displayGroups.value.length > 0) {
    const groups = displayGroups.value;
    const firstId = groups[0].id;
    groups.forEach(g => {
      // Default expand highest priority (first one), collapse others
      collapsedGroups.value[g.id] = (g.id !== firstId);
    });
    urgentInitialized.value = true;
    updateAxisBounds();
  }
};

const checkAndInitSticky = () => {
  if (props.stickyMode && props.categoryId === 'all' && !stickyInitialized.value && displayGroups.value.length > 0) {
    const groups = displayGroups.value;
    groups.forEach(g => {
      collapsedGroups.value[g.id] = g.id !== 'sticky-today';
    });
    stickyInitialized.value = true;
    updateAxisBounds();
  }
};

watch(() => props.categoryId, (newId) => {
  if (newId === 'urgent') {
    urgentInitialized.value = false;
    nextTick(() => checkAndInitUrgent());
  }
  if (props.stickyMode && newId === 'all') {
    stickyInitialized.value = false;
    nextTick(() => checkAndInitSticky());
  }
});

watch(displayGroups, () => {
  checkAndInitUrgent();
  checkAndInitSticky();
});

const groupsRef = ref(null);
const scrollEnabled = ref(!props.stickyMode);
const updateScrollState = () => {
  nextTick(() => {
    const container = groupsRef.value;
    if (!container) return;
    const diff = container.scrollHeight - container.clientHeight;
    scrollEnabled.value = diff > 16;
    if (!scrollEnabled.value) {
      try { container.scrollTop = 0 } catch (e) {}
    }
  });
};

const onWheel = (e) => {
  if (!scrollEnabled.value) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
};

const isStickyCategoryGroup = (groupId) => {
  return !!(props.stickyMode && props.categoryId === 'all' && groupId && groupId !== 'sticky-today' && groupId !== 'sticky-urgent');
};

const openAddForGroup = (groupId) => {
  if (!groupId) return;
  emit('open-add-task', { categoryId: groupId });
};

// ... existing methods ...
const activateInput = () => {
  if (props.categoryId === 'completed') return;
  emit('open-add-task');
};

const onKeydown = (e) => {
  if (e.key === 'Tab') {
    if (props.categoryId === 'completed') return;
    e.preventDefault();
    activateInput();
  }
};

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  if (props.categoryId !== 'all' && props.categoryId !== 'today' && props.categoryId !== 'plan' && props.categoryId !== 'urgent' && props.categoryId !== 'completed') {
     collapsedGroups.value['completed'] = true;
  }
  updateAxisBounds();
  updateScrollState();
  window.addEventListener('resize', updateAxisBounds);
  window.addEventListener('resize', updateScrollState);
  if (props.stickyMode) {
    window.addEventListener('wheel', onWheel, { passive: false });
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('resize', updateAxisBounds);
  window.removeEventListener('resize', updateScrollState);
  if (props.stickyMode) {
    window.removeEventListener('wheel', onWheel);
  }
});

const toggleComplete = (todo, event) => {
  const newStatus = !todo.isCompleted;
  emit('update-todo', { ...todo, isCompleted: newStatus });
  // Confetti is now handled globally in App.vue
};

const onContextMenu = (e, todo) => {
  e.preventDefault();
  emit('context-menu', { event: e, type: 'todo', item: todo });
};

// Subtask Hover Logic
const hoveredKey = ref(null);
let hoverTimeout = null;

const showSubtasks = (groupId, id) => {
  if (hoverTimeout) clearTimeout(hoverTimeout);
  hoveredKey.value = `${groupId}:${id}`;
};

const hideSubtasks = () => {
  hoverTimeout = setTimeout(() => {
    hoveredKey.value = null;
  }, 200);
};

const toggleSubtaskComplete = (todo, index) => {
  if (!todo.subtasks) return;
  const newSubtasks = [...todo.subtasks];
  newSubtasks[index].isCompleted = !newSubtasks[index].isCompleted;
  
  // Create a copy of the todo to update
  const newTodo = { ...todo, subtasks: newSubtasks };
  emit('update-todo', newTodo);
};

// Expand Animation Hooks
const beforeEnter = (el) => {
  el.style.height = '0';
  el.style.opacity = '0';
};

const enter = (el) => {
  el.style.transition = 'height 0.2s ease-in-out, opacity 0.2s ease-in-out';
  // Force reflow
  el.offsetHeight;
  el.style.height = el.scrollHeight + 'px';
  el.style.opacity = '1';
};

const afterEnter = (el) => {
  el.style.height = 'auto';
  el.style.transition = '';
};

const leave = (el) => {
  el.style.transition = 'height 0.2s ease-in-out, opacity 0.2s ease-in-out';
  el.style.height = el.scrollHeight + 'px';
  el.style.opacity = '1';
  // Force reflow
  el.offsetHeight;
  el.style.height = '0';
  el.style.opacity = '0';
};
</script>

<template>
  <div class="todo-list-container" @wheel="onWheel">
    <!-- Header removed as per request -->

    <div class="groups-container" ref="groupsRef" :style="{ overflowY: scrollEnabled ? 'auto' : 'hidden' }" @wheel="onWheel">
      <div class="timeline-content" ref="timelineRef">
        <div class="timeline-axis" :style="axisStyle"></div>
        <div v-for="group in displayGroups" :key="group.id" class="group-section">
        <!-- Group Header -->
        <div 
          v-if="!group.noHeader" 
          class="group-header" 
          :class="{ 
            'clickable': group.isCollapsible || categoryId === 'plan' || ['all', 'today', 'completed'].includes(categoryId),
            'sticky-today': props.stickyMode && group.id === 'sticky-today',
            'sticky-urgent': props.stickyMode && group.id === 'sticky-urgent',
          }"
          @click="(group.isCollapsible || categoryId === 'plan' || ['all', 'today', 'completed'].includes(categoryId)) ? toggleGroup(group.id) : null"
        >
           <div class="header-left">
             <i 
               v-if="group.isCollapsible || categoryId === 'plan' || ['all', 'today', 'completed'].includes(categoryId)" 
               class="ri-arrow-right-s-line arrow-icon"
               :class="{ rotated: !collapsedGroups[group.id] }"
             ></i>
             <span class="group-title" :style="{ color: group.color }">{{ group.title }}</span>
             <span class="group-count">{{ group.items.length }}</span>
           </div>
           <div v-if="isStickyCategoryGroup(group.id)" class="header-right">
             <button class="group-add-btn" title="新建待办" @click.stop="openAddForGroup(group.id)">
               <i class="ri-add-line"></i>
             </button>
           </div>
        </div>

        <!-- Group List -->
        <div v-show="!collapsedGroups[group.id]" class="group-list">
           <!-- Use Draggable only if it's the 'active' group in Custom Category and NOT sorting -->
           <draggable 
             v-if="group.id === 'active' && !isCustomSort && !['all', 'today', 'plan', 'urgent', 'completed'].includes(categoryId)"
             :list="group.items"
             item-key="id" 
             class="todo-list-draggable"
             handle=".drag-handle"
             animation="300"
             @end="(e) => emit('update:todos', props.todos)" 
           >
              <!-- Note: Draggable directly mutating prop array might be tricky if we split it. 
                   If we split, we can't easily drag to reorder the main array unless we map back.
                   However, for custom category, 'active' IS the main list minus completed.
                   If we reorder 'active', we should update the main list.
                   But props.todos includes completed items too.
                   Simplification: Disable drag for now if we are doing complex grouping, OR just render list.
                   User didn't explicitly ask to keep drag-sort, but it's implied for 'My List'.
                   Since 'active' items are usually at the top of props.todos in My List (if we ignore completed at bottom),
                   reordering them locally is fine. But syncing back to props.todos is hard without a proper store action.
                   Let's stick to simple list rendering for now to ensure stability with the new grouping features, 
                   unless it's the main simple view.
                   Actually, draggable works with v-model. We can't v-model a filtered array easily.
                   So let's use standard list for now.
              -->
              <template #item="{ element }">
                <div 
                  class="todo-item" 
                  :class="{ 
                    completed: element.isCompleted,
                    'is-hovering': hoveredKey === `${group.id}:${element.id}`,
                    'has-drag-handle': true
                  }"
                  @contextmenu="onContextMenu($event, element)"
                  @mouseleave="hideSubtasks"
                >
                  <div class="todo-main-row">
                    <span class="drag-handle">⋮⋮</span>
                    <div class="checkbox-wrapper" @click.stop="toggleComplete(element, $event)">
                      <div 
                        class="custom-checkbox"
                        :class="{ 'checked': element.isCompleted }"
                        :style="{ borderColor: element.isCompleted ? 'transparent' : (element.priority === 'high' ? 'var(--danger-color)' : (element.priority === 'medium' ? 'var(--warning-color)' : (element.priority === 'low' ? 'var(--success-color)' : 'var(--border-color)'))) }"
                      >
                        <i v-if="element.isCompleted" class="ri-check-line" style="color: white; font-size: 14px;"></i>
                      </div>
                    </div>
                    <div class="todo-content" @click="emit('item-click', element)">
                      <div class="content-main">
                        <span class="text">{{ element.content }}</span>
                        <span v-if="element.priority && element.priority !== 'normal'" class="priority-badge" :class="element.priority">
                          {{ element.priority === 'high' ? '高' : element.priority === 'medium' ? '中' : '低' }}
                        </span>
                      </div>
                      <div class="meta" v-if="element.dueDate || element.repeatRule || element.description || (element.subtasks && element.subtasks.length > 0) || (element.attachments && element.attachments.length > 0)">
                         <span v-if="element.description" class="meta-tag has-desc" title="有备注">
                           <i class="ri-sticky-note-line"></i>
                         </span>

                         <span 
                           v-if="element.subtasks && element.subtasks.length > 0" 
                           class="meta-tag subtask-tag" 
                           title="子任务"
                           @mouseenter="showSubtasks(group.id, element.id)"
                         >
                           <i class="ri-list-check"></i> {{ getSubtaskProgress(element) }}
                         </span>
                         <span v-if="element.dueDate" class="meta-tag" :class="{ overdue: isOverdue(element) }">
                           <i class="ri-calendar-line"></i> {{ formatDueDate(element.dueDate) }}
                         </span>
                         <span v-if="element.repeatRule" class="meta-tag">
                           <i class="ri-loop-right-line"></i> {{ formatRepeatRule(element) }}
                         </span>
                         <div 
                           v-if="element.attachments && element.attachments.length > 0"
                           class="attachment-icon-wrapper"
                           @mouseenter="(e) => showAttachments(element.id, element.attachments, e)"
                           @mouseleave="hideAttachments"
                         >
                             <i class="ri-attachment-line"></i>
                             <span class="count">{{ element.attachments.length }}</span>
                         </div>
                      </div>
                    </div>
                  </div>

                  <Transition
                    @before-enter="beforeEnter"
                    @enter="enter"
                    @after-enter="afterEnter"
                    @leave="leave"
                  >
                    <div 
                      v-if="hoveredKey === `${group.id}:${element.id}` && element.subtasks && element.subtasks.length > 0"
                      class="subtask-expansion-wrapper"
                      @click.stop
                    >
                      <div class="subtask-inner-panel">
                        <div 
                          v-for="(sub, idx) in element.subtasks" 
                          :key="idx" 
                          class="hover-subtask-item"
                          @click="toggleSubtaskComplete(element, idx)"
                        >
                          <div 
                            class="subtask-circle" 
                            :class="{ checked: sub.isCompleted }"
                            :style="{ borderColor: sub.isCompleted ? 'transparent' : (element.priority === 'high' ? 'var(--danger-color)' : (element.priority === 'medium' ? 'var(--warning-color)' : (element.priority === 'low' ? 'var(--success-color)' : 'var(--border-color)'))) }"
                          >
                            <i v-if="sub.isCompleted" class="ri-check-line"></i>
                          </div>
                          <span :class="{ done: sub.isCompleted }">
                            <span class="subtask-index">{{ idx + 1 }}.</span> {{ sub.content }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>
              </template>
           </draggable>

           <!-- Non-draggable List -->
           <div v-else>
             <TransitionGroup name="list" tag="div">
             <div 
                v-for="element in group.items" 
                :key="element.id" 
                class="todo-item" 
                :class="{ 
                  completed: element.isCompleted,
                  'is-hovering': hoveredKey === `${group.id}:${element.id}`,
                  'has-drag-handle': (!isCustomSort && group.id === 'active' && !['all', 'today', 'plan', 'urgent', 'completed'].includes(categoryId))
                }"
                @contextmenu="onContextMenu($event, element)"
                @mouseleave="hideSubtasks"
              >
               <div class="todo-main-row">
                 <span class="drag-handle" v-if="!isCustomSort && group.id === 'active' && !['all', 'today', 'plan', 'urgent', 'completed'].includes(categoryId)">⋮⋮</span>
                 <div class="checkbox-wrapper" @click.stop="toggleComplete(element, $event)">
                   <div 
                     class="custom-checkbox"
                     :class="{ 'checked': element.isCompleted }"
                     :style="{ borderColor: element.isCompleted ? 'transparent' : (element.priority === 'high' ? 'var(--danger-color)' : (element.priority === 'medium' ? 'var(--warning-color)' : (element.priority === 'low' ? 'var(--success-color)' : 'var(--border-color)'))) }"
                   >
                     <i v-if="element.isCompleted" class="ri-check-line" style="color: white; font-size: 14px;"></i>
                   </div>
                 </div>
                 <div class="todo-content" @click="emit('item-click', element)">
                   <div class="content-main">
                     <span class="text">{{ element.content }}</span>
                     <span v-if="element.priority && element.priority !== 'normal'" class="priority-badge" :class="element.priority">
                       {{ element.priority === 'high' ? '高' : element.priority === 'medium' ? '中' : '低' }}
                     </span>
                   </div>
                   <div class="meta" v-if="element.dueDate || element.repeatRule || element.description || (element.subtasks && element.subtasks.length > 0) || (element.attachments && element.attachments.length > 0)">
                         <span v-if="element.description" class="meta-tag has-desc" title="有备注">
                           <i class="ri-sticky-note-line"></i>
                         </span>
                 <span 
                   v-if="element.subtasks && element.subtasks.length > 0" 
                   class="meta-tag subtask-tag" 
                   title="子任务"
                   @mouseenter="showSubtasks(group.id, element.id)"
                 >
                   <i class="ri-list-check"></i> {{ getSubtaskProgress(element) }}
                 </span>
                     <span v-if="element.dueDate" class="meta-tag" :class="{ overdue: isOverdue(element) }">
                       <i class="ri-calendar-line"></i> {{ formatDueDate(element.dueDate) }}
                     </span>
                     <span v-if="element.repeatRule && !element.isCompleted" class="meta-tag">
                       <i class="ri-loop-right-line"></i> {{ formatRepeatRule(element) }}
                     </span>
                     <span v-if="element.completedAt" class="meta-tag completed-time">
                       <i class="ri-check-double-line"></i> {{ dayjs(element.completedAt).format('MM-DD HH:mm') }}
                     </span>
                     <div 
                       v-if="element.attachments && element.attachments.length > 0"
                       class="attachment-icon-wrapper"
                       @mouseenter="(e) => showAttachments(element.id, element.attachments, e)"
                       @mouseleave="hideAttachments"
                     >
                         <i class="ri-attachment-line"></i>
                         <span class="count">{{ element.attachments.length }}</span>
                     </div>

                   </div>
                 </div>
               </div>

             <Transition
                @before-enter="beforeEnter"
                @enter="enter"
                @after-enter="afterEnter"
                @leave="leave"
              >
              <div 
                  v-if="hoveredKey === `${group.id}:${element.id}` && element.subtasks && element.subtasks.length > 0"
                  class="subtask-expansion-wrapper"
                  @click.stop
                >
                  <div class="subtask-inner-panel">
                    <div 
                      v-for="(sub, idx) in element.subtasks" 
                      :key="idx" 
                      class="hover-subtask-item"
                      @click="toggleSubtaskComplete(element, idx)"
                    >
                       <div 
                         class="subtask-circle" 
                         :class="{ checked: sub.isCompleted }"
                         :style="{ borderColor: sub.isCompleted ? 'transparent' : (element.priority === 'high' ? 'var(--danger-color)' : (element.priority === 'medium' ? 'var(--warning-color)' : (element.priority === 'low' ? 'var(--success-color)' : 'var(--border-color)'))) }"
                       >
                         <i v-if="sub.isCompleted" class="ri-check-line"></i>
                       </div>
                       <span :class="{ done: sub.isCompleted }">
                         <span class="subtask-index">{{ idx + 1 }}.</span> {{ sub.content }}
                       </span>
                    </div>
                  </div>
                </div>
              </Transition>
             </div>
             </TransitionGroup>
           </div>
        </div>
        <div v-if="props.stickyMode && props.categoryId === 'all' && group.id === 'sticky-urgent'" class="sticky-group-separator"></div>
      </div>
      
      <div v-if="displayGroups.length === 0" class="empty-state">
        <i class="ri-checkbox-circle-line" style="font-size: 48px; opacity: 0.2; margin-bottom: 10px;"></i>
        <div>暂无待办事项</div>
      </div>
      </div>
    </div>

    <div class="fab-btn" @click="activateInput" v-if="!props.stickyMode && categoryId !== 'completed'" title="新建待办">
      <i class="ri-add-line"></i>
    </div>

    <!-- Global Attachment Dropdown -->
    <div 
      v-if="hoveredAttachmentId && hoveredAttachmentsList.length > 0" 
      class="global-attachment-dropdown"
      :style="dropdownPosition"
      @mouseenter="cancelHideAttachments" 
      @mouseleave="hideAttachments"
    >
       <div 
         v-for="att in hoveredAttachmentsList" 
         :key="att.id" 
         class="attachment-item"
         @click.stop="openPreview(att)"
       >
         <i :class="getAttachmentIcon(att)"></i>
         <span class="att-name">{{ att.name }}</span>
       </div>
    </div>

    <!-- Preview Modal -->
    <div v-if="previewVisible" class="preview-overlay" @click.self="closePreview">
      <div class="preview-box">
        <div class="preview-header">
          <div class="preview-title-block">
            <span class="preview-title">{{ previewAttachment?.name }}</span>
            <select 
              v-if="isTextAttachment(previewAttachment)" 
              v-model="previewEncoding" 
              @change="changeEncoding"
              class="encoding-select"
            >
              <option v-for="opt in encodingOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
          <div class="preview-actions">
              <button class="preview-download-btn" @click="downloadAttachment(previewAttachment)">
                <i class="ri-download-2-line"></i> 下载
              </button>
              <button class="preview-close-btn" @click="closePreview"><i class="ri-close-line"></i></button>
          </div>
        </div>
        <div class="preview-body">
          <img v-if="isImageAttachment(previewAttachment)" :src="previewAttachment.dataUrl" class="preview-image" />
          <pre v-else-if="isTextAttachment(previewAttachment)" class="preview-text">{{ previewText }}</pre>
          <div v-else class="preview-empty">
            <i class="ri-file-unknow-line"></i>
            <p>该文件不支持预览</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.todo-list-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overscroll-behavior: none;

  .header {
    padding: 20px 0;
    margin-bottom: 10px;

    h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: var(--text-color);
    }
  }

  .groups-container {
    flex: 1;
    overflow-y: auto;
    position: relative;
    /* Padding moved to inner wrapper to allow axis to scroll with content */
    overscroll-behavior: none;
  }

  .timeline-content {
    position: relative;
    padding: 10px 8px 10px 8px;
    min-height: 100%;
    box-sizing: border-box;
  }
  .timeline-axis {
    position: absolute;
    left: 6px;
    width: 2px;
    border-left: 2px dashed var(--sticky-axis, var(--border-color));
    opacity: 0.6;
    z-index: 0;
  }
}

.group-section {
  margin-bottom: 30px;
  position: relative;
  z-index: 1;
}
.group-section:last-child {
  margin-bottom: 0;
}

  .group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 6px 0;
  user-select: none;
  position: relative;
  padding-left: 8px; /* Space for dot */
  
  /* Timeline Dot */
  &::before {
    content: '';
    position: absolute;
    /* 
       Container padding-left is 20px. 
       Line is at left: 28px (absolute to container).
       Relative to container content (starts at 20px), line is at 8px.
    */
    left: -4px; 
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--primary-color);
    box-shadow: none;
    border: none;
    z-index: 2;
    transition: all 0.2s;
  }

  &.sticky-today {
    &::before {
      background: #52c41a;
    }
  }

  &.sticky-urgent {
    &::before {
      background: #ff4d4f;
    }
  }

  &.clickable {
    cursor: pointer;
    &:hover {
      opacity: 0.8;
      &::before {
        transform: translateY(-50%) scale(1.2);
        box-shadow: 0 0 0 6px var(--sticky-dot-glow, var(--hover-bg));
      }
    }
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-right {
    display: flex;
    align-items: center;
  }

  .group-add-btn {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--secondary-text);
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;

    &:hover {
      background: var(--hover-bg);
      border-color: var(--primary-color);
      color: var(--primary-color);
    }
  }

  .arrow-icon {
    font-size: 18px;
    color: var(--primary-color);
    transition: transform 0.2s;
    margin-left: 0;
    opacity: 0.8;
    
    &.rotated {
      transform: rotate(90deg);
    }
  }

  .group-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--primary-color);
  }

  .group-count {
    display: none; /* Hide count to match cleaner look, or style it minimally */
  }
}

.group-list {
  padding-left: 8px; /* Indent items to align with title text */
}

.sticky-group-separator {
  margin: 14px 8px 18px 8px;
  border-top: 1px dashed var(--border-color);
  opacity: 0.6;
}

.todo-item {
  --subtask-indent: 28px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 6px 8px;
  background: var(--sticky-card-bg, var(--bg-secondary));
  border-radius: 8px; /* Slightly less rounded, more like card */
  margin-bottom: 12px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  user-select: none;
  position: relative;
  /* overflow: hidden; Removed to allow subtask panel to overflow */

  &.is-hovering {
    z-index: 100;
  }

  &.has-drag-handle {
    --subtask-indent: 52px;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    background: var(--hover-bg); /* Highlight on hover */
    
    .drag-handle {
      opacity: 1;
    }
  }


  &.completed {
    opacity: 0.7;
    background: var(--bg-color);
    box-shadow: none;
    border-color: transparent;
    
    &:hover {
      transform: none;
      box-shadow: none;
    }

    .text {
      text-decoration: line-through;
      color: var(--secondary-text);
    }
    
    .checkbox-custom {
      border-color: var(--secondary-text);
      background: var(--secondary-text);
      
      &::after {
        opacity: 1;
      }
    }
  }
}

.todo-main-row {
  display: flex;
  align-items: flex-start;
  width: 100%;
}

.drag-handle {
  cursor: move;
  padding: 2px 4px;
  color: var(--secondary-text);
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 14px;
  margin-right: 4px;
}

/* Custom Checkbox */
.checkbox-wrapper {
  width: 20px;
  height: 20px;
  margin-right: 8px;
  flex-shrink: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.custom-checkbox {
  width: 15px;
  height: 15px;
  border: 1.5px solid var(--border-color);
  border-radius: 50%; /* Circular */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: transparent;

  &:hover {
    border-color: var(--primary-color) !important;
    background: rgba(59, 130, 246, 0.05);
  }

  &.checked {
    background: var(--secondary-text); /* Completed color */
    border-color: transparent !important;
    
    /* If priority colors needed for checked state, can adjust here. 
       But usually completed = gray/muted. 
    */
  }
}

.todo-content {
  flex: 1;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;

  .content-main {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .text {
    font-size: 15px;
    color: var(--text-color);
    flex: 1;
    line-height: 1.5;
    font-weight: 500;
  }
  
  /* Modern Priority Badge/Indicator */
  .priority-badge {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    
    &.high { 
      background: rgba(239, 68, 68, 0.1); 
      color: var(--danger-color);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    &.medium { 
      background: rgba(245, 158, 11, 0.1); 
      color: var(--warning-color);
      border: 1px solid rgba(245, 158, 11, 0.2);
    }
    &.low { 
      background: rgba(34, 197, 94, 0.1); 
      color: var(--success-color);
      border: 1px solid rgba(34, 197, 94, 0.2);
    }
    &.normal { display: none; } 
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12px;
    color: var(--secondary-text);
    align-items: center;

    .meta-tag {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: var(--bg-color); /* Darker/Lighter than card */
      border: 1px solid var(--border-color); /* Subtle border */
      border-radius: 6px; /* Match checkbox radius */
      font-size: 11px;
      color: var(--secondary-text);
      transition: all 0.2s;
      font-weight: 500;

      i {
        font-size: 12px;
        opacity: 0.8;
      }
      
      &.overdue {
        background: rgba(239, 68, 68, 0.1);
        color: var(--danger-color);
        border-color: rgba(239, 68, 68, 0.2);
      }
      
      &.has-desc {
        color: var(--primary-color);
        background: rgba(59, 130, 246, 0.1);
        border-color: rgba(59, 130, 246, 0.2);
      }

      &.completed-time {
         border-color: transparent;
         background: transparent;
         padding-left: 0;
      }
    }
  }
}

.fab-btn {
  position: absolute;
  right: 30px;
  bottom: 30px;
  width: 56px;
  height: 56px;
  background: var(--primary-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
  box-shadow: var(--shadow-lg);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 99;

  &:hover {
    transform: scale(1.1) rotate(90deg);
    background: var(--primary-hover);
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.5);
  }

  &:active {
    transform: scale(0.95);
  }
  
  i {
    line-height: 1;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 300px;
  color: var(--secondary-text);
  font-size: 14px;
  opacity: 0.8;
  
  img {
    filter: grayscale(1);
    opacity: 0.5;
    margin-bottom: 16px;
  }
}

/* List Transitions */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: scale(0.9);
  max-height: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-width: 0;
}

.list-leave-active {
  /* Ensure smooth removal */
  max-height: 100px; /* Needs to be larger than actual height */
}

/* Subtask Hover Panel Styles */
.subtask-expansion-wrapper {
  width: 100%;
  overflow: hidden;
  position: relative;
  margin-top: 4px;
  padding-top: 6px;
}

.subtask-expansion-wrapper::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  border-top: 1px dashed var(--secondary-text);
  opacity: 0.4;
  pointer-events: none;
}

.subtask-inner-panel {
  padding: 0 0 0 var(--subtask-indent);
}

.hover-subtask-item {
  display: flex;
  align-items: center;
  padding: 4px 0;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  transition: background 0.2s;
  color: var(--secondary-text);
  gap: 6px;
  
  &:hover {
    background: var(--active-bg);
  }
  
  .subtask-circle {
    width: 10px;
    height: 10px;
    border: 1.5px solid var(--border-color);
    border-radius: 50%; /* Circular */
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
    background: transparent;
    
    &.checked {
       background: var(--primary-color);
       border-color: var(--primary-color);
    }
    
    i {
      font-size: 10px;
      color: white;
    }
  }
  
  span {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    
    &.done {
      text-decoration: line-through;
      opacity: 0.6;
    }
  }
  
  .subtask-index {
    margin-right: 2px;
    opacity: 0.8;
    font-size: 12px;
  }
}

.attachment-icon-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  color: var(--secondary-text);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 11px;
  
  &:hover {
    background: var(--active-bg);
    color: var(--primary-color);
  }
  
  i {
    font-size: 12px;
  }
  
  .count {
    font-size: 11px;
    font-weight: 500;
  }
}

.global-attachment-dropdown {
  position: fixed;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  padding: 6px;
  z-index: 9999;
  min-width: 200px;
  max-width: 300px;
  
  .attachment-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    color: var(--text-color);
    transition: background 0.2s;
    
    &:hover {
      background: var(--active-bg);
    }
    
    i {
      font-size: 18px;
      color: var(--primary-color);
    }
    
    .att-name {
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }
  }
}

/* Preview Modal Styles */
.preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.preview-box {
  background: var(--bg-secondary);
  border-radius: 12px;
  width: 80%;
  max-width: 800px;
  height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.preview-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-color);
}

.preview-title-block {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.preview-title {
  font-weight: 600;
  font-size: 16px;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 16px;
}

.preview-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.encoding-select {
  padding: 6px 24px 6px 8px; /* Extra right padding for arrow */
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-color);
  color: var(--text-color);
  font-size: 13px;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24' fill='%23666'%3e%3cpath fill='none' d='M0 0h24v24H0z'/%3e%3cpath d='M12 13.172l4.95-4.95 1.414 1.414L12 16 5.636 9.636 7.05 8.222z'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 4px center;
  background-size: 16px;
  
  &:hover {
    border-color: var(--primary-color);
  }
}

.preview-download-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-color);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: var(--hover-bg);
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
}

.preview-close-btn {
  background: transparent;
  border: none;
  font-size: 20px;
  color: var(--secondary-text);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: var(--hover-bg);
    color: var(--text-color);
  }
}

.preview-body {
  flex: 1;
  overflow: auto;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.preview-text {
  width: 100%;
  height: 100%;
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-color);
  padding: 16px;
  background: var(--bg-color);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  overflow: auto;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--secondary-text);
  
  i {
    font-size: 48px;
    opacity: 0.5;
  }
  
  p {
    font-size: 14px;
  }
}
</style>
