# 冲突解决技巧

合并冲突是协作开发的常见场景。掌握高效的冲突解决流程，让合并不再痛苦。

## 理解冲突

### 冲突标记

Git 冲突在文件中显示为：

```
<<<<<<< HEAD
当前分支的代码
=======
传入分支的代码
>>>>>>> feature-branch
```

### VSCode 冲突显示

VSCode 在冲突区域显示：

- 彩色高亮区分不同版本
- 快速操作按钮：
  - Accept Current Change
  - Accept Incoming Change
  - Accept Both Changes
  - Compare Changes

## 键位配置

### 基础冲突导航

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 导航冲突
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

### 解决冲突

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 接受当前版本
    {
      "before": ["<leader>", "m", "c"],
      "commands": ["merge-conflict.accept.current"]
    },
    // 接受传入版本
    {
      "before": ["<leader>", "m", "i"],
      "commands": ["merge-conflict.accept.incoming"]
    },
    // 接受两者
    {
      "before": ["<leader>", "m", "b"],
      "commands": ["merge-conflict.accept.both"]
    },
    // 比较更改
    {
      "before": ["<leader>", "m", "d"],
      "commands": ["merge-conflict.compare"]
    }
  ]
}
```

## 冲突解决流程

### 标准流程

```
1. 执行 git merge 或 git pull
2. VSCode 提示有冲突
3. 打开有冲突的文件
4. ]x 跳到第一个冲突
5. 选择解决方式（\mc / \mi / \mb）
6. ]x 跳到下一个冲突
7. 重复直到所有冲突解决
8. 保存文件
9. \ga 暂存
10. \gc 提交
```

### 使用键位

```
]x      跳到下一个冲突
[x      跳到上一个冲突
\mc     接受当前版本
\mi     接受传入版本
\mb     接受两者
\md     打开比较视图
```

## 三方合并编辑器

### 启用三方合并

```json
{
  "git.mergeEditor": true
}
```

### 三方编辑器布局

```
┌─────────────────┬─────────────────┐
│    Incoming     │     Current     │
│  (their changes)│  (your changes) │
├─────────────────┴─────────────────┤
│              Result               │
│         (final version)           │
└───────────────────────────────────┘
```

### 在三方编辑器中操作

点击复选框选择要保留的更改，或直接在 Result 面板编辑。

## 手动解决冲突

### 当自动选项不够用时

有时需要组合两个版本的代码：

```
1. ]x 跳到冲突
2. 进入插入模式
3. 手动编辑，删除冲突标记
4. 组合两个版本的代码
5. Esc 保存
```

### 删除冲突标记

```
1. 搜索 /<<<<<<< 
2. dd 删除标记行
3. 搜索 /=======
4. dd 删除
5. 搜索 />>>>>>>
6. dd 删除
```

或者使用宏：

```
qa        开始录制
/<<<<<<<  搜索开始标记
dd        删除行
n         下一个
q         停止录制
@a        重复
```

## 复杂冲突策略

### 策略 1：重新基于最新代码

如果冲突太多，可能需要重新开始：

```
1. 保存当前更改（另存或 stash）
2. git checkout 主分支
3. git pull 拉取最新
4. git checkout -b new-feature
5. 重新应用更改
```

### 策略 2：分块合并

```
1. 识别独立的更改块
2. 一块一块处理
3. 每处理完一块就测试
```

### 策略 3：使用 theirs 或 ours

对于某类文件，可以批量选择版本：

```bash
# 使用他们的版本
git checkout --theirs path/to/file

# 使用我们的版本
git checkout --ours path/to/file
```

## 预防冲突

### 频繁同步

```
1. 每天开始工作前 git pull
2. 完成功能后尽快合并
3. 避免长期分支
```

### 小步提交

```
1. 小的、专注的提交
2. 更容易定位和解决冲突
```

### 沟通

```
1. 告知团队正在修改的文件
2. 避免同时大规模重构
```

## 常见冲突场景

### 场景 1：同时修改同一函数

```javascript
<<<<<<< HEAD
function calculate(a, b) {
  return a + b;
}
=======
function calculate(a, b) {
  return a * b;
}
>>>>>>> feature
```

解决：确定正确的实现，手动编辑。

### 场景 2：package-lock.json 冲突

```bash
# 通常选择接受传入版本后重新安装
git checkout --theirs package-lock.json
npm install
```

## 场景 3：配置文件冲突

```
1. 打开比较视图 \md
2. 仔细对比两个版本
3. 手动合并需要的配置项
```

### 场景 4：删除与修改冲突

一方删除文件，另一方修改：

```
1. 确定文件是否应该存在
2. 如果保留：恢复文件并应用修改
3. 如果删除：确认删除
```

## 完整键位配置

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // === 冲突导航 ===
    {
      "before": ["]", "x"],
      "commands": ["merge-conflict.next"]
    },
    {
      "before": ["[", "x"],
      "commands": ["merge-conflict.previous"]
    },
    
    // === 解决冲突 ===
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
      "before": ["<leader>", "m", "a"],
      "commands": ["merge-conflict.accept.all-current"]
    },
    {
      "before": ["<leader>", "m", "A"],
      "commands": ["merge-conflict.accept.all-incoming"]
    },
    
    // === 比较 ===
    {
      "before": ["<leader>", "m", "d"],
      "commands": ["merge-conflict.compare"]
    }
  ]
}
```

## 工具推荐

### VSCode 内置

足够处理大多数冲突场景。

### GitLens

提供更详细的历史信息，帮助理解冲突原因。

### 外部合并工具

复杂冲突可以使用：

- Beyond Compare
- Meld
- KDiff3

配置 Git 使用外部工具：

```bash
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait $MERGED'
```

---

**本章收获**：
- ✅ 掌握冲突导航和解决
- ✅ 学会使用三方合并编辑器
- ✅ 理解不同冲突场景的解决策略
- ✅ 建立冲突预防意识

**效率提升**：冲突解决从手动查找变成键盘快速跳转和选择，大幅提高合并效率。
