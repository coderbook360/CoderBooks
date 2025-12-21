# VSCode Vim 最佳实践速查指南

本文档整理自《VSCode Vim 10x 效率指南》全书核心内容，帮助你快速掌握 VSCode Vim 的精髓。

---

## 一、核心配置

### 1.1 基础 settings.json 配置

```json
{
  "vim.easymotion": true,
  "vim.sneak": true,
  "vim.surround": true,
  "vim.incsearch": true,
  "vim.hlsearch": true,
  "vim.useSystemClipboard": true,
  "vim.leader": "<space>",
  
  "vim.handleKeys": {
    "<C-d>": true,
    "<C-u>": true,
    "<C-f>": false,
    "<C-b>": false,
    "<C-w>": true,
    "<C-c>": false,
    "<C-v>": false,
    "<C-a>": false,
    "<C-x>": false
  }
}
```

**配置说明**：
- `<C-d>/<C-u>`：交给 Vim 处理（半页滚动）
- `<C-f>/<C-b>`：交给 VSCode 处理（搜索/侧边栏）
- `<C-c>/<C-v>`：交给系统处理（复制/粘贴）

### 1.2 中文输入法自动切换

```json
{
  "vim.autoSwitchInputMethod.enable": true,
  "vim.autoSwitchInputMethod.defaultIM": "1033",
  "vim.autoSwitchInputMethod.obtainIMCmd": "im-select.exe",
  "vim.autoSwitchInputMethod.switchIMCmd": "im-select.exe {im}"
}
```

### 1.3 模式视觉提示

```json
{
  "vim.statusBarColorControl": true,
  "vim.statusBarColors.normal": "#007ACC",
  "vim.statusBarColors.insert": "#E51400",
  "vim.statusBarColors.visual": "#68217A",

  "vim.cursorStylePerMode.normal": "block",
  "vim.cursorStylePerMode.insert": "line",
  "vim.cursorStylePerMode.visual": "block"
}
```

---

## 二、Vim 核心思维：操作符 + 文本对象

### 2.1 语法公式

```
操作符 + 动作/文本对象 = 编辑命令
```

### 2.2 核心操作符

| 操作符 | 功能 | 示例 |
|--------|------|------|
| `d` | 删除 | `dw` 删除到词尾 |
| `c` | 修改（删除+进入Insert） | `ciw` 修改单词 |
| `y` | 复制 | `yy` 复制整行 |
| `v` | 选择 | `viw` 选中单词 |
| `>` / `<` | 缩进 | `>>` 当前行缩进 |

### 2.3 核心文本对象

| 文本对象 | inner (`i`) | around (`a`) |
|----------|-------------|--------------|
| 单词 | `iw` | `aw` |
| 引号 `"` | `i"` | `a"` |
| 括号 `()` | `i(` 或 `ib` | `a(` 或 `ab` |
| 花括号 `{}` | `i{` 或 `iB` | `a{` 或 `aB` |
| 标签 | `it` | `at` |
| 段落 | `ip` | `ap` |

### 2.4 黄金组合速查

| 命令 | 效果 | 场景 |
|------|------|------|
| `ciw` | 修改单词 | 重命名变量 |
| `ci"` | 修改引号内容 | 修改字符串 |
| `ci(` | 修改括号内容 | 修改函数参数 |
| `cit` | 修改标签内容 | 修改 HTML/JSX |
| `da"` | 删除整个字符串 | 移除属性 |
| `dit` | 删除标签内容 | 清空元素 |
| `yip` | 复制段落 | 复制代码块 |
| `>i{` | 花括号内增加缩进 | 格式化代码 |

**黄金法则**：
- **修改用 `i`**（保留结构）
- **删除用 `a`**（完全移除）

---

## 三、高效移动

### 3.1 基础移动

| 命令 | 效果 |
|------|------|
| `w` / `b` / `e` | 词首/上一词/词尾 |
| `0` / `^` / `$` | 行首/首字符/行尾 |
| `gg` / `G` | 文件首/文件尾 |
| `{` / `}` | 上/下一段落 |
| `Ctrl+D/U` | 半页下/上滚动 |
| `f{char}` / `t{char}` | 跳到字符/字符前 |

### 3.2 EasyMotion（屏幕内闪电跳转）

