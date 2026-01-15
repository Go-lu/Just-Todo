<script setup>
import { ref, watch, computed, nextTick } from 'vue';
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

const emit = defineEmits(['update:visible', 'save']);

const contentInput = ref(null);
const datePickerContainer = ref(null);
const activeDropdown = ref(null);

const toggleDropdown = (name) => {
  if (activeDropdown.value === name) {
    activeDropdown.value = null;
  } else {
    activeDropdown.value = name;
  }
};

const closeDropdowns = () => {
  activeDropdown.value = null;
};

// Auto scroll to date picker when opened
watch(() => activeDropdown.value, (val) => {
  if (val === 'date') {
    nextTick(() => {
      const modalBox = document.querySelector('.modal-box.task-modal');
      const container = datePickerContainer.value;
      if (!modalBox || !container) return;
      const rect = container.getBoundingClientRect();
      const modalRect = modalBox.getBoundingClientRect();
      const offsetTop = rect.top - modalRect.top;
      const desiredTop = (modalRect.height - rect.height) / 2;
      const delta = offsetTop - desiredTop;
      if (Math.abs(delta) > 4) {
        const target = Math.max(0, modalBox.scrollTop + delta);
        modalBox.scrollTo({ top: target, behavior: Math.abs(delta) < 180 ? 'smooth' : 'auto' });
      }
    });
  }
});

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

const newSubtaskContent = ref('');

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
  if (isTextAttachment(att) && att?.dataUrl) {
    try {
      const bytes = dataUrlToUint8Array(att.dataUrl);
      previewText.value = new TextDecoder('utf-8').decode(bytes);
    } catch (e) {
      previewText.value = '预览失败';
    }
  }
  previewVisible.value = true;
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

const priorityOptions = [
  { value: 'high', label: '🔴 高' },
  { value: 'medium', label: '🟠 中' },
  { value: 'low', label: '🔵 低' }
];

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

const getPriorityLabel = (val) => {
  const opt = priorityOptions.find(o => o.value === val);
  return opt ? opt.label : '';
};

const getCategoryName = (id) => {
  const cat = (Array.isArray(props.categories) ? props.categories : []).find(c => c.id === id);
  return cat ? cat.name : '';
};

const getRepeatLabelFromOptions = (val) => {
  const opt = repeatOptions.value.find(o => o.value === val);
  return opt ? opt.label : '';
};

