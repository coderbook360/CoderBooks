# 章节写作指导：键盘事件与快捷键

## 1. 章节信息

- **章节标题**: 键盘事件与快捷键
- **文件名**: interaction/keyboard-events.md
- **所属部分**: 第五部分：事件与交互
- **预计阅读时间**: 25分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解键盘事件的类型和属性
- 掌握修饰键（Ctrl, Shift, Alt）的处理
- 理解焦点管理对键盘事件的影响
- 掌握快捷键系统的设计模式

### 技能目标
- 能够监听和处理键盘事件
- 能够实现常用快捷键功能
- 能够设计可扩展的快捷键系统
- 能够处理快捷键冲突

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **键盘事件** | keydown, keyup, keypress（已废弃） |
| **event.key** | 按键的字符值，如 'a', 'Enter', 'ArrowUp' |
| **event.code** | 按键的物理位置码，如 'KeyA', 'Enter' |
| **修饰键** | ctrlKey, shiftKey, altKey, metaKey |

### 关键知识点

- keydown vs keyup 的使用场景
- key vs code 的区别和选择
- 修饰键组合检测
- 阻止默认行为（如 Ctrl+S）
- Canvas 焦点与 tabIndex
- 快捷键注册与分发

### 边界与限制

- 某些系统快捷键无法覆盖
- 焦点管理影响事件接收
- 不同键盘布局的差异

## 4. 写作要求

### 开篇方式
从用户体验角度引入：专业的图形编辑器都有丰富的快捷键支持——Ctrl+Z 撤销、Delete 删除、方向键微调位置。键盘交互能大大提高操作效率。

### 结构组织

```
1. 键盘事件基础
   - 事件类型
   - 事件对象属性
   - key vs code
   
2. 事件监听设置
   - 绑定位置选择
   - Canvas 焦点管理
   - tabIndex 属性
   
3. 修饰键处理
   - 检测修饰键
   - 组合键实现
   - 跨平台考虑（Ctrl vs Cmd）
   
4. 常见快捷键实现
   - 删除（Delete/Backspace）
   - 全选（Ctrl+A）
   - 撤销/重做（Ctrl+Z/Y）
   - 方向键移动
   
5. 快捷键系统设计
   - 注册机制
   - 优先级处理
   - 冲突解决
   - 可配置性
   
6. 阻止默认行为
   - 何时阻止
   - 如何阻止
   - 注意事项
   
7. 本章小结
```

### 代码示例

1. **基本键盘事件监听**
2. **修饰键组合检测**
3. **方向键移动对象**
4. **快捷键管理器类**
5. **跨平台修饰键处理**
6. **完整快捷键系统**

### 图表需求

- **键盘事件流程图**：展示事件捕获和冒泡
- **常用快捷键表**：列出图形编辑器常用快捷键

## 5. 技术细节

### 实现要点

```javascript
// Canvas 焦点设置
const canvas = document.getElementById('canvas');
canvas.tabIndex = 1;  // 使 Canvas 可获得焦点
canvas.focus();  // 设置初始焦点

// 基本键盘事件
canvas.addEventListener('keydown', (e) => {
  console.log('Key:', e.key);
  console.log('Code:', e.code);
  console.log('Modifiers:', {
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
    meta: e.metaKey
  });
});

// 跨平台修饰键
function isCommandKey(e) {
  // Mac 使用 Cmd，Windows/Linux 使用 Ctrl
  return e.metaKey || e.ctrlKey;
}

// 快捷键管理器
class ShortcutManager {
  constructor(target) {
    this.target = target;
    this.shortcuts = new Map();
    
    target.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }
  
  // 注册快捷键
  register(shortcut, handler, options = {}) {
    const key = this.normalizeShortcut(shortcut);
    this.shortcuts.set(key, { handler, ...options });
  }
  
  // 注销快捷键
  unregister(shortcut) {
    const key = this.normalizeShortcut(shortcut);
    this.shortcuts.delete(key);
  }
  
  // 标准化快捷键字符串
  normalizeShortcut(shortcut) {
    return shortcut.toLowerCase()
      .replace(/cmd|command/g, 'meta')
      .replace(/\s+/g, '');
  }
  
  // 从事件生成快捷键字符串
  eventToShortcut(e) {
    const parts = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    if (e.metaKey) parts.push('meta');
    
    // 添加主键
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      parts.push(e.key.toLowerCase());
    }
    
    return parts.join('+');
  }
  
  handleKeyDown(e) {
    const shortcut = this.eventToShortcut(e);
    const binding = this.shortcuts.get(shortcut);
    
    if (binding) {
      e.preventDefault();
      binding.handler(e);
    }
  }
}

// 使用示例
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
shortcuts.register('ctrl+y', () => {
  editor.redo();
});
shortcuts.register('ctrl+shift+z', () => {
  editor.redo();  // Mac 风格
});

// 全选
shortcuts.register('ctrl+a', () => {
  editor.selectAll();
});

// 方向键移动
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
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| Canvas 无法接收键盘事件 | 设置 tabIndex 并 focus |
| Ctrl+S 触发浏览器保存 | 使用 e.preventDefault() |
| Mac 上 Ctrl 不工作 | 同时支持 Ctrl 和 Meta 键 |
| 快捷键冲突 | 设计优先级机制 |

## 6. 风格指导

### 语气语调
- 注重实用性和可扩展性
- 强调跨平台兼容

### 类比方向
- 快捷键系统类比"电话总机"
- 修饰键类比"功能键"

## 7. 与其他章节的关系

### 前置依赖
- 第20章：事件绑定与坐标计算

### 后续章节铺垫
- 为第44章"撤销重做系统"提供快捷键支持
- 为第45章"剪贴板操作"提供快捷键支持

## 8. 章节检查清单

- [ ] 目标明确：读者能实现快捷键系统
- [ ] 术语统一：键盘事件、修饰键等术语定义清晰
- [ ] 最小实现：提供快捷键管理器代码
- [ ] 边界处理：说明焦点和跨平台问题
- [ ] 性能与权衡：无特殊性能考虑
- [ ] 图示与代码：快捷键表与代码对应
- [ ] 总结与练习：提供快捷键实现练习