| 命令 | 效果 |
|------|------|
| `<leader><leader>w` | 跳转到后面的词首 |
| `<leader><leader>b` | 跳转到前面的词首 |
| `<leader><leader>j` | 跳转到下面某行 |
| `<leader><leader>s{char}` | 搜索字符并跳转 |

**简化配置**：
```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    { "before": ["s"], "after": ["<leader>", "<leader>", "s"] }
  ]
}
```

### 3.3 代码跳转

| 命令 | 效果 |
|------|------|
| `gd` | 跳转到定义 |
| `gD` | 跳转到声明 |
| `gr` | 查看所有引用 |
| `gi` | 跳转到实现 |
| `Ctrl+O` | 返回上一个位置 |
| `Ctrl+I` | 前进到下一个位置 |

---

## 四、点命令：重复的艺术

### 4.1 核心原则

`.` 命令重复上一次**修改操作**。设计可重复的原子操作：

```
低效：i → 删除 → 输入 → Esc
高效：ciw → 输入 → Esc → . 重复
```

### 4.2 cgn 模式（搜索+修改+重复）

```
1. /pattern 搜索
2. cgn 修改当前匹配
3. 输入新内容 → Esc
4. . 自动跳到下一个匹配并替换
5. n 跳过当前匹配
```

**优势**：选择性替换，比 `:%s` 更灵活。

### 4.3 经典场景

| 场景 | 操作 |
|------|------|
| 批量加分号 | `A;Esc` → `j.` 重复 |
| 批量改变量名 | `/name` → `cgn新名Esc` → `.` 重复 |
| 批量添加前缀 | `I前缀Esc` → `j.` 重复 |

---

## 五、多光标编辑

### 5.1 创建多光标

| 方法 | 命令 |
|------|------|
| 选择下一个相同词 | `gb` 或 `Ctrl+D` |
| 选择所有相同词 | `Ctrl+Shift+L` |
| 上下添加光标 | `Ctrl+Alt+↑/↓` |
| 每行末尾添加光标 | `V` 选多行 → `Ctrl+Shift+L` |

### 5.2 Visual Block 批量编辑

```
1. Ctrl+V 进入块可视模式
2. j/k 选择多行
3. I（大写）在每行开头插入
4. 输入内容 → Escape
5. 所有行同时添加
```

---

## 六、Vim Surround

### 6.1 核心操作

| 命令 | 效果 |
|------|------|
| `cs"'` | 将 `"` 改为 `'` |
| `ds"` | 删除双引号 |
| `ysiw"` | 给单词加双引号 |
| `ysiw<div>` | 用 `<div>` 包裹单词 |
| `S<tag>` | Visual 模式下用标签包裹 |

### 6.2 常用场景

```javascript
// cs"' → "hello" 变成 'hello'
// ysiw( → word 变成 (word)
// dst → <span>text</span> 变成 text
// cst<div> → 修改外层标签为 div
```

---

## 七、寄存器系统

### 7.1 常用寄存器

| 寄存器 | 说明 |
|--------|------|
| `"a-z` | 命名寄存器 |
| `"+` | 系统剪贴板 |
| `"0` | 最近复制内容（不受删除影响） |
| `"1-9` | 删除历史 |

### 7.2 实用操作

```vim
"ayy    " 复制到寄存器 a
"ap     " 粘贴寄存器 a
"Ayy    " 追加到寄存器 a
"0p     " 粘贴复制内容（忽略删除）
"+yy    " 复制到系统剪贴板
"+p     " 粘贴系统剪贴板
```

---

## 八、搜索与替换

### 8.1 Vim 替换语法

```vim
:[range]s/pattern/replacement/[flags]
```

**常用示例**：
```vim
:%s/old/new/g       " 全局替换
:%s/old/new/gc      " 带确认的替换
:%s/\<word\>/new/g  " 完整单词匹配
:'<,'>s/old/new/g   " 只替换选中区域
```

### 8.2 正则技巧

```vim
" 捕获组交换参数
:%s/func(\(\w\+\), \(\w\+\))/func(\2, \1)/g
```

---

## 九、Leader 键命令体系

### 9.1 推荐键位设计

