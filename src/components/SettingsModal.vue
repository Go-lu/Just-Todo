<template>
  <div class="modal-mask" v-if="visible" @click.self="close">
    <div class="modal-container">
      <div class="modal-header">
        <h3>设置</h3>
        <button class="close-btn" @click="close">
          <i class="ri-close-line"></i>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="tabs">
          <div 
            class="tab-item" 
            :class="{ active: currentTab === 'desktop' }"
            @click="currentTab = 'desktop'"
          >
            <i class="ri-computer-line"></i> 桌面通知
          </div>
          <div 
            class="tab-item" 
            :class="{ active: currentTab === 'email' }"
            @click="currentTab = 'email'"
          >
            <i class="ri-mail-line"></i> 邮件
          </div>
          <div 
            class="tab-item" 
            :class="{ active: currentTab === 'bark' }"
            @click="currentTab = 'bark'"
          >
            <i class="ri-notification-badge-line"></i> Bark
          </div>
          <div 
            class="tab-item" 
            :class="{ active: currentTab === 'webhook' }"
            @click="currentTab = 'webhook'"
          >
            <i class="ri-links-line"></i> Webhook
          </div>
          <div 
            class="tab-item" 
            :class="{ active: currentTab === 'data' }"
            @click="currentTab = 'data'"
          >
            <i class="ri-database-2-line"></i> 数据
          </div>
        </div>

        <div class="tab-content">
          <!-- Desktop Settings -->
          <div v-if="currentTab === 'desktop'" class="settings-panel">
            <div class="form-group">
              <label class="switch-label">
                <span>启用桌面通知</span>
                <input type="checkbox" v-model="form.desktop.enabled">
                <span class="slider"></span>
              </label>
            </div>
            <div class="form-group">
              <label>提前提醒时间 (分钟)</label>
              <input type="number" v-model.number="form.desktop.advanceMinutes" min="0" placeholder="0 表示准时提醒">
              <small>设置在任务截止时间前多少分钟进行提醒</small>
            </div>
            <div class="form-group">
              <button class="test-btn" @click="testDesktop" :disabled="!form.desktop.enabled">
                <i class="ri-flask-line"></i> 测试桌面通知
              </button>
            </div>
          </div>

          <!-- Email Settings -->
          <div v-if="currentTab === 'email'" class="settings-panel">
            <div class="form-group">
              <label class="switch-label">
                <span>启用邮件通知</span>
                <input type="checkbox" v-model="form.email.enabled">
                <span class="slider"></span>
              </label>
            </div>
            <div class="form-group">
              <label>发送人邮箱别名</label>
              <input type="text" v-model="form.email.alias" placeholder="JustTodo 提醒">
            </div>
            <div class="form-group">
              <label>发送人邮箱</label>
              <input type="text" v-model="form.email.user" placeholder="your_email@example.com">
            </div>
            <div class="form-group">
              <label>SMTP 密码 / 授权码</label>
              <input type="password" v-model="form.email.pass" placeholder="Password or App Token">
            </div>
            <div class="form-row">
              <div class="form-group half">
                <label>SMTP 服务器</label>
                <input type="text" v-model="form.email.host" placeholder="smtp.example.com">
              </div>
              <div class="form-group half">
                <label>端口</label>
                <input type="number" v-model.number="form.email.port" placeholder="465">
              </div>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="form.email.secure">
                <span>使用 SSL/TLS (Secure)</span>
              </label>
            </div>
            <div class="form-group">
              <label>接收邮箱</label>
              <input type="text" v-model="form.email.to" placeholder="receive@example.com">
            </div>
            <div class="form-group">
              <button class="test-btn" @click="testEmail" :disabled="!form.email.enabled || !isEmailValid">
                <i class="ri-flask-line"></i> 发送测试邮件
              </button>
            </div>
          </div>

          <!-- Bark Settings -->
          <div v-if="currentTab === 'bark'" class="settings-panel">
            <div class="form-group">
              <label class="switch-label">
                <span>启用 Bark 通知</span>
                <input type="checkbox" v-model="form.bark.enabled">
                <span class="slider"></span>
              </label>
            </div>
            <div class="form-group">
              <label>Bark 服务器地址 (包含 Key)</label>
              <input type="text" v-model="form.bark.serverUrl" placeholder="https://api.day.app/YOUR_KEY/">
              <small>请输入完整的 Bark 推送 URL，通常以 / 结尾</small>
            </div>
            <div class="form-group">
              <label>通知模式 (Level)</label>
              <select v-model="form.bark.level">
                <option value="active">默认 (Active)</option>
                <option value="timeSensitive">时效性 (Time Sensitive)</option>
                <option value="passive">被动 (Passive)</option>
              </select>
            </div>
            <div class="form-row">
               <div class="form-group half">
                 <label>铃声 (Sound)</label>
                 <input type="text" v-model="form.bark.sound" placeholder="minuet">
               </div>
               <div class="form-group half">
                 <label>角标 (Badge)</label>
                 <input type="number" v-model.number="form.bark.badge" placeholder="1">
               </div>
            </div>
            <div class="form-group">
              <button class="test-btn" @click="testBark" :disabled="!form.bark.enabled || !form.bark.serverUrl">
                <i class="ri-flask-line"></i> 发送测试消息
              </button>
            </div>
          </div>

          <!-- Webhook Settings -->
          <div v-if="currentTab === 'webhook'" class="settings-panel">
            <div class="form-group">
              <label class="switch-label">
                <span>启用 Webhook 通知</span>
                <input type="checkbox" v-model="form.webhook.enabled">
                <span class="slider"></span>
              </label>
            </div>
            <div class="form-group">
              <label>Webhook URL</label>
              <input type="text" v-model="form.webhook.url" placeholder="https://your-webhook.com/endpoint">
            </div>
            <div class="form-row">
               <div class="form-group half">
                  <label>请求方式</label>
                  <select v-model="form.webhook.method">
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                  </select>
               </div>
               <div class="form-group half" v-if="form.webhook.method === 'POST'">
                  <label>参数格式 (Content-Type)</label>
                  <select v-model="form.webhook.contentType">
                    <option value="application/json">JSON</option>
                    <option value="application/x-www-form-urlencoded">Form Data</option>
                  </select>
               </div>
            </div>
            
            <div class="form-group" v-if="form.webhook.method === 'POST'">
               <label>请求头 (Headers)</label>
               <div class="key-value-list">
                 <div v-for="(header, index) in form.webhook.headers" :key="index" class="key-value-item">
                   <input type="text" v-model="header.key" placeholder="Key" class="kv-input">
                   <input type="text" v-model="header.value" placeholder="Value" class="kv-input">
                   <button class="remove-btn" @click="removeHeader(index)"><i class="ri-delete-bin-line"></i></button>
                 </div>
                 <button class="add-btn-small" @click="addHeader"><i class="ri-add-line"></i> 添加请求头</button>
               </div>
            </div>

            <div class="form-group" v-if="form.webhook.method === 'POST' && form.webhook.contentType === 'application/json'">
               <label>自定义参数 (JSON Body, 可选)</label>
               <textarea v-model="form.webhook.customBody" placeholder='{"extra": "value"}' rows="3"></textarea>
               <small>将合并到默认请求体中</small>
            </div>

            <div class="form-group">
              <button class="test-btn" @click="testWebhook" :disabled="!form.webhook.enabled || !form.webhook.url">
                <i class="ri-flask-line"></i> 发送测试请求
              </button>
            </div>
          </div>

          <div v-if="currentTab === 'data'" class="settings-panel">
            <div class="data-section">
              <div class="form-group">
                <div class="section-title">本地备份</div>
                <div class="actions-row">
                  <button class="test-btn" @click="exportBackupLocal" :disabled="exporting">
                    <i class="ri-download-cloud-2-line"></i> 导出备份
                  </button>
                </div>
              </div>

              <div class="form-group">
                <div class="section-subtitle">恢复备份</div>
                <div class="actions-row">
                  <label class="file-btn">
                    <i class="ri-upload-2-line"></i> 从本地恢复
                    <input type="file" accept=".json,application/json" @change="onLocalBackupFile" />
                  </label>
                  <button class="test-btn" @click="restoreBackupHttp" :disabled="exporting || !backupForm.http.url">
                    <i class="ri-download-cloud-2-line"></i> 从URL恢复
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label>备份 URL</label>
                <input type="text" v-model="backupForm.http.url" placeholder="https://example.com/backup.json">
              </div>
            </div>

            <div class="data-section">
              <div class="form-group">
                <div class="section-title">WebDAV 备份</div>
                <div class="form-row">
                  <div class="form-group half">
                    <label>服务器地址</label>
                    <input type="text" v-model="backupForm.webdav.baseUrl" placeholder="https://dav.example.com/dav">
                  </div>
                  <div class="form-group half">
                    <label>目录</label>
                    <input type="text" v-model="backupForm.webdav.directory" placeholder="/just-todo">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group half">
                    <label>用户名</label>
                    <input type="text" v-model="backupForm.webdav.username" placeholder="username">
                  </div>
                  <div class="form-group half">
                    <label>密码</label>
                    <input type="password" v-model="backupForm.webdav.password" placeholder="password">
                  </div>
                </div>
                <div class="actions-row">
                  <button class="test-btn" @click="exportBackupWebdav" :disabled="exporting || !isWebdavReady">
                    <i class="ri-upload-cloud-2-line"></i> 导出到 WebDAV
                  </button>
                  <button class="test-btn" @click="loadWebdavFiles" :disabled="exporting || !isWebdavReady">
                    <i class="ri-refresh-line"></i> 刷新目录
                  </button>
                </div>

                <div v-if="webdavFiles.length > 0" class="form-group">
                  <label>选择备份</label>
                  <select v-model="selectedWebdavFileUrl">
                    <option v-for="f in webdavFiles" :key="f.url" :value="f.url">
                      {{ f.name }}
                    </option>
                  </select>
                  <div class="actions-row">
                    <button class="test-btn" @click="restoreBackupWebdav" :disabled="exporting || !selectedWebdavFileUrl">
                      <i class="ri-history-line"></i> 从 WebDAV 恢复
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="cancel-btn" @click="close">取消</button>
        <button class="save-btn" @click="save">保存设置</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import dayjs from 'dayjs';
import { createBackupPayload, applyBackupPayload } from '../utils/db';

const props = defineProps({
  visible: Boolean,
  initialSettings: {
    type: Object,
    default: () => ({})
  },
  initialBackupSettings: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:visible', 'save', 'save-backup', 'data-restored', 'test-desktop', 'test-email', 'test-bark', 'test-webhook']);

const currentTab = ref('desktop');

const defaultSettings = {
  desktop: { enabled: true, advanceMinutes: 0 },
  email: { enabled: false, alias: '', host: 'smtp.qq.com', port: 465, secure: true, user: '', pass: '', to: '' },
  bark: { enabled: false, serverUrl: '', level: 'active', sound: 'minuet', badge: 1 },
  webhook: { enabled: false, url: '', method: 'POST', contentType: 'application/json', headers: [], customBody: '' }
};

const form = reactive(JSON.parse(JSON.stringify(defaultSettings)));

const defaultBackupSettings = {
  webdav: { baseUrl: '', directory: '', username: '', password: '' },
  http: { url: '' }
};

const backupForm = reactive(JSON.parse(JSON.stringify(defaultBackupSettings)));
const exporting = ref(false);

const webdavFiles = ref([]);
const selectedWebdavFileUrl = ref('');

watch(() => props.visible, (newVal) => {
  if (newVal) {
    // Merge initial settings with defaults
    const loaded = props.initialSettings || {};
    Object.keys(defaultSettings).forEach(key => {
      form[key] = { ...defaultSettings[key], ...(loaded[key] || {}) };
      // Ensure arrays/objects are properly initialized if missing
      if (key === 'webhook') {
         if (!form.webhook.headers) form.webhook.headers = [];
      }
    });

    const loadedBackup = props.initialBackupSettings || {};
    Object.keys(defaultBackupSettings).forEach(key => {
      backupForm[key] = { ...defaultBackupSettings[key], ...(loadedBackup[key] || {}) };
    });
    webdavFiles.value = [];
    selectedWebdavFileUrl.value = '';
  }
});

const close = () => {
  emit('update:visible', false);
};

const save = () => {
  emit('save', JSON.parse(JSON.stringify(form)));
  emit('save-backup', JSON.parse(JSON.stringify(backupForm)));
  close();
};

const isEmailValid = computed(() => {
  const f = form.email;
  return f.host && f.user && f.pass && f.to;
});

// Helper for Webhook Headers
const addHeader = () => {
  form.webhook.headers.push({ key: '', value: '' });
};

const removeHeader = (index) => {
  form.webhook.headers.splice(index, 1);
};

const testDesktop = () => emit('test-desktop', form.desktop);
const testEmail = () => emit('test-email', form.email);
const testBark = () => emit('test-bark', form.bark);
const testWebhook = () => emit('test-webhook', form.webhook);

const notify = (message) => {
  try {
    if (window.utools && window.utools.showNotification) {
      window.utools.showNotification(message);
      return;
    }
  } catch (e) {}
  try {
    alert(message);
  } catch (e) {}
};

const isWebdavReady = computed(() => {
  const w = backupForm.webdav;
  return !!(w.baseUrl && w.username && w.password);
});

const webdavAuthHeader = () => {
  const w = backupForm.webdav;
  const token = btoa(`${w.username}:${w.password}`);
  return `Basic ${token}`;
};

const normalizePath = (p) => {
  const s = (p || '').toString().trim();
  if (!s) return '';
  return s.startsWith('/') ? s : '/' + s;
};

const buildWebdavUrl = (fileOrDir = '') => {
  const base = (backupForm.webdav.baseUrl || '').toString().trim().replace(/\/+$/g, '');
  const dir = normalizePath(backupForm.webdav.directory).replace(/\/+$/g, '');
  const sub = normalizePath(fileOrDir).replace(/^\/+/g, '');
  const full = `${base}${dir}${sub ? '/' + sub : ''}`;
  return full;
};

const webdavRequest = async (url, options = {}) => {
  const headers = { ...(options.headers || {}) };
  headers.Authorization = webdavAuthHeader();
  if (window.services?.requestText && window.utools) {
    const result = await window.services.requestText({ url, method: options.method || 'GET', headers, body: options.body || null });
    if (result.status !== 207 && (result.status < 200 || result.status >= 300)) {
      throw new Error(`WebDAV 请求失败 (${result.status}) ${result.body || ''}`.trim());
    }
    return result;
  }

  const res = await fetch(url, { ...options, headers });
  const text = await res.text().catch(() => '');
  if (!res.ok && res.status !== 207) {
    throw new Error(`WebDAV 请求失败 (${res.status}) ${text || res.statusText}`);
  }
  return { status: res.status, headers: {}, body: text };
};

const ensureWebdavDirectory = async () => {
  const dir = normalizePath(backupForm.webdav.directory);
  if (!dir || dir === '/') return;

  const base = (backupForm.webdav.baseUrl || '').toString().trim().replace(/\/+$/g, '');
  const segments = dir.split('/').filter(Boolean);
  let current = '';
  for (const seg of segments) {
    current += '/' + seg;
    const url = `${base}${current}`;
    try {
      await webdavRequest(url, { method: 'MKCOL' });
    } catch (e) {}
  }
};

const exportBackupLocal = async () => {
  exporting.value = true;
  try {
    const payload = createBackupPayload();
    const text = JSON.stringify(payload, null, 2);
    const fileName = `just-todo-backup_${dayjs().format('YYYYMMDD_HHmmss')}.json`;

    if (window.utools && window.services?.showSaveDialog && window.services?.writeTextFileToPath) {
      const res = window.services.showSaveDialog({
        title: '保存备份文件',
        defaultPath: fileName,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });
      if (!res || res.canceled) return;
      window.services.writeTextFileToPath(res.filePath, text, 'utf-8');
      notify('已导出备份：' + res.filePath);
      return;
    }

    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch (e) {
    notify('导出失败：' + e.message);
  } finally {
    exporting.value = false;
  }
};

const exportBackupWebdav = async () => {
  exporting.value = true;
  try {
    await ensureWebdavDirectory();
    const payload = createBackupPayload();
    const text = JSON.stringify(payload, null, 2);
    const fileName = `just-todo-backup_${dayjs().format('YYYYMMDD_HHmmss')}.json`;
    const url = buildWebdavUrl(fileName);
    await webdavRequest(url, { method: 'PUT', body: text, headers: { 'Content-Type': 'application/json' } });
    notify('已导出到 WebDAV：' + fileName);
    await loadWebdavFiles();
    selectedWebdavFileUrl.value = url;
  } catch (e) {
    notify('导出失败：' + e.message);
  } finally {
    exporting.value = false;
  }
};

const parseWebdavList = (xmlText) => {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const responses = Array.from(doc.getElementsByTagNameNS('*', 'response'));
  const out = [];
  for (const r of responses) {
    const href = r.getElementsByTagNameNS('*', 'href')[0]?.textContent || '';
    const lastModified = r.getElementsByTagNameNS('*', 'getlastmodified')[0]?.textContent || '';
    const resourceType = r.getElementsByTagNameNS('*', 'resourcetype')[0];
    const isCollection = !!(resourceType && resourceType.getElementsByTagNameNS('*', 'collection').length > 0);
    if (!href || isCollection) continue;

    const name = decodeURIComponent(href.split('/').filter(Boolean).pop() || '');
    if (!name) continue;
    out.push({ name, url: href, lastModified });
  }
  return out;
};

const loadWebdavFiles = async () => {
  exporting.value = true;
  try {
    const url = buildWebdavUrl();
    const body = `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:getlastmodified />
    <d:resourcetype />
  </d:prop>
</d:propfind>`;
    const res = await webdavRequest(url, { method: 'PROPFIND', headers: { Depth: '1', 'Content-Type': 'application/xml' }, body });
    const xml = res.body || '';
    const list = parseWebdavList(xml);

    const base = (backupForm.webdav.baseUrl || '').toString().trim().replace(/\/+$/g, '');
    const normalized = list
      .filter(i => i.name.endsWith('.json'))
      .map(i => ({
        ...i,
        url: i.url.startsWith('http') ? i.url : (base + i.url)
      }))
      .sort((a, b) => (b.lastModified || '').localeCompare(a.lastModified || '') || b.name.localeCompare(a.name));

    webdavFiles.value = normalized;
    if (!selectedWebdavFileUrl.value && normalized.length > 0) selectedWebdavFileUrl.value = normalized[0].url;
  } catch (e) {
    notify('读取目录失败：' + e.message);
  } finally {
    exporting.value = false;
  }
};

const restoreFromPayload = (payload) => {
  applyBackupPayload(payload);
  emit('data-restored');
  notify('恢复成功');
};

const onLocalBackupFile = async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;

  exporting.value = true;
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    restoreFromPayload(payload);
  } catch (err) {
    notify('恢复失败：' + err.message);
  } finally {
    exporting.value = false;
  }
};

const restoreBackupHttp = async () => {
  exporting.value = true;
  try {
    const url = (backupForm.http.url || '').toString().trim();
    if (!url) throw new Error('请输入备份 URL');
    let payload = null;
    if (window.services?.requestText && window.utools) {
      const result = await window.services.requestText({ url, method: 'GET', headers: {}, body: null });
      if (result.status < 200 || result.status >= 300) throw new Error(`下载失败 (${result.status})`);
      payload = JSON.parse(result.body || '{}');
    } else {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`下载失败 (${res.status})`);
      payload = await res.json();
    }
    restoreFromPayload(payload);
  } catch (e) {
    notify('恢复失败：' + e.message);
  } finally {
    exporting.value = false;
  }
};

