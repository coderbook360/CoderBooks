# 分支管理与合并冲突处理

高效的分支管理和冲突处理是团队协作的关键技能。

## 分支操作

### 创建新分支

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "n"],
      "commands": ["git.branch"]
    }
  ]
}
```

执行后输入分支名即可。

### 切换分支

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "o"],
      "commands": ["git.checkout"]
    }
  ]
}
```

弹出分支列表，使用 `j/k` 导航，`Enter` 选择。

### 删除分支

通过命令面板：

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "D"],
      "commands": ["workbench.action.showCommands"],
      "args": ["Git: Delete Branch"]
    }
  ]
}
```

### 重命名分支

```json
{
  "before": ["<leader>", "g", "rn"],
  "commands": ["git.renameBranch"]
}
```

## 分支合并

### 合并分支

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "m"],
      "commands": ["git.merge"]
    }
  ]
}
```

选择要合并的分支。

### Rebase

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "rb"],
      "commands": ["git.rebase"]
    }
  ]
}
```

## 冲突处理

### 识别冲突

当合并产生冲突时，VSCode 会高亮显示冲突文件。

冲突标记：

```
<<<<<<< HEAD
你的修改
=======
他人的修改
>>>>>>> branch-name
```

### 冲突导航

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["]", "x"],
      "commands": ["merge-conflict.next"]
    },
    {
      "before": ["[", "x"],
      "commands": ["merge-conflict.previous"]
    }
  ]
}
```

### 解决冲突选项

在冲突位置，VSCode 提供内联操作：

| 操作 | 说明 |
|------|------|
| Accept Current Change | 保留当前分支更改 |
| Accept Incoming Change | 接受合并分支更改 |
| Accept Both Changes | 保留两者 |
| Compare Changes | 对比查看 |

### 快捷键配置

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "m", "c"],
      "commands": ["merge-conflict.accept.current"]
    },
    {
      "before": ["<leader>", "m", "i"],
      "commands": ["merge-conflict.accept.incoming"]
    },
    {
      "before": ["<leader>", "m", "b"],
      "commands": ["merge-conflict.accept.both"]
    },
    {
      "before": ["<leader>", "m", "d"],
      "commands": ["merge-conflict.compare"]
    }
  ]
}
```

### 冲突处理流程

```
1. 发现冲突
   git merge feature-branch
   → 提示冲突

2. 打开冲突文件
   <leader>gg → 查看冲突文件列表
   Enter → 打开文件

3. 导航到冲突
   ]x → 下一个冲突
   [x → 上一个冲突

4. 解决冲突
   <leader>mc → 接受当前
   <leader>mi → 接受传入
   <leader>mb → 接受两者
   或手动编辑

5. 标记解决
   <leader>ga → 暂存已解决的文件

6. 继续合并
   <leader>gc → 提交合并结果
```

## 三路合并

### 打开三路合并视图

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "m", "3"],
      "commands": ["merge-conflict.openMergeEditor"]
    }
  ]
}
```

### 三路合并界面

| 区域 | 内容 |
|------|------|
| 左侧 | 当前分支（yours） |
| 右侧 | 传入分支（theirs） |
| 底部 | 合并结果 |

### 在三路合并中操作

| 按键 | 操作 |
|------|------|
| `j/k` | 导航 |
| `Tab` | 切换区域 |
| 点击复选框 | 选择保留的更改 |

## Cherry-pick

### 选择性合并提交

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "cp"],
      "commands": ["git.cherryPick"]
    }
  ]
}
```

## Stash 操作

### 保存工作进度

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "S"],
      "commands": ["git.stash"]
    }
  ]
}
```

### 恢复工作进度

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "O"],
      "commands": ["git.stashPop"]
    }
  ]
}
```

### 查看 Stash 列表

```json
{
  "before": ["<leader>", "g", "ss"],
  "commands": ["git.stashList"]
}
```

## 分支策略工作流

### Git Flow

```
main
  └── develop
        ├── feature/xxx
        ├── release/x.x
        └── hotfix/xxx
```

### 创建功能分支

```
1. 切换到 develop
   <leader>go → develop

2. 创建功能分支
   <leader>gn → feature/new-feature

3. 开发完成后合并回 develop
   <leader>go → develop
   <leader>gm → feature/new-feature

4. 删除功能分支
   <leader>gD → feature/new-feature
```

### GitHub Flow

```
main
  └── feature/xxx
```

更简单的流程：
1. 从 main 创建分支
2. 开发并提交
3. 创建 PR
4. 合并后删除分支

## 远程分支管理

### Fetch 远程更新

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "f"],
      "commands": ["git.fetch"]
    }
  ]
}
```

### 查看远程分支

```json
{
  "before": ["<leader>", "g", "br"],
  "commands": ["git.branchFrom"]
}
```

### 追踪远程分支

切换分支时选择远程分支会自动设置追踪。

## 完整键位配置

```json
{
  "vim.normalModeKeyBindings": [
    // 分支操作
    { "before": ["<leader>", "g", "n"], "commands": ["git.branch"] },
    { "before": ["<leader>", "g", "o"], "commands": ["git.checkout"] },
    { "before": ["<leader>", "g", "D"], "commands": ["git.deleteBranch"] },
    { "before": ["<leader>", "g", "rn"], "commands": ["git.renameBranch"] },
    { "before": ["<leader>", "g", "m"], "commands": ["git.merge"] },
    { "before": ["<leader>", "g", "rb"], "commands": ["git.rebase"] },
    
    // 冲突处理
    { "before": ["]", "x"], "commands": ["merge-conflict.next"] },
    { "before": ["[", "x"], "commands": ["merge-conflict.previous"] },
    { "before": ["<leader>", "m", "c"], "commands": ["merge-conflict.accept.current"] },
    { "before": ["<leader>", "m", "i"], "commands": ["merge-conflict.accept.incoming"] },
    { "before": ["<leader>", "m", "b"], "commands": ["merge-conflict.accept.both"] },
    { "before": ["<leader>", "m", "d"], "commands": ["merge-conflict.compare"] },
    { "before": ["<leader>", "m", "3"], "commands": ["merge-conflict.openMergeEditor"] },
    
    // Stash
    { "before": ["<leader>", "g", "S"], "commands": ["git.stash"] },
    { "before": ["<leader>", "g", "O"], "commands": ["git.stashPop"] },
    
    // 远程
    { "before": ["<leader>", "g", "f"], "commands": ["git.fetch"] }
  ]
}
```

## 效率技巧总结

| 任务 | 快捷键 |
|------|--------|
| 创建分支 | `<leader>gn` |
| 切换分支 | `<leader>go` |
| 合并分支 | `<leader>gm` |
| 下一个冲突 | `]x` |
| 接受当前 | `<leader>mc` |
| 接受传入 | `<leader>mi` |
| Stash | `<leader>gS` |
| Pop Stash | `<leader>gO` |

## 总结

分支管理和冲突处理的核心：

1. **分支操作**：`<leader>gn/go/gm` 创建/切换/合并
2. **冲突导航**：`]x/[x` 快速定位冲突
3. **冲突解决**：`<leader>m` 系列命令处理冲突
4. **Stash**：临时保存工作进度
5. **流程化**：遵循团队分支策略

---

**下一步**：学习 Git Diff 与 Blame 查看。
