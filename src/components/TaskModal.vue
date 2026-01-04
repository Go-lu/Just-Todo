<script setup>
import { ref, watch, computed, nextTick } from 'vue';
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

const emit = defineEmits(['update:visible', 'save']);

const contentInput = ref(null);

const form = ref({
  content: '',
  description: '',
  categoryId: '',
  priority: 'normal',
  dueDate: '',
  repeatRule: 'none'
});

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

watch(() => props.visible, (val) => {
  if (val) {
    nextTick(() => {
      if (contentInput.value) contentInput.value.focus();
    });
    if (props.initialData && Object.keys(props.initialData).length > 0) {
      form.value = {
        ...props.initialData,
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

const handleDateConfirm = (val) => {
  form.value.dueDate = val;
  showDatePicker.value = false;
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
      
      <div class="form-group">
        <input 
          ref="contentInput"
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
          <select v-model="form.categoryId">
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>
        <div class="form-col">
          <label>优先级</label>
          <select v-model="form.priority">
            <option v-for="opt in priorityOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-col full-width">
          <label>重复</label>
          <select v-model="form.repeatRule">
            <option v-for="opt in repeatOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
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
        <div class="custom-date-input" @click="showDatePicker = true">
           <i class="ri-calendar-line icon-prefix"></i>
           <span class="date-text">{{ form.dueDate || '选择日期时间' }}</span>
           <i v-if="form.dueDate" class="ri-close-circle-fill clear-btn" @click.stop="form.dueDate = ''"></i>
        </div>
      </div>

      <div class="form-group">
        <label>备注</label>
        <textarea v-model="form.description" placeholder="添加备注..." rows="3"></textarea>
      </div>

      <div class="modal-actions">
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
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  color: var(--text-color);
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
  margin-bottom: 20px;

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
</style>