const restoreBackupWebdav = async () => {
  exporting.value = true;
  try {
    const url = selectedWebdavFileUrl.value;
    if (!url) throw new Error('请选择备份文件');
    const res = await webdavRequest(url, { method: 'GET' });
    const payload = JSON.parse(res.body || '{}');
    restoreFromPayload(payload);
  } catch (e) {
    notify('恢复失败：' + e.message);
  } finally {
    exporting.value = false;
  }
};

</script>

<style scoped>
.modal-mask {
  position: fixed;
  z-index: 9998;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}

.modal-container {
  width: 600px;
  max-width: 90%;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 24px);
  animation: modal-in 0.3s ease;
}

@keyframes modal-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.close-btn {
  font-size: 1.2rem;
  color: var(--secondary-text);
  padding: 4px;
}

.close-btn:hover {
  color: var(--text-color);
}

.modal-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.tabs {
  width: 140px;
  background-color: var(--bg-color);
  border-right: 1px solid var(--border-color);
  padding: 12px 0;
  display: flex;
  flex-direction: column;
}

.tab-item {
  padding: 12px 16px;
  cursor: pointer;
  color: var(--secondary-text);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
}

.tab-item:hover {
  background-color: var(--hover-bg);
  color: var(--text-color);
}

.tab-item.active {
  background-color: var(--bg-secondary);
  color: var(--primary-color);
  font-weight: 500;
  border-left: 3px solid var(--primary-color);
}

