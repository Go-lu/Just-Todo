<script setup>
import { ref, computed, nextTick } from 'vue';
import dayjs from 'dayjs';

const props = defineProps({
  todos: {
    type: Array,
    required: true
  }
});

const emit = defineEmits([
  'item-click',
  'update-todo',
  'context-menu'
]);

const currentMonth = ref(dayjs());
const hoverState = ref({ todo: null, x: 0, y: 0, visible: false });
let hideTimer = null;

const days = computed(() => {
  const startOfMonth = currentMonth.value.startOf('month');
  const endOfMonth = currentMonth.value.endOf('month');
  const startDate = startOfMonth.startOf('week');
  const endDate = endOfMonth.endOf('week');

  const daysArr = [];
  let day = startDate;
  
  while (day.isBefore(endDate) || day.isSame(endDate, 'day')) {
    daysArr.push(day);
    day = day.add(1, 'day');
  }
  return daysArr;
});

const getTodosForDate = (date) => {
  return props.todos.filter(todo => {
    if (!todo.dueDate) return false;
    return dayjs(todo.dueDate).isSame(date, 'day');
  });
};

const prevMonth = () => {
  currentMonth.value = currentMonth.value.subtract(1, 'month');
};

const nextMonth = () => {
  currentMonth.value = currentMonth.value.add(1, 'month');
};

const goToday = () => {
  currentMonth.value = dayjs();
};

const toggleComplete = (todo, event) => {
  const newStatus = !todo.isCompleted;
  
  // 1. Immediate UI update for popover if visible
  if (hoverState.value.todo && hoverState.value.todo.id === todo.id) {
    hoverState.value.todo.isCompleted = newStatus;
  }
  
  // Confetti is now handled globally in App.vue

  emit('update-todo', { ...todo, isCompleted: newStatus });
};

const showPopover = (todo, e) => {
  if (hideTimer) clearTimeout(hideTimer);
  
  const rect = e.currentTarget.getBoundingClientRect();
  const popoverWidth = 220; // Approximate width
  const popoverHeight = 40; // Approximate height
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // Default position: Right of the item, aligned with top
  let x = rect.right + 8;
  let y = rect.top;

  // Check right boundary
  if (x + popoverWidth > windowWidth) {
    // Try placing on the left
    x = rect.left - popoverWidth - 8;
  }
  
  // Check bottom boundary
  if (y + popoverHeight > windowHeight) {
    y = windowHeight - popoverHeight - 8;
  }
  
  // Ensure left boundary (if placed on left)
  if (x < 0) x = 8;

  hoverState.value = { todo, x, y, visible: true };
};

const startHide = () => {
  hideTimer = setTimeout(() => {
    hoverState.value.visible = false;
  }, 200);
};

const cancelHide = () => {
  if (hideTimer) clearTimeout(hideTimer);
};

const handleWheel = (e) => {
  const container = e.currentTarget;
  // Reduce scroll speed to avoid skipping items
  // Using a factor of 0.35 (approx 35px per notch, roughly 2 items)
  container.scrollTop += e.deltaY * 0.35;
};
</script>

