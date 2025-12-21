# 键盘布局优化

优化键盘设置，让 Vim 操作更舒适高效。

## Caps Lock 重映射

### 为什么要重映射 Caps Lock

Caps Lock 位置极佳但几乎没用。把它改成 Escape 或 Ctrl，大幅提升 Vim 体验。

### 方案 1：Caps Lock → Escape

最简单的方案，按 Caps Lock 就是 Escape。

**Windows**（使用 PowerToys）:

```
1. 安装 Microsoft PowerToys
2. 打开 Keyboard Manager
3. Remap keys
4. Caps Lock → Escape
```

**Mac**:

```
系统偏好设置 → 键盘 → 修饰键 → Caps Lock → Escape
```

### 方案 2：Caps Lock → Ctrl（按住）+ Escape（单击）

更高级：按住当 Ctrl，单击当 Escape。

**Windows**（使用 AutoHotkey）:

```autohotkey
; CapsLock_Dual.ahk
*CapsLock::
    Send {Ctrl Down}
    KeyWait, CapsLock
    Send {Ctrl Up}
    if (A_PriorKey = "CapsLock") {
        Send {Escape}
    }
return
```

**Mac**（使用 Karabiner-Elements）:

```json
{
  "description": "CapsLock to Escape on tap, Ctrl on hold",
  "manipulators": [
    {
      "type": "basic",
      "from": {
        "key_code": "caps_lock"
      },
      "to_if_alone": [
        { "key_code": "escape" }
      ],
      "to_if_held_down": [
        { "key_code": "left_control" }
      ]
    }
  ]
}
```

## 配置 jk 退出插入模式

### 基本配置

```json
{
  "vim.insertModeKeyBindings": [
    {
      "before": ["j", "k"],
      "after": ["<Esc>"]
    }
  ]
}
```

快速按 `jk` 退出插入模式。

### 为什么是 jk

- 手指不离开主键区
- 正常输入中很少连续打 jk
- 比按 Escape 快得多

### 注意事项

如果打字时 jk 频繁误触发，可以增加超时：

```json
{
  "vim.insertModeKeyBindingsNonRecursive": [
    {
      "before": ["j", "k"],
      "after": ["<Esc>"]
    }
  ],
  "vim.timeout": true,
  "vim.timeoutLen": 200
}
```

## Leader 键配置

### 默认 Leader

VSCode Vim 默认 leader 键是 `\`（反斜杠）。

### 更改 Leader 键

```json
{
  "vim.leader": "<Space>"
}
```

空格键作为 leader 是流行选择：

- 位置方便（两手大拇指都能按）
- 空间大，容易按
- 不影响正常空格功能（在普通模式空格无默认作用）

### 推荐的 Leader 键

- **Space**：最流行，最方便
- **,**：单手可达，传统选择
- **\**：默认值，位置还行

## 自定义键位映射

### 基本映射

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // H 跳到行首非空字符
    { "before": ["H"], "after": ["^"] },
    // L 跳到行尾
    { "before": ["L"], "after": ["$"] }
  ]
}
```

### 常用自定义

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 快速保存
    { "before": ["<leader>", "w"], "commands": ["workbench.action.files.save"] },
    
    // 快速关闭
    { "before": ["<leader>", "q"], "commands": ["workbench.action.closeActiveEditor"] },
    
    // 清除搜索高亮
    { "before": ["<leader>", "<space>"], "commands": ["editor.action.clearSearchHighlight"] },
    
    // 分屏
    { "before": ["<leader>", "v"], "commands": ["workbench.action.splitEditor"] },
    { "before": ["<leader>", "s"], "commands": ["workbench.action.splitEditorDown"] }
  ]
}
```

## VSCode 键位配置

### keybindings.json

除了 vim 配置，还可以在 VSCode 的 `keybindings.json` 配置：

```json
[
  // 在文件浏览器使用 j/k 导航
  {
    "key": "j",
    "command": "list.focusDown",
    "when": "listFocus && !inputFocus"
  },
  {
    "key": "k",
    "command": "list.focusUp",
    "when": "listFocus && !inputFocus"
  },
  // 在列表中用 o 打开文件
  {
    "key": "o",
    "command": "list.select",
    "when": "listFocus && !inputFocus"
  }
]
```

### 禁用冲突键位

```json
{
  "vim.handleKeys": {
    "<C-a>": false,
    "<C-f>": false
  }
}
```

让这些键使用 VSCode 默认行为。

## 常用键位优化

### 窗口导航

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 窗口切换
    { "before": ["<C-h>"], "commands": ["workbench.action.focusLeftGroup"] },
    { "before": ["<C-l>"], "commands": ["workbench.action.focusRightGroup"] },
    { "before": ["<C-j>"], "commands": ["workbench.action.focusBelowGroup"] },
    { "before": ["<C-k>"], "commands": ["workbench.action.focusAboveGroup"] }
  ]
}
```

