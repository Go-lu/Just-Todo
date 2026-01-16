// ----------------------------------------------------------------------------
// 终极 Polyfill: 修复 Electron/uTools 环境下 setImmediate is not defined
// ----------------------------------------------------------------------------
(function() {
  const _setTimeout = setTimeout;
  const _clearTimeout = clearTimeout;

  function setImmediatePolyfill(callback, ...args) {
    if (typeof callback !== 'function') {
      throw new TypeError('"callback" argument must be a function');
    }
    return _setTimeout(callback, 0, ...args);
  }

  function clearImmediatePolyfill(id) {
    return _clearTimeout(id);
  }

  // 1. 获取所有可能的全局对象
  const globalObjects = [];
  if (typeof globalThis !== 'undefined') globalObjects.push(globalThis);
  if (typeof global !== 'undefined') globalObjects.push(global);
  if (typeof window !== 'undefined') globalObjects.push(window);
  if (typeof self !== 'undefined') globalObjects.push(self);

  // 2. 挂载到所有全局对象
  globalObjects.forEach(g => {
    try {
      if (!g.setImmediate) {
        Object.defineProperty(g, 'setImmediate', {
          value: setImmediatePolyfill,
          writable: true,
          configurable: true
        });
      }
      if (!g.clearImmediate) {
        Object.defineProperty(g, 'clearImmediate', {
          value: clearImmediatePolyfill,
          writable: true,
          configurable: true
        });
      }
    } catch (e) {
      // 忽略不可写对象
    }
  });
})();

// ----------------------------------------------------------------------------

const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const https = require('node:https')
const nodemailer = require('nodemailer')
const { remote } = require('electron')

