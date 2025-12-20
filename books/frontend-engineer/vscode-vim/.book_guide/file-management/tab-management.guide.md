# 章节写作指导：Tab 管理：切换、关闭、重排

## 1. 章节信息
- **章节标题**: Tab 管理：切换、关闭、重排
- **文件名**: file-management/tab-management.md
- **所属部分**: 第三部分：文件与项目管理（全键盘）
- **预计阅读时间**: 20分钟
- **难度等级**: 初级-中级

## 2. 学习目标
### 知识目标
- 理解 VSCode Tab 与 Vim Buffer 的关系
- 掌握 Tab 管理的所有键盘操作
- 了解 Tab 管理的最佳实践

### 技能目标
- 能够快速在多个 Tab 间切换
- 能够用键盘关闭、重排 Tab
- 能够配置自定义 Tab 管理键位

## 3. 内容要点
### 核心 Tab 操作
- **Tab 切换**:
  - `gt` / `gT`: 下一个/上一个 Tab
  - `{数字}gt`: 跳到第 N 个 Tab
  - `Ctrl+Tab` / `Ctrl+Shift+Tab`: VSCode 原生切换
  - `Ctrl+PageDown` / `Ctrl+PageUp`: 循环切换

- **Tab 关闭**:
  - `:q` 或 `Ctrl+W`: 关闭当前 Tab
  - `:qa`: 关闭所有 Tab
  - `Ctrl+K W`: 关闭所有 Tab (VSCode)

- **Tab 管理**:
  - `:tabmove`: 移动 Tab 位置
  - `Ctrl+K Enter`: 保持当前 Tab，关闭其他
  - Split 相关：`Ctrl+\` 分屏

### VSCode 特有功能
- Editor Group 管理
- Tab 置顶（Pin）
- 最近文件快速切换（`Ctrl+Tab` 保持不放）

## 4. 写作要求
- **开篇方式**: "当你同时打开 10+ 个文件，如何快速找到目标文件？鼠标点击 Tab？那你可能要花 3-5 秒。用键盘？只需 0.5 秒。"

- **结构组织**:
  1. Tab vs Buffer 概念区分
  2. 基础 Tab 切换（gt/gT）
  3. 快速关闭策略
  4. Tab 重排与组织
  5. 与 Editor Group 配合
  6. 实战：管理 20+ 个文件
  7. 自定义键位优化

- **代码示例**:
  - keybindings.json 配置（Leader + 数字切换）
  - 实战流程演示

- **图表需求**:
  - Tab 操作命令速查表
  - 效率对比（鼠标 vs 键盘）

## 5. 技术细节
### keybindings.json 优化
```json
[
  // Leader + 数字快速切换 Tab
  {
    "key": "space 1",
    "command": "workbench.action.openEditorAtIndex1",
    "when": "vim.mode == 'Normal'"
  },
  {
    "key": "space 2",
    "command": "workbench.action.openEditorAtIndex2",
    "when": "vim.mode == 'Normal'"
  },
  // ... 依此类推
  
  // 快速关闭其他 Tab
  {
    "key": "space o",
    "command": "workbench.action.closeOtherEditors",
    "when": "vim.mode == 'Normal'"
  }
]
```

## 6. 风格指导
- 强调"Tab 不是用来浏览的，是用来切换的"
- 提供"打开文件过多"的管理策略

## 7. 效率提升承诺
- Tab 切换速度提升 **5-10 倍**
- 完全脱离鼠标点击 Tab
- 配置时间：10 分钟
