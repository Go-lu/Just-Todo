<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import Sidebar from './components/Sidebar.vue';
import StickyNote from './components/StickyNote.vue';
import TodoList from './components/TodoList.vue';
import CalendarView from './components/CalendarView.vue';
import TaskModal from './components/TaskModal.vue';
import TaskDrawer from './components/TaskDrawer.vue';
import SettingsModal from './components/SettingsModal.vue';
import DateTimePicker from './components/DateTimePicker.vue';
import Toast from './components/Toast.vue';
import { db } from './utils/db';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import 'dayjs/locale/zh-cn';
import confetti from 'canvas-confetti';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.locale('zh-cn');

// State
const isSticky = ref(window.location.search.includes('mode=sticky') || window.location.hash.includes('sticky'));
const categories = ref([]);
const todos = ref([]);
const currentCategoryId = ref('default');
const defaultCategoryId = ref('default');
const viewMode = ref('list'); // 'list' or 'calendar'
const contextMenu = ref({ visible: false, x: 0, y: 0, type: '', item: null });
const datePickerModal = ref({
  visible: false,
  date: '',
  todo: null,
  callback: null
});
const taskModal = ref({
  visible: false,
  initialData: {}
});
const taskDrawer = ref({
  visible: false,
  initialData: {}
});
const settingsVisible = ref(false);
const notificationSettings = ref({});
const notifiedTasks = ref(new Set());
let notificationTimer = null;

const toast = ref({
  visible: false,
  message: '',
  type: 'success'
});

const showToast = (message, type = 'success') => {
  toast.value.message = message;
  toast.value.type = type;
  toast.value.visible = true;
  setTimeout(() => {
    toast.value.visible = false;
  }, 2000);
};

const themeMode = ref('system');
const applyTheme = (mode) => {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');
  if (mode === 'light') {
    root.classList.add('theme-light');
  } else if (mode === 'dark') {
    root.classList.add('theme-dark');
  } else {
    
  }
};
const setThemeMode = (mode) => {
  themeMode.value = mode;
};
const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const handleSystemThemeChange = () => {
  if (themeMode.value === 'system') applyTheme('system');
};
watch(themeMode, (val) => {
  localStorage.setItem('theme-mode', val);
  applyTheme(val);
});
const isPinned = ref(false);

onMounted(() => {
  const saved = localStorage.getItem('theme-mode') || 'system';
  themeMode.value = saved;
  applyTheme(saved);
  mediaQuery && mediaQuery.addEventListener('change', handleSystemThemeChange);

  if (window.utools) {
    // window.utools.isAlwaysOnTop might not exist in some versions
    // We rely on local state or default to false
    // isPinned.value = window.utools.isAlwaysOnTop();
  }
});
onUnmounted(() => {
  mediaQuery && mediaQuery.removeEventListener('change', handleSystemThemeChange);
  if (notificationTimer) clearInterval(notificationTimer);
});
const minDate = ref(dayjs().format('YYYY-MM-DD'));

const sortState = ref({
  field: 'default', // 'default', 'createdAt', 'dueDate', 'priority'
  order: 'asc'      // 'asc', 'desc'
});
const sortMenuVisible = ref(false);

const toggleSortMenu = () => {
  sortMenuVisible.value = !sortMenuVisible.value;
};

const toggleSortOrder = () => {
  sortState.value.order = sortState.value.order === 'asc' ? 'desc' : 'asc';
};

const setSort = (field) => {
  if (sortState.value.field === field) {
    // Toggle order if same field
    sortState.value.order = sortState.value.order === 'asc' ? 'desc' : 'asc';
  } else {
    sortState.value.field = field;
    sortState.value.order = 'asc'; // Default to asc for new field
  }
  sortMenuVisible.value = false;
};

