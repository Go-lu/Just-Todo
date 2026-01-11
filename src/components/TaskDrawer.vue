<script setup>
import { ref, watch, computed, nextTick, onMounted, onUnmounted } from 'vue';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import DateTimePicker from './DateTimePicker.vue';

const vAutoResize = {
  mounted: (el) => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
    el.addEventListener('input', () => {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    });
  }
};

dayjs.locale('zh-cn');

const props = defineProps({
  visible: Boolean,
  categories: {
    type: Array,
    required: true
  },
  initialData: {
    type: Object,
    default: () => ({})
  },
  defaultCategoryId: {
    type: String,
    default: 'default'
  }
});

const emit = defineEmits(['update:visible', 'save', 'delay']);

const form = ref({
  content: '',
  description: '',
  categoryId: '',
  priority: 'normal',
  dueDate: '',
  repeatRule: 'none',
  subtasks: [],
  attachments: []
});

const addSubtask = () => {
  if (!form.value.subtasks) form.value.subtasks = [];
  
  form.value.subtasks.push({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    content: '',
    isCompleted: false
  });

  // Focus the new input after render
  nextTick(() => {
    const inputs = document.querySelectorAll('.subtask-input');
    if (inputs.length > 0) {
      inputs[inputs.length - 1].focus();
    }
  });
};

const removeSubtask = (index) => {
  form.value.subtasks.splice(index, 1);
};

const toggleSubtask = (index) => {
  form.value.subtasks[index].isCompleted = !form.value.subtasks[index].isCompleted;
};

const attachmentsInputRef = ref(null);
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

const openFilePicker = () => {
  attachmentsInputRef.value?.click();
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

const guessMimeType = (name) => {
  const lower = (name || '').toLowerCase();
  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.md')) return 'text/markdown';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.log')) return 'text/plain';
  if (lower.endsWith('.yml') || lower.endsWith('.yaml')) return 'text/yaml';
  if (lower.endsWith('.xml')) return 'application/xml';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
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

const downloadAttachment = (att) => {
  if (!att?.dataUrl) return;
  const bytes = dataUrlToUint8Array(att.dataUrl);
  const mime = att.mimeType || 'application/octet-stream';
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = att.name || 'attachment';
  a.click();
  URL.revokeObjectURL(url);
};