<template>
  <div class="calendar-view">
    <div class="calendar-header">
      <button @click="prevMonth">&lt;</button>
      <span>{{ currentMonth.format('YYYY年 MM月') }}</span>
      <button @click="nextMonth">&gt;</button>
      <button @click="goToday" class="today-btn">今天</button>
    </div>

    <div class="calendar-grid">
      <div class="weekdays">
        <div v-for="d in ['日', '一', '二', '三', '四', '五', '六']" :key="d" class="weekday">{{ d }}</div>
      </div>
      <div class="days">
        <div 
          v-for="day in days" 
          :key="day.toString()" 
          class="day-cell"
          :class="{ 
            'current-month': day.isSame(currentMonth, 'month'),
            'today': day.isSame(dayjs(), 'day')
          }"
        >
          <div class="date-num">{{ day.date() }}</div>
          <div class="day-todos" @wheel.stop.prevent="handleWheel">
            <div 
              v-for="todo in getTodosForDate(day)" 
              :key="todo.id" 
              class="todo-thumb"
              :class="[{ completed: todo.isCompleted }, todo.priority || 'normal']"
              @click="emit('item-click', todo)"
              @contextmenu.prevent="emit('context-menu', { type: 'todo', item: todo })"
              @mouseenter="showPopover(todo, $event)"
              @mouseleave="startHide"
            >
              <span class="thumb-text">{{ todo.content }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div 
      v-if="hoverState.visible && hoverState.todo" 
      class="hover-popover" 
      :style="{ top: hoverState.y + 'px', left: hoverState.x + 'px' }"
      @mouseenter="cancelHide"
      @mouseleave="startHide"
    >
      <div class="row" @click.stop="toggleComplete(hoverState.todo, $event)">
        <span class="priority-dot" :class="hoverState.todo.priority || 'normal'"></span>
        <span class="title" :class="{ completed: hoverState.todo.isCompleted }">{{ hoverState.todo.content }}</span>
        <i :class="hoverState.todo.isCompleted ? 'ri-checkbox-circle-line completed-icon' : 'ri-checkbox-blank-circle-line'"></i>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.calendar-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px;
  height: 100%;
  box-sizing: border-box;

  .calendar-header {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 10px;
    
    button {
      margin: 0 10px;
      padding: 5px 10px;
      cursor: pointer;
      color: var(--text-color);
    }

    span {
      font-size: 18px;
      font-weight: bold;
      width: 120px;
      text-align: center;
      color: var(--text-color);
    }

    .today-btn {
      font-size: 12px;
    }
  }

  .calendar-grid {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border-color);
    overflow: hidden;

    .weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      background: var(--bg-color);
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
      
      .weekday {
        padding: 10px;
        text-align: center;
        font-weight: bold;
        color: var(--text-color);
      }
    }

    .days {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      grid-auto-rows: minmax(96px, 1fr);
      overflow: hidden;
      min-height: 0;
      
      .day-cell {
        border-right: 1px solid var(--border-color);
        border-bottom: 1px solid var(--border-color);
        padding: 5px;
        position: relative;
        background: var(--secondary-bg);
        overflow: hidden;
        display: flex;
        flex-direction: column;

        &:nth-child(7n) {
          border-right: none;
        }

        &.current-month {
          background: var(--secondary-bg);
          color: var(--text-color);
        }

        &:not(.current-month) {
          background: var(--bg-color);
          color: var(--secondary-text);
        }

        &.today {
          background: rgba(59, 130, 246, 0.08);
          .date-num {
            color: var(--primary-color);
            font-weight: 800;
          }
        }

        .date-num {
          font-size: 14px;
          margin-bottom: 4px;
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
        }

        .day-todos {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          &::-webkit-scrollbar {
            width: 0;
            height: 0;
          }

          .todo-thumb {
            position: relative;
            display: flex;
            align-items: center;
            padding: 1px 4px;
            border-radius: 4px;
            cursor: pointer;
            color: #fff;
            font-size: 11px;
            line-height: 1.4;
            max-width: 100%;
            transition: all 0.2s ease;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            
            &.high { background: var(--danger-color); }
            &.medium { background: var(--warning-color); }
            &.low { background: var(--success-color); }
            &.normal { background: var(--primary-color); }
            
            &.completed {
              opacity: 0.6;
              filter: grayscale(1);
              text-decoration: line-through;
              background: var(--secondary-text);
            }
            
            &:hover {
              z-index: 2;
              box-shadow: 0 2px 4px rgba(0,0,0,0.15);
            }
            
            .thumb-text {
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              flex: 1;
            }
          }
        }
      }
    }
  }
}
  
.hover-popover {
  position: fixed;
  background: var(--bg-secondary);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 12px;
  z-index: 1000;
  min-width: 220px;
  max-width: 320px;
  backdrop-filter: blur(10px);
  
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    
    &:hover {
      opacity: 0.8;
    }
  }
  
  .priority-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--secondary-text);
    flex-shrink: 0;
    &.high { background: var(--danger-color); box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2); }
    &.medium { background: var(--warning-color); }
    &.low { background: var(--success-color); }
    &.normal { background: var(--primary-color); }
  }
  
  .title {
    flex: 1;
    font-size: 12px;
    white-space: normal;
    word-break: break-all;
    line-height: 1.4;
    
    &.completed {
      text-decoration: line-through;
      color: var(--secondary-text);
    }
  }

  .completed-icon {
    color: var(--secondary-text);
  }
}
</style>
