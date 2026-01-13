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
      const win = remote.getCurrentWindow()
      win.setAlwaysOnTop(flag)
    } catch (e) {
      console.error('setAlwaysOnTop failed', e)
    }
  },
  // 读文件
  readFile (file) {
    return fs.readFileSync(file, { encoding: 'utf-8' })
  },
  // 文本写入到下载目录
  writeTextFile (text) {
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.txt')
    fs.writeFileSync(filePath, text, { encoding: 'utf-8' })
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