const openPreview = (att) => {
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

const removeAttachment = (index) => {
  if (!form.value.attachments) form.value.attachments = [];
  form.value.attachments.splice(index, 1);
};

const onFilesSelected = async (e) => {
  const input = e.target;
  const files = Array.from(input.files || []);
  if (!form.value.attachments) form.value.attachments = [];

  for (const file of files) {
    const dataUrl = await readFileAsDataUrl(file);
    form.value.attachments.push({
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
      name: file.name,
      size: file.size,
      mimeType: file.type || guessMimeType(file.name),
      createdAt: Date.now(),
      dataUrl
    });
  }

  input.value = '';
};

const toggleTaskComplete = () => {
  form.value.isCompleted = !form.value.isCompleted;
  if (!form.value.history) form.value.history = [];
  form.value.history.push({
    type: form.value.isCompleted ? 'complete' : 'uncomplete',
    timestamp: Date.now()
  });
  form.value.completedAt = form.value.isCompleted ? Date.now() : null;
  emit('save', { ...form.value, priority: form.value.priority });
};

const categoryList = computed(() => props.categories || []);

const priorityOptions = [
  { value: 'high', label: '🔴 高' },
  { value: 'medium', label: '🟠 中' },
  { value: 'low', label: '🔵 低' }
];

const getPriorityColor = (p) => {
  switch (p) {
    case 'high': return 'var(--danger-color)';
    case 'medium': return 'var(--warning-color)';
    case 'low': return 'var(--primary-color)';
    default: return 'var(--secondary-text)';
  }
};

const repeatOptions = computed(() => {
  const date = form.value.dueDate ? dayjs(form.value.dueDate) : dayjs();
  
  return [
    { value: 'none', label: '不重复' },
    { value: 'daily', label: '每天' },
    { value: 'weekly', label: `每周 (${date.format('dddd')})` },
    { value: 'monthly', label: `每月 (${date.format('D')}日)` },
    { value: 'yearly', label: `每年 (${date.format('MM月DD日')})` }
  ];
});

// History / Timeline
const timeline = computed(() => {
  if (!props.initialData) return [];
  
  const history = props.initialData.history || [];
  const events = [...history];

  // Add creation event if not present but createdAt exists
  if (props.initialData.createdAt && !events.some(e => e.type === 'create')) {
    events.push({
      type: 'create',
      timestamp: props.initialData.createdAt
    });
  }

  // Add completion event if completedAt exists
  if (props.initialData.completedAt && !events.some(e => e.type === 'complete')) {
    events.push({
      type: 'complete',
      timestamp: props.initialData.completedAt
    });
  }
  
  return events.sort((a, b) => b.timestamp - a.timestamp);
});

const getEventLabel = (event) => {
  switch (event.type) {
    case 'create': return '创建任务';
    case 'complete': return '完成任务';
    case 'uncomplete': return '重置任务';
    case 'delay': return `推迟至 ${event.details}`;
    case 'update': return '更新任务';
    default: return '未知操作';
  }
};

const getEventIcon = (type) => {
  switch (type) {
    case 'create': return 'ri-add-circle-line';
    case 'complete': return 'ri-checkbox-circle-line';
    case 'uncomplete': return 'ri-refresh-line';
    case 'delay': return 'ri-time-line';
    case 'update': return 'ri-edit-line';
    default: return 'ri-record-circle-line';
  }
};

watch(() => props.visible, (val) => {
  if (val) {
    if (props.initialData && Object.keys(props.initialData).length > 0) {
      form.value = {
        ...props.initialData,
        history: props.initialData.history ? [...props.initialData.history] : [],
        priority: props.initialData.priority === 'normal' ? 'medium' : (props.initialData.priority || 'medium'),
        repeatRule: props.initialData.repeatRule || 'none',
        subtasks: props.initialData.subtasks ? JSON.parse(JSON.stringify(props.initialData.subtasks)) : [],
        attachments: props.initialData.attachments ? JSON.parse(JSON.stringify(props.initialData.attachments)) : []
      };
    } else {
      // New Task
      form.value = {
        content: '',
        description: '',
        isCompleted: false,
        categoryId: props.defaultCategoryId === 'all' || props.defaultCategoryId === 'today' || props.defaultCategoryId === 'urgent' || props.defaultCategoryId === 'plan' ? (props.categories.find(c => c.isDefault)?.id || props.categories[0]?.id) : props.defaultCategoryId,
        priority: 'medium',
        dueDate: props.defaultCategoryId === 'today' ? dayjs().format('YYYY-MM-DD') : '',
        repeatRule: 'none',
        subtasks: [],
        attachments: []
      };
    }
  }
});

const showDatePicker = ref(false);
const isDelayAction = ref(false);
const activeDropdown = ref(null);
const datePickerContainer = ref(null);

const toggleDropdown = (name) => {
  if (activeDropdown.value === name) {
    activeDropdown.value = null;
  } else {
    activeDropdown.value = name;
  }
};

const closeDropdowns = (e) => {
  if (activeDropdown.value && !e.target.closest('.select-field') && !e.target.closest('.dropdown-panel')) {
    activeDropdown.value = null;
  }
};

onMounted(() => {
  document.addEventListener('click', closeDropdowns);
});

onUnmounted(() => {
  document.removeEventListener('click', closeDropdowns);
});

const getCategoryName = (id) => categoryList.value.find(c => c.id === id)?.name;
const getRepeatLabel = (val) => repeatOptions.value.find(o => o.value === val)?.label;
const getPriorityLabel = (val) => priorityOptions.find(o => o.value === val)?.label;

const openDatePicker = () => {
  activeDropdown.value = null;
  showDatePicker.value = true;
};

const handleDateConfirm = (val) => {
  if (isDelayAction.value) {
      // Add delay history
      if (!form.value.history) form.value.history = [];
      form.value.history.push({
        type: 'delay',
        timestamp: Date.now(),
        details: val
      });
      
      form.value.dueDate = val;
      isDelayAction.value = false;
      
      // Auto save
      onSave();
  } else {
      form.value.dueDate = val;
  }
  showDatePicker.value = false;
};

const triggerDelay = () => {
    isDelayAction.value = true;
    showDatePicker.value = true;
};

// Weekly: 0-6 (Sun-Sat)
const weekDays = [
  { val: 1, label: '一' },
  { val: 2, label: '二' },
  { val: 3, label: '三' },
  { val: 4, label: '四' },
  { val: 5, label: '五' },
  { val: 6, label: '六' },
  { val: 0, label: '日' }
];

const currentWeekDay = computed(() => {
  if (!form.value.dueDate) return -1;
  return dayjs(form.value.dueDate).day();
});

const setWeekDay = (dayIndex) => {
  const today = dayjs();
  let target = today.day(dayIndex);
  if (target.isBefore(today, 'day')) {
    target = target.add(1, 'week');
  }
  form.value.dueDate = target.format('YYYY-MM-DD');
};

// Monthly: 1-31
const monthDays = Array.from({ length: 31 }, (_, i) => i + 1);

// Yearly
const yearMonths = Array.from({ length: 12 }, (_, i) => ({ val: i, label: `${i + 1}月` }));

const currentYearMonth = computed(() => {
  if (!form.value.dueDate) return -1;
  return dayjs(form.value.dueDate).month();
});

const currentYearDate = computed(() => {
  if (!form.value.dueDate) return -1;
  return dayjs(form.value.dueDate).date();
});

const setYearlyDate = (monthIndex, date) => {
  const today = dayjs();
  let target = today.month(monthIndex).date(date);
  
  if (target.isBefore(today, 'day')) {
    target = target.add(1, 'year');
  }
  form.value.dueDate = target.format('YYYY-MM-DD');
};

const currentMonthDay = computed(() => {
  if (!form.value.dueDate) return -1;
  return dayjs(form.value.dueDate).date();
});

const setMonthDay = (day) => {
  const today = dayjs();
  let target = today.date(day);
  
  if (target.isBefore(today, 'day')) {
    target = target.add(1, 'month');
    const daysInNextMonth = target.daysInMonth();
    if (day > daysInNextMonth) {
        target = target.date(daysInNextMonth); 
    } else {
        target = target.date(day);
    }
  } else {
      const daysInMonth = today.daysInMonth();
       if (day > daysInMonth) {
          target = today.add(1, 'month').date(day); 
       }
  }
  form.value.dueDate = target.format('YYYY-MM-DD');
};

const drawerContentRef = ref(null);

watch(() => form.value.repeatRule, (newVal) => {
  if (newVal !== 'none' && !form.value.dueDate) {
    form.value.dueDate = dayjs().format('YYYY-MM-DD');
  }
});

const onSave = () => {
  if (!form.value.content.trim()) return;
  emit('save', {
    ...form.value,
    priority: form.value.priority
  });
  emit('update:visible', false);
};

const onClose = () => {
  emit('update:visible', false);
};

const onOverlayClick = () => {
  if (form.value.content && form.value.content.trim()) {
    onSave();
  } else {
    onClose();
  }
};
</script>

<template>
  <div v-if="visible" class="drawer-overlay" @click.self="onOverlayClick">
    <div class="drawer-box">
      <!-- Mask for dropdowns -->
      <div class="dropdown-mask" v-if="activeDropdown" @click.stop="activeDropdown = null"></div>

      <div class="drawer-header">
        <h3>{{ initialData && initialData.id ? '待办详情' : '新建待办' }}</h3>
        <button class="close-btn" @click="onClose"><i class="ri-close-line"></i></button>
      </div>
      
      <div class="drawer-content" ref="drawerContentRef">
        <div class="section-card task-main-card">
          <div class="task-header-row">
            <div 
              class="large-circle-icon" 
              :class="{ checked: form.isCompleted }" 
              :style="!form.isCompleted ? { borderColor: getPriorityColor(form.priority) } : {}"
              @click="toggleTaskComplete"
              title="点击完成/重置任务"
            >
              <i v-if="form.isCompleted" class="ri-check-line"></i>
            </div>
            <textarea 
              v-model="form.content" 
              class="task-input-clean auto-resize"
              placeholder="准备做什么？" 
              rows="1"
              v-auto-resize
              @keydown.enter.prevent="onSave"
            ></textarea>
          </div>

          <div class="dashed-divider"></div>

          <div class="subtasks-container">
            <div class="subtask-list" v-if="form.subtasks && form.subtasks.length > 0">
              <div 
                v-for="(subtask, index) in form.subtasks" 
                :key="subtask.id" 
                class="subtask-item"
              >
                <div 
                class="subtask-checkbox" 
                :class="{ checked: subtask.isCompleted }"
                :style="!subtask.isCompleted ? { borderColor: getPriorityColor(form.priority) } : {}"
                @click="toggleSubtask(index)"
              >
                  <i v-if="subtask.isCompleted" class="ri-check-line"></i>
                </div>
                <textarea 
                  v-model="subtask.content" 
                  class="subtask-input auto-resize" 
                  :class="{ completed: subtask.isCompleted }"
                  placeholder="子任务内容"
                  rows="1"
                  v-auto-resize
                  @keydown.enter.prevent="addSubtask"
                  @keydown.backspace="subtask.content === '' ? removeSubtask(index) : null"
                ></textarea>
                <div class="remove-btn" @click="removeSubtask(index)">
                  <i class="ri-close-line"></i>
                </div>
              </div>
            </div>
            
            <div class="add-subtask-wrapper" @click="addSubtask">
              <i class="ri-add-line add-icon"></i>
              <span class="add-subtask-text">添加子任务</span>
            </div>
          </div>

          <div class="dashed-divider"></div>

          <div class="attachments-section">
            <input
              ref="attachmentsInputRef"
              type="file"
              multiple
              class="attachments-input"
              style="display: none"
              @change="onFilesSelected"
            />

            <div class="attachments-header">
              <div class="attachments-title">附件</div>
              <button class="attachments-add-btn" @click="openFilePicker">
                <i class="ri-attachment-2"></i>
                上传
              </button>
            </div>

            <div v-if="form.attachments && form.attachments.length > 0" class="attachments-list">
              <div v-for="(att, idx) in form.attachments" :key="att.id" class="attachment-item">
                <div
                  class="attachment-main"
                  :class="{ clickable: isImageAttachment(att) || isTextAttachment(att) }"
                  @click="(isImageAttachment(att) || isTextAttachment(att)) ? openPreview(att) : null"
                >
                  <i v-if="isImageAttachment(att)" class="ri-image-line"></i>
                  <i v-else-if="isTextAttachment(att)" class="ri-file-text-line"></i>
                  <i v-else class="ri-file-3-line"></i>
                  <span class="attachment-name">{{ att.name }}</span>
                </div>
                <div class="attachment-actions">
                  <button class="attachment-icon-btn" title="下载" @click.stop="downloadAttachment(att)">
                    <i class="ri-download-2-line"></i>
                  </button>
                  <button class="attachment-icon-btn" title="移除" @click.stop="removeAttachment(idx)">
                    <i class="ri-close-line"></i>
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="attachments-empty">暂无附件</div>
          </div>
        </div>

        <div class="section-card">
          <div class="card-title">属性</div>
          <div class="form-row">
            <div class="form-col">
              <label>清单</label>
              <div class="select-field" :class="{ open: activeDropdown === 'category' }" @click.stop="toggleDropdown('category')">
                <span class="field-text">{{ getCategoryName(form.categoryId) || '选择清单' }}</span>
                <i class="ri-arrow-down-s-line field-arrow" :class="{ open: activeDropdown === 'category' }"></i>
                <transition name="slide-pull">
                  <div class="dropdown-panel" v-show="activeDropdown === 'category'" @click.stop>
                     <div class="dropdown-item" v-for="cat in categoryList" :key="cat.id" @click="form.categoryId = cat.id; activeDropdown = null">
                        {{ cat.name }}
                     </div>
                  </div>
                </transition>
              </div>
            </div>
            <div class="form-col">
              <label>优先级</label>
              <div class="select-field" :class="{ open: activeDropdown === 'priority' }" @click.stop="toggleDropdown('priority')">
                <span class="field-text">{{ getPriorityLabel(form.priority) || '普通' }}</span>
                <i class="ri-arrow-down-s-line field-arrow" :class="{ open: activeDropdown === 'priority' }"></i>
                <transition name="slide-pull">
                  <div class="dropdown-panel" v-show="activeDropdown === 'priority'" @click.stop>
                     <div class="dropdown-item" v-for="opt in priorityOptions" :key="opt.value" @click="form.priority = opt.value; activeDropdown = null">
                        {{ opt.label }}
                     </div>
                  </div>
                </transition>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-col full-width">
              <label>重复</label>
              <div class="select-field" :class="{ open: activeDropdown === 'repeat' }" @click.stop="toggleDropdown('repeat')">
                <span class="field-text">{{ getRepeatLabel(form.repeatRule) || '不重复' }}</span>
                <i class="ri-arrow-down-s-line field-arrow" :class="{ open: activeDropdown === 'repeat' }"></i>
                <transition name="slide-pull">
                  <div class="dropdown-panel" v-show="activeDropdown === 'repeat'" @click.stop>
                     <div class="dropdown-item" v-for="opt in repeatOptions" :key="opt.value" @click="form.repeatRule = opt.value; activeDropdown = null">
                        {{ opt.label }}
                     </div>
                  </div>
                </transition>
              </div>
            </div>
          </div>

          <!-- Detailed Repeat Settings -->
          <div class="form-row" v-if="form.repeatRule === 'weekly'">
            <div class="form-col full-width">
               <label>重复时间</label>
               <div class="week-selector">
                 <div 
                   v-for="d in weekDays" 
                   :key="d.val" 
                   class="week-btn"
                   :class="{ active: currentWeekDay === d.val }"
                   @click="setWeekDay(d.val)"
                 >
                   {{ d.label }}
                 </div>
               </div>
               <div class="hint-text">
                 下次执行日期: {{ form.dueDate }}
               </div>
            </div>
          </div>

          <div class="form-row" v-if="form.repeatRule === 'monthly'">
            <div class="form-col full-width">
               <label>每月几号</label>
               <div class="month-selector">
                 <select :value="currentMonthDay" @change="setMonthDay(parseInt($event.target.value))">
                   <option v-for="d in monthDays" :key="d" :value="d">{{ d }}日</option>
                 </select>
               </div>
               <div class="hint-text">
                 下次执行日期: {{ form.dueDate }}
               </div>
            </div>
          </div>

          <div class="form-row" v-if="form.repeatRule === 'yearly'">
            <div class="form-col full-width">
               <label>每年几月几号</label>
               <div class="month-selector yearly-selector">
                 <select :value="currentYearMonth" @change="setYearlyDate(parseInt($event.target.value), currentYearDate)">
                   <option v-for="m in yearMonths" :key="m.val" :value="m.val">{{ m.label }}</option>
                 </select>
                 <select :value="currentYearDate" @change="setYearlyDate(currentYearMonth, parseInt($event.target.value))">
                   <option v-for="d in monthDays" :key="d" :value="d">{{ d }}日</option>
                 </select>
               </div>
               <div class="hint-text">
                 下次执行日期: {{ form.dueDate }}
               </div>
            </div>
          </div>

          <div class="form-group no-margin" v-if="form.repeatRule === 'none'">
            <label>截止日期</label>
            <div class="select-field date-picker-wrapper" @click.stop="openDatePicker">
              <i class="ri-calendar-line icon-prefix"></i>
              <span class="field-text">{{ form.dueDate || '设置截止日期' }}</span>
              <i v-if="form.dueDate" class="ri-close-circle-fill clear-btn" @click.stop="form.dueDate = ''"></i>
              <i class="ri-arrow-down-s-line field-arrow"></i>
            </div>
            <!-- Delay Button -->
            <button v-if="initialData && initialData.id" class="delay-btn" @click.stop="triggerDelay" title="延迟操作" style="margin-top:8px;">
              <i class="ri-time-line"></i> 推迟
            </button>
          </div>
        </div>

        <div class="section-card">
          <div class="card-title">备注</div>
          <div class="form-group no-margin">
            <textarea v-model="form.description" placeholder="添加备注..." rows="3"></textarea>
          </div>
        </div>

        <!-- Timeline Card -->
        <div class="section-card timeline-card" v-if="initialData && initialData.id">
          <div class="card-title">
            <span>任务时间轴</span>
          </div>
          <div class="timeline-list">
             <div v-for="(event, index) in timeline" :key="index" class="timeline-item">
               <div class="timeline-left">
                  <div class="line" v-if="index !== timeline.length - 1"></div>
                  <div class="dot" :class="event.type">
                    <i :class="getEventIcon(event.type)"></i>
                  </div>
               </div>
               <div class="timeline-content">
                 <div class="event-title">{{ getEventLabel(event) }}</div>
                 <div class="event-time">{{ dayjs(event.timestamp).format('YYYY-MM-DD HH:mm') }}</div>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div class="drawer-footer">
        <button class="cancel-btn" @click="onClose">取消</button>
        <button class="confirm-btn" @click="onSave">保存</button>
      </div>
      
      <!-- Mask for dropdowns -->
      <div v-if="activeDropdown" class="dropdown-mask" @click="closeDropdowns"></div>
    </div>

    <!-- Top-level Modal Date Picker -->
    <div v-if="showDatePicker" class="picker-overlay" @click.self="showDatePicker = false">
      <div class="picker-modal" @click.stop>
         <DateTimePicker 
           :model-value="form.dueDate"
           :show-time="true"
           :show-clear="!isDelayAction"
           :min-date="dayjs().format('YYYY-MM-DD')"
           @confirm="handleDateConfirm"
           @close="showDatePicker = false"
         />
       </div>
    </div>

    <div v-if="previewVisible" class="preview-overlay" @click.self="closePreview">
      <div class="preview-box">
        <div class="preview-header">
          <div class="preview-title">{{ previewAttachment ? previewAttachment.name : '' }}</div>
          <div class="preview-actions">
            <button class="preview-download-btn" @click="downloadAttachment(previewAttachment)">下载</button>
            <button class="preview-close-btn" @click="closePreview">
              <i class="ri-close-line"></i>
            </button>
          </div>
        </div>
        <div class="preview-body">
          <img
            v-if="previewAttachment && isImageAttachment(previewAttachment)"
            class="preview-image"
            :src="previewAttachment.dataUrl"
          />
          <pre v-else-if="previewAttachment && isTextAttachment(previewAttachment)" class="preview-text">{{ previewText }}</pre>
          <div v-else class="preview-empty">暂不支持预览</div>
        </div>
      </div>
      <!-- Preview Modal -->
      <div v-if="previewVisible" class="preview-modal-overlay" @click.self="closePreview">
        <div class="preview-modal">
          <div class="preview-header">
            <span>{{ previewAttachment?.name }}</span>
            <div class="preview-actions">
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
            <button class="preview-download-btn" @click="downloadAttachment(previewAttachment)">
              <i class="ri-download-2-line"></i> 下载
            </button>
               <button class="close-btn" @click="closePreview"><i class="ri-close-line"></i></button>
            </div>
          </div>
          <div class="preview-content">
            <img v-if="isImageAttachment(previewAttachment)" :src="previewAttachment.dataUrl" class="preview-image" />
            <pre v-else-if="isTextAttachment(previewAttachment)" class="preview-text">{{ previewText }}</pre>
            <div v-else class="preview-unsupported">
              <i class="ri-file-unknow-line"></i>
              <p>该文件不支持预览</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.section-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--border-color);
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.no-margin {
  margin: 0 !important;
}