// Computed
const currentTodos = computed(() => {
  let filtered = [];
  
  // 1. Filter Logic
  if (currentCategoryId.value === 'all') {
    filtered = todos.value.filter(t => !t.isCompleted);
  } else if (currentCategoryId.value === 'today') {
    filtered = todos.value.filter(t => !t.isCompleted && t.dueDate && dayjs(t.dueDate).isSameOrBefore(dayjs(), 'day'));
  } else if (currentCategoryId.value === 'plan') {
    filtered = todos.value.filter(t => !t.isCompleted && t.dueDate && dayjs(t.dueDate).isAfter(dayjs(), 'day'));
  } else if (currentCategoryId.value === 'urgent') {
    filtered = todos.value.filter(t => !t.isCompleted && (t.priority === 'high' || t.priority === 'medium' || t.priority === 'low'));
  } else if (currentCategoryId.value === 'completed') {
    filtered = todos.value.filter(t => t.isCompleted);
  } else {
    // Custom Category: Show all (active + completed) - TodoList will handle separation
    filtered = todos.value.filter(t => t.categoryId === currentCategoryId.value);
  }

  // 2. Sort Logic (If custom sort is active, override default sorts)
  if (sortState.value.field !== 'default') {
    const { field, order } = sortState.value;
    const factor = order === 'asc' ? 1 : -1;
    
    return [...filtered].sort((a, b) => {
      let valA, valB;
      
      if (field === 'createdAt') {
        valA = a.createdAt || 0;
        valB = b.createdAt || 0;
      } else if (field === 'dueDate') {
        valA = a.dueDate ? dayjs(a.dueDate).valueOf() : (order === 'asc' ? 9999999999999 : 0); // Nulls last/first?
        valB = b.dueDate ? dayjs(b.dueDate).valueOf() : (order === 'asc' ? 9999999999999 : 0);
      } else if (field === 'priority') {
        const pMap = { high: 3, medium: 2, low: 1, normal: 0 };
        valA = pMap[a.priority || 'normal'];
        valB = pMap[b.priority || 'normal'];
      }
      
      if (valA < valB) return -1 * factor;
      if (valA > valB) return 1 * factor;
      return 0;
    });
  }

  // Default Sorts
  if (currentCategoryId.value === 'today') {
    return filtered.sort((a, b) => {
        const pMap = { high: 0, medium: 1, low: 2, normal: 3 };
        const pA = pMap[a.priority || 'normal'];
        const pB = pMap[b.priority || 'normal'];
        if (pA !== pB) return pA - pB;
        return b.createdAt - a.createdAt;
    });
  }
  if (currentCategoryId.value === 'plan') {
    return filtered.sort((a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf());
  }
  if (currentCategoryId.value === 'completed') {
    return filtered.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  }
  
  // Default for others (Custom Categories): Keep original order (Manual Sort)
  return filtered;
});

const currentCategoryName = computed(() => {
  if (currentCategoryId.value === 'all') return '全部待办';
  if (currentCategoryId.value === 'today') return '今日待办';
  if (currentCategoryId.value === 'plan') return '计划';
  if (currentCategoryId.value === 'urgent') return '紧急待办';
  if (currentCategoryId.value === 'completed') return '已完成';
  const cat = categories.value.find(c => c.id === currentCategoryId.value);
  return cat ? cat.name : '未知清单';
});

// Lifecycle
const showDatePicker = (defaultDate, callback) => {
  minDate.value = dayjs().format('YYYY-MM-DD');
  datePickerModal.value = {
    visible: true,
    date: defaultDate || dayjs().format('YYYY-MM-DD'),
    callback
  };
};

const handleDateConfirm = (dateValue) => {
  const finalDate = (typeof dateValue === 'string') ? dateValue : datePickerModal.value.date;
  if (datePickerModal.value.callback) {
    datePickerModal.value.callback(finalDate);
  }
  datePickerModal.value.visible = false;
};

const setQuickDate = (type) => {
  if (type === 'today') {
    datePickerModal.value.date = dayjs().format('YYYY-MM-DD');
  } else if (type === 'tomorrow') {
    datePickerModal.value.date = dayjs().add(1, 'day').format('YYYY-MM-DD');
  } else if (type === 'next-week') {
    datePickerModal.value.date = dayjs().add(1, 'week').startOf('week').add(1, 'day').format('YYYY-MM-DD'); // Next Monday
  }
};

onMounted(() => {
  if (window.utools) {
    window.utools.onPluginEnter((action) => {
      console.log('Plugin Enter', action);
      loadData();
    });
  } else {
    loadData();
  }

  document.addEventListener('click', closeContextMenu);
  
  // Start Notification Scheduler
  checkNotifications(); // Check immediately
  notificationTimer = setInterval(checkNotifications, 60000);
});

// Methods
const loadData = () => {
  console.time('loadData');
  try {
    categories.value = db.getCategories();
    todos.value = db.getTodos();
    const settings = db.getSettings();
    notificationSettings.value = settings.notification || {};
    
    // Ensure default categories exist if empty
    if (categories.value.length === 0) {
      categories.value = [
        { id: 'default', name: '默认清单', sort: 0, icon: 'ri-file-list-line', color: '#1890ff' },
        { id: 'work', name: '工作', sort: 1, icon: 'ri-briefcase-line', color: '#52c41a' },
        { id: 'life', name: '生活', sort: 2, icon: 'ri-home-smile-line', color: '#faad14' }
      ];
      saveCategories();
    } else {
      // Migration: Add icon and color if missing
      let changed = false;
      categories.value.forEach(c => {
        if (!c.icon || !c.icon.startsWith('ri-')) {
          // Simple mapping or default
          if (c.name.includes('工作')) c.icon = 'ri-briefcase-line';
          else if (c.name.includes('生活')) c.icon = 'ri-home-smile-line';
          else c.icon = 'ri-list-check';
          changed = true;
        }
        if (!c.color) {
          c.color = '#666666';
          changed = true;
        }
        // Fix specific defaults if they are standard ones
        if (c.id === 'default' && c.icon === 'ri-list-check') c.icon = 'ri-file-list-line';
      });
      if (changed) saveCategories();
    }
  } catch (error) {
    console.error('Failed to load data:', error);
    // Try to recover or show notification
    if (window.utools) {
       window.utools.showNotification('数据加载失败: ' + error.message);
    }
  } finally {
    console.timeEnd('loadData');
  }
};

const saveCategories = () => {
  db.saveCategories(JSON.parse(JSON.stringify(categories.value)));
};

const saveTodos = () => {
  db.saveTodos(JSON.parse(JSON.stringify(todos.value)));
};

// Category Actions
const selectCategory = (id) => {
  currentCategoryId.value = id;
  // viewMode.value = 'list'; // Optional: Switch back to list view on category change
};

const addCategory = () => {
  showCategoryModal('新建清单', '', 'ri-file-list-line', '#1890ff', (name, icon, color) => {
    if (name) {
      categories.value.push({
        id: uuidv4(),
        name,
        icon,
        color,
        sort: categories.value.length
      });
      saveCategories();
    }
  });
};

const updateCategories = () => {
  saveCategories();
};

const openTaskModal = (initialData = {}) => {
  taskModal.value = {
    visible: true,
    initialData
  };
};

const openTaskDrawer = (todo) => {
  taskDrawer.value = {
    visible: true,
    initialData: JSON.parse(JSON.stringify(todo))
  };
};

const handleDrawerSave = (taskData) => {
  if (taskData.id) {
    updateTodo(taskData);
  } else {
    addTodo(taskData);
  }
  taskDrawer.value.visible = false;
  showToast('保存成功');
};

const handleDrawerDelay = ({ id, date }) => {
  const index = todos.value.findIndex(t => t.id === id);
  if (index !== -1) {
    const todo = todos.value[index];
    const newHistory = [...(todo.history || [])];
    newHistory.push({
      type: 'delay',
      timestamp: Date.now(),
      details: date
    });
    
    const updatedTodo = {
      ...todo,
      dueDate: date,
      history: newHistory
    };
    updateTodo(updatedTodo);
    
    // Update drawer data if open
    if (taskDrawer.value.visible && taskDrawer.value.initialData.id === id) {
       taskDrawer.value.initialData = JSON.parse(JSON.stringify(updatedTodo));
    }
  }
};

const handleTaskSave = (taskData) => {
  if (taskData.id) {
    // Edit existing
    updateTodo(taskData);
  } else {
    // Add new
    addTodo(taskData);
  }
};

// Todo Actions
const addTodo = (todoData) => {
  const newTodo = {
    id: uuidv4(),
    content: todoData.content,
    categoryId: todoData.categoryId,
    description: todoData.description || '',
    isCompleted: !!todoData.isCompleted,
    priority: todoData.priority || 'medium',
    createdAt: Date.now(),
    dueDate: todoData.dueDate || null,
    repeatRule: todoData.repeatRule !== 'none' ? todoData.repeatRule : null,
    subtasks: todoData.subtasks || [],
    attachments: todoData.attachments || []
  };
  todos.value.unshift(newTodo);
  saveTodos();
};

const handleTodosUpdate = (newFilteredList) => {
  // Get IDs of items in the new list
  const newIds = new Set(newFilteredList.map(t => t.id));
  
  // Get items that are NOT in the modified list
  const others = todos.value.filter(t => !newIds.has(t.id));
  
  // Combine others + newFilteredList
  // Note: This effectively groups the modified items together at the end of the list
  todos.value = [...others, ...newFilteredList];
  saveTodos();
};

const updateTodo = (updatedTodo) => {
  const index = todos.value.findIndex(t => t.id === updatedTodo.id);
  if (index !== -1) {
    const oldTodo = todos.value[index];
    
    // Update completedAt timestamp
    if (updatedTodo.isCompleted && !oldTodo.isCompleted) {
      updatedTodo.completedAt = Date.now();
      if (!updatedTodo.history) updatedTodo.history = [];
      updatedTodo.history.push({ type: 'complete', timestamp: Date.now() });
      
      // Trigger Global Confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
        zIndex: 99999
      });
    } else if (!updatedTodo.isCompleted && oldTodo.isCompleted) {
      updatedTodo.completedAt = null;
      if (!updatedTodo.history) updatedTodo.history = [];
      updatedTodo.history.push({ type: 'uncomplete', timestamp: Date.now() });
    }

    // Check completion for recurrence
    let shouldRecur = false;
    if (updatedTodo.isCompleted && !oldTodo.isCompleted && updatedTodo.repeatRule && updatedTodo.repeatRule !== 'none') {
      shouldRecur = true;
    }
    
    todos.value[index] = {
      ...oldTodo,
      ...updatedTodo,
      attachments: updatedTodo.attachments !== undefined ? updatedTodo.attachments : (oldTodo.attachments || [])
    };

    if (shouldRecur) {
      handleRecurrence(updatedTodo);
    }

    saveTodos();
  }
};

