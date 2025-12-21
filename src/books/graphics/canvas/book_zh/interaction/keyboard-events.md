# 键盘事件与快捷键

首先要问一个问题：如何让你的图形编辑器像专业软件一样，响应键盘操作？

答案是：实现一套完善的键盘事件处理和快捷键系统。想象一下，Photoshop 里的 Delete 删除、Ctrl+Z 撤销、方向键微调位置——这些快捷键极大地提高了操作效率。

---

## 1. 键盘事件基础

### 事件类型

JavaScript 提供了三种键盘事件：
- **keydown**：按键按下时触发，持续按住会重复触发
- **keyup**：按键释放时触发
- **keypress**：已废弃，不推荐使用

绝大多数情况下，我们使用 **keydown** 事件。

```javascript
const canvas = document.getElementById('canvas');

canvas.addEventListener('keydown', (e) => {
  console.log('按下了:', e.key);
  console.log('物理按键:', e.code);
  console.log('修饰键:', {
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
    meta: e.metaKey  // Mac 的 Cmd 键
  });
});
```

### key vs code

现在我要问第二个问题：`e.key` 和 `e.code` 有什么区别？

- **e.key**：按键的"字符值"，会受键盘布局影响
  - 按 A 键：`e.key = 'a'` 或 `'A'`（取决于 Shift）
  - 按 Enter：`e.key = 'Enter'`
  - 按 方向键上：`e.key = 'ArrowUp'`

- **e.code**：按键的"物理位置码"，不受键盘布局影响
  - 按 A 键：`e.code = 'KeyA'`
  - 按 Enter：`e.code = 'Enter'`
  - 按 方向键上：`e.code = 'ArrowUp'`

**选择原则**：
- 处理字符输入时用 `e.key`（如搜索框）
- 处理游戏或编辑器控制时用 `e.code`（如 WASD 移动）

但是有个更实用的建议：对于图形编辑器，**推荐使用 `e.key`**，因为它更符合用户习惯（用户期望按下标着 "A" 的键就触发 A）。

---

## 2. Canvas 焦点管理

### 问题

现在会遇到一个问题：Canvas 元素默认**不能接收键盘事件**！

试试这段代码，你会发现没有任何输出：

```javascript
const canvas = document.getElementById('canvas');
canvas.addEventListener('keydown', (e) => {
  console.log('这不会被触发');
});
```

### 解决方案

要让 Canvas 能接收键盘事件，必须：
1. 设置 `tabIndex` 属性，使其可获得焦点
2. 调用 `focus()` 方法，让它获得焦点

```javascript
const canvas = document.getElementById('canvas');
canvas.tabIndex = 1;  // 任意非负整数
canvas.focus();       // 立即获得焦点

// 现在可以接收键盘事件了
canvas.addEventListener('keydown', (e) => {
  console.log('收到按键:', e.key);
});
```

更稳妥的做法是，当用户点击 Canvas 时自动获取焦点：

```javascript
canvas.addEventListener('mousedown', () => {
  canvas.focus();
});
```

---

## 3. 修饰键处理

### 检测修饰键

修饰键（Ctrl、Shift、Alt、Meta）通常与其他键组合使用。检测它们很简单：

```javascript
canvas.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') {
    console.log('撤销');
  }
  
  if (e.shiftKey && e.key === 'ArrowUp') {
    console.log('大步向上移动');
  }
  
  if (e.altKey && e.key === 'a') {
    console.log('Alt + A 组合');
  }
});
```

### 跨平台考虑

第三个问题来了：Mac 用户习惯用 **Cmd**，Windows/Linux 用户习惯用 **Ctrl**。如何兼容？

答案是：同时检测 `e.ctrlKey` 和 `e.metaKey`。

```javascript
function isCommandKey(e) {
  // Mac 上是 Cmd，其他平台是 Ctrl
  return e.metaKey || e.ctrlKey;
}

canvas.addEventListener('keydown', (e) => {
  if (isCommandKey(e) && e.key === 'z') {
    console.log('撤销（跨平台）');
    e.preventDefault();
  }
});
```