```json
{
  "vim.leader": "<space>",
  "vim.normalModeKeyBindingsNonRecursive": [
    // 文件操作 (f = file)
    { "before": ["<leader>", "f", "f"], "commands": ["workbench.action.quickOpen"] },
    { "before": ["<leader>", "f", "r"], "commands": ["workbench.action.openRecent"] },
    { "before": ["<leader>", "f", "s"], "commands": ["workbench.action.files.save"] },
    
    // 窗口操作 (w = window)
    { "before": ["<leader>", "v"], "commands": ["workbench.action.splitEditorRight"] },
    { "before": ["<leader>", "s"], "commands": ["workbench.action.splitEditorDown"] },
    { "before": ["<leader>", "w", "q"], "commands": ["workbench.action.closeActiveEditor"] },
    
    // Git 操作 (g = git)
    { "before": ["<leader>", "g", "s"], "commands": ["workbench.view.scm"] },
    { "before": ["<leader>", "g", "c"], "commands": ["git.commit"] },
    { "before": ["<leader>", "g", "p"], "commands": ["git.push"] },
    { "before": ["<leader>", "g", "a"], "commands": ["git.stage"] },
    
    // 代码操作 (c = code)
    { "before": ["<leader>", "c", "a"], "commands": ["editor.action.quickFix"] },
    { "before": ["<leader>", "c", "r"], "commands": ["editor.action.refactor"] },
    { "before": ["<leader>", "c", "f"], "commands": ["editor.action.formatDocument"] },
    { "before": ["<leader>", "o", "i"], "commands": ["editor.action.organizeImports"] },
    
    // 诊断导航
    { "before": ["]", "d"], "commands": ["editor.action.marker.nextInFiles"] },
    { "before": ["[", "d"], "commands": ["editor.action.marker.prevInFiles"] },
    
    // 变更导航
    { "before": ["]", "c"], "commands": ["workbench.action.editor.nextChange"] },
    { "before": ["[", "c"], "commands": ["workbench.action.editor.previousChange"] },
    
    // 终端
    { "before": ["<leader>", "t", "t"], "commands": ["workbench.action.terminal.toggleTerminal"] },
    { "before": ["<leader>", "t", "n"], "commands": ["workbench.action.terminal.new"] }
  ]
}
```

### 9.2 助记符设计

| 前缀 | 含义 | 示例 |
|------|------|------|
| `f` | file | `ff` find file, `fr` recent, `fs` save |
| `w` | window | `wv` vertical, `ws` split, `wq` quit |
| `g` | git | `gs` status, `gc` commit, `gp` push |
| `c` | code | `ca` action, `cr` refactor, `cf` format |
| `t` | terminal | `tt` toggle, `tn` new |

---

## 十、窗口与分屏管理

### 10.1 分屏操作

```json
{
  // 创建分屏
  { "before": ["<leader>", "v"], "commands": ["workbench.action.splitEditorRight"] },
  { "before": ["<leader>", "s"], "commands": ["workbench.action.splitEditorDown"] },
  
  // 窗口切换
  { "before": ["<C-h>"], "commands": ["workbench.action.focusLeftGroup"] },
  { "before": ["<C-j>"], "commands": ["workbench.action.focusBelowGroup"] },
  { "before": ["<C-k>"], "commands": ["workbench.action.focusAboveGroup"] },
  { "before": ["<C-l>"], "commands": ["workbench.action.focusRightGroup"] },
  
  // 按编号切换
  { "before": ["<leader>", "1"], "commands": ["workbench.action.focusFirstEditorGroup"] },
  { "before": ["<leader>", "2"], "commands": ["workbench.action.focusSecondEditorGroup"] }
}
```

---

## 十一、前端开发技巧

### 11.1 HTML/JSX 文本对象

| 命令 | 效果 |
|------|------|
| `cit` | 修改标签内容 |
| `dat` | 删除整个标签 |
| `vat` | 选中整个标签 |
| `ci"` | 修改属性值 |
| `ci{` | 修改 JSX 表达式 |

### 11.2 常用代码片段

**React 函数组件**：
```json
{
  "prefix": "rfc",
  "body": [
    "interface ${1:Name}Props {",
    "  $2",
    "}",
    "",
    "export function ${1:Name}({ $3 }: ${1:Name}Props) {",
    "  return (",
    "    <div>$0</div>",
    "  );",
    "}"
  ]
}
```