const handleRecurrence = (todo) => {
  if (!todo.repeatRule || todo.repeatRule === 'none') return;

  const existsActiveNext = todos.value.some(t => t.recurrenceFromId === todo.id && !t.isCompleted);
  if (existsActiveNext) return;

  let baseDate = todo.dueDate ? dayjs(todo.dueDate) : dayjs();
  let nextDate;

  switch (todo.repeatRule) {
    case 'daily': 
      nextDate = baseDate.add(1, 'day'); 
      break;
    case 'weekly': 
      nextDate = baseDate.add(1, 'week'); 
      break;
    case 'monthly': 
      nextDate = baseDate.add(1, 'month'); 
      break;
    case 'yearly': 
      nextDate = baseDate.add(1, 'year'); 
      break;
    default:
      return;
  }

  const newTodo = {
    ...todo,
    id: uuidv4(),
    recurrenceFromId: todo.id,
    isCompleted: false,
    priority: todo.priority || 'normal',
    dueDate: nextDate.format('YYYY-MM-DD'),
    createdAt: Date.now(),
    completedAt: null,
    history: []
  };
  
  // Add new task
  todos.value.unshift(newTodo);
  
  const originalIndex = todos.value.findIndex(t => t.id === todo.id);
  if (originalIndex !== -1) {
    const hist = [...(todos.value[originalIndex].history || [])];
    hist.push({ type: 'recurrence', timestamp: Date.now(), nextId: newTodo.id });
    todos.value[originalIndex].history = hist;
    todos.value[originalIndex].generatedNextTaskId = newTodo.id;
  }
  // Old task remains completed
};

// Notification Logic
const checkNotifications = () => {
  const settings = notificationSettings.value;
  if (!settings) return;
  
  const now = dayjs();
  
  todos.value.forEach(todo => {
    if (todo.isCompleted || !todo.dueDate) return;
    if (notifiedTasks.value.has(todo.id)) return;
    
    // Determine trigger time
    let dueTime = dayjs(todo.dueDate);
    if (todo.dueDate.length === 10) {
      dueTime = dueTime.hour(9).minute(0).second(0);
    }
    
    // Advance time (General settings > Desktop settings > 0)
    let advance = 0;
    if (settings.general && typeof settings.general.advanceMinutes === 'number') {
      advance = settings.general.advanceMinutes;
    } else if (settings.desktop && settings.desktop.advanceMinutes) {
      advance = settings.desktop.advanceMinutes;
    }
    
    const triggerTime = dueTime.subtract(advance, 'minute');
    
    if (now.isSameOrAfter(triggerTime)) {
       const diff = now.diff(triggerTime, 'minute');
       if (diff >= 0 && diff < 60) { // Notify if within 1 hour of due/trigger time
         sendNotification(todo);
         notifiedTasks.value.add(todo.id);
       } else if (diff >= 60) {
         // Mark as notified to avoid spam for old tasks
         notifiedTasks.value.add(todo.id);
       }
    }
  });
};