---

## 4. 常见快捷键实现

### 删除对象

```javascript
canvas.addEventListener('keydown', (e) => {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    editor.deleteSelected();
    e.preventDefault();  // 阻止 Backspace 的默认后退行为
  }
});
```

### 全选

```javascript
canvas.addEventListener('keydown', (e) => {
  if (isCommandKey(e) && e.key === 'a') {
    editor.selectAll();
    e.preventDefault();  // 阻止浏览器的全选文本
  }
});
```

### 撤销/重做

```javascript
canvas.addEventListener('keydown', (e) => {
  if (isCommandKey(e) && e.key === 'z') {
    if (e.shiftKey) {
      editor.redo();  // Ctrl+Shift+Z 重做
    } else {
      editor.undo();  // Ctrl+Z 撤销
    }
    e.preventDefault();
  }
  
  if (isCommandKey(e) && e.key === 'y') {
    editor.redo();  // Ctrl+Y 也是重做
    e.preventDefault();
  }
});
```

### 方向键移动

```javascript
canvas.addEventListener('keydown', (e) => {
  const step = e.shiftKey ? 10 : 1;  // Shift 大步移动
  
  switch (e.key) {
    case 'ArrowUp':
      editor.moveSelected(0, -step);
      e.preventDefault();
      break;
    case 'ArrowDown':
      editor.moveSelected(0, step);
      e.preventDefault();
      break;
    case 'ArrowLeft':
      editor.moveSelected(-step, 0);
      e.preventDefault();
      break;
    case 'ArrowRight':
      editor.moveSelected(step, 0);
      e.preventDefault();
      break;
  }
});
```

---

## 5. 快捷键系统设计

随着功能增多，直接在事件监听器里写 if-else 会变得混乱。现在要问第四个问题：如何设计一个可扩展的快捷键系统？

答案是：构建一个快捷键管理器。

```javascript
class ShortcutManager {
  constructor(target) {
    this.target = target;
    this.shortcuts = new Map();
    
    target.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }
  
  // 注册快捷键
  register(shortcut, handler, options = {}) {
    const key = this.normalizeShortcut(shortcut);
    this.shortcuts.set(key, { 
      handler, 
      preventDefault: options.preventDefault !== false  // 默认阻止默认行为
    });
  }
  
  // 注销快捷键
  unregister(shortcut) {
    const key = this.normalizeShortcut(shortcut);
    this.shortcuts.delete(key);
  }
  
  // 标准化快捷键字符串
  normalizeShortcut(shortcut) {
    // "Ctrl+Z" -> "ctrl+z"
    // "Cmd+Shift+A" -> "meta+shift+a"
    return shortcut.toLowerCase()
      .replace(/cmd|command/g, 'meta')
      .replace(/\s+/g, '');
  }
  
  // 从事件生成快捷键字符串
  eventToShortcut(e) {
    const parts = [];
    
    // 按固定顺序添加修饰键
    if (e.ctrlKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    if (e.metaKey) parts.push('meta');
    
    // 添加主键（排除修饰键本身）
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      parts.push(e.key.toLowerCase());
    }
    
    return parts.join('+');
  }
  
  handleKeyDown(e) {
    const shortcut = this.eventToShortcut(e);
    const binding = this.shortcuts.get(shortcut);
    
    if (binding) {
      if (binding.preventDefault) {
        e.preventDefault();
      }
      binding.handler(e);
    }
  }
}
```

### 使用示例