**useState Hook**：
```json
{
  "prefix": "ust",
  "body": "const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState<${2:type}>(${3:initial});"
}
```

### 11.3 Emmet 配置

```json
{
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact"
  },
  "emmet.triggerExpansionOnTab": true
}
```

---

## 十二、常见陷阱与最佳实践

### 12.1 移动陷阱

| ❌ 错误 | ✅ 正确 |
|--------|--------|
| `jjjjjjjj` 移动 8 行 | `8j` 直接跳 |
| `llllll` 逐字符移动 | `f(` 跳到括号 |
| 不用 `w/b/e` | 按词移动更高效 |

### 12.2 编辑陷阱

| ❌ 错误 | ✅ 正确 |
|--------|--------|
| `v` + 移动 + 选中 + `d` | `diw` 直接删除词 |
| 重复相同操作多次输入 | `ciw` + `.` 重复 |
| 手动选中整行 | `V` 或 `yy`/`dd` |

### 12.3 搜索陷阱

| ❌ 错误 | ✅ 正确 |
|--------|--------|
| 每次输入 `/pattern` | `*` 搜索当前词 |
| 搜索后逐个 `ciw` | `cgn` + `.` 重复 |

### 12.4 配置陷阱

| ❌ 错误 | ✅ 正确 |
|--------|--------|
| 复制大量未理解的配置 | 逐条添加，理解每条作用 |
| 为每个操作创建映射 | 只为高频操作创建映射 |
| 禁用太多 VSCode 功能 | 保留有用的原生功能 |

### 12.5 模式陷阱

| ❌ 错误 | ✅ 正确 |
|--------|--------|
| 在 Insert 模式停留太久 | 完成输入立即 `Esc` |
| 不知道当前模式 | 配置光标/状态栏提示 |
| 只用 `v` 选择 | 善用 `V` 行选和 `Ctrl+V` 块选 |

---

## 十三、性能优化

### 13.1 基础优化

```json
{
  // 禁用不需要的功能
  "vim.enableNeovim": false,
  "vim.highlightedyank.enable": false,
  "vim.statusBarColorControl": false,
  
  // 减少渲染开销
  "editor.minimap.enabled": false,
  "editor.renderWhitespace": "none",
  "editor.occurrencesHighlight": "off"
}
```

### 13.2 合理设置超时

```json
{
  "vim.timeout": true,
  "vim.timeoutLen": 300
}
```

---

## 十四、快速入门检查清单

### 第一周：基础

- [ ] 安装 VSCode Vim 插件
- [ ] 配置基础 settings.json
- [ ] 掌握 `hjkl` + `w/b/e` + `0/$` 移动
- [ ] 熟练使用 `dd`、`yy`、`p`
- [ ] 掌握 `ciw`、`diw`、`viw`

### 第二周：进阶

- [ ] 掌握 `ci"`、`ci(`、`ci{`、`cit` 文本对象
- [ ] 使用 `.` 命令重复操作
- [ ] 使用 `f/t` 行内跳转
- [ ] 掌握 EasyMotion 基础
- [ ] 配置 Leader 键基础映射

### 第三周：融合

- [ ] 掌握 `gd`、`gr` 代码跳转
- [ ] 使用 `Ctrl+O/I` 跳转历史
- [ ] 掌握 Vim Surround
- [ ] 使用多光标编辑
- [ ] 掌握搜索替换

### 第四周：精通

- [ ] 使用 `cgn` 模式批量修改
- [ ] 掌握寄存器系统
- [ ] 配置完整 Leader 键体系
- [ ] 优化前端开发工作流
- [ ] 完全键盘化 Git 操作

---

## 十五、完整配置模板

### settings.json