const sendNotification = async (todo) => {
  const settings = notificationSettings.value;
  const title = '待办提醒';
  const body = `任务 "${todo.content}" 即将到期`;
  
  // Desktop
  if (settings.desktop?.enabled) {
    const options = { 
      body, 
      requireInteraction: true // Requires user interaction to close
    };
    
    // Always try HTML5 Notification API first for better control (requireInteraction)
    if (Notification.permission === 'granted') {
       try {
         new Notification(title, options);
       } catch (e) {
         console.error('Notification API failed', e);
         // Fallback to uTools native notification
         if (window.utools) window.utools.showNotification(body);
       }
    } else if (Notification.permission !== 'denied') {
       Notification.requestPermission().then(permission => {
         if (permission === 'granted') {
           try {
             new Notification(title, options);
           } catch (e) {
             if (window.utools) window.utools.showNotification(body);
           }
         }
       });
    } else {
        // Fallback
        if (window.utools) {
            window.utools.showNotification(body);
        }
    }
  }
  
  // Bark
  if (settings.bark?.enabled && settings.bark.serverUrl) {
    try {
      const baseUrl = settings.bark.serverUrl.endsWith('/') ? settings.bark.serverUrl : settings.bark.serverUrl + '/';
      const params = new URLSearchParams();
      if (settings.bark.level) params.append('level', settings.bark.level);
      if (settings.bark.sound) params.append('sound', settings.bark.sound);
      if (settings.bark.badge) params.append('badge', settings.bark.badge);
      
      const finalUrl = `${baseUrl}${encodeURIComponent(title)}/${encodeURIComponent(body)}?${params.toString()}`;
      await fetch(finalUrl);
    } catch (e) {
      console.error('Bark failed', e);
    }
  }
  
  // Webhook
  if (settings.webhook?.enabled && settings.webhook.url) {
    try {
        const method = settings.webhook.method || 'POST';
        const headers = {};
        if (settings.webhook.headers && Array.isArray(settings.webhook.headers)) {
          settings.webhook.headers.forEach(h => {
            if (h.key) headers[h.key] = h.value;
          });
        }

        const payload = {
          event: 'todo_due',
          title: title,
          body: body,
          todo: todo
        };

        if (settings.webhook.customBody) {
          try {
            const custom = JSON.parse(settings.webhook.customBody);
            Object.assign(payload, custom);
          } catch (e) {
            console.warn('Invalid custom body JSON', e);
          }
        }

        if (method === 'GET') {
             const url = new URL(settings.webhook.url);
             Object.keys(payload).forEach(k => {
               const val = payload[k];
               url.searchParams.append(k, typeof val === 'object' ? JSON.stringify(val) : val);
             });
             await fetch(url.toString(), { method: 'GET', headers });
        } else {
            let bodyContent;
            const contentType = settings.webhook.contentType || 'application/json';
            if (!headers['Content-Type']) headers['Content-Type'] = contentType;

            if (contentType === 'application/json') {
               bodyContent = JSON.stringify(payload);
            } else if (contentType === 'application/x-www-form-urlencoded') {
               const params = new URLSearchParams();
               Object.keys(payload).forEach(key => {
                 const val = payload[key];
                 params.append(key, typeof val === 'object' ? JSON.stringify(val) : val);
               });
               bodyContent = params;
            }

            await fetch(settings.webhook.url, {
                method: 'POST',
                headers: headers,
                body: bodyContent
            });
        }
    } catch (e) {
      console.error('Webhook failed', e);
    }
  }
  
  // Email
  if (settings.email?.enabled) {
    notifyEmail(settings.email, title, body);
  }
};

const notifyEmail = async (config, subject, text) => {
    if (!window.services?.sendEmail) return;
    const from = config.alias ? `"${config.alias}" <${config.user}>` : config.user;

    const transportConfig = {
        host: config.host,
        port: Number(config.port),
        secure: config.secure,
        auth: {
            user: config.user,
            pass: config.pass
        }
    };

    const mailOptions = {
        from: from,
        to: config.to,
        subject,
        text
    };
    const res = await window.services.sendEmail(transportConfig, mailOptions);
    if (!res.success) {
        console.error('Email failed', res.error);
        if (window.utools) {
             window.utools.showNotification('邮件发送失败: ' + res.error);
        }
    }
};

// Settings Actions
const handleSaveSettings = (newSettings) => {
  const currentSettings = db.getSettings();
  currentSettings.notification = newSettings;
  db.saveSettings(currentSettings);
  notificationSettings.value = newSettings;
  showToast('设置已保存');
};

const testDesktop = (config) => {
  const title = '测试通知';
  const body = '这是一条测试通知';
  const options = { 
    body, 
    requireInteraction: true 
  };

  // Try HTML5 Notification first
  if (Notification.permission === 'granted') {
     try {
       new Notification(title, options);
     } catch (e) {
       if (window.utools) window.utools.showNotification(body);
     }
  } else if (Notification.permission !== 'denied') {
     Notification.requestPermission().then(permission => {
       if (permission === 'granted') {
         new Notification(title, options);
       }
     });
  } else {
    if (window.utools) {
      window.utools.showNotification(body);
    }
  }
  showToast('已发送桌面通知');
};

const testBark = async (config) => {
  if (!config.serverUrl) return;
  try {
      const baseUrl = config.serverUrl.endsWith('/') ? config.serverUrl : config.serverUrl + '/';
      const params = new URLSearchParams();
      if (config.level) params.append('level', config.level);
      if (config.sound) params.append('sound', config.sound);
      if (config.badge) params.append('badge', config.badge);

      const finalUrl = `${baseUrl}${encodeURIComponent('测试通知')}/${encodeURIComponent('这是一条测试消息')}?${params.toString()}`;
      await fetch(finalUrl);
      showToast('已发送 Bark 请求');
  } catch (e) {
      showToast('Bark 请求失败: ' + e.message, 'error');
  }
};

const testWebhook = async (config) => {
  if (!config.url) return;
  try {
    const method = config.method || 'POST';
    const headers = {};
    if (config.headers && Array.isArray(config.headers)) {
      config.headers.forEach(h => {
        if (h.key) headers[h.key] = h.value;
      });
    }

    const payload = {
       event: 'test_notification',
       title: '测试通知',
       body: '这是一条测试消息'
    };

    if (config.customBody) {
      try {
        const custom = JSON.parse(config.customBody);
        Object.assign(payload, custom);
      } catch (e) {
        console.warn('Invalid custom body JSON', e);
      }
    }

    if (method === 'GET') {
         const url = new URL(config.url);
         Object.keys(payload).forEach(k => {
            const val = payload[k];
            url.searchParams.append(k, typeof val === 'object' ? JSON.stringify(val) : val);
         });
         await fetch(url.toString(), { method: 'GET', headers });
    } else {
        let bodyContent;
        const contentType = config.contentType || 'application/json';
        if (!headers['Content-Type']) headers['Content-Type'] = contentType;

        if (contentType === 'application/json') {
           bodyContent = JSON.stringify(payload);
        } else if (contentType === 'application/x-www-form-urlencoded') {
           const params = new URLSearchParams();
           Object.keys(payload).forEach(key => {
             const val = payload[key];
             params.append(key, typeof val === 'object' ? JSON.stringify(val) : val);
           });
           bodyContent = params;
        }

        await fetch(config.url, {
            method: 'POST',
            headers: headers,
            body: bodyContent
        });
    }
    showToast('已发送 Webhook 请求');
  } catch (e) {
      showToast('Webhook 请求失败: ' + e.message, 'error');
  }
};

const testEmail = async (config) => {
    showToast('正在发送邮件...');
    const from = config.alias ? `"${config.alias}" <${config.user}>` : config.user;
    
    // Construct Nodemailer transport config with proper auth structure
    const transportConfig = {
        host: config.host,
        port: Number(config.port),
        secure: config.secure,
        auth: {
            user: config.user,
            pass: config.pass
        }
    };

    const res = await window.services?.sendEmail(transportConfig, {
        from: from,
        to: config.to,
        subject: 'Just Todo 测试邮件',
        text: '这是一条来自 Just Todo 的测试邮件。'
    });
    if (res && res.success) {
        showToast('邮件发送成功');
    } else {
        showToast('邮件发送失败: ' + (res?.error || '未知错误'), 'error');
    }
};