.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6); // Darker overlay
  display: flex;
  justify-content: flex-end;
  z-index: 1000;
  backdrop-filter: blur(4px); // Blur background
}

.drawer-box {
  background: var(--bg-color);
  width: 320px; // Narrower width
  height: 100%;
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.3); // Stronger shadow
  color: var(--text-color);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}

.dropdown-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9;
  background: transparent;
}

/* Ensure dropdown triggers stay clickable above mask */
.select-field {
  position: relative;
  z-index: 10;
}
.select-field.open {
  z-index: 12;
}
@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.drawer-header {
  padding: 15px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 16px; // Smaller font
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 20px; // Smaller icon
    color: var(--secondary-text);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    &:hover { 
      color: var(--text-color); 
      background: var(--hover-bg);
    }
  }
}

.drawer-content {
  flex: 1;
  padding: 15px 16px;
  overflow-y: auto;
}

.drawer-footer {
  padding: 15px 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.task-main-card {
  padding-bottom: 2px;
}

.task-header-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.large-circle-icon {
  width: 16px;
  height: 16px;
  margin-top: 6px;
  border-radius: 50%;
  border: 2px solid var(--secondary-text);
  flex-shrink: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.checked {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: #fff;
  }
}

.task-input-clean {
  flex: 1;
  font-size: 16px;
  padding: 6px 0 6px 4px;
  border: none;
  background: transparent;
  color: var(--text-color);
  outline: none;
  border-bottom: 2px solid transparent;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: var(--secondary-text);
  }
  
  &:focus {
    border-bottom-color: var(--primary-color);
  }
}

