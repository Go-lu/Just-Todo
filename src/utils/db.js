import { v4 as uuidv4 } from 'uuid';

const IS_UTOOLS = window.utools ? true : false;

// Mock data for browser development
const mockDb = {
  categories: {
    _id: 'categories',
    data: [
      { id: 'default', name: '默认清单', sort: 0, icon: '📝', color: '#1890ff' },
      { id: 'work', name: '工作', sort: 1, icon: '💼', color: '#52c41a' },
      { id: 'life', name: '生活', sort: 2, icon: '🏠', color: '#faad14' }
    ]
  },
  todos: {
    _id: 'todos',
    data: []
  }
};

function getDoc(id) {
  if (IS_UTOOLS) {
    return window.utools.db.get(id);
  } else {
    const data = localStorage.getItem(id);
    return data ? JSON.parse(data) : mockDb[id];
  }
}

function putDoc(doc) {
  if (IS_UTOOLS) {
    const result = window.utools.db.put(doc);
    if (result.error) {
      throw new Error(result.message);
    }
    return result;
  } else {
    // Simulate rev update
    doc._rev = (doc._rev || 0) + 1;
    localStorage.setItem(doc._id, JSON.stringify(doc));
    return { ok: true, id: doc._id, rev: doc._rev };
  }
}

export const BACKUP_VERSION = 1;

export function createBackupPayload(extra = {}) {
  const data = {
    categories: db.getCategories(),
    todos: db.getTodos(),
    settings: db.getSettings()
  };

  const themeMode = (() => {
    try {
      return localStorage.getItem('theme-mode') || 'system';
    } catch (e) {
      return 'system';
    }
  })();

  return {
    app: 'just-todo',
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    themeMode,
    data,
    extra
  };
}

export function applyBackupPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('备份数据格式错误');
  if (payload.app !== 'just-todo') throw new Error('不是 Just Todo 备份文件');
  if (!payload.data || typeof payload.data !== 'object') throw new Error('备份缺少 data 字段');

  const categories = Array.isArray(payload.data.categories) ? payload.data.categories : null;
  const todos = Array.isArray(payload.data.todos) ? payload.data.todos : null;
  const settings = payload.data.settings && typeof payload.data.settings === 'object' ? payload.data.settings : null;

  if (!categories) throw new Error('备份 categories 格式错误');
  if (!todos) throw new Error('备份 todos 格式错误');
  if (!settings) throw new Error('备份 settings 格式错误');

  const nextCategories = categories.some(c => c && c.id === 'default')
    ? categories
    : [{ id: 'default', name: '默认清单', sort: 0, icon: '📝', color: '#1890ff' }, ...categories];

  db.saveCategories(JSON.parse(JSON.stringify(nextCategories)));
  db.saveTodos(JSON.parse(JSON.stringify(todos)));
  db.saveSettings(JSON.parse(JSON.stringify(settings)));

  if (payload.themeMode) {
    try {
      localStorage.setItem('theme-mode', payload.themeMode);
    } catch (e) {}
  }

  return true;
}

export const db = {
  getCategories() {
    let doc = getDoc('categories');
    if (!doc) {
      doc = { _id: 'categories', data: [
        { id: 'default', name: '默认清单', sort: 0, icon: '📝', color: '#1890ff' }
      ] };
      putDoc(doc);
    }
    return doc.data || [];
  },

  saveCategories(categories) {
    const doc = getDoc('categories') || { _id: 'categories' };
    doc.data = categories;
    return putDoc(doc);
  },

  getTodos() {
    let doc = getDoc('todos');
    if (!doc) {
      doc = { _id: 'todos', data: [] };
      putDoc(doc);
    }
    return doc.data || [];
  },

  saveTodos(todos) {
    const doc = getDoc('todos') || { _id: 'todos' };
    doc.data = todos;
    return putDoc(doc);
  },

  getSettings() {
    let doc = getDoc('settings');
    if (!doc) {
      doc = { _id: 'settings', data: { defaultCategoryId: 'default' } };
      putDoc(doc);
    }
    return doc.data || {};
  },

  saveSettings(settings) {
    const doc = getDoc('settings') || { _id: 'settings' };
    doc.data = settings;
    return putDoc(doc);
  },
  
  // Helper to ensure initial data
  init() {
    this.getCategories();
    this.getTodos();
    this.getSettings();
  }
};