```json
{
  // 核心功能
  "vim.easymotion": true,
  "vim.sneak": true,
  "vim.surround": true,
  "vim.incsearch": true,
  "vim.hlsearch": true,
  "vim.useSystemClipboard": true,
  "vim.leader": "<space>",
  
  // 键位处理
  "vim.handleKeys": {
    "<C-d>": true,
    "<C-u>": true,
    "<C-f>": false,
    "<C-b>": false,
    "<C-w>": true,
    "<C-c>": false,
    "<C-v>": false,
    "<C-a>": false,
    "<C-x>": false
  },
  
  // 中文输入法
  "vim.autoSwitchInputMethod.enable": true,
  "vim.autoSwitchInputMethod.defaultIM": "1033",
  "vim.autoSwitchInputMethod.obtainIMCmd": "im-select.exe",
  "vim.autoSwitchInputMethod.switchIMCmd": "im-select.exe {im}",
  
  // 模式提示
  "vim.statusBarColorControl": true,
  "vim.statusBarColors.normal": "#007ACC",
  "vim.statusBarColors.insert": "#E51400",
  "vim.statusBarColors.visual": "#68217A",
  "vim.cursorStylePerMode.normal": "block",
  "vim.cursorStylePerMode.insert": "line",
  "vim.cursorStylePerMode.visual": "block",
  
  // Normal 模式映射
  "vim.normalModeKeyBindingsNonRecursive": [
    // 快速退出
    { "before": ["j", "k"], "after": ["<Esc>"] },
    
    // 文件操作
    { "before": ["<leader>", "f", "f"], "commands": ["workbench.action.quickOpen"] },
    { "before": ["<leader>", "f", "r"], "commands": ["workbench.action.openRecent"] },
    { "before": ["<leader>", "f", "s"], "commands": ["workbench.action.files.save"] },
    
    // 窗口操作
    { "before": ["<leader>", "v"], "commands": ["workbench.action.splitEditorRight"] },
    { "before": ["<leader>", "s"], "commands": ["workbench.action.splitEditorDown"] },
    { "before": ["<C-h>"], "commands": ["workbench.action.focusLeftGroup"] },
    { "before": ["<C-j>"], "commands": ["workbench.action.focusBelowGroup"] },
    { "before": ["<C-k>"], "commands": ["workbench.action.focusAboveGroup"] },
    { "before": ["<C-l>"], "commands": ["workbench.action.focusRightGroup"] },
    
    // Git 操作
    { "before": ["<leader>", "g", "s"], "commands": ["workbench.view.scm"] },
    { "before": ["<leader>", "g", "c"], "commands": ["git.commit"] },
    { "before": ["<leader>", "g", "p"], "commands": ["git.push"] },
    { "before": ["<leader>", "g", "a"], "commands": ["git.stage"] },
    
    // 代码操作
    { "before": ["<leader>", "c", "a"], "commands": ["editor.action.quickFix"] },
    { "before": ["<leader>", "c", "r"], "commands": ["editor.action.refactor"] },
    { "before": ["<leader>", "c", "f"], "commands": ["editor.action.formatDocument"] },
    { "before": ["g", "d"], "commands": ["editor.action.revealDefinition"] },
    { "before": ["g", "r"], "commands": ["editor.action.goToReferences"] },
    
    // 诊断导航
    { "before": ["]", "d"], "commands": ["editor.action.marker.nextInFiles"] },
    { "before": ["[", "d"], "commands": ["editor.action.marker.prevInFiles"] },
    { "before": ["]", "c"], "commands": ["workbench.action.editor.nextChange"] },
    { "before": ["[", "c"], "commands": ["workbench.action.editor.previousChange"] },
    
    // 终端
    { "before": ["<leader>", "t", "t"], "commands": ["workbench.action.terminal.toggleTerminal"] },
    
    // EasyMotion 简化
    { "before": ["s"], "after": ["<leader>", "<leader>", "s"] }
  ],
  
  // Insert 模式映射
  "vim.insertModeKeyBindings": [
    { "before": ["j", "k"], "after": ["<Esc>"] }
  ],
  
  // Visual 模式映射
  "vim.visualModeKeyBindingsNonRecursive": [
    { "before": ["<leader>", "y"], "after": ["\"", "+", "y"] },
    { "before": ["p"], "after": ["\"", "_", "d", "P"] }
  ]
}
```

---

## 结语

VSCode Vim 的学习曲线虽然陡峭，但一旦掌握，效率提升是实实在在的。记住：

1. **渐进式学习**：不要试图一次掌握所有命令
2. **高频优先**：先掌握最常用的 20% 命令
3. **肌肉记忆**：多练习，让操作成为本能
4. **融合使用**：结合 VSCode 和 Vim 的优势

**从今天开始，每天学会一个新技巧，一个月后你的编码效率将质的飞跃！**