.dashed-divider {
  height: 1px;
  border-bottom: 1px dashed var(--secondary-text);
  margin: 6px 0 8px 0;
  opacity: 0.4;
}

.form-row {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;

  .form-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px; // Slightly more gap for label

    &.full-width {
      flex: 0 0 100%;
    }
  }
}

.form-group {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.select-field {
  position: relative;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s;

  &.open {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.1);
    z-index: 101; /* Higher than mask */
  }

  &:hover {
    border-color: var(--primary-color);
  }
}

.field-text {
  flex: 1;
  font-size: 14px;
  color: var(--text-color);
}

.field-arrow {
  color: var(--secondary-text);
  transition: transform 0.2s ease;
  &.open { transform: rotate(180deg); }
}

.dropdown-panel {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  margin-top: 4px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100; /* Ensure visibility */
  max-height: 200px;
  overflow-y: auto;
  padding: 4px;
}

.dropdown-item {
  padding: 8px 12px;
  font-size: 14px;
  color: var(--text-color);
  cursor: pointer;
  border-radius: 4px;
  &:hover { background: var(--hover-bg); }
}

.slide-pull-enter-active,
.slide-pull-leave-active {
  transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), 
              transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: top;
}
.slide-pull-enter-from,
.slide-pull-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.slide-pull-enter-to,
.slide-pull-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.week-selector {
  display: flex;
  gap: 8px;
  
  .week-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;

    &:hover {
      background: var(--hover-bg);
    }

    &.active {
      background: var(--primary-color);
      color: white;
      border-color: var(--primary-color);
    }
  }
}

