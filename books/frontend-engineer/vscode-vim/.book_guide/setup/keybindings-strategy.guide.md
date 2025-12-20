# 章节写作指导：keybindings.json 自定义键位策略

## 1. 章节信息
- **章节标题**: keybindings.json 自定义键位策略
- **文件名**: setup/keybindings-strategy.md
- **所属部分**: 第一部分
- **预计阅读时间**: 30分钟
- **难度等级**: 中级-高级

## 2. 学习目标
### 知识目标
- 理解 VSCode keybindings.json 的工作机制
- 掌握 when 条件的使用方法
- 了解键位优先级与覆盖规则
- 理解 command 与 args 参数

### 技能目标
- 能够自定义 Vim 模式下的键位映射
- 能够设置上下文敏感的键位绑定
- 能够解决键位冲突
- 能够创建自定义命令序列

## 3. 内容要点
### 核心概念（必须全部讲解）
- **keybindings.json 结构**: key、command、when、args 四要素
- **when 条件语法**: 
  - `editorTextFocus`: 编辑器获得焦点
  - `vim.mode == 'Normal'`: 在 Normal 模式下
  - `vim.active`: Vim 插件激活
  - `&&` 和 `||` 逻辑组合
  
- **命令类型**:
  - VSCode 内置命令（如 `workbench.action.files.save`）
  - Vim 插件命令（如 `extension.vim_...`）
  - 禁用命令（`-` 前缀）

### 关键知识点（必须全部覆盖）
- **常用 when 条件模式**:
  ```json
  {
    "key": "j",
    "command": "list.focusDown",
    "when": "explorerViewletFocus && !inputFocus"
  }
  ```

- **Leader 键系统设计**:
  ```json
  {
    "key": "space f",
    "command": "workbench.action.quickOpen",
    "when": "vim.mode == 'Normal'"
  }
  ```

- **模式特定键位**:
  ```json
  {
    "key": "j j",
    "command": "extension.vim_escape",
    "when": "vim.mode == 'Insert'"
  }
  ```

## 4. 写作要求
- **开篇方式**: "如果说 settings.json 是配置 Vim 的行为，那么 keybindings.json 就是定义 Vim 的灵魂——你的个性化键位体系"

- **结构组织**:
  1. keybindings.json 文件位置与编辑
  2. 基础键位映射语法
  3. when 条件完全指南
  4. 常见键位映射模式
  5. Leader 键系统设计
  6. 文件树、侧边栏等特殊区域键位
  7. 完整键位配置示例
  8. 调试键位冲突的方法

- **代码示例**: 必须包含：
  - 完整的 keybindings.json 示例（100+ 行）
  - 每种映射类型的独立示例
  - 常见场景的键位配置
  - 作者实际使用的配置

- **图表需求**:
  - when 条件决策树
  - 键位优先级流程图
  - Leader 键系统架构图

## 5. 技术细节
```json
[
  // ===== Leader 键系统 (Space) =====
  {
    "key": "space f",
    "command": "workbench.action.quickOpen",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  },
  {
    "key": "space b",
    "command": "workbench.action.showAllEditors",
    "when": "vim.mode == 'Normal'"
  },
  {
    "key": "space g",
    "command": "workbench.view.scm",
    "when": "vim.mode == 'Normal'"
  },
  {
    "key": "space e",
    "command": "workbench.files.action.focusFilesExplorer",
    "when": "vim.mode == 'Normal'"
  },
  
  // ===== 文件树 Vim 导航 =====
  {
    "key": "j",
    "command": "list.focusDown",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "k",
    "command": "list.focusUp",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "h",
    "command": "list.collapse",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "l",
    "command": "list.expand",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "a",
    "command": "explorer.newFile",
    "when": "explorerViewletFocus && !inputFocus"
  },
  
  // ===== Insert 模式快速退出 =====
  {
    "key": "j j",
    "command": "extension.vim_escape",
    "when": "vim.mode == 'Insert' && editorTextFocus"
  },
  
  // ===== 禁用冲突键位 =====
  {
    "key": "ctrl+d",
    "command": "-editor.action.addSelectionToNextFindMatch",
    "when": "editorFocus && vim.active"
  },
  {
    "key": "ctrl+w",
    "command": "-workbench.action.closeActiveEditor",
    "when": "vim.active"
  },
  
  // ===== 快速保存与关闭 =====
  {
    "key": "space w",
    "command": "workbench.action.files.save",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  },
  {
    "key": "space q",
    "command": "workbench.action.closeActiveEditor",
    "when": "vim.mode == 'Normal'"
  }
]
```

## 6. 风格指导
- **语气语调**: 
  - 强调"键位是个性化的"，鼓励读者实验
  - 提供多种设计理念（Spacemacs 风格、Doom Emacs 风格等）
  
- **类比方向**:
  - 将键位设计比作"键盘乐器调音"——找到最适合自己的音色

## 7. 章节检查清单
- [ ] 目标明确：读者能设计自己的键位体系
- [ ] 术语统一：使用 VSCode 标准命令名
- [ ] 最小实现：提供 20 个最常用键位配置
- [ ] 边界处理：说明某些键位无法自定义
- [ ] 性能与权衡：复杂键位序列可能有延迟
- [ ] 替代方案：提供多种 Leader 键选择（Space/,/;）
- [ ] 图示与代码：完整配置 + when 条件图解
- [ ] 总结与练习：让读者设计 5 个自定义键位

## 8. 与其他章节的关联
- **前置章节**: 第 2 章（键位冲突解决）
- **后续章节**: 
  - 第 10 章：文件树键位（具体应用）
  - 第 64 章：Leader 键系统（深度设计）

## 9. 读者痛点预判
- **痛点 1**: "when 条件太复杂了"
  - 回应：提供 10 个最常用 when 条件模板

- **痛点 2**: "不知道有哪些 command 可用"
  - 回应：说明如何使用 `Ctrl+Shift+P` 查看命令 ID

- **痛点 3**: "键位不生效，不知道为什么"
  - 回应：提供调试方法（Keyboard Shortcuts 编辑器）

## 10. 效率提升承诺
本章结束后，读者应该能够：
- ✅ 设计自己的 Leader 键系统
- ✅ 在所有 VSCode 区域使用 Vim 键位
- ✅ 减少键位冲突到 0
- ✅ 键位配置效率提升 **10-20 倍**（相比手动点击设置）

**配置投入**：1-2 小时初始设置  
**长期收益**：终身受益的个性化键位体系

## 11. 调试技巧
提供完整的键位调试流程：
1. `Ctrl+K Ctrl+S` 打开 Keyboard Shortcuts 编辑器
2. 右上角点击"Open Keyboard Shortcuts (JSON)"
3. 在界面中搜索冲突键位
4. 使用"Developer: Toggle Keyboard Shortcuts Troubleshooting"

## 12. 特别强调
**这是全书最技术性的章节之一！**  
必须提供：
1. 清晰的语法说明
2. 大量可复制的示例
3. 可视化的 when 条件图解
4. 完整的调试方法

让读者从"被动接受默认键位"变为"主动设计键位体系"。
