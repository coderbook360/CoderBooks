# settings.json 效率优化配置

默认的 VSCode Vim 配置只是起点。通过精心调整 settings.json，你可以将编辑效率再提升 30-50%。

本章将详解所有关键配置项，提供经过实战检验的最优配置方案。

## 配置文件位置

settings.json 是 VSCode 的用户配置文件，有两种打开方式：

**方式一：命令面板**

按 `Ctrl+Shift+P`，输入 `Preferences: Open User Settings (JSON)`

**方式二：快捷键**

先按 `Ctrl+,` 打开设置界面，再点击右上角的"打开设置(JSON)"图标

## 核心配置详解

### 剪贴板集成

```json
{
  "vim.useSystemClipboard": true
}
```

这是最重要的配置之一。启用后，Vim 的 `y`（复制）和 `p`（粘贴）命令将直接使用系统剪贴板。

为什么重要？因为你经常需要：
- 从浏览器复制代码，到 VSCode 中粘贴
- 从 VSCode 复制代码，到 Slack 或文档中粘贴

如果不启用，Vim 会使用自己的寄存器系统，与系统剪贴板隔离，非常不便。

### 搜索优化

```json
{
  "vim.hlsearch": true,
  "vim.incsearch": true,
  "vim.ignorecase": true,
  "vim.smartcase": true
}
```

这四个配置协同工作：

- `hlsearch`：搜索结果高亮显示，让你清楚看到所有匹配
- `incsearch`：输入搜索词时实时高亮，边输入边看到结果
- `ignorecase`：搜索时忽略大小写，`/hello` 可以匹配 `Hello`
- `smartcase`：如果搜索词包含大写，则精确匹配大小写。`/Hello` 只匹配 `Hello`，不匹配 `hello`

`ignorecase` 和 `smartcase` 的组合非常实用——大多数时候你不关心大小写，但当你明确输入大写时，系统知道你在意。

### Leader 键

```json
{
  "vim.leader": "<space>"
}
```

Leader 键是 Vim 高级用法的核心。它作为自定义命令的前缀，让你可以创建大量不冲突的快捷键。

为什么推荐空格键？

1. 空格是最大的键，容易按到
2. 在 Normal 模式下，空格默认只是向前移动一格，功能较弱
3. 双手都能轻松触及
4. Spacemacs、Doom Emacs 等流行配置都使用空格作为 Leader

后续章节会详细讲解如何利用 Leader 键构建高效的快捷键体系。

### 功能模块启用

```json
{
  "vim.easymotion": true,
  "vim.sneak": true,
  "vim.surround": true,
  "vim.camelCaseMotion.enable": true
}
```

这些是 VSCode Vim 内置的效率模块：

- `easymotion`：按 `<Leader><Leader>w` 可以快速跳转到屏幕上任意单词
- `sneak`：按 `s` 加两个字符，快速跳转到该字符组合
- `surround`：快速修改括号、引号。如 `cs"'` 将双引号改为单引号
- `camelCaseMotion`：驼峰命名感知移动。在 `myVariableName` 中按 `w` 可以在驼峰边界停留

每个模块将在后续章节详细讲解。

### 光标样式

```json
{
  "vim.cursorStylePerMode.normal": "block",
  "vim.cursorStylePerMode.insert": "line",
  "vim.cursorStylePerMode.visual": "block",
  "vim.cursorStylePerMode.visualline": "block",
  "vim.cursorStylePerMode.visualblock": "block",
  "vim.cursorStylePerMode.replace": "underline"
}
```

不同模式使用不同光标样式，可以一眼看出当前模式：

- **Normal 模式**：方块光标（block）
- **Insert 模式**：竖线光标（line）
- **Visual 模式**：方块光标
- **Replace 模式**：下划线光标

这比依赖状态栏文字更直观。

### 高亮复制

```json
{
  "vim.highlightedyank.enable": true,
  "vim.highlightedyank.duration": 200
}
```

启用后，每次复制（yank）操作会短暂高亮被复制的区域。这提供了视觉反馈，让你确认复制范围是否正确。

`duration` 是高亮持续时间，单位毫秒。200ms 足够看清又不影响节奏。

### Visual 模式搜索

```json
{
  "vim.visualstar": true
}
```

在 Visual 模式下选中文本后，按 `*` 可以搜索选中的内容。

这个功能极其实用。比如你想找到所有 `handleClick` 的使用位置：
1. 用 `viw` 选中 `handleClick`
2. 按 `*`
3. 按 `n` 跳转到下一个匹配

