<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import dayjs from 'dayjs';

const props = defineProps({
  modelValue: {
    type: [String, Number, Date],
    default: ''
  },
  size: {
    type: String,
    default: 'md'
  },
  showTime: {
    type: Boolean,
    default: false
  },
  minDate: {
    type: [String, Number, Date],
    default: ''
  },
  showClear: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['update:modelValue', 'close', 'confirm']);

const currentMonth = ref(dayjs());
const selectedDate = ref(null);
const timeValue = ref('00:00');

// Initialize
watch(() => props.modelValue, (val) => {
  if (val) {
    const d = dayjs(val);
    selectedDate.value = d;
    currentMonth.value = d;
    timeValue.value = d.format('HH:mm');
  } else {
    selectedDate.value = null;
    currentMonth.value = dayjs();
    timeValue.value = dayjs().format('HH:mm');
  }
}, { immediate: true });

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

const calendarDays = computed(() => {
  const startOfMonth = currentMonth.value.startOf('month');
  const endOfMonth = currentMonth.value.endOf('month');
  const startDay = startOfMonth.day(); // 0-6
  const daysInMonth = currentMonth.value.daysInMonth();
  
  const days = [];
  
  // Previous month days
  const prevMonth = currentMonth.value.subtract(1, 'month');
  const prevMonthDays = prevMonth.daysInMonth();
  for (let i = startDay - 1; i >= 0; i--) {
    days.push({
      date: prevMonth.date(prevMonthDays - i),
      isCurrentMonth: false,
      isToday: false
    });
  }
  
  // Current month days
  const today = dayjs();
  for (let i = 1; i <= daysInMonth; i++) {
    const date = currentMonth.value.date(i);
    days.push({
      date: date,
      isCurrentMonth: true,
      isToday: date.isSame(today, 'day')
    });
  }
  
  // Next month days
  const remaining = 42 - days.length;
  const nextMonth = currentMonth.value.add(1, 'month');
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: nextMonth.date(i),
      isCurrentMonth: false,
      isToday: false
    });
  }
  
  return days;
});

const isSelected = (date) => {
  if (!selectedDate.value) return false;
  return date.isSame(selectedDate.value, 'day');
};

const isDisabled = (date) => {
  if (!props.minDate) return false;
  // minDate is inclusive, so disabled if BEFORE minDate
  return date.isBefore(dayjs(props.minDate), 'day');
};

const selectDate = (day) => {
  if (isDisabled(day.date)) return;
  selectedDate.value = day.date;
  // If not in current month, switch view
  if (!day.isCurrentMonth) {
    currentMonth.value = day.date;
  }
};

const prevMonth = () => {
  currentMonth.value = currentMonth.value.subtract(1, 'month');
};

const nextMonth = () => {
  currentMonth.value = currentMonth.value.add(1, 'month');
};

const confirm = () => {
  if (selectedDate.value) {
    let finalDate = selectedDate.value;
    if (props.showTime) {
      const [h, m] = timeValue.value.split(':');
      finalDate = finalDate.hour(parseInt(h)).minute(parseInt(m));
      emit('confirm', finalDate.format('YYYY-MM-DD HH:mm'));
    } else {
      emit('confirm', finalDate.format('YYYY-MM-DD'));
    }
  } else {
    emit('confirm', '');
  }
};

const setToday = () => {
  const now = dayjs();
  selectedDate.value = now;
  currentMonth.value = now;
  timeValue.value = now.format('HH:mm');
};

const clear = () => {
  selectedDate.value = null;
  emit('confirm', '');
};
</script>