```javascript
const canvas = document.getElementById('canvas');
canvas.tabIndex = 1;
canvas.focus();

const shortcuts = new ShortcutManager(canvas);

// 删除
shortcuts.register('delete', () => {
  editor.deleteSelected();
});
shortcuts.register('backspace', () => {
  editor.deleteSelected();
});

// 撤销/重做
shortcuts.register('ctrl+z', () => {
  editor.undo();
});
shortcuts.register('ctrl+shift+z', () => {
  editor.redo();
});
shortcuts.register('ctrl+y', () => {
  editor.redo();
});

// 全选
shortcuts.register('ctrl+a', () => {
  editor.selectAll();
});

// 复制粘贴
shortcuts.register('ctrl+c', () => {
  editor.copy();
});
shortcuts.register('ctrl+v', () => {
  editor.paste();
});
shortcuts.register('ctrl+x', () => {
  editor.cut();
});

// 方向键
shortcuts.register('arrowup', () => {
  editor.moveSelected(0, -1);
});
shortcuts.register('arrowdown', () => {
  editor.moveSelected(0, 1);
});
shortcuts.register('arrowleft', () => {
  editor.moveSelected(-1, 0);
});
shortcuts.register('arrowright', () => {
  editor.moveSelected(1, 0);
});

// Shift + 方向键大步移动
shortcuts.register('shift+arrowup', () => {
  editor.moveSelected(0, -10);
});
shortcuts.register('shift+arrowdown', () => {
  editor.moveSelected(0, 10);
});
shortcuts.register('shift+arrowleft', () => {
  editor.moveSelected(-10, 0);
});
shortcuts.register('shift+arrowright', () => {
  editor.moveSelected(10, 0);
});

// ESC 取消选择
shortcuts.register('escape', () => {
  editor.clearSelection();
});
```

---

## 6. 快捷键冲突与优先级

有时会遇到冲突，比如：
- 全局快捷键 vs 局部快捷键
- 输入框获得焦点时不应触发 Canvas 快捷键

```javascript
class SmartShortcutManager extends ShortcutManager {
  handleKeyDown(e) {
    // 如果焦点在输入框，不处理快捷键
    const target = e.target;
    if (target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable) {
      return;
    }
    
    super.handleKeyDown(e);
  }
  
  // 添加优先级支持
  register(shortcut, handler, options = {}) {
    const key = this.normalizeShortcut(shortcut);
    const priority = options.priority || 0;  // 默认优先级 0
    
    const existing = this.shortcuts.get(key);
    if (existing && existing.priority > priority) {
      console.warn(`快捷键 ${shortcut} 已被更高优先级占用`);
      return;
    }
    
    this.shortcuts.set(key, { 
      handler, 
      priority,
      preventDefault: options.preventDefault !== false
    });
  }
}
```

---

## 7. 阻止默认行为

第五个问题：什么时候应该调用 `e.preventDefault()`？

答案是：**几乎总是**。大多数编辑器快捷键都与浏览器默认行为冲突：
- **Ctrl+S**：浏览器保存页面 → 应该保存项目
- **Ctrl+P**：浏览器打印 → 可能是其他功能
- **Backspace**：浏览器后退 → 应该删除对象
- **Space**：浏览器滚动 → 可能是切换工具

但是有个例外：**Ctrl+W**（关闭标签页）和 **Ctrl+T**（新标签页）等系统级快捷键，浏览器会忽略 preventDefault()。

```javascript
canvas.addEventListener('keydown', (e) => {
  // 这些快捷键一般都要阻止默认行为
  if (e.ctrlKey || e.metaKey) {
    if (['s', 'p', 'z', 'y', 'a', 'c', 'v', 'x'].includes(e.key)) {
      e.preventDefault();
    }
  }
  
  // 方向键和空格也要阻止（防止页面滚动）
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
});
```

---

## 8. 可配置快捷键

进阶功能：允许用户自定义快捷键。