.month-selector select {
  width: 100px;
}

.yearly-selector {
  display: flex;
  gap: 10px;
}

.hint-text {
  font-size: 12px;
  color: var(--secondary-text);
  margin-top: 5px;
}

label {
  font-size: 12px;
  color: var(--secondary-text);
  font-weight: 500;
}

select, input[type="date"], textarea {
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-secondary);
  color: var(--text-color);
  font-size: 14px;
  outline: none;

  &:focus {
    border-color: var(--primary-color);
  }
}

textarea {
  width: 100%;
  resize: vertical;
  box-sizing: border-box;
}

textarea.auto-resize {
  resize: none;
  overflow: hidden;
  min-height: 24px;
  font-family: inherit;
  line-height: 1.5;
  display: block;
  vertical-align: top; 
}

button.cancel-btn {
  padding: 8px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-color);
  &:hover { background: var(--hover-bg); }
}

button.confirm-btn {
  padding: 8px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  border: none;
  background: var(--primary-color);
  color: white;
  &:hover { opacity: 0.9; }
}

.date-row {
  display: flex;
  gap: 10px;
}

.custom-date-input {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-secondary);
  cursor: pointer;
  height: 35px;
  box-sizing: border-box;

  &:hover {
    border-color: var(--primary-color);
  }

  .icon-prefix {
    margin-right: 8px;
    color: var(--secondary-text);
  }

  .date-text {
    flex: 1;
    font-size: 14px;
    color: var(--text-color);
  }

  .clear-btn {
    color: var(--secondary-text);
    &:hover { color: var(--text-color); }
  }
}

