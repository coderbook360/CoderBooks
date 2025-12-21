# Git 集成工作流

VSCode 的 Git 集成加上 Vim 键位，让版本控制操作行云流水。

## 基础配置

### 键位映射

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // Git 视图
    { "before": ["<leader>", "g", "g"], "commands": ["workbench.view.scm"] },
    
    // 暂存当前文件
    { "before": ["<leader>", "g", "a"], "commands": ["git.stage"] },
    
    // 暂存所有
    { "before": ["<leader>", "g", "A"], "commands": ["git.stageAll"] },
    
    // 取消暂存
    { "before": ["<leader>", "g", "u"], "commands": ["git.unstage"] },
    
    // 提交
    { "before": ["<leader>", "g", "c"], "commands": ["git.commit"] },
    
    // 推送
    { "before": ["<leader>", "g", "p"], "commands": ["git.push"] },
    
    // 拉取
    { "before": ["<leader>", "g", "l"], "commands": ["git.pull"] },
    
    // 查看更改
    { "before": ["<leader>", "g", "d"], "commands": ["git.openChange"] },
    
    // 撤销更改
    { "before": ["<leader>", "g", "r"], "commands": ["git.revertChange"] }
  ]
}
```

## 文件级操作

### 暂存文件

```
\ga     暂存当前文件
\gA     暂存所有更改
```

### 取消暂存

```
\gu     取消暂存当前文件
```

### 查看更改

```
\gd     打开当前文件的 diff 视图
```

### 撤销更改

```
\gr     撤销当前文件的更改（恢复到 HEAD）
```

**注意**：此操作不可逆！

## 提交工作流

### 常规提交

```
1. \ga 或 \gA 暂存更改
2. \gc 打开提交输入框
3. 输入提交信息
4. Enter 提交
```

### 快速提交

配置快速提交命令：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "g", "C"],
      "commands": ["git.commitAll"]
    }
  ]
}
```

`\gC` 暂存所有并打开提交框。

### 修改提交

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "g", "m"],
      "commands": ["git.commitAmend"]
    }
  ]
}
```

`\gm` 修改最近一次提交。

## 分支操作

### 配置键位

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 切换分支
    { "before": ["<leader>", "g", "b"], "commands": ["git.checkout"] },
    
    // 创建分支
    { "before": ["<leader>", "g", "B"], "commands": ["git.branch"] },
    
    // 合并分支
    { "before": ["<leader>", "g", "M"], "commands": ["git.merge"] }
  ]
}
```

### 使用

```
\gb     显示分支列表，选择切换
\gB     创建新分支
\gM     合并分支
```

## 远程操作

