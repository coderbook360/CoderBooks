# 减少击键次数的系统性方法

每次少按一个键，累积起来就是巨大的效率提升。

## 核心原则

### 1. 选择更短的命令

| 长命令 | 短命令 | 节省 |
|--------|--------|------|
| `:write` | `:w` | 4 次 |
| `:quit` | `:q` | 3 次 |
| `ddkP` | 配置 `<A-k>` | 2 次 |

### 2. 使用 Leader 键

将常用操作映射到 Leader 组合：

```json
{
  "vim.normalModeKeyBindings": [
    { "before": ["<leader>", "w"], "commands": [":w"] },
    { "before": ["<leader>", "q"], "commands": [":q"] }
  ]
}
```

- `<leader>w` 比 `:w<Enter>` 少 1 次击键
- 且不需要按 Shift

### 3. 避免修饰键组合

尽量减少需要按住多个键的操作：

| 避免 | 推荐 |
|------|------|
| `Ctrl+Shift+P` | 映射到单键 |
| `Ctrl+K Ctrl+C` | 使用 `gcc` |

## 文本对象优化

### 使用语义化移动

| 低效 | 高效 | 说明 |
|------|------|------|
| `llllll` | `w` | 移动到下一个词 |
| `jjjjj` | `5j` 或 `}` | 移动多行或到段落 |
| `hhhhh` | `b` | 移动到上一个词 |

### 使用文本对象

| 低效 | 高效 | 说明 |
|------|------|------|
| `v$hd` | `D` | 删除到行尾 |
| `0v$y` | `yy` | 复制整行 |
| `vf"hd` | `di"` | 删除引号内 |

### 组合操作

| 低效 | 高效 | 说明 |
|------|------|------|
| `vwwwd` | `d3w` | 删除 3 个词 |
| 选中 + 删除 + 输入 | `ciw` | 修改词 |

## 搜索优化

### 使用 `*` 和 `#`

```
# 搜索当前词
* → 下一个匹配
# → 上一个匹配
```

比 `/word<Enter>` 更快。

## 使用 `f` 和 `t`

```
# 跳转到字符
f( → 跳转到下一个 (
t) → 跳转到 ) 之前
```

比多次 `w` 或 `l` 更快。

## 使用 EasyMotion

```
<leader><leader>w → 快速跳转到任意词
<leader><leader>f( → 快速跳转到任意 (
```

比反复按键更快。

## 重复操作优化

### 使用 `.` 命令

```
# 修改多个相同词
/word        → 搜索
cgn          → 修改
.            → 重复
```

## 使用宏

```
qa           → 开始录制
...操作...
q            → 停止
10@a         → 重复 10 次
```

### 使用多光标

```
gb           → 添加光标到下一个匹配
gb gb gb     → 添加多个
c            → 同时修改
```

## 导航优化

### 标记系统

```
ma           → 设置标记 a
'a           → 跳回标记 a
```

比记住行号更快。

### 跳转列表

```
Ctrl+o       → 返回
Ctrl+i       → 前进
```

不需要记住位置。

### 相对行号

```json
{
  "editor.lineNumbers": "relative"
}
```

使用 `5j` 比数行数更快。

## 配置优化

### 常用命令映射

```json
{
  "vim.normalModeKeyBindings": [
    // 保存退出
    { "before": ["<leader>", "w"], "commands": [":w"] },
    { "before": ["<leader>", "q"], "commands": [":q"] },
    { "before": ["<leader>", "x"], "commands": [":x"] },
    
    // 分屏
    { "before": ["<leader>", "v"], "commands": [":vsplit"] },
    { "before": ["<leader>", "s"], "commands": [":split"] },
    
    // 导航
    { "before": ["H"], "commands": [":bprevious"] },
    { "before": ["L"], "commands": [":bnext"] }
  ]
}
```

### 减少 Escape

```json
{
  "vim.insertModeKeyBindings": [
    { "before": ["j", "k"], "after": ["<Escape>"] }
  ]
}
```

`jk` 比 `Escape` 更快（手不离主键盘区）。

### 快速移动行

```json
{
  "vim.normalModeKeyBindings": [
    { "before": ["<A-j>"], "commands": ["editor.action.moveLinesDownAction"] },
    { "before": ["<A-k>"], "commands": ["editor.action.moveLinesUpAction"] }
  ]
}
```

`Alt+j` 比 `ddp` 少 1 次击键。

## 击键统计

### 常见操作对比

| 操作 | 传统方式 | 优化方式 | 节省 |
|------|----------|----------|------|
| 保存 | `:w<Enter>` (3) | `<leader>w` (2) | 1 |
| 退出 | `:q<Enter>` (3) | `<leader>q` (2) | 1 |
| 删除词 | `daw` (3) | `dw` (2) | 1 |
| 修改词 | `caw` (3) | `ciw` (3) | 0 |
| 到行首 | `0` (1) | `^` (1) | 0 |
| 复制行 | `yy` (2) | `yy` (2) | 0 |
| 换 Escape | `Escape` (1) | `jk` (2) | -1 但更舒适 |

### 日均节省估算

假设每天：
- 保存 100 次：节省 100 次击键
- 搜索替换 50 次：使用 `.` 节省 150 次
- 导航 200 次：使用 EasyMotion 节省 200 次

**每天可节省 400+ 次击键**

## 效率工具

### 击键计数器

使用工具记录击键模式，找出可优化的高频操作：

1. 记录一周的击键数据
2. 分析最常用的操作
3. 为高频操作创建更短的映射

### 效率审计

定期检查：
- 是否有操作超过 3 次击键
- 是否经常重复相同序列
- 是否使用了最优的文本对象

## 最佳实践

### 1. 从高频操作开始

优先优化每天执行最多的操作。

### 2. 渐进式优化

每周学习 2-3 个新的快捷方式，逐步内化。

### 3. 使用助记符

```
<leader>w → write (保存)
<leader>q → quit (退出)
<leader>e → explorer (文件树)
```

### 4. 保持一致性

相似操作使用相似键位：
- `<leader>g*` → Git 相关
- `<leader>t*` → 测试相关
- `<leader>d*` → 调试相关

### 5. 定期复习

每月审视配置，移除不用的映射，优化常用的映射。

## 优化配置模板

```json
{
  "vim.leader": "<space>",
  "vim.normalModeKeyBindings": [
    // 一级常用（最少击键）
    { "before": ["<leader>", "w"], "commands": [":w"] },
    { "before": ["<leader>", "q"], "commands": [":q"] },
    { "before": ["<leader>", "e"], "commands": ["workbench.view.explorer"] },
    { "before": ["<leader>", "f"], "commands": ["workbench.action.quickOpen"] },
    
    // Buffer 导航
    { "before": ["H"], "commands": [":bprevious"] },
    { "before": ["L"], "commands": [":bnext"] },
    
    // 快速移动行
    { "before": ["<A-j>"], "commands": ["editor.action.moveLinesDownAction"] },
    { "before": ["<A-k>"], "commands": ["editor.action.moveLinesUpAction"] }
  ],
  "vim.insertModeKeyBindings": [
    { "before": ["j", "k"], "after": ["<Escape>"] }
  ]
}
```

## 总结

减少击键的核心策略：

1. **使用 Leader 键**：统一入口，避免修饰键
2. **使用文本对象**：语义化操作更高效
3. **使用重复命令**：`.` 和宏避免重复击键
4. **优化高频操作**：为常用操作创建短映射
5. **避免手离开主键盘区**：`jk` 代替 `Escape`

---

**下一步**：学习从鼠标到键盘的完整迁移路线。
