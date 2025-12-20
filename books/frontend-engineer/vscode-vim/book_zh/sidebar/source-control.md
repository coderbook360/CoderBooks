# 源代码管理：Git 视图操作

Git 是前端开发必备工具。VSCode 的 Git 集成强大，配合 Vim 键位可以完全用键盘完成版本控制操作。

## 打开 Git 视图

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Shift+G` | 聚焦 Git 视图 |

配置 Vim 快捷键：

```json
{
  "before": ["<leader>", "g", "g"],
  "commands": ["workbench.view.scm"]
}
```

`\gg` 打开 Git 视图。

## Git 视图结构

Git 视图显示：
- **源代码管理提供程序**：通常是 Git
- **更改**：已修改的文件
- **暂存的更改**：已暂存（staged）的文件

## 在 Git 视图中导航

聚焦 Git 视图后：

| 按键 | 效果 |
|------|------|
| `j/k` | 上下移动 |
| `Enter` | 打开文件 / 显示差异 |
| `Space` | 暂存/取消暂存当前文件 |

## 暂存和取消暂存

### 暂存单个文件

在文件上按 `Space` 或点击 `+` 图标。

### 暂存所有文件

```json
{
  "before": ["<leader>", "g", "a"],
  "commands": ["git.stageAll"]
}
```

`\ga` 暂存所有更改。

### 取消暂存

在已暂存的文件上按 `Space` 或：

```json
{
  "before": ["<leader>", "g", "u"],
  "commands": ["git.unstageAll"]
}
```

`\gu` 取消暂存所有文件。

## 提交

### 打开提交输入框

Git 视图顶部有提交消息输入框。

```json
{
  "before": ["<leader>", "g", "c"],
  "commands": ["git.commitStaged"]
}
```

`\gc` 提交已暂存的更改。

### 提交所有

```json
{
  "before": ["<leader>", "g", "C"],
  "commands": ["git.commitAll"]
}
```

`\gC` 暂存所有并提交。

## 查看差异

### 打开差异视图

在 Git 视图中选择文件，按 `Enter` 打开差异视图。

差异视图显示左右对比：
- 左侧：原始版本
- 右侧：修改后版本

### 编辑器内行差异

编辑器左侧装订线会显示更改标记：
- 绿色：新增
- 蓝色：修改
- 红色三角：删除

点击装订线可以查看该处的差异。

### 差异导航

```json
{
  "before": ["]", "c"],
  "commands": ["workbench.action.editor.nextChange"]
},
{
  "before": ["[", "c"],
  "commands": ["workbench.action.editor.previousChange"]
}
```

- `]c`：下一个更改（Change）
- `[c`：上一个更改

## 放弃更改

### 放弃单个文件

在文件上右键 → "Discard Changes"。

或者：

```json
{
  "before": ["<leader>", "g", "d"],
  "commands": ["git.clean"]
}
```

`\gd` 放弃当前文件的更改。

### 放弃所有更改

```json
{
  "before": ["<leader>", "g", "D"],
  "commands": ["git.cleanAll"]
}
```

`\gD` 放弃所有更改（危险操作！）。

## 分支操作

### 切换分支

```json
{
  "before": ["<leader>", "g", "b"],
  "commands": ["git.checkout"]
}
```

`\gb` 切换分支，会显示分支列表。

### 创建分支

```json
{
  "before": ["<leader>", "g", "n"],
  "commands": ["git.branch"]
}
```

`\gn` 创建新分支。

## 推送和拉取

### 推送

```json
{
  "before": ["<leader>", "g", "p"],
  "commands": ["git.push"]
}
```

`\gp` 推送到远程。

### 拉取

```json
{
  "before": ["<leader>", "g", "P"],
  "commands": ["git.pull"]
}
```

`\gP` 从远程拉取。

### 同步

```json
{
  "before": ["<leader>", "g", "s"],
  "commands": ["git.sync"]
}
```

`\gs` 同步（拉取 + 推送）。

## Git 日志

### 查看文件历史

```
> Git: View File History
```

显示当前文件的提交历史。

### 查看行历史（Git Blame）

```
> Git: View Line History
```

或安装 **GitLens** 扩展获得更强大的 blame 功能。

## GitLens 扩展

GitLens 是最受欢迎的 Git 扩展，提供：
- 行内 blame 信息
- 详细的文件和行历史
- 交互式变基
- 比较功能

安装后，编辑器会在每行末尾显示最后修改信息。

## 实战工作流

### 日常提交流程

```
1. \gg 打开 Git 视图
2. 浏览更改的文件
3. Enter 查看差异，确认更改
4. Space 暂存需要提交的文件
5. \gc 提交
6. 输入提交消息
7. Enter 确认提交
8. \gp 推送
```

### 切换功能分支

```
1. \gb 选择分支
2. 开始工作
3. 定期提交
4. 完成后 \gb 切换回主分支
5. 合并或创建 PR
```

### 撤销错误更改

```
1. [c ]c 导航到更改位置
2. 查看装订线中的差异
3. 点击 "Revert Block" 撤销该块
4. 或 \gd 放弃整个文件的更改
```

## 配置汇总

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "g", "g"],
      "commands": ["workbench.view.scm"]
    },
    {
      "before": ["<leader>", "g", "a"],
      "commands": ["git.stageAll"]
    },
    {
      "before": ["<leader>", "g", "u"],
      "commands": ["git.unstageAll"]
    },
    {
      "before": ["<leader>", "g", "c"],
      "commands": ["git.commitStaged"]
    },
    {
      "before": ["<leader>", "g", "C"],
      "commands": ["git.commitAll"]
    },
    {
      "before": ["<leader>", "g", "d"],
      "commands": ["git.clean"]
    },
    {
      "before": ["<leader>", "g", "b"],
      "commands": ["git.checkout"]
    },
    {
      "before": ["<leader>", "g", "p"],
      "commands": ["git.push"]
    },
    {
      "before": ["<leader>", "g", "P"],
      "commands": ["git.pull"]
    },
    {
      "before": ["<leader>", "g", "s"],
      "commands": ["git.sync"]
    },
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

---

**本章收获**：
- ✅ 掌握 Git 视图的键盘操作
- ✅ 学会暂存、提交、推送流程
- ✅ 了解差异导航和撤销更改
- ✅ 配置完整的 Git 快捷键

**效率提升**：Git 操作全键盘化，版本控制成为编码流程的自然延伸。