### 配置

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    { "before": ["<leader>", "g", "p"], "commands": ["git.push"] },
    { "before": ["<leader>", "g", "l"], "commands": ["git.pull"] },
    { "before": ["<leader>", "g", "f"], "commands": ["git.fetch"] }
  ]
}
```

### 使用

```
\gp     推送
\gl     拉取
\gf     获取（不合并）
```

### 强制推送

```json
{
  "before": ["<leader>", "g", "P"],
  "commands": ["git.pushForce"]
}
```

**注意**：谨慎使用强制推送！

## Git 视图操作

### 打开 Git 视图

```
\gg     打开源代码管理视图
```

### 在视图中操作

进入 Git 视图后：

```
j/k     上下移动
Enter   打开文件
Space   暂存/取消暂存
```

### 配置 Git 视图键位

VSCode 的 Git 视图使用列表键位：

```json
{
  "keybindings": [
    {
      "key": "j",
      "command": "list.focusDown",
      "when": "listFocus && !inputFocus"
    },
    {
      "key": "k",
      "command": "list.focusUp",
      "when": "listFocus && !inputFocus"
    }
  ]
}
```

## Diff 视图

### 打开 Diff

```
\gd     打开当前文件的 diff
```

### Diff 视图中导航

在 Diff 视图中：

```
]c      跳到下一个更改
[c      跳到上一个更改
```

### 配置 Diff 导航

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["]", "c"],
      "commands": ["workbench.action.editor.nextChange"]
    },
    {
      "before": ["[", "c"],
      "commands": ["workbench.action.editor.previousChange"]
    }
  ]
}
```

## 行级 Git 操作

### 查看行历史

```
\gb     Git Blame（显示每行的提交信息）
```

配置：

```json
{
  "before": ["<leader>", "g", "b", "l"],
  "commands": ["gitlens.toggleFileBlame"]
}
```

需要安装 GitLens 扩展。

### 撤销行更改

在更改的行上：

```
\gr     撤销当前更改块
```

或使用 gutter 操作：

```
1. 点击行号旁的更改标记
2. 选择 "Revert Change"
```

## Stash 操作

### 配置

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "g", "s", "s"],
      "commands": ["git.stash"]
    },
    {
      "before": ["<leader>", "g", "s", "p"],
      "commands": ["git.stashPop"]
    }
  ]
}
```

### 使用

```
\gss    储藏当前更改
\gsp    恢复储藏
```

## 日志查看

### 配置

```json
{
  "before": ["<leader>", "g", "L"],
  "commands": ["git.viewHistory"]
}
```

需要安装 Git History 或 GitLens 扩展。

### 使用

```
\gL     查看 Git 日志
```

## 完整配置示例

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // === Git 基础 ===
    { "before": ["<leader>", "g", "g"], "commands": ["workbench.view.scm"] },
    { "before": ["<leader>", "g", "s"], "commands": ["git.status"] },
    
    // === 暂存 ===
    { "before": ["<leader>", "g", "a"], "commands": ["git.stage"] },
    { "before": ["<leader>", "g", "A"], "commands": ["git.stageAll"] },
    { "before": ["<leader>", "g", "u"], "commands": ["git.unstage"] },
    { "before": ["<leader>", "g", "U"], "commands": ["git.unstageAll"] },
    
    // === 提交 ===
    { "before": ["<leader>", "g", "c"], "commands": ["git.commit"] },
    { "before": ["<leader>", "g", "C"], "commands": ["git.commitAll"] },
    { "before": ["<leader>", "g", "m"], "commands": ["git.commitAmend"] },
    
    // === 远程 ===
    { "before": ["<leader>", "g", "p"], "commands": ["git.push"] },
    { "before": ["<leader>", "g", "l"], "commands": ["git.pull"] },
    { "before": ["<leader>", "g", "f"], "commands": ["git.fetch"] },
    
    // === 分支 ===
    { "before": ["<leader>", "g", "b"], "commands": ["git.checkout"] },
    { "before": ["<leader>", "g", "B"], "commands": ["git.branch"] },
    
    // === Diff ===
    { "before": ["<leader>", "g", "d"], "commands": ["git.openChange"] },
    { "before": ["]", "c"], "commands": ["workbench.action.editor.nextChange"] },
    { "before": ["[", "c"], "commands": ["workbench.action.editor.previousChange"] },
    
    // === 撤销 ===
    { "before": ["<leader>", "g", "r"], "commands": ["git.revertChange"] },
    
    // === Stash ===
    { "before": ["<leader>", "g", "S"], "commands": ["git.stash"] },
    { "before": ["<leader>", "g", "P"], "commands": ["git.stashPop"] }
  ]
}
```

## 工作流示例

### 日常开发流程

```
1. \gl 拉取最新代码
2. 编辑代码
3. \gd 查看更改
4. \ga 暂存文件（或 \gA 全部暂存）
5. \gc 提交
6. \gp 推送
```

### 功能分支流程

```
1. \gB 创建功能分支
2. 开发功能
3. \gc 提交
4. \gb 切换回主分支
5. \gl 拉取最新
6. \gM 合并功能分支
7. \gp 推送
```

### 临时切换任务

```
1. \gss 储藏当前更改
2. \gb 切换分支
3. 处理紧急任务
4. \gb 切换回来
5. \gsp 恢复储藏
```

---

**本章收获**：
- ✅ 配置完整的 Git 键位映射
- ✅ 掌握文件级和行级 Git 操作
- ✅ 学会 Diff 视图导航
- ✅ 建立高效的 Git 工作流

**效率提升**：Git 操作全键盘化，不再需要切换到终端或点击界面。