```javascript
class ConfigurableShortcutManager extends ShortcutManager {
  constructor(target, config = {}) {
    super(target);
    this.config = this.loadConfig(config);
    this.registerFromConfig();
  }
  
  loadConfig(config) {
    // 默认配置
    const defaults = {
      delete: 'delete',
      undo: 'ctrl+z',
      redo: 'ctrl+shift+z',
      selectAll: 'ctrl+a',
      copy: 'ctrl+c',
      paste: 'ctrl+v',
      cut: 'ctrl+x'
    };
    
    return { ...defaults, ...config };
  }
  
  registerFromConfig() {
    // 根据配置注册快捷键
    this.register(this.config.delete, () => editor.deleteSelected());
    this.register(this.config.undo, () => editor.undo());
    this.register(this.config.redo, () => editor.redo());
    this.register(this.config.selectAll, () => editor.selectAll());
    this.register(this.config.copy, () => editor.copy());
    this.register(this.config.paste, () => editor.paste());
    this.register(this.config.cut, () => editor.cut());
  }
  
  updateShortcut(action, newShortcut) {
    // 注销旧快捷键
    this.unregister(this.config[action]);
    
    // 更新配置
    this.config[action] = newShortcut;
    
    // 注册新快捷键
    this.registerFromConfig();
    
    // 保存到 localStorage
    localStorage.setItem('shortcuts', JSON.stringify(this.config));
  }
}

// 使用
const savedConfig = JSON.parse(localStorage.getItem('shortcuts') || '{}');
const shortcuts = new ConfigurableShortcutManager(canvas, savedConfig);

// 用户可以修改快捷键
document.getElementById('changeUndo').addEventListener('click', () => {
  const newShortcut = prompt('输入新的撤销快捷键', 'ctrl+z');
  shortcuts.updateShortcut('undo', newShortcut);
});
```

---

## 9. 快捷键提示 UI

为了让用户知道有哪些快捷键，可以显示帮助面板：

```javascript
class ShortcutHelper {
  constructor(shortcuts) {
    this.shortcuts = shortcuts;
    this.createHelpPanel();
  }
  
  createHelpPanel() {
    this.panel = document.createElement('div');
    this.panel.className = 'shortcut-help';
    this.panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: none;
      max-height: 80vh;
      overflow-y: auto;
    `;
    
    document.body.appendChild(this.panel);
    
    // ? 键显示帮助
    document.addEventListener('keydown', (e) => {
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        this.toggle();
      }
      if (e.key === 'Escape') {
        this.hide();
      }
    });
  }
  
  show() {
    this.updateContent();
    this.panel.style.display = 'block';
  }
  
  hide() {
    this.panel.style.display = 'none';
  }
  
  toggle() {
    if (this.panel.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }
  
  updateContent() {
    const html = `
      <h2>快捷键列表</h2>
      <table>
        <tr><th>功能</th><th>快捷键</th></tr>
        ${Array.from(this.shortcuts.shortcuts.entries())
          .map(([key, binding]) => `
            <tr>
              <td>${this.getFunctionName(binding)}</td>
              <td><kbd>${this.formatShortcut(key)}</kbd></td>
            </tr>
          `).join('')}
      </table>
      <p><small>按 ESC 或 ? 键关闭</small></p>
    `;
    this.panel.innerHTML = html;
  }
  
  formatShortcut(shortcut) {
    // "ctrl+shift+z" -> "Ctrl + Shift + Z"
    return shortcut.split('+')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' + ');
  }
  
  getFunctionName(binding) {
    // 尝试从函数名推断功能
    return binding.handler.name || '未知功能';
  }
}

// 使用
const helper = new ShortcutHelper(shortcuts);
```

---

## 本章小结

键盘交互是图形编辑器效率的关键：
- **焦点管理**：设置 `tabIndex` 和 `focus()`，让 Canvas 能接收键盘事件
- **修饰键**：用 `e.ctrlKey`、`e.shiftKey` 等检测，注意跨平台处理（Ctrl vs Cmd）
- **快捷键系统**：构建可扩展的 ShortcutManager，统一管理所有快捷键
- **阻止默认行为**：几乎所有编辑器快捷键都应调用 `e.preventDefault()`

掌握这些技术后，你的编辑器就能像专业软件一样响应快捷键了。这些快捷键会在第44章（撤销重做系统）和第45章（剪贴板操作）中发挥重要作用。