.delay-btn {
  padding: 0 15px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text-color);
  font-size: 14px;
  
  &:hover {
    background: var(--hover-bg);
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
}

.dropdown-mask {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 90;
  background: transparent;
}

.picker-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); /* Darker background */
  z-index: 2000;
  display: flex;
  align-items: center; /* Center vertically */
  justify-content: center;
  backdrop-filter: blur(2px);
}

.picker-modal {
  background: var(--bg-secondary);
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.2);
  padding: 6px;
  animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Timeline Styles */
.timeline-card {
  /* Inherits from .section-card */

  .timeline-list {
    display: flex;
    flex-direction: column;
    
    .timeline-item {
      display: flex;
      gap: 15px;
      position: relative;
      padding-bottom: 20px;
      
      &:last-child {
        padding-bottom: 0;
      }

      .timeline-left {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 24px;
        position: relative;

        .dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--bg-color);
          border: 2px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
          font-size: 14px;
          color: var(--secondary-text);
          
          &.create { color: var(--primary-color); border-color: var(--primary-color); }
          &.complete { color: #52c41a; border-color: #52c41a; }
          &.uncomplete { color: #faad14; border-color: #faad14; }
          &.delay { color: #ff4d4f; border-color: #ff4d4f; }
        }

        .line {
          position: absolute;
          top: 24px;
          bottom: -20px;
          width: 2px;
          background: var(--border-color);
          left: 50%;
          transform: translateX(-50%);
        }
      }

      .timeline-content {
        flex: 1;
        padding-top: 2px;
        
        .event-title {
          font-size: 14px;
          color: var(--text-color);
          margin-bottom: 4px;
        }
        
        .event-time {
          font-size: 12px;
          color: var(--secondary-text);
        }
      }
    }
  }
}

.subtasks-container {
  display: flex;
  flex-direction: column;
  gap: 0; /* Reduced from 2px */
  margin-left: 8px;
  /* margin-bottom removed */
}

.subtask-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 0; /* Reduced from 2px 0 */
  
  .subtask-checkbox {
    width: 12px;
    height: 12px;
    margin-top: 8px;
    border: 1.5px solid var(--border-color);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;

    &.checked {
      background: var(--primary-color);
      border-color: var(--primary-color);
      
      i {
        font-size: 8px;
        color: white;
      }
    }
  }

  .subtask-input {
    flex: 1;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    padding: 4px 0 4px 4px;
    font-size: 14px;
    color: var(--text-color);
    outline: none;
    border-radius: 0;
    transition: all 0.2s ease;
    
    &.completed {
      text-decoration: line-through;
      color: var(--secondary-text);
    }
    
    &:focus {
      background: transparent;
      border-bottom-color: var(--primary-color);
    }
  }

  .remove-btn {
    color: var(--secondary-text);
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s;
    padding: 4px;
    
    &:hover {
      color: var(--danger-color, #ff4d4f);
    }
  }

  &:hover .remove-btn {
    opacity: 1;
  }
}

.add-subtask-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  cursor: pointer;
  color: var(--secondary-text);
  transition: color 0.2s;
  
  &:hover {
    color: var(--primary-color);
  }
  
  .add-icon {
    font-size: 18px;
    margin-left: 0;
  }

  .add-subtask-text {
    font-size: 14px;
    color: var(--primary-color);
  }
}

