# 测试文件快速跳转与运行

高效的测试工作流是开发质量的保障，掌握快速跳转和运行测试的技巧。

## 测试文件导航

### 跳转到测试文件

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "t", "f"],
      "commands": ["workbench.action.quickOpen"],
      "args": [".test."]
    },
    {
      "before": ["<leader>", "t", "s"],
      "commands": ["workbench.action.quickOpen"],
      "args": [".spec."]
    }
  ]
}
```

### 切换源文件和测试文件

安装扩展或配置自定义命令：

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "t", "t"],
      "commands": ["vscode-test-switcher.switch"]
    }
  ]
}
```

或使用 Go to Related File：

```json
{
  "before": ["<leader>", "g", "r"],
  "commands": ["workbench.action.showAllEditors"]
}
```

### 文件命名约定

| 源文件 | 测试文件 |
|--------|----------|
| `Button.tsx` | `Button.test.tsx` |
| `utils.ts` | `utils.spec.ts` |
| `api.ts` | `__tests__/api.test.ts` |

## 运行测试

### 运行当前测试文件

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "t", "r"],
      "commands": ["testing.runCurrentFile"]
    }
  ]
}
```

### 运行光标处的测试

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "t", "c"],
      "commands": ["testing.runAtCursor"]
    }
  ]
}
```

### 运行所有测试

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "t", "a"],
      "commands": ["testing.runAll"]
    }
  ]
}
```

### 重新运行上次测试

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "t", "l"],
      "commands": ["testing.reRunLastRun"]
    }
  ]
}
```

## 调试测试

### 调试当前测试

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "t", "d"],
      "commands": ["testing.debugCurrentFile"]
    }
  ]
}
```

### 调试光标处的测试

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "d", "t"],
      "commands": ["testing.debugAtCursor"]
    }
  ]
}
```

## 测试结果导航

### 查看测试输出

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "t", "o"],
      "commands": ["testing.openOutputPeek"]
    }
  ]
}
```

### 跳转到失败的测试

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["]", "t"],
      "commands": ["testing.goToNextMessage"]
    },
    {
      "before": ["[", "t"],
      "commands": ["testing.goToPreviousMessage"]
    }
  ]
}
```

### 打开测试面板

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "t", "v"],
      "commands": ["workbench.view.testing.focus"]
    }
  ]
}
```

## Jest 集成

### 配置 VSCode

安装 Jest 扩展后配置：

```json
{
  "jest.autoRun": "off",
  "jest.showCoverageOnLoad": false
}
```

### Jest 特定命令

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "j", "r"],
      "commands": ["jest.runCurrentTest"]
    },
    {
      "before": ["<leader>", "j", "f"],
      "commands": ["jest.runCurrentFile"]
    },
    {
      "before": ["<leader>", "j", "a"],
      "commands": ["jest.runAllTests"]
    }
  ]
}
```

## 测试代码片段

### describe 块

```json
{
  "Describe Block": {
    "prefix": "desc",
    "body": [
      "describe('${1:description}', () => {",
      "  $0",
      "});"
    ]
  }
}
```

### it 块

```json
{
  "It Block": {
    "prefix": "it",
    "body": [
      "it('should ${1:description}', () => {",
      "  $0",
      "});"
    ]
  }
}
```

### 异步测试

```json
{
  "Async It Block": {
    "prefix": "ita",
    "body": [
      "it('should ${1:description}', async () => {",
      "  $0",
      "});"
    ]
  }
}
```

### beforeEach

```json
{
  "Before Each": {
    "prefix": "bef",
    "body": [
      "beforeEach(() => {",
      "  $0",
      "});"
    ]
  }
}
```

## React Testing Library

### 渲染测试

```json
{
  "RTL Render": {
    "prefix": "rtlr",
    "body": [
      "render(<${1:Component} ${2:props} />);",
      "$0"
    ]
  }
}
```

### 查询元素

```json
{
  "RTL Get By Text": {
    "prefix": "gbt",
    "body": "screen.getByText(${1:/regex/})$0"
  },
  "RTL Get By Role": {
    "prefix": "gbr",
    "body": "screen.getByRole('${1:role}', { name: ${2:/regex/} })$0"
  },
  "RTL Get By Test Id": {
    "prefix": "gbti",
    "body": "screen.getByTestId('${1:testId}')$0"
  }
}
```