### 缓冲区（Tab）导航

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // Tab 切换
    { "before": ["<Tab>"], "commands": ["workbench.action.nextEditor"] },
    { "before": ["<S-Tab>"], "commands": ["workbench.action.previousEditor"] }
  ]
}
```

### 快速访问

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 文件浏览器
    { "before": ["<leader>", "e"], "commands": ["workbench.view.explorer"] },
    // 搜索
    { "before": ["<leader>", "f", "f"], "commands": ["workbench.action.quickOpen"] },
    // 全局搜索
    { "before": ["<leader>", "f", "g"], "commands": ["workbench.action.findInFiles"] },
    // 命令面板
    { "before": ["<leader>", "p"], "commands": ["workbench.action.showCommands"] }
  ]
}
```

## 物理键盘考虑

### 分离式键盘

如果用分离式键盘（如 Ergodox），可以：

- 把 Escape 放在更方便的位置
- 添加专用 leader 键
- 优化修饰键位置

### 60% 键盘

60% 键盘没有 F 键和方向键，确保：

- 配置 Fn 层访问缺失按键
- 或完全使用 Vim 导航

### 机械键盘固件

使用 QMK 固件的键盘可以：

- 配置 tap/hold 双功能
- 添加层切换
- 宏支持

## 优化建议

### 渐进式优化

```
1. 先掌握基本操作
2. 发现痛点
3. 搜索解决方案
4. 添加配置
5. 适应新配置
6. 重复
```

### 不要过度配置

- 只添加真正需要的映射
- 保持配置简单可维护
- 记住你添加的映射

### 形成肌肉记忆

新配置后：

```
1. 有意识地使用新键位
2. 抵制使用旧方式
3. 1-2 周后形成习惯
```

## 完整示例配置

```json
{
  "vim.leader": "<Space>",
  "vim.timeout": true,
  "vim.timeoutLen": 300,
  
  "vim.insertModeKeyBindings": [
    { "before": ["j", "k"], "after": ["<Esc>"] }
  ],
  
  "vim.normalModeKeyBindingsNonRecursive": [
    // 行首行尾
    { "before": ["H"], "after": ["^"] },
    { "before": ["L"], "after": ["$"] },
    
    // 文件操作
    { "before": ["<leader>", "w"], "commands": ["workbench.action.files.save"] },
    { "before": ["<leader>", "q"], "commands": ["workbench.action.closeActiveEditor"] },
    
    // 窗口
    { "before": ["<leader>", "v"], "commands": ["workbench.action.splitEditor"] },
    { "before": ["<C-h>"], "commands": ["workbench.action.focusLeftGroup"] },
    { "before": ["<C-l>"], "commands": ["workbench.action.focusRightGroup"] },
    
    // 搜索
    { "before": ["<leader>", "<space>"], "commands": ["editor.action.clearSearchHighlight"] },
    { "before": ["<leader>", "f"], "commands": ["workbench.action.quickOpen"] },
    { "before": ["<leader>", "p"], "commands": ["workbench.action.showCommands"] }
  ]
}
```

---

**本章收获**：
- ✅ 优化 Caps Lock 键位
- ✅ 配置 jk 退出插入模式
- ✅ 设置合适的 Leader 键
- ✅ 建立个人化的键位系统

**效率提升**：键位优化让操作更符合人体工程学，减少手指移动，提高输入舒适度。