.attachments-section {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .attachments-input {
    display: none;
  }

  .attachments-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;

    .attachments-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--secondary-text);
    }

    .attachments-add-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--primary-color);
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.2s;

      &:hover {
        background: var(--hover-bg);
      }
    }
  }

  .attachments-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .attachments-empty {
    font-size: 12px;
    color: var(--secondary-text);
    text-align: center;
    padding: 8px 0;
    font-style: italic;
  }

  .attachment-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 13px;
    transition: border-color 0.2s;

    &:hover {
      border-color: var(--primary-color);
    }

    .attachment-main {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      overflow: hidden;
      
      &.clickable {
        cursor: pointer;
        &:hover .attachment-name {
          color: var(--primary-color);
          text-decoration: underline;
        }
      }

      i {
        font-size: 16px;
        color: var(--secondary-text);
      }

      .attachment-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--text-color);
      }
    }

    .attachment-actions {
      display: flex;
      gap: 4px;
      
      .attachment-icon-btn {
        padding: 4px;
        border-radius: 4px;
        color: var(--secondary-text);
        
        &:hover {
          background: var(--hover-bg);
          color: var(--text-color);
        }
      }
    }
  }
}

/* Preview Modal */
.preview-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease;
}

.preview-modal {
  background: var(--bg-secondary);
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0,0,0,0.3);
  overflow: hidden;
  animation: zoomIn 0.2s ease;
}