const getRepeatLabel = (rule, item) => {
  const date = item && item.dueDate ? dayjs(item.dueDate) : dayjs();
  switch(rule) {
    case 'none': return '不重复';
    case 'daily': return '每日';
    case 'weekly': return `每周 (${date.format('dddd')})`;
    case 'monthly': return `每月 (${date.format('D')}日)`;
    case 'yearly': return `每年 (${date.format('MM月D日')})`;
    default: return rule;
  }
};

// Context Menu
const showContextMenu = ({ event, type, item }) => {
  const x = event.clientX;
  const y = event.clientY;
  
  contextMenu.value = {
    visible: true,
    x,
    y,
    type,
    item,
    submenuDirection: 'right'
  };

  nextTick(() => {
    const menuEl = document.querySelector('.context-menu');
    if (menuEl) {
      const rect = menuEl.getBoundingClientRect();
      const winHeight = window.innerHeight;
      const winWidth = window.innerWidth;
      
      let newY = y;
      let newX = x;

      // Check bottom overflow
      if (y + rect.height > winHeight) {
        newY = winHeight - rect.height - 10;
      }
      
      // Check right overflow
      if (x + rect.width > winWidth) {
        newX = winWidth - rect.width - 10;
      }

      // Check submenu overflow (approximate submenu width 160px)
      if (newX + rect.width + 160 > winWidth) {
        contextMenu.value.submenuDirection = 'left';
      }

      contextMenu.value.y = newY;
      contextMenu.value.x = newX;
    }
  });
};

const closeContextMenu = () => {
  contextMenu.value.visible = false;
};

// Modal State
const inputModal = ref({ visible: false, title: '', value: '', icon: '', color: '', isCategory: false, callback: null, searchText: '' });

const showInputModal = (title, defaultValue, callback) => {
  inputModal.value = {
    visible: true,
    title,
    value: defaultValue || '',
    icon: '',
    color: '#1890ff',
    isCategory: false,
    callback,
    searchText: ''
  };
  nextTick(() => {
    document.getElementById('modal-input')?.focus();
  });
};

const presetColors = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', 
  '#13c2c2', '#eb2f96', '#fa541c', '#a0d911', '#2f54eb',
  '#fa8c16', '#7cb305', '#666666', '#8c8c8c', '#000000'
];

const presetIcons = [
  'ri-list-check', 'ri-file-list-line', 'ri-briefcase-line', 'ri-home-smile-line', 'ri-calendar-event-line',
  'ri-star-line', 'ri-shopping-cart-line', 'ri-book-open-line', 'ri-capsule-line', 'ri-football-line',
  'ri-music-fill', 'ri-plane-fill', 'ri-gamepad-line', 'ri-cup-line', 'ri-lightbulb-line',
  'ri-money-dollar-circle-line', 'ri-gift-line', 'ri-tools-line', 'ri-computer-line', 'ri-palette-line',
  'ri-heart-line', 'ri-user-smile-line', 'ri-emotion-happy-line', 'ri-sun-line', 'ri-moon-line',
  'ri-cloud-line', 'ri-umbrella-line', 'ri-flag-line', 'ri-bookmark-line', 'ri-attachment-line',
  'ri-folder-line', 'ri-delete-bin-line', 'ri-edit-line', 'ri-settings-line', 'ri-search-line',
  'ri-lock-line', 'ri-key-line', 'ri-shield-line', 'ri-notification-line', 'ri-mail-line',
  'ri-phone-line', 'ri-map-pin-line', 'ri-car-line', 'ri-bus-line', 'ri-train-line',
  'ri-bike-line', 'ri-walk-line', 'ri-restaurant-line', 'ri-hotel-line', 'ri-ticket-line'
];

const filteredIcons = computed(() => {
  if (!inputModal.value.searchText) return presetIcons;
  const lowerSearch = inputModal.value.searchText.toLowerCase();
  return presetIcons.filter(icon => icon.toLowerCase().includes(lowerSearch));
});

const showCategoryModal = (title, defaultName, defaultIcon, defaultColor, callback) => {
  inputModal.value = {
    visible: true,
    title,
    value: defaultName || '',
    icon: defaultIcon || 'ri-list-check',
    color: defaultColor || '#1890ff',
    isCategory: true,
    callback,
    searchText: ''
  };
  nextTick(() => {
    document.getElementById('modal-input')?.focus();
  });
};

const confirmInputModal = () => {
  if (inputModal.value.callback) {
    if (inputModal.value.isCategory) {
      inputModal.value.callback(inputModal.value.value, inputModal.value.icon, inputModal.value.color);
    } else {
      inputModal.value.callback(inputModal.value.value);
    }
  }
  inputModal.value.visible = false;
};

const cancelInputModal = () => {
  inputModal.value.visible = false;
};

