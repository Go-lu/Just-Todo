<script setup>
import { ref, watch, computed } from 'vue';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import DateTimePicker from './DateTimePicker.vue';

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
  repeatRule: 'none'
});

const categoryList = computed(() => props.categories || []);

const priorityOptions = [
  { value: 'high', label: '🔴 高优先级' },
  { value: 'medium', label: '🟠 中优先级' },
  { value: 'low', label: '🔵 低优先级' }
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
        repeatRule: props.initialData.repeatRule || 'none'
      };
    } else {
      // New Task
      form.value = {
        content: '',
        description: '',
        categoryId: props.defaultCategoryId === 'all' || props.defaultCategoryId === 'today' || props.defaultCategoryId === 'urgent' || props.defaultCategoryId === 'plan' ? (props.categories.find(c => c.isDefault)?.id || props.categories[0]?.id) : props.defaultCategoryId,
        priority: 'medium',
        dueDate: props.defaultCategoryId === 'today' ? dayjs().format('YYYY-MM-DD') : '',
        repeatRule: 'none'
      };
    }
  }
});

const showDatePicker = ref(false);
const isDelayAction = ref(false);

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
</script>

<template>
  <div v-if="visible" class="drawer-overlay" @click.self="onClose">
    <div class="drawer-box">
      <div class="drawer-header">
        <h3>{{ initialData && initialData.id ? '待办详情' : '新建待办' }}</h3>
        <button class="close-btn" @click="onClose"><i class="ri-close-line"></i></button>
      </div>
      
      <div class="drawer-content">
        <div class="form-group">
          <input 
            v-model="form.content" 
            class="task-input-large"
            placeholder="准备做什么？" 
            @keydown.enter.prevent="onSave"
            autofocus
          />
        </div>

        <div class="form-row">
          <div class="form-col">
            <label>清单</label>
            <div class="select-wrapper">
              <select v-model="form.categoryId">
                <option v-if="categoryList.length === 0" value="" disabled>暂无清单</option>
                <option v-for="cat in categoryList" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
              <i class="ri-arrow-down-s-line select-arrow"></i>
            </div>
          </div>
          <div class="form-col">
            <label>优先级</label>
            <div class="select-wrapper">
              <select v-model="form.priority">
                <option v-for="opt in priorityOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <i class="ri-arrow-down-s-line select-arrow"></i>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-col full-width">
            <label>重复</label>
            <div class="select-wrapper">
              <select v-model="form.repeatRule">
                <option v-for="opt in repeatOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <i class="ri-arrow-down-s-line select-arrow"></i>
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

        <div class="form-group" v-if="form.repeatRule === 'none'">
          <label>截止日期</label>
          <div class="date-row">
             <div class="custom-date-input" @click="showDatePicker = true; isDelayAction = false">
                <i class="ri-calendar-line icon-prefix"></i>
                <span class="date-text">{{ form.dueDate || '设置截止日期' }}</span>
                <i v-if="form.dueDate" class="ri-close-circle-fill clear-btn" @click.stop="form.dueDate = ''"></i>
             </div>
             <!-- Delay Button -->
             <button v-if="initialData && initialData.id" class="delay-btn" @click="triggerDelay" title="延迟操作">
               <i class="ri-time-line"></i> 推迟
             </button>
          </div>
        </div>

        <div class="form-group">
          <label>备注</label>
          <textarea v-model="form.description" placeholder="添加备注..." rows="3"></textarea>
        </div>

        <!-- Timeline Card -->
        <div class="timeline-card" v-if="initialData && initialData.id">
          <div class="card-header">
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
    </div>

    <!-- Nested Picker Overlay -->
    <div v-if="showDatePicker" class="picker-overlay" @click.self="showDatePicker = false">
      <DateTimePicker 
        :model-value="form.dueDate"
        :show-time="true"
        :min-date="dayjs().format('YYYY-MM-DD')"
        @confirm="handleDateConfirm"
        @close="showDatePicker = false"
      />
    </div>
  </div>
</template>

<style scoped lang="less">
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
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.drawer-header {
  padding: 15px 20px; // Reduced padding
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
  padding: 15px 20px; // Consistent padding
  overflow-y: auto;
}

.drawer-footer {
  padding: 15px 20px; // Consistent padding
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.task-input-large {
  width: 100%;
  font-size: 16px; // Slightly smaller
  padding: 8px 0; // Less padding
  border: none;
  border-bottom: 2px solid var(--primary-color);
  background: transparent;
  color: var(--text-color);
  outline: none;
  margin-bottom: 20px;
  box-sizing: border-box;

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
    gap: 6px; // Slightly more gap for label

    &.full-width {
      flex: 0 0 100%;
    }
  }
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

.picker-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.2);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Timeline Styles */
.timeline-card {
  margin-top: 30px;
  background: var(--secondary-bg);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid var(--border-color);

  .card-header {
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 15px;
    color: var(--text-color);
  }

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
</style>