.preview-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-secondary);

  span {
    font-weight: 600;
    font-size: 16px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 60%;
  }

  .preview-actions {
    display: flex;
    gap: 8px;
    align-items: center;

    .preview-download-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      background: var(--primary-color);
      color: white;
      border-radius: 6px;
      font-size: 13px;
      border: none;
      cursor: pointer;
      
      &:hover {
        opacity: 0.9;
      }
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

    .close-btn {
      padding: 6px;
      border-radius: 50%;
      &:hover {
        background: var(--hover-bg);
      }
    }
  }
}

.preview-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color);

  .preview-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 4px;
    box-shadow: var(--shadow-md);
  }

  .preview-text {
    width: 100%;
    height: 100%;
    white-space: pre-wrap;
    font-family: monospace;
    font-size: 14px;
    color: var(--text-color);
    background: var(--bg-secondary);
    padding: 16px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    overflow: auto;
  }

  .preview-unsupported {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: var(--secondary-text);

    i {
      font-size: 48px;
    }
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes zoomIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Updated Input Styles for Wrapping */
.task-input-clean {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 15px; /* Reduced from 16px */
  color: var(--text-color);
  outline: none;
  resize: none;
  overflow: hidden;
  line-height: 1.5;
  padding: 0;
  /* Key wrapping properties */
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
}

.subtask-input {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 13px; /* Smaller than main task */
  color: var(--text-color);
  opacity: 0.6; /* Make it grayer/dimmer */
  outline: none;
  white-space: pre-wrap !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  resize: none !important;
  overflow: hidden !important;
  height: auto; /* Managed by v-auto-resize */
  line-height: 1.5;
  padding: 0;
  
  &.completed {
    color: var(--secondary-text);
    text-decoration: line-through;
    opacity: 0.7;
  }
}


</style>
