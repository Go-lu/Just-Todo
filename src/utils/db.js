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