.tab-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  min-height: 0;
}

@media (max-height: 560px) {
  .modal-container {
    max-width: calc(100vw - 16px);
    max-height: calc(100vh - 16px);
  }

  .modal-header {
    padding: 12px 16px;
  }

  .tab-content {
    padding: 16px;
  }

  .modal-footer {
    padding: 12px 16px;
  }
}

.settings-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.half {
  flex: 1;
}

label {
  font-size: 0.9rem;
  color: var(--text-color);
  font-weight: 500;
}

input, select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background-color: var(--input-bg);
  color: var(--text-color);
  font-size: 0.9rem;
}

small {
  color: var(--secondary-text);
  font-size: 0.8rem;
}

/* Switch */
.switch-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 4px 0;
}

.switch-label input {
  display: none;
}

.slider {
  position: relative;
  width: 44px;
  height: 24px;
  background-color: var(--border-color);
  border-radius: 24px;
  transition: .3s;
}

.slider:before {
  content: "";
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: .3s;
}

input:checked + .slider {
  background-color: var(--success-color);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input {
  width: auto;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  color: var(--secondary-text);
  background-color: transparent;
  border: 1px solid var(--border-color);
}

.cancel-btn:hover {
  background-color: var(--hover-bg);
}

.save-btn {
  padding: 8px 24px;
  border-radius: var(--radius-sm);
  background-color: var(--primary-color);
  color: white;
  font-weight: 500;
}

.save-btn:hover {
  background-color: var(--primary-hover);
}

.test-btn {
  align-self: flex-start;
  padding: 6px 12px;
  font-size: 0.85rem;
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: 6px;
}

.test-btn:hover:not(:disabled) {
  background-color: rgba(59, 130, 246, 0.1);
}

.test-btn:disabled {
  border-color: var(--border-color);
  color: var(--secondary-text);
  cursor: not-allowed;
}

.key-value-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.key-value-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.kv-input {
  flex: 1;
}

.remove-btn {
  color: var(--danger-color, #ef4444);
  padding: 4px;
  border-radius: 4px;
}

.remove-btn:hover {
  background-color: rgba(239, 68, 68, 0.1);
}

.add-btn-small {
  align-self: flex-start;
  font-size: 0.8rem;
  color: var(--primary-color);
  display: flex;
  align-items: center;
  gap: 4px;
}

.add-btn-small:hover {
  text-decoration: underline;
}

textarea {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background-color: var(--input-bg);
  color: var(--text-color);
  font-size: 0.9rem;
  resize: vertical;
}

.data-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-color);
}