const handleMenuAction = (action, payload) => {
  const { type, item } = contextMenu.value;
  
  if (type === 'category') {
    if (action === 'delete') {
      if (item.isDefault) {
        // Use a better UI for alert if possible, but alert is fine for now
        alert('默认清单不可删除');
        return;
      }
      if (confirm('确定要删除该清单吗？清单内的任务也会被删除。')) {
        const index = categories.value.findIndex(c => c.id === item.id);
        if (index > -1) {
          categories.value.splice(index, 1);
          saveCategories();
          // Delete related todos
          todos.value = todos.value.filter(t => t.categoryId !== item.id);
          saveTodos();
          if (currentCategoryId.value === item.id) {
            currentCategoryId.value = 'all';
          }
        }
      }
    } else if (action === 'set-default') {
      categories.value.forEach(c => c.isDefault = false);
      const cat = categories.value.find(c => c.id === item.id);
      if (cat) {
        cat.isDefault = true;
        saveCategories();
      }
    } else if (action === 'rename') {
      showCategoryModal('编辑清单', item.name, item.icon, item.color, (name, icon, color) => {
        if (name) {
          const cat = categories.value.find(c => c.id === item.id);
          if (cat) {
            cat.name = name;
            cat.icon = icon;
            cat.color = color;
            saveCategories();
          }
        }
      });
    } else if (action === 'pin-top') {
      // Move to top
      const index = categories.value.findIndex(c => c.id === item.id);
      if (index > 0) {
        const cat = categories.value.splice(index, 1)[0];
        categories.value.unshift(cat);
        saveCategories();
      }
    } else if (action === 'pin') {
      // Toggle Pin / Detach
      togglePin();
    }
  } else if (type === 'todo') {
    if (action === 'delete') {
      todos.value = todos.value.filter(t => t.id !== item.id);
      saveTodos();
    } else if (action === 'copy') {
      if (window.utools) {
        window.utools.copyText(item.content);
      } else {
        navigator.clipboard.writeText(item.content);
      }
    } else if (action === 'move') {
      const targetCatId = payload;
      const todo = todos.value.find(t => t.id === item.id);
      if (todo) {
        todo.categoryId = targetCatId;
        saveTodos();
      }
    } else if (action === 'dueDate') {
      const todo = todos.value.find(t => t.id === item.id);
      if (todo) {
        showDatePicker(todo.dueDate, (newDate) => {
          todo.dueDate = newDate;
          saveTodos();
        });
      }
    } else if (action === 'repeat') {
       const rule = payload; // daily, weekly, etc.
       const todo = todos.value.find(t => t.id === item.id);
       if (todo) {
         todo.repeatRule = rule === 'none' ? null : rule;
         saveTodos();
       }
    } else if (action === 'priority') {
       const priority = payload;
       const todo = todos.value.find(t => t.id === item.id);
       if (todo) {
         todo.priority = priority;
         saveTodos();
       }
    }
  }
  closeContextMenu();
};

const isUtools = typeof window !== 'undefined' && !!window.utools;

const togglePin = () => {
  if (isSticky.value) return;

  if (window.utools) {
     window.utools.createBrowserWindow('sticky.html', {
        width: 320,
        height: 500,
        title: '待办便签',
        useContentSize: true,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        resizable: true,
        minimizable: false,
        maximizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        webPreferences: {
            preload: 'preload/services.js',
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            backgroundThrottling: false
        }
     });
     window.utools.outPlugin();
  }
};

const copyTodoList = () => {
  let content = '';
  currentTodos.value.forEach(t => {
      content += `- [${t.isCompleted ? 'x' : ' '}] ${t.content}\n`;
  });
  
  if (window.utools) {
      window.utools.copyText(content);
      window.utools.showNotification('列表已复制到剪贴板');
  } else {
      navigator.clipboard.writeText(content).then(() => {
          alert('列表已复制到剪贴板');
      });
  }
};

// Export
const exportMarkdown = () => {
  let content = '# 待办事项\n\n';
  categories.value.forEach(cat => {
    const catTodos = todos.value.filter(t => t.categoryId === cat.id && !t.isCompleted);
    if (catTodos.length > 0) {
      content += `## ${cat.name}\n`;
      catTodos.forEach(t => {
        content += `- [ ] ${t.content} ${t.dueDate ? `(📅 ${t.dueDate})` : ''}\n`;
      });
      content += '\n';
    }
  });
  
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `todo_export_${dayjs().format('YYYYMMDD')}.md`;
  a.click();
};

</script>