watch(() => props.visible, (val) => {
  if (val) {
    nextTick(() => {
      if (contentInput.value) contentInput.value.focus();
    });
    if (props.initialData && Object.keys(props.initialData).length > 0) {
      form.value = {
        ...props.initialData,
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

const handleDateConfirm = (val) => {
  form.value.dueDate = val;
  showDatePicker.value = false;
  activeDropdown.value = null;
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
  // Find next occurrence of this day
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
  let target = today.month(monthIndex);
  const daysInMonth = target.daysInMonth();
  target = target.date(Math.min(date, daysInMonth));
  
  if (target.isBefore(today, 'day')) {
    target = target.add(1, 'year');
    // Check leap year for Feb 29
    const dim = target.daysInMonth();
    if (target.date() > dim) target = target.date(dim);
  }
  form.value.dueDate = target.format('YYYY-MM-DD');
};

const currentMonthDay = computed(() => {
  if (!form.value.dueDate) return -1;
  return dayjs(form.value.dueDate).date();
});

const setMonthDay = (day) => {
  const today = dayjs();
  let target = today;
  
  // Try to set date in current month
  const dim = target.daysInMonth();
  let tempDate = Math.min(day, dim);
  target = target.date(tempDate);
  
  // If the result is before today, move to next month
  if (target.isBefore(today, 'day')) {
    target = target.add(1, 'month'); // Go to next month
    // Set date in next month
    const dim2 = target.daysInMonth();
    target = target.date(Math.min(day, dim2));
  }
  
  form.value.dueDate = target.format('YYYY-MM-DD');
};

// Auto-set due date if repeat is selected but no date
watch(() => form.value.repeatRule, (newVal) => {
  if (newVal !== 'none' && !form.value.dueDate) {
    form.value.dueDate = dayjs().format('YYYY-MM-DD');
  }
});

const onSave = () => {
  if (!form.value.content.trim()) return;
  emit('save', {
    ...form.value,
    priority: form.value.priority // Map back if needed, but 'medium' is fine if we update app logic
  });
  emit('update:visible', false);
};

const onClose = () => {
  emit('update:visible', false);
};
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="onClose">
    <div class="modal-box task-modal">
      <h3>{{ initialData && initialData.id ? '编辑任务' : '新建任务' }}</h3>
      
      <div class="section-card task-main-card">
        <div class="task-header-row">
          <textarea 
            ref="contentInput"
            v-model="form.content" 
            class="task-input-clean"
            placeholder="准备做什么？" 
            rows="1"
            v-auto-resize
            @keydown.enter.prevent="onSave"
            autofocus
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
                @click="toggleSubtask(index)"
              >
                <i v-if="subtask.isCompleted" class="ri-check-line"></i>
              </div>
              <textarea 
                v-model="subtask.content" 
                class="subtask-input" 
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
            </div>
            <transition name="slide-pull">
              <div class="dropdown-panel" v-show="activeDropdown === 'category'" @click.stop>
                <div 
                  class="dropdown-item" 
                  v-for="cat in categories" 
                  :key="cat.id" 
                  @click="form.categoryId = cat.id; activeDropdown = null"
                >
                  {{ cat.name }}
                </div>
              </div>
            </transition>
          </div>
          <div class="form-col">
            <label>优先级</label>
            <div class="select-field" :class="{ open: activeDropdown === 'priority' }" @click.stop="toggleDropdown('priority')">
              <span class="field-text">{{ getPriorityLabel(form.priority) || '选择优先级' }}</span>
              <i class="ri-arrow-down-s-line field-arrow" :class="{ open: activeDropdown === 'priority' }"></i>
            </div>
            <transition name="slide-pull">
              <div class="dropdown-panel" v-show="activeDropdown === 'priority'" @click.stop>
                <div 
                  class="dropdown-item" 
                  v-for="opt in priorityOptions" 
                  :key="opt.value" 
                  @click="form.priority = opt.value; activeDropdown = null"
                >
                  {{ opt.label }}
                </div>
              </div>
            </transition>
          </div>
        </div>

        <div class="form-row">
          <div class="form-col full-width">
            <label>重复</label>
            <div class="select-field" :class="{ open: activeDropdown === 'repeat' }" @click.stop="toggleDropdown('repeat')">
              <span class="field-text">{{ getRepeatLabelFromOptions(form.repeatRule) || '不重复' }}</span>
              <i class="ri-arrow-down-s-line field-arrow" :class="{ open: activeDropdown === 'repeat' }"></i>
            </div>
            <transition name="slide-pull">
              <div class="dropdown-panel" v-show="activeDropdown === 'repeat'" @click.stop>
                <div 
                  class="dropdown-item" 
                  v-for="opt in repeatOptions" 
                  :key="opt.value" 
                  @click="form.repeatRule = opt.value; activeDropdown = null"
                >
                  {{ opt.label }}
                </div>
              </div>
            </transition>
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

        <div class="form-group no-margin" v-if="form.repeatRule === 'none'" ref="datePickerContainer">
          <label>截止日期</label>
          <div class="select-field date-picker-wrapper" :class="{ open: activeDropdown === 'date' }" @click.stop="toggleDropdown('date')">
             <i class="ri-calendar-line icon-prefix"></i>
             <span class="field-text">{{ form.dueDate || '选择日期时间' }}</span>
             <i v-if="form.dueDate" class="ri-close-circle-fill clear-btn" @click.stop="form.dueDate = ''"></i>
             <i class="ri-arrow-down-s-line field-arrow" :class="{ open: activeDropdown === 'date' }"></i>
          </div>
          <transition name="slide-pull">
            <div class="dropdown-panel" v-if="activeDropdown === 'date'" @click.stop>
              <DateTimePicker 
                :model-value="form.dueDate"
                :show-time="true"
                :min-date="dayjs().format('YYYY-MM-DD')"
                @confirm="handleDateConfirm"
                @close="activeDropdown = null"
              />
            </div>
          </transition>
        </div>
      </div>

      <div class="section-card">
        <div class="card-title">备注</div>
        <div class="form-group no-margin">
          <textarea v-model="form.description" placeholder="添加备注..." rows="3"></textarea>
        </div>
      </div>

      <div class="modal-actions">
        <button class="cancel-btn" @click="onClose">取消</button>
        <button class="confirm-btn" @click="onSave">保存</button>
      </div>
      
      <!-- Mask for dropdowns -->
      <div v-if="activeDropdown" class="dropdown-mask" @click="closeDropdowns"></div>
    </div>

    <!-- Preview Modal -->
    <div v-if="previewVisible" class="preview-overlay" @click.self="closePreview">
      <div class="preview-box">
        <div class="preview-header">
          <span class="preview-title">{{ previewAttachment?.name }}</span>
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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-box.task-modal {
  background: var(--bg-color);
  width: 500px;
  max-height: 80vh; /* Max height to allow scrolling on small screens */
  overflow-y: auto; /* Enable vertical scroll */
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  color: var(--text-color);
  display: flex;
  flex-direction: column;
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



h3 {
  margin-top: 0;
  margin-bottom: 20px;
  text-align: center;
}

.task-input-large {
  width: 100%;
  font-size: 18px;
  padding: 10px;
  border: none;
  border-bottom: 2px solid var(--primary-color);
  background: transparent;
  color: var(--text-color);
  outline: none;
  /* margin-bottom: 20px; removed */

  &::placeholder {
    color: var(--secondary-text);
  }
}

.form-row {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;

  .form-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
    position: relative;

    &.full-width {
      flex: 0 0 100%;
    }
  }
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

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;

  button {
    padding: 8px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    border: none;
    transition: all 0.2s;

    &.cancel-btn {
      background: var(--bg-secondary);
      color: var(--text-color);
      &:hover {
        background: var(--hover-bg);
      }
    }

    &.confirm-btn {
      background: var(--primary-color);
      color: white;
      &:hover {
        opacity: 0.9;
      }
    }
  }
}

.custom-date-input {
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

.picker-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.2);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.subtasks-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  
  .subtask-checkbox {
    width: 16px;
    height: 16px;
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
        font-size: 12px;
        color: white;
      }
    }
  }

  .subtask-input {
    flex: 1;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    padding: 6px 0 6px 8px;
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
  gap: 10px;
  padding: 8px 0;
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

.task-main-card {
  padding-bottom: 5px; // Less padding at bottom
}

.task-header-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.large-circle-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--secondary-text);
  flex-shrink: 0;
}

.task-input-clean {
  flex: 1;
  font-size: 16px;
  padding: 8px 0 10px 6px;
  border: none;
  background: transparent;
  color: var(--text-color);
  outline: none;
  border-bottom: 2px solid transparent;
  transition: border-color 0.2s ease, background-color 0.2s ease;

  &::placeholder {
    color: var(--secondary-text);
  }

  &:focus {
    border-bottom-color: var(--primary-color);
    background: transparent;
  }
}

.dashed-divider {
  height: 1px;
  border-bottom: 1px dashed var(--border-color);
  margin: 10px 0 15px 0;
  opacity: 0.6;
}

.select-wrapper {
  position: relative;
  width: 100%;
  
  select {
    width: 100%;
    appearance: none;
    -webkit-appearance: none;
    padding-right: 30px;
    cursor: pointer;
  }
  
  .select-arrow {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--secondary-text);
    font-size: 16px;
  }
}
.select-field {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-color);
  border-radius: 10px;
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  cursor: pointer;
  position: relative; /* Added for z-index context */
}
.select-field:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.select-field.open {
  border-color: var(--primary-color);
  box-shadow: 0 6px 18px rgba(0,0,0,0.12);
  z-index: 11; /* Above mask */
}
.field-text {
  flex: 1;
  font-size: 14px;
  color: var(--text-color);
}
.field-arrow {
  color: var(--secondary-text);
  transition: transform 0.2s ease;
}
.field-arrow.open {
  transform: rotate(180deg);
}
.dropdown-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 6px 16px rgba(0,0,0,0.10);
  overflow: hidden;
  transform-origin: top;
  will-change: transform, opacity;
  z-index: 20;
}
.form-group.no-margin {
  position: relative;
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
.dropdown-item {
  padding: 10px 12px;
  font-size: 14px;
  color: var(--text-color);
  cursor: pointer;
}
.dropdown-item + .dropdown-item {
  border-top: 1px solid var(--hover-bg);
}
.dropdown-item:hover {
  background: var(--hover-bg);
}

.attachments-input {
  display: none;
}

.attachments-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.attachments-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.attachments-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
}

.attachments-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 10px;
  background: var(--hover-bg);
  color: var(--text-color);
}

.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-color);
}

.attachment-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--text-color);
}

.attachment-main.clickable {
  cursor: pointer;
}

.attachment-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.attachment-icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--hover-bg);
  color: var(--text-color);
}

.attachments-empty {
  font-size: 12px;
  color: var(--secondary-text);
}

.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1300;
}

.preview-box {
  width: min(860px, 92vw);
  max-height: min(78vh, 780px);
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  box-shadow: 0 16px 40px rgba(0,0,0,0.28);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-download-btn {
  padding: 6px 10px;
  border-radius: 10px;
  background: var(--primary-color);
  color: var(--bg-secondary);
}

.preview-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--hover-bg);
  color: var(--text-color);
}

.preview-body {
  padding: 12px;
  overflow: auto;
  flex: 1;
}

.preview-image {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
  border-radius: 10px;
}

.preview-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 13px;
  color: var(--text-color);
}

.preview-empty {
  color: var(--secondary-text);
  font-size: 13px;
  padding: 20px 6px;
}

.task-input-clean {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  resize: none;
  overflow: hidden;
  height: auto;
}

.subtask-input {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  resize: none;
  overflow: hidden;
  height: auto;
}
</style>
