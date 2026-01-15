<template>
  <div class="modal-mask" v-if="visible" @click.self="close">
    <div class="modal-container">
      <div class="modal-header">
        <h3>通知设置</h3>
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

const props = defineProps({
  visible: Boolean,
  initialSettings: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:visible', 'save', 'test-desktop', 'test-email', 'test-bark', 'test-webhook']);

const currentTab = ref('desktop');

const defaultSettings = {
  desktop: { enabled: true, advanceMinutes: 0 },
  email: { enabled: false, alias: '', host: 'smtp.qq.com', port: 465, secure: true, user: '', pass: '', to: '' },
  bark: { enabled: false, serverUrl: '', level: 'active', sound: 'minuet', badge: 1 },
  webhook: { enabled: false, url: '', method: 'POST', contentType: 'application/json', headers: [], customBody: '' }
};

const form = reactive(JSON.parse(JSON.stringify(defaultSettings)));

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
  }
});

const close = () => {
  emit('update:visible', false);
};

const save = () => {
  emit('save', JSON.parse(JSON.stringify(form)));
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
}</style>