<template>
  <div class="datetime-picker" :class="{ sm: props.size === 'sm', xs: props.size === 'xs' }">
    <div class="picker-header">
      <button @click="prevMonth" class="nav-btn">&lt;</button>
      <span class="current-month">{{ currentMonth.format('YYYY年 MM月') }}</span>
      <button @click="nextMonth" class="nav-btn">&gt;</button>
    </div>

    <div class="week-days">
      <span v-for="day in weekDays" :key="day">{{ day }}</span>
    </div>

    <div class="calendar-grid">
      <div 
        v-for="(day, index) in calendarDays" 
        :key="index"
        class="day-cell"
        :class="{ 
          'other-month': !day.isCurrentMonth,
          'today': day.isToday,
          'selected': isSelected(day.date),
          'disabled': isDisabled(day.date)
        }"
        @click="selectDate(day)"
      >
        {{ day.date.date() }}
      </div>
    </div>

    <div class="picker-footer">
      <div v-if="showTime" class="time-picker">
        <label>时间</label>
        <input type="time" v-model="timeValue" class="time-input" />
      </div>
      
      <div class="actions">
        <button v-if="showClear" class="text-btn" @click="clear">清除</button>
        <button class="text-btn" @click="setToday">今天</button>
        <button class="confirm-btn" @click="confirm">确定</button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.datetime-picker {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  user-select: none;
  color: var(--text-color);
  min-width: 280px;

  &.sm {
    padding: 10px;
    min-width: 240px;
    border-radius: 10px;

    .picker-header {
      margin-bottom: 10px;

      .current-month {
        font-size: 14px;
      }

      .nav-btn {
        padding: 2px 6px;
      }
    }

    .week-days {
      margin-bottom: 6px;
      font-size: 11px;
    }

    .calendar-grid {
      gap: 3px;
      margin-bottom: 10px;

      .day-cell {
        height: 26px;
        font-size: 12px;
        border-radius: 6px;
      }
    }

    .picker-footer {
      gap: 10px;
      padding-top: 10px;

      .time-picker {
        font-size: 12px;

        .time-input {
          padding: 2px 6px;
          font-size: 12px;
        }
      }

      .actions {
        button {
          padding: 4px 10px;
          font-size: 12px;
        }
      }
    }
  }

  &.xs {
    padding: 6px;
    min-width: 190px;
    border-radius: 10px;

    .picker-header {
      margin-bottom: 8px;

      .current-month {
        font-size: 12px;
      }

      .nav-btn {
        padding: 1px 5px;
        font-size: 12px;
      }
    }

    .week-days {
      margin-bottom: 4px;
      font-size: 10px;
    }

    .calendar-grid {
      gap: 2px;
      margin-bottom: 8px;

      .day-cell {
        height: 20px;
        font-size: 11px;
        border-radius: 6px;
      }
    }

    .picker-footer {
      gap: 8px;
      padding-top: 8px;

      .time-picker {
        font-size: 11px;

        .time-input {
          padding: 1px 5px;
          font-size: 11px;
        }
      }

      .actions {
        button {
          padding: 3px 8px;
          font-size: 11px;
        }
      }
    }
  }

  .picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .current-month {
      font-weight: bold;
      font-size: 16px;
    }

    .nav-btn {
      background: none;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      cursor: pointer;
      padding: 4px 8px;
      color: var(--text-color);
      
      &:hover {
        background: var(--hover-bg);
        color: var(--primary-color);
      }
    }
  }

  .week-days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    text-align: center;
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--secondary-text);
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    margin-bottom: 16px;

    .day-cell {
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 4px;
      font-size: 14px;
      transition: all 0.2s;

      &:hover {
        background: var(--hover-bg);
      }

      &.other-month {
        color: var(--secondary-text);
        opacity: 0.5;
      }

      &.today {
        color: var(--primary-color);
        font-weight: bold;
      }

      &.selected {
        background: var(--primary-color);
        color: white;
        
        &.today {
          color: white;
        }
      }

      &.disabled {
        opacity: 0.3;
        cursor: not-allowed;
        &:hover {
          background: transparent;
        }
      }
    }
  }

  .picker-footer {
    display: flex;
    flex-direction: column;
    gap: 12px;
    border-top: 1px solid var(--border-color);
    padding-top: 12px;

    .time-picker {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      
      .time-input {
        border: 1px solid var(--border-color);
        border-radius: 4px;
        padding: 4px 8px;
        background: var(--input-bg);
        color: var(--text-color);
      }
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;

      button {
        cursor: pointer;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 13px;
        transition: all 0.2s;
      }

      .text-btn {
        background: none;
        border: none;
        color: var(--secondary-text);
        
        &:hover {
          color: var(--text-color);
          background: var(--hover-bg);
        }
      }

      .confirm-btn {
        background: var(--primary-color);
        color: white;
        border: none;
        
        &:hover {
          opacity: 0.9;
        }
      }
    }
  }
}
</style>