### 断言

```json
{
  "Expect To Be": {
    "prefix": "exb",
    "body": "expect(${1:value}).toBe(${2:expected});"
  },
  "Expect In Document": {
    "prefix": "exd",
    "body": "expect(${1:element}).toBeInTheDocument();"
  }
}
```

## 测试编写工作流

### 创建新测试

1. `<leader>tf` → 打开测试文件搜索
2. 如果不存在，创建新文件
3. `desc` + Tab → 生成 describe 块
4. `it` + Tab → 生成 it 块
5. 编写测试代码

### 红-绿-重构循环

```
1. 编写失败的测试（红）
   - `it` + Tab
   - 编写断言
   - `<leader>tc` 运行

2. 编写代码使测试通过（绿）
   - `<leader>tt` 切换到源文件
   - 编写实现
   - `<leader>tt` 切换回测试
   - `<leader>tc` 运行

3. 重构代码（重构）
   - 优化代码
   - `<leader>tc` 确保测试仍通过
```

## 测试覆盖率

### 查看覆盖率

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "t", "cov"],
      "commands": ["testing.coverageAll"]
    }
  ]
}
```

### 覆盖率高亮

配置显示哪些行被覆盖：

```json
{
  "testing.displayedCoveragePercent": "statement",
  "testing.showAllMessages": true
}
```

## 监视模式

### 启动监视

终端中运行：

```bash
npm test -- --watch
```

或配置任务：

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Jest Watch",
      "type": "shell",
      "command": "npm",
      "args": ["test", "--", "--watch"],
      "group": "test",
      "isBackground": true
    }
  ]
}
```

### 运行任务

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "t", "w"],
      "commands": ["workbench.action.tasks.runTask"],
      "args": ["Jest Watch"]
    }
  ]
}
```

## 完整键位配置

```json
{
  "vim.normalModeKeyBindings": [
    // 文件跳转
    { "before": ["<leader>", "t", "f"], "commands": ["workbench.action.quickOpen"], "args": [".test."] },
    { "before": ["<leader>", "t", "t"], "commands": ["vscode-test-switcher.switch"] },
    
    // 运行测试
    { "before": ["<leader>", "t", "r"], "commands": ["testing.runCurrentFile"] },
    { "before": ["<leader>", "t", "c"], "commands": ["testing.runAtCursor"] },
    { "before": ["<leader>", "t", "a"], "commands": ["testing.runAll"] },
    { "before": ["<leader>", "t", "l"], "commands": ["testing.reRunLastRun"] },
    
    // 调试测试
    { "before": ["<leader>", "t", "d"], "commands": ["testing.debugCurrentFile"] },
    { "before": ["<leader>", "d", "t"], "commands": ["testing.debugAtCursor"] },
    
    // 结果导航
    { "before": ["]", "t"], "commands": ["testing.goToNextMessage"] },
    { "before": ["[", "t"], "commands": ["testing.goToPreviousMessage"] },
    { "before": ["<leader>", "t", "o"], "commands": ["testing.openOutputPeek"] },
    
    // 测试面板
    { "before": ["<leader>", "t", "v"], "commands": ["workbench.view.testing.focus"] }
  ]
}
```

## 效率技巧总结

| 任务 | 最快操作 |
|------|----------|
| 跳转到测试文件 | `<leader>tt` |
| 运行当前测试 | `<leader>tc` |
| 运行所有测试 | `<leader>ta` |
| 重新运行测试 | `<leader>tl` |
| 调试测试 | `<leader>td` |
| 下一个失败 | `]t` |
| 创建测试块 | `desc`/`it` + Tab |

## 总结

测试工作流要点：

1. **快速跳转**：`<leader>tt` 在源文件和测试文件间切换
2. **运行测试**：`<leader>tc` 运行光标处测试
3. **结果导航**：`]t`/`[t` 跳转失败测试
4. **代码片段**：快速生成测试结构
5. **调试集成**：`<leader>td` 调试测试

---

**下一步**：学习 Git 操作完全键盘化。