// 通过 window 对象向渲染进程注入 nodejs 能力
window.services = {
  // 设置窗口透明度
  setOpacity(value) {
    try {
      const win = remote.getCurrentWindow()
      win.setOpacity(value)
    } catch (e) {
      console.error('setOpacity failed', e)
    }
  },
  // 设置窗口置顶
  setAlwaysOnTop(flag) {
    try {
      let win = null
      try {
        win = remote.getCurrentWindow()
      } catch (e) {}
      if (!win) {
        try {
          if (window.utools && window.utools.getCurrentBrowserWindow) {
            win = window.utools.getCurrentBrowserWindow()
          }
        } catch (e) {}
      }
      
      if (win) {
        if (flag) {
          try { win.setAlwaysOnTop(true, 'floating') } catch (e) {}
          try { win.setAlwaysOnTop(true, 'screen-saver') } catch (e) {}
          try { win.setAlwaysOnTop(true) } catch (e) {}
          try {
            if (typeof win.show === 'function') win.show()
          } catch (e) {}
          try {
            if (typeof win.moveTop === 'function') win.moveTop()
          } catch (e) {}
          try {
            if (typeof win.focus === 'function') win.focus()
          } catch (e) {}
          return true
        } else {
          try {
            win.setAlwaysOnTop(false)
          } catch (e) {}
          try {
            if (typeof win.setVisibleOnAllWorkspaces === 'function') {
              win.setVisibleOnAllWorkspaces(false)
            }
          } catch (e) {}
          try {
            setTimeout(() => {
              try {
                win.setAlwaysOnTop(false)
              } catch (e) {}
              try {
                if (typeof win.isAlwaysOnTop === 'function' && win.isAlwaysOnTop()) {
                  try { win.setAlwaysOnTop(false, 'screen-saver') } catch (e2) {}
                  try { win.setAlwaysOnTop(false, 'floating') } catch (e2) {}
                  try { win.setAlwaysOnTop(false, 'normal') } catch (e2) {}
                  try { win.setAlwaysOnTop(true, 'normal') } catch (e2) {}
                  try { win.setAlwaysOnTop(false) } catch (e2) {}
                }
              } catch (e) {}
            }, 0)
          } catch (e) {}
          return true
        }
      }
      return false
    } catch (e) {
      console.error('setAlwaysOnTop failed', e)
      return false
    }
  },
  recreateStickyWindow(pin, bounds) {
    const width = bounds?.width ?? 320
    const height = bounds?.height ?? 500

    const options = {
      width,
      height,
      x: typeof bounds?.x === 'number' ? bounds.x : undefined,
      y: typeof bounds?.y === 'number' ? bounds.y : undefined,
      title: '待办便签',
      useContentSize: true,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: true,
      minimizable: false,
      maximizable: false,
      alwaysOnTop: false,
      skipTaskbar: true,
      show: false,
      webPreferences: {
        preload: 'preload/services.js',
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
        backgroundThrottling: false
      }
    }

    const stickyUrl = (() => {
      try {
        return new URL(`sticky.html?pin=${pin ? '1' : '0'}&nonce=${Date.now().toString(36)}`, window.location.href).toString()
      } catch (e) {
        return `sticky.html?pin=${pin ? '1' : '0'}&nonce=${Date.now().toString(36)}`
      }
    })()

    try {
      if (window.utools && window.utools.createBrowserWindow) {
        let win = null
        win = window.utools.createBrowserWindow(stickyUrl, options, () => {
          try {
            if (win && typeof win.show === 'function') win.show()
          } catch (e) {}
          try {
            if (win && typeof win.setAlwaysOnTop === 'function') {
              if (pin) {
                try { win.setAlwaysOnTop(true, 'floating') } catch (e) {}
                try { win.setAlwaysOnTop(true, 'screen-saver') } catch (e) {}
                try { win.setAlwaysOnTop(true) } catch (e) {}
              }
              else {
                try { win.setAlwaysOnTop(false) } catch (e) {}
                try { win.setAlwaysOnTop(false, 'normal') } catch (e) {}
              }
            }
          } catch (e) {}
        })
        return true
      }
    } catch (e) {}

    try {
      if (remote && remote.BrowserWindow) {
        const win = new remote.BrowserWindow(options)
        try {
          win.loadURL(stickyUrl)
        } catch (e) {}
        win.once('ready-to-show', () => {
          try {
            win.show()
          } catch (e) {}
          try {
            if (pin) win.setAlwaysOnTop(true)
            else {
              try { win.setAlwaysOnTop(false) } catch (e) {}
              try { win.setAlwaysOnTop(false, 'normal') } catch (e) {}
            }
          } catch (e) {}
        })
        return true
      }
    } catch (e) {}

    return false
  },
  // 读文件
  readFile (file) {
    return fs.readFileSync(file, { encoding: 'utf-8' })
  },
  showSaveDialog (options = {}) {
    try {
      if (window.utools && typeof window.utools.showSaveDialog === 'function') {
        const res = window.utools.showSaveDialog(options)
        if (!res) return { canceled: true, filePath: '' }
        return { canceled: false, filePath: res }
      }
    } catch (e) {
      return { canceled: true, filePath: '', error: e.message }
    }
    try {
      if (!remote || !remote.dialog || typeof remote.getCurrentWindow !== 'function') {
        return { canceled: true, filePath: '', error: 'remote 不可用' }
      }
      const win = remote.getCurrentWindow()
      const res = remote.dialog.showSaveDialogSync(win, options)
      if (!res) return { canceled: true, filePath: '' }
      return { canceled: false, filePath: res }
    } catch (e) {
      return { canceled: true, filePath: '', error: e.message }
    }
  },
  showOpenDialog (options = {}) {
    try {
      if (window.utools && typeof window.utools.showOpenDialog === 'function') {
        const res = window.utools.showOpenDialog(options)
        if (!res || !Array.isArray(res) || res.length === 0) return { canceled: true, filePaths: [] }
        return { canceled: false, filePaths: res }
      }
    } catch (e) {
      return { canceled: true, filePaths: [], error: e.message }
    }
    try {
      if (!remote || !remote.dialog || typeof remote.getCurrentWindow !== 'function') {
        return { canceled: true, filePaths: [], error: 'remote 不可用' }
      }
      const win = remote.getCurrentWindow()
      const res = remote.dialog.showOpenDialogSync(win, options)
      if (!res || !Array.isArray(res) || res.length === 0) return { canceled: true, filePaths: [] }
      return { canceled: false, filePaths: res }
    } catch (e) {
      return { canceled: true, filePaths: [], error: e.message }
    }
  },
  writeTextFileToPath (filePath, text, encoding = 'utf-8') {
    fs.writeFileSync(filePath, text, { encoding })
    return filePath
  },
  writeBase64FileToPath (filePath, base64Data) {
    fs.writeFileSync(filePath, base64Data, { encoding: 'base64' })
    return filePath
  },
  // 文本写入到下载目录
  writeTextFile (text) {
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.txt')
    fs.writeFileSync(filePath, text, { encoding: 'utf-8' })
    return filePath
  },
  writeFileToDownloads (fileName, text, encoding = 'utf-8') {
    const safeName = (fileName || '').toString().replace(/[\\/:*?"<>|]/g, '_')
    const filePath = path.join(window.utools.getPath('downloads'), safeName || (Date.now().toString() + '.txt'))
    fs.writeFileSync(filePath, text, { encoding })
    return filePath
  },
  // 图片写入到下载目录
  writeImageFile (base64Url) {
    const matchs = /^data:image\/([a-z]{1,20});base64,/i.exec(base64Url)
    if (!matchs) return
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.' + matchs[1])
    fs.writeFileSync(filePath, base64Url.substring(matchs[0].length), { encoding: 'base64' })
    return filePath
  },
  writeBase64FileToDownloads (fileName, base64Data) {
    const safeName = (fileName || '').toString().replace(/[\\/:*?"<>|]/g, '_')
    const filePath = path.join(window.utools.getPath('downloads'), safeName || (Date.now().toString() + '.bin'))
    fs.writeFileSync(filePath, base64Data, { encoding: 'base64' })
    return filePath
  },
  requestText ({ url, method = 'GET', headers = {}, body = null, timeoutMs = 20000 }) {
    return new Promise((resolve, reject) => {
      try {
        const u = new URL(url)
        const isHttps = u.protocol === 'https:'
        const lib = isHttps ? https : http
        const options = {
          protocol: u.protocol,
          hostname: u.hostname,
          port: u.port || (isHttps ? 443 : 80),
          path: u.pathname + u.search,
          method,
          headers
        }

        const req = lib.request(options, res => {
          const chunks = []
          res.on('data', c => chunks.push(c))
          res.on('end', () => {
            const buf = Buffer.concat(chunks)
            resolve({
              status: res.statusCode || 0,
              headers: res.headers || {},
              body: buf.toString('utf-8')
            })
          })
        })

        req.on('error', err => reject(err))
        req.setTimeout(timeoutMs, () => {
          try { req.destroy(new Error('Request timeout')) } catch (e) {}
        })

        if (body) req.write(body)
        req.end()
      } catch (e) {
        reject(e)
      }
    })
  },
  // 发送邮件
  async sendEmail(config, mailOptions) {
    try {
      // 运行时再次检查并尝试修复，以防被覆盖
      if (typeof setImmediate === 'undefined') {
          global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
      }
      
      const transporter = nodemailer.createTransport(config)
      const info = await transporter.sendMail(mailOptions)
      return { success: true, info }
    } catch (error) {
      console.error('Email Error:', error);
      return { success: false, error: error.message }
    }
  }
}