<template>
  <StickyNote 
    v-if="isSticky"
    :todos="todos"
    :categories="categories"
    @update:todos="handleTodosUpdate"
    @open-add-task="openTaskModal({ categoryId: 'default' })"
    @update-todo="updateTodo"
    @context-menu="showContextMenu"
    @item-click="openTaskDrawer"
  />
  <div v-else class="app-container">
    <Sidebar 
      :categories="categories" 
      :currentCategoryId="currentCategoryId"
      :todos="todos"
      :themeMode="themeMode"
      @select="selectCategory"
      @update:categories="updateCategories"
      @add-category="addCategory"
      @context-menu="showContextMenu"
      @theme-change="setThemeMode"
      @open-settings="settingsVisible = true"
    />
    
    <main class="main-content">
      <header class="main-header">
        <div class="header-left">
          <h2>{{ currentCategoryName }}</h2>
        </div>
        <div class="header-right">
          <!-- Pin Button -->
          <button v-if="isUtools" class="icon-btn" @click="togglePin" title="开启便签模式" style="margin-right: 8px;">
            <i class="ri-pushpin-line"></i>
          </button>
          
          <!-- Sort Button -->
          <div class="sort-wrapper">
             <button class="icon-btn" @click="toggleSortOrder" :title="sortState.order === 'asc' ? '切换为降序' : '切换为升序'" style="margin-right: 4px;">
               <i :class="sortState.order === 'asc' ? 'ri-sort-asc' : 'ri-sort-desc'"></i>
             </button>
             <div class="filter-wrapper" @mouseenter="sortMenuVisible = true" @mouseleave="sortMenuVisible = false">
               <button class="icon-btn">
                 <i class="ri-filter-3-line"></i>
               </button>
               <div v-if="sortMenuVisible" class="sort-menu">
                 <div class="sort-item" :class="{ active: sortState.field === 'createdAt' }" @click="setSort('createdAt')">
                   <span>创建时间</span>
                 </div>
                 <div class="sort-item" :class="{ active: sortState.field === 'dueDate' }" @click="setSort('dueDate')">
                   <span>截止时间</span>
                 </div>
                 <div class="sort-item" :class="{ active: sortState.field === 'priority' }" @click="setSort('priority')">
                  <span>优先级</span>
                 </div>
                 <div class="sort-divider"></div>
                 <div class="sort-item" :class="{ active: sortState.field === 'default' }" @click="setSort('default')">
                   <span>默认排序</span>
                 </div>
               </div>
             </div>
          </div>

          <!-- View Toggle Switch -->
          <div class="view-switch">
            <div 
              class="switch-item" 
              :class="{ active: viewMode === 'list' }" 
              @click="viewMode = 'list'"
            >
              <i class="ri-list-check"></i>
            </div>
            <div 
              class="switch-item" 
              :class="{ active: viewMode === 'calendar' }" 
              @click="viewMode = 'calendar'"
            >
              <i class="ri-calendar-line"></i>
            </div>
          </div>
          
          <button class="add-btn" @click="openTaskModal({ categoryId: currentCategoryId === 'all' || currentCategoryId === 'today' || currentCategoryId === 'plan' || currentCategoryId === 'urgent' || currentCategoryId === 'completed' ? defaultCategoryId : currentCategoryId })">
            <i class="ri-add-line"></i> 新建任务
          </button>
        </div>
      </header>

      <div class="content-body">
        <div v-if="viewMode === 'list'" class="list-view">
           <TodoList 
             :todos="currentTodos" 
             :categoryId="currentCategoryId"
             :categories="categories"
             :sortState="sortState"
             @update:todos="handleTodosUpdate"
             @open-add-task="openTaskModal"
             @update-todo="updateTodo"
             @context-menu="showContextMenu"
             @item-click="openTaskDrawer"
           />
        </div>
        <CalendarView 
          v-else 
          :todos="currentTodos" 
          @item-click="openTaskDrawer"
          @update-todo="updateTodo"
          @context-menu="showContextMenu"
        />
      </div>
    </main>

    <!-- Context Menu -->
    <div 
      v-if="contextMenu.visible" 
      class="context-menu"
      :class="{ 'submenu-left': contextMenu.submenuDirection === 'left' }"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      @click.stop
    >
      <template v-if="contextMenu.type === 'category'">
        <div class="menu-item" @click="handleMenuAction('pin-top')">置顶清单</div>
        <div class="menu-item" @click="handleMenuAction('rename')">重命名</div>
        <div class="menu-item" @click="handleMenuAction('set-default')">设为默认</div>
        <div class="menu-item" @click="handleMenuAction('pin')">置顶/取消置顶窗口</div>
        <div 
          class="menu-item delete" 
          :class="{ disabled: contextMenu.item.isDefault }"
          :title="contextMenu.item.isDefault ? '默认清单不可删除' : ''"
          @click="!contextMenu.item.isDefault && handleMenuAction('delete')"
        >
          删除清单
        </div>
      </template>
      
      <template v-if="contextMenu.type === 'todo'">
        <div class="menu-item" @click="handleMenuAction('copy')">复制内容</div>
        <div class="menu-item has-submenu">
          移动到...
          <div class="submenu">
            <div 
              v-for="cat in categories" 
              :key="cat.id" 
              class="menu-item"
              @click="handleMenuAction('move', cat.id)"
            >
              {{ cat.name }}
            </div>
          </div>
        </div>
        <div class="menu-item" @click="handleMenuAction('dueDate')">设置截止日期</div>
        <div class="menu-item has-submenu">
           设置优先级
           <div class="submenu">
             <div class="menu-item" @click="handleMenuAction('priority', 'high')">🔴 高</div>
             <div class="menu-item" @click="handleMenuAction('priority', 'medium')">🟠 中</div>
             <div class="menu-item" @click="handleMenuAction('priority', 'low')">🟢 低</div>
           </div>
        </div>
        <div class="menu-item has-submenu">
          重复任务
          <div class="submenu">
             <div class="menu-item" @click="handleMenuAction('repeat', 'none')">不重复</div>
             <div class="menu-item" @click="handleMenuAction('repeat', 'daily')">每日</div>
             <div class="menu-item" @click="handleMenuAction('repeat', 'weekly')">{{ getRepeatLabel('weekly', contextMenu.item) }}</div>
             <div class="menu-item" @click="handleMenuAction('repeat', 'monthly')">{{ getRepeatLabel('monthly', contextMenu.item) }}</div>
             <div class="menu-item" @click="handleMenuAction('repeat', 'yearly')">{{ getRepeatLabel('yearly', contextMenu.item) }}</div>
          </div>
        </div>
        <div class="menu-item delete" @click="handleMenuAction('delete')">删除任务</div>
      </template>
    </div>

  </div>
    <!-- Input Modal -->
    <TaskDrawer 
      v-model:visible="taskDrawer.visible"
      :categories="categories"
      :initial-data="taskDrawer.initialData"
      :default-category-id="currentCategoryId"
      @save="handleDrawerSave"
      @delay="handleDrawerDelay"
    />

    <SettingsModal
      v-model:visible="settingsVisible"
      :initial-settings="notificationSettings"
      @save="handleSaveSettings"
      @test-desktop="testDesktop"
      @test-email="testEmail"
      @test-bark="testBark"
      @test-webhook="testWebhook"
    />

    <div v-if="inputModal.visible" class="modal-overlay" @click.self="cancelInputModal">
      <div class="modal-box">
        <h3>{{ inputModal.title }}</h3>
        
        <!-- Category Edit Mode -->
        <template v-if="inputModal.isCategory">
          <div class="input-group">
            <label>清单名称</label>
            <input 
              id="modal-input"
              v-model="inputModal.value" 
              placeholder="请输入清单名称"
              @keyup.enter="confirmInputModal"
            />
          </div>

          <div class="input-group">
            <div class="search-box">
               <input 
                v-model="inputModal.searchText"
                placeholder="搜索图标..."
                class="search-input"
              />
            </div>
            <label>选择图标</label>
            <div class="icon-grid">
              <div 
                v-for="icon in filteredIcons" 
                :key="icon"
                class="icon-item"
                :class="{ active: inputModal.icon === icon }"
                :style="{ color: inputModal.icon === icon ? inputModal.color : '' }"
                @click="inputModal.icon = icon"
              >
                <i :class="icon"></i>
              </div>
            </div>
          </div>

          <div class="input-group">
            <label>选择颜色</label>
            <div class="color-grid">
              <div 
                v-for="color in presetColors" 
                :key="color"
                class="color-item"
                :class="{ active: inputModal.color === color }"
                :style="{ backgroundColor: color }"
                @click="inputModal.color = color"
              >
                <span v-if="inputModal.color === color" class="check-mark">✓</span>
              </div>
            </div>
          </div>
        </template>

        <!-- Simple Input Mode (e.g. Date) -->
        <template v-else>
           <input 
            id="modal-input"
            v-model="inputModal.value" 
            placeholder="请输入内容"
            @keyup.enter="confirmInputModal"
            @keyup.esc="cancelInputModal"
          />
        </template>

        <div class="modal-actions">
          <button @click="cancelInputModal">取消</button>
          <button class="primary" @click="confirmInputModal">确定</button>
        </div>
      </div>
    </div>
    <!-- Date Picker Modal -->
    <div v-if="datePickerModal.visible" class="modal-overlay" @click.self="datePickerModal.visible = false">
      <DateTimePicker 
        :model-value="datePickerModal.date"
        :show-time="true"
        :min-date="minDate"
        @confirm="handleDateConfirm"
        @close="datePickerModal.visible = false"
      />
    </div>

    <!-- Task Modal -->
    <TaskModal
      v-model:visible="taskModal.visible"
      :categories="categories"
      :initial-data="taskModal.initialData"
      :default-category-id="currentCategoryId"
      @save="handleTaskSave"
    />

    <Toast
      :visible="toast.visible"
      :message="toast.message"
      :type="toast.type"
    />
