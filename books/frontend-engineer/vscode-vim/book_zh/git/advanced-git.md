# 高级 Git 技巧

超越基础操作，掌握更强大的 Git 工作流。

## 交互式 Rebase

### 启动交互式 rebase

```bash
git rebase -i HEAD~5
```

或使用 VSCode/GitLens 命令。

### 常用操作

- **pick**：保留提交
- **reword**：修改提交信息
- **edit**：修改提交内容
- **squash**：合并到上一个提交
- **fixup**：合并但丢弃提交信息
- **drop**：删除提交

### 键位配置

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "g", "r", "i"],
      "commands": ["gitlens.gitCommands.rebase"]
    }
  ]
}
```

需要 GitLens 扩展。

## Cherry-pick

### 选择性合并提交

```bash
git cherry-pick <commit-hash>
```

### 使用场景

```
1. 从其他分支获取特定修复
2. 移动错误提交到正确分支
3. 选择性合并功能
```

### 键位配置

```json
{
  "before": ["<leader>", "g", "c", "p"],
  "commands": ["gitlens.gitCommands.cherryPick"]
}
```

## Git Worktree

### 什么是 Worktree

同时在多个分支工作，每个分支一个目录。

### 创建 worktree

```bash
git worktree add ../project-feature feature-branch
```

### 使用场景

- 同时处理多个功能
- 不中断当前工作切换上下文
- 对比不同分支的实现

## Bisect 查找 Bug

### 启动 bisect

```bash
git bisect start
git bisect bad          # 当前版本有 bug
git bisect good <commit> # 已知正常的版本
```

### Git 自动定位

Git 会自动切换到中间提交，你测试后标记好/坏：

```bash
git bisect good    # 如果当前没 bug
git bisect bad     # 如果当前有 bug
```

### 结束 bisect

```bash
git bisect reset
```

## Reflog 恢复

### 查看 reflog

```bash
git reflog
```

显示所有 HEAD 移动历史。

### 恢复丢失的提交

```bash
git checkout <reflog-hash>
# 或
git reset --hard <reflog-hash>
```

## 恢复删除的分支

```bash
git checkout -b recovered-branch <reflog-hash>
```

## 高级 Stash

### 带名称的 stash

```bash
git stash push -m "WIP: feature description"
```

### 查看 stash 内容

```bash
git stash show -p stash@{0}
```

### 应用特定 stash

```bash
git stash apply stash@{2}
```

### 创建分支从 stash

```bash
git stash branch new-branch stash@{0}
```

### 键位配置

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "g", "s", "l"],
      "commands": ["git.stashList"]
    }
  ]
}
```

## Hooks 自动化

### 常用 Git Hooks

```
.git/hooks/
├── pre-commit      # 提交前
├── commit-msg      # 提交信息检查
├── pre-push        # 推送前
└── post-merge      # 合并后
```

### 使用 Husky

```bash
npm install husky -D
npx husky install
```

### 配置 pre-commit

```bash
npx husky add .husky/pre-commit "npm run lint"
```

### 配置 commit-msg

使用 commitlint：

```bash
npm install @commitlint/cli @commitlint/config-conventional -D
echo "module.exports = {extends: ['@commitlint/config-conventional']}" > commitlint.config.js
npx husky add .husky/commit-msg 'npx commitlint --edit $1'
```

## Submodule

### 添加 submodule

```bash
git submodule add <repo-url> path/to/submodule
```

### 初始化 submodule

```bash
git submodule update --init --recursive
```

### 更新 submodule

```bash
git submodule update --remote
```

## Git Attributes

### .gitattributes 配置

```
# 确保换行符一致
* text=auto

# 二进制文件
*.png binary
*.jpg binary

# 合并策略
package-lock.json merge=ours
```

## 自定义 diff

```
*.md diff=markdown
```

## 高级日志

### 图形化日志

```bash
git log --oneline --graph --all
```

### 搜索提交

```bash
git log --grep="fix"
git log -S "functionName"
```

### 查看文件历史

```bash
git log --follow -p path/to/file
```

### 键位配置

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "g", "L"],
      "commands": ["gitlens.showQuickRepoHistory"]
    },
    {
      "before": ["<leader>", "g", "l", "f"],
      "commands": ["gitlens.showQuickFileHistory"]
    }
  ]
}
```

## Git Aliases

### 常用别名

```bash
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
```

### 复杂别名

```bash
# 美化日志
git config --global alias.lg "log --color --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit"
```

## 完整键位配置

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // === 高级操作 ===
    // Rebase
    {
      "before": ["<leader>", "g", "r", "i"],
      "commands": ["gitlens.gitCommands.rebase"]
    },
    // Cherry-pick
    {
      "before": ["<leader>", "g", "c", "p"],
      "commands": ["gitlens.gitCommands.cherryPick"]
    },
    // Stash 列表
    {
      "before": ["<leader>", "g", "s", "l"],
      "commands": ["gitlens.stashes.view"]
    },
    
    // === 历史查看 ===
    // 仓库历史
    {
      "before": ["<leader>", "g", "L"],
      "commands": ["gitlens.showQuickRepoHistory"]
    },
    // 文件历史
    {
      "before": ["<leader>", "g", "l", "f"],
      "commands": ["gitlens.showQuickFileHistory"]
    },
    // 行历史
    {
      "before": ["<leader>", "g", "l", "l"],
      "commands": ["gitlens.showQuickLineHistory"]
    },
    
    // === Blame ===
    {
      "before": ["<leader>", "g", "b"],
      "commands": ["gitlens.toggleFileBlame"]
    },
    
    // === 比较 ===
    // 与上一个版本比较
    {
      "before": ["<leader>", "g", "d", "h"],
      "commands": ["gitlens.diffWithPrevious"]
    },
    // 与另一个分支比较
    {
      "before": ["<leader>", "g", "d", "b"],
      "commands": ["gitlens.diffWithBranch"]
    }
  ]
}
```

## 工作流最佳实践

### 功能分支流程

```
main
  └── develop
        ├── feature/add-login
        ├── feature/user-profile
        └── bugfix/login-error
```

### 提交规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- feat: 新功能
- fix: 修复
- docs: 文档
- style: 格式
- refactor: 重构
- test: 测试
- chore: 构建/工具

### 代码审查流程

```
1. 创建功能分支
2. 开发并提交
3. 推送分支
4. 创建 Pull Request
5. 代码审查
6. 合并到主分支
```

---

**本章收获**：
- ✅ 掌握交互式 rebase 和 cherry-pick
- ✅ 学会使用 git bisect 定位 bug
- ✅ 理解 Git hooks 自动化
- ✅ 建立专业的 Git 工作流

**效率提升**：高级 Git 操作让版本控制更精细，问题定位更快速。