.section-title {
  font-weight: 600;
  color: var(--text-color);
}

.section-subtitle {
  font-weight: 600;
  color: var(--text-color);
  font-size: 0.9rem;
}

.actions-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.file-btn {
  align-self: flex-start;
  padding: 6px 12px;
  font-size: 0.85rem;
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.file-btn input {
  display: none;
}

.file-btn:hover {
  background-color: rgba(59, 130, 246, 0.1);
}

.export-preview-root {
  position: fixed;
  left: -99999px;
  top: 0;
  width: 820px;
}

.export-card {
  width: 820px;
  background: #ffffff;
  color: #111827;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial;
}

.export-card-header {
  padding: 22px 22px 14px 22px;
  background: linear-gradient(135deg, #eef2ff, #ffffff);
  border-bottom: 1px solid #e5e7eb;
}

.export-card-title {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.export-card-meta {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}

.export-card-list {
  padding: 12px 22px 8px 22px;
}

.export-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;
}

.export-item:last-child {
  border-bottom: none;
}

.export-item-left {
  display: flex;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.export-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 5px;
  border: 2px solid #cbd5e1;
  margin-top: 2px;
  flex: 0 0 auto;
}

.export-checkbox.checked {
  border-color: #22c55e;
  background: #22c55e;
}

.export-content {
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.export-item-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

.export-due {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
}

.export-priority {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #9ca3af;
}

.export-priority.p-high {
  background: #ef4444;
}

.export-priority.p-medium {
  background: #f59e0b;
}

.export-priority.p-low {
  background: #22c55e;
}

.export-empty {
  padding: 26px 0;
  color: #9ca3af;
  text-align: center;
  font-size: 13px;
}

.export-card-footer {
  padding: 10px 22px 14px 22px;
  color: #9ca3af;
  font-size: 12px;
  text-align: right;
}
</style>