</template>

<style scoped lang="less">
.app-container {
  height: 100vh;
  display: flex;
  color: var(--text-color);
  background: var(--bg-color);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  
  .list-view {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .main-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 24px;
    background: var(--bg-color);

    .header-left {
      h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        color: var(--text-color);
        display: flex;
        align-items: center;
        gap: 10px;
        letter-spacing: -0.5px;
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;

      .sort-wrapper {
        position: relative;
        display: flex;
        
        .filter-wrapper {
          position: relative;
        }

        .sort-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            min-width: 160px;
            z-index: 1000;
            padding: 6px;
            
            &::before {
              content: '';
              position: absolute;
              top: -10px;
              left: 0;
              right: 0;
              height: 10px;
            }
          
            .sort-item {
              padding: 8px 12px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              cursor: pointer;
              font-size: 14px;
              color: var(--text-color);
              border-radius: var(--radius-sm);
            
              &:hover {
                background: var(--hover-bg);
              }
            
              &.active {
                color: var(--primary-color);
                background: var(--active-bg);
                font-weight: 500;
              }
            
              i {
                font-size: 16px;
              }
            }
          
          .sort-divider {
            height: 1px;
            background: var(--border-color);
            margin: 4px 0;
          }
        }
      }

      .view-switch {
        display: flex;
        background: var(--hover-bg);
        border-radius: var(--radius-sm);
        padding: 4px;
        border: none;

        .switch-item {
          padding: 6px 12px;
          cursor: pointer;
          border-radius: 4px;
          color: var(--secondary-text);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;

          i {
            font-size: 16px;
          }

          &.active {
            background: var(--bg-secondary);
            color: var(--primary-color);
            box-shadow: var(--shadow-sm);
            font-weight: 500;
          }

          &:hover:not(.active) {
            color: var(--text-color);
            background: rgba(0,0,0,0.05);
          }
        }
      }

      .icon-btn {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-sm);
        border: 1px solid transparent;
        background: transparent;
        color: var(--secondary-text);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;

        &:hover {
          background: var(--hover-bg);
          color: var(--text-color);
          border-color: var(--border-color);
        }

        &.active {
          background: var(--active-bg);
          color: var(--primary-color);
        }

        i {
          font-size: 20px;
        }
      }

      .add-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s;
        box-shadow: var(--shadow-sm);
        
        &:hover {
          background: var(--primary-hover);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }
        
        &:active {
          transform: translateY(0);
        }
      }
    }
  }

  .content-body {
    flex: 1;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
  }
}

.context-menu {
  position: fixed;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  border-radius: var(--radius-md);
  padding: 6px;
  z-index: 1000;
  min-width: 160px;
  
  .menu-item {
    padding: 8px 12px;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-color);
    position: relative;
    border-radius: var(--radius-sm);
    
    &:hover {
      background-color: var(--hover-bg);
      
      > .submenu {
        display: block;
      }
    }
    
    &.delete {
      color: var(--danger-color);
      border-top: 1px solid var(--border-color);
      margin-top: 4px;
      padding-top: 8px;

      &.disabled {
        color: var(--secondary-text);
        cursor: not-allowed;
        &:hover {
          background-color: transparent;
        }
      }
    }
  }

  &.submenu-left {
    .menu-item {
      &:hover {
        > .submenu {
          left: auto;
          right: 100%;
          margin-left: 0;
          margin-right: 8px;
        }
      }
    }
  }

  .submenu {
    display: none;
    position: absolute;
    left: 100%;
    top: -4px;
    margin-left: 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-lg);
    border-radius: var(--radius-md);
    padding: 6px;
    min-width: 140px;
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  
  .modal-box {
    background: var(--bg-secondary);
    padding: 24px;
    border-radius: var(--radius-lg);
    min-width: 320px;
    color: var(--text-color);
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border-color);
    
    h3 {
      margin-top: 0;
      margin-bottom: 20px;
      font-size: 18px;
      font-weight: 600;
    }
    
    input {
      width: 100%;
      padding: 10px 12px;
      margin: 8px 0 20px;
      border: 1px solid var(--input-border);
      border-radius: var(--radius-sm);
      box-sizing: border-box;
      background: var(--input-bg);
      color: var(--text-color);
      font-size: 14px;
      
      &:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }
    }
    
    .input-group {
      margin-bottom: 20px;
      
      .search-box {
        margin-bottom: 12px;
        .search-input {
          margin: 0;
        }
      }

      label {
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        font-weight: 500;
        color: var(--text-color);
      }
      
      .icon-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 8px;
        max-height: 180px;
        overflow-y: auto;
        padding: 8px;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        background: var(--bg-color);
        
        .icon-item {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 36px;
          font-size: 20px;
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all 0.2s;
          color: var(--secondary-text);
          
          &:hover {
            background-color: var(--hover-bg);
            color: var(--text-color);
          }
          
          &.active {
            background-color: var(--active-bg);
            color: var(--primary-color);
            border: 1px solid var(--primary-color);
          }
        }
      }
      
      .color-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 10px;
        
        .color-item {
          height: 28px;
          width: 28px;
          aspect-ratio: 1;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
          border: 2px solid transparent;
          
          &:hover {
             transform: scale(1.1);
          }
          
          &.active {
             transform: scale(1.1);
             border-color: var(--text-color);
          }
          
          .check-mark {
            color: white;
            font-size: 14px;
            font-weight: bold;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
          }
        }
      }
    }

    .modal-actions {
       display: flex;
       justify-content: flex-end;
       gap: 12px;
       margin-top: 24px;
       
       button {
         padding: 8px 16px;
         border-radius: var(--radius-sm);
         font-size: 14px;
         font-weight: 500;
         cursor: pointer;
         transition: all 0.2s;
         background: transparent;
         color: var(--text-color);
         border: 1px solid var(--border-color);
         
         &:hover {
           background: var(--hover-bg);
         }
         
         &.primary {
           background: var(--primary-color);
           color: white;
           border: none;
           
           &:hover {
             background: var(--primary-hover);
             box-shadow: var(--shadow-sm);
           }
         }
       }
    }
  }
}
</style>
