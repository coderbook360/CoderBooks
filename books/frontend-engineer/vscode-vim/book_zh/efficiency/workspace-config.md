# 工作区配置管理

不同项目可能需要不同的配置。学会管理工作区配置，让每个项目都有最适合的设置。

## 配置层级

### VSCode 配置优先级

```
1. 默认设置（只读）
2. 用户设置（~/.config/Code/User/settings.json）
3. 工作区设置（.vscode/settings.json）
4. 文件夹设置（多根工作区）
```

后面的覆盖前面的。

### Vim 配置位置

```json
// 用户设置 - 全局 Vim 配置
{
  "vim.leader": "<Space>",
  "vim.normalModeKeyBindingsNonRecursive": [...]
}

// 工作区设置 - 项目特定 Vim 配置
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 项目特定的映射
  ]
}
```

## 工作区设置

### 创建工作区配置

```
1. 在项目根目录创建 .vscode/ 文件夹
2. 创建 settings.json
```

或：

```
Ctrl+Shift+P → "Preferences: Open Workspace Settings (JSON)"
```

### 常用工作区配置

```json
{
  // 项目特定的格式化
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  
  // 项目特定的 lint 配置
  "eslint.workingDirectories": ["./src"],
  
  // TypeScript 配置
  "typescript.tsdk": "./node_modules/typescript/lib",
  
  // 排除的文件
  "files.exclude": {
    "**/.git": true,
    "**/node_modules": true,
    "**/dist": true
  }
}
```

## 多根工作区

### 什么是多根工作区

一个 VSCode 窗口打开多个项目文件夹。

### 创建工作区文件

```
1. 打开多个文件夹
2. File → Save Workspace As
3. 保存为 .code-workspace 文件
```

### 工作区文件结构

```json
{
  "folders": [
    { "path": "./frontend" },
    { "path": "./backend" },
    { "path": "./shared" }
  ],
  "settings": {
    // 整个工作区的设置
  }
}
```

### 每个文件夹的设置

在工作区文件中：

```json
{
  "folders": [
    {
      "path": "./frontend",
      "name": "Frontend (React)"
    },
    {
      "path": "./backend",
      "name": "Backend (Node)"
    }
  ],
  "settings": {
    // 通用设置
  }
}
```

每个文件夹还可以有自己的 `.vscode/settings.json`。

## 项目特定 Vim 配置

### React 项目

`.vscode/settings.json`:

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 快速创建组件
    {
      "before": ["<leader>", "c", "c"],
      "commands": [
        {
          "command": "editor.action.insertSnippet",
          "args": { "langId": "typescriptreact", "name": "React Function Component" }
        }
      ]
    },
    // 运行 React 开发服务器
    {
      "before": ["<leader>", "r", "d"],
      "commands": ["workbench.action.tasks.runTask", { "args": "npm: start" }]
    }
  ]
}
```

### Node.js 项目

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 运行当前文件
    {
      "before": ["<leader>", "r", "f"],
      "commands": [
        {
          "command": "workbench.action.terminal.sendSequence",
          "args": { "text": "node ${file}\n" }
        }
      ]
    },
    // 运行测试
    {
      "before": ["<leader>", "r", "t"],
      "commands": ["workbench.action.tasks.runTask", { "args": "npm: test" }]
    }
  ]
}
```

### Python 项目

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 运行 Python 文件
    {
      "before": ["<leader>", "r", "f"],
      "commands": ["python.execInTerminal"]
    },
    // 激活虚拟环境
    {
      "before": ["<leader>", "p", "v"],
      "commands": ["python.setInterpreter"]
    }
  ]
}
```

## 配置同步

### VSCode Settings Sync

```
1. 登录 GitHub/Microsoft 账号
2. Ctrl+Shift+P → "Settings Sync: Turn On"
3. 选择要同步的内容
```

### 同步内容选项

- Settings
- Keyboard Shortcuts
- User Snippets
- Extensions
- UI State

### 配置文件版本控制

把配置纳入 dotfiles 仓库：

```
dotfiles/
├── vscode/
│   ├── settings.json
│   ├── keybindings.json
│   └── snippets/
└── install.sh
```

## 推荐的扩展

### 配置管理扩展

- **Settings Sync**：内置同步功能
- **Project Manager**：项目切换
- **Workspace Sidebar**：工作区管理

### 按项目推荐扩展

`.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
  ],
  "unwantedRecommendations": [
    "some.conflicting-extension"
  ]
}
```

## 任务配置

### 项目特定任务

`.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "开发服务器",
      "type": "npm",
      "script": "dev",
      "group": {
        "kind": "build",
        "isDefault": true
      }
    },
    {
      "label": "构建生产版本",
      "type": "npm",
      "script": "build"
    },
    {
      "label": "运行测试",
      "type": "npm",
      "script": "test",
      "group": {
        "kind": "test",
        "isDefault": true
      }
    }
  ]
}
```

## 启动配置

### 调试配置

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Chrome",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

## 配置模板

### 创建项目模板

把常用的 `.vscode/` 配置保存为模板：

```
templates/
├── react/
│   └── .vscode/
│       ├── settings.json
│       ├── extensions.json
│       ├── tasks.json
│       └── launch.json
├── node/
│   └── .vscode/
└── python/
    └── .vscode/
```

### 使用模板

```bash
# 创建新项目时
cp -r templates/react/.vscode ./new-project/
```

## 完整工作区配置示例

### React/TypeScript 项目

`.vscode/settings.json`:

```json
{
  // 编辑器
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  
  // TypeScript
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.updateImportsOnFileMove.enabled": "always",
  
  // Vim 项目特定配置
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "r", "d"],
      "commands": ["workbench.action.tasks.runTask", { "args": "npm: dev" }]
    },
    {
      "before": ["<leader>", "r", "b"],
      "commands": ["workbench.action.tasks.runTask", { "args": "npm: build" }]
    },
    {
      "before": ["<leader>", "r", "t"],
      "commands": ["workbench.action.tasks.runTask", { "args": "npm: test" }]
    }
  ],
  
  // 文件排除
  "files.exclude": {
    "**/.git": true,
    "**/node_modules": true,
    "**/.next": true
  }
}
```

---

**本章收获**：
- ✅ 理解 VSCode 配置层级
- ✅ 掌握工作区配置管理
- ✅ 学会项目特定的 Vim 配置
- ✅ 建立配置同步和模板系统

**效率提升**：每个项目都有最适合的配置，切换项目无缝衔接。