比手动输入 `/handleClick` 快得多。

## 键位映射配置

settings.json 中还可以配置 Vim 的键位映射：

```json
{
  "vim.insertModeKeyBindings": [
    {
      "before": ["j", "j"],
      "after": ["<Esc>"]
    }
  ],
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<Leader>", "w"],
      "commands": ["workbench.action.files.save"]
    },
    {
      "before": ["<Leader>", "q"],
      "commands": ["workbench.action.closeActiveEditor"]
    },
    {
      "before": ["H"],
      "after": ["^"]
    },
    {
      "before": ["L"],
      "after": ["$"]
    }
  ]
}
```

这些映射的含义：

- `jj` 退出 Insert 模式：比按 `Esc` 更方便，手指不用离开主键区
- `<Leader>w` 保存文件：空格 + w 快速保存
- `<Leader>q` 关闭标签：空格 + q 快速关闭
- `H` 跳到行首非空字符：比 `^` 好按
- `L` 跳到行尾：比 `$` 好按

注意 `insertModeKeyBindings` 和 `normalModeKeyBindingsNonRecursive` 的区别：后者的 `NonRecursive` 表示映射不会递归触发，避免无限循环。

## 完整推荐配置

综合以上讲解，这是经过实战检验的完整配置：

```json
{
  "vim.easymotion": true,
  "vim.sneak": true,
  "vim.surround": true,
  "vim.incsearch": true,
  "vim.useSystemClipboard": true,
  "vim.useCtrlKeys": true,
  "vim.hlsearch": true,
  "vim.ignorecase": true,
  "vim.smartcase": true,
  "vim.leader": "<space>",
  "vim.camelCaseMotion.enable": true,
  "vim.highlightedyank.enable": true,
  "vim.highlightedyank.duration": 200,
  "vim.visualstar": true,
  
  "vim.handleKeys": {
    "<C-d>": true,
    "<C-u>": true,
    "<C-f>": false,
    "<C-b>": false,
    "<C-w>": true,
    "<C-c>": false,
    "<C-v>": false,
    "<C-a>": false
  },
  
  "vim.cursorStylePerMode.normal": "block",
  "vim.cursorStylePerMode.insert": "line",
  "vim.cursorStylePerMode.visual": "block",
  "vim.cursorStylePerMode.replace": "underline",
  
  "vim.insertModeKeyBindings": [
    {
      "before": ["j", "j"],
      "after": ["<Esc>"]
    }
  ],
  
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<Leader>", "w"],
      "commands": ["workbench.action.files.save"]
    },
    {
      "before": ["<Leader>", "q"],
      "commands": ["workbench.action.closeActiveEditor"]
    },
    {
      "before": ["H"],
      "after": ["^"]
    },
    {
      "before": ["L"],
      "after": ["$"]
    }
  ]
}
```

## 配置测试清单

配置完成后，逐一测试以下功能：

| 测试项 | 操作 | 预期结果 |
|--------|------|----------|
| 剪贴板 | 用 `yy` 复制一行，在其他程序中粘贴 | 内容正确粘贴 |
| 搜索高亮 | 输入 `/function` | 所有 function 高亮 |
| Leader 保存 | 按 `空格 w` | 文件保存 |
| jj 退出 | Insert 模式下快速按 `jj` | 返回 Normal 模式 |
| 光标样式 | 切换模式 | 光标样式随模式变化 |
| 复制高亮 | 按 `yy` | 当前行短暂高亮 |

## 不同场景的配置方案

### 前端开发者

增加 HTML/JSX 相关的优化：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<Leader>", "t", "a"],
      "commands": ["editor.emmet.action.matchTag"]
    }
  ]
}
```

`<Leader>ta`（tag around）可以选中配对的 HTML 标签。

### 后端开发者

增加代码导航优化：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["g", "r"],
      "commands": ["editor.action.goToReferences"]
    }
  ]
}
```

`gr` 可以快速查看函数的所有引用。

### 写作者

增加专注模式快捷键：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<Leader>", "z"],
      "commands": ["workbench.action.toggleZenMode"]
    }
  ]
}
```

`<Leader>z` 进入 Zen 模式，全屏专注写作。

---

**本章收获**：
- ✅ 掌握所有关键配置项的含义
- ✅ 获得完整的推荐配置
- ✅ 了解不同场景的配置优化
- ✅ 学会验证配置是否生效

**效率提升**：优化配置后，编辑体验提升 **30-50%**。配置时间约 10-15 分钟，一次配置终身受益。
