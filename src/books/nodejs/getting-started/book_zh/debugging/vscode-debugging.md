# VS Code 调试配置详解

> `console.log` 调试法虽然简单，但效率不高——需要反复添加、删除日志，重新运行程序。

VS Code 内置的调试器可以让你：
- **暂停执行**：在任意位置停下来，查看当时的变量状态
- **单步执行**：逐行执行代码，观察每一步的变化
- **条件断点**：只在特定条件下暂停（如 `i > 100`）
- **实时求值**：暂停时可以执行任意表达式

这是专业开发者的必备技能。

## 快速开始

最简单的调试流程：

1. 打开任意 JavaScript 文件
2. 点击行号左侧设置断点（出现红点 🔴）
3. 按 `F5` 开始调试
4. 选择 "Node.js" 环境

程序会在断点处暂停，你可以查看变量、调用栈等信息。

## launch.json 配置

对于正式项目，建议创建配置文件，这样团队成员可以共享调试配置。

### 创建配置文件

1. 打开调试面板（`Ctrl+Shift+D`）
2. 点击 "创建 launch.json 文件"
3. 选择 "Node.js"

VS Code 会在 `.vscode/launch.json` 创建配置文件：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "启动程序",
      "program": "${workspaceFolder}/src/index.js"
    }
  ]
}
```

### 常用配置项详解

```json
{
  "type": "node",                    // 调试器类型
  "request": "launch",               // launch（启动）或 attach（附加到已运行进程）
  "name": "调试应用",                 // 在调试下拉菜单中显示的名称
  
  // 程序配置
  "program": "${workspaceFolder}/src/index.js",  // 入口文件
  "cwd": "${workspaceFolder}",       // 工作目录
  "args": ["--port", "3000"],        // 命令行参数（相当于 node index.js --port 3000）
  
  // 环境变量
  "env": {
    "NODE_ENV": "development",
    "DEBUG": "app:*"
  },
  
  // 其他选项
  "console": "integratedTerminal",   // 使用 VS Code 终端（推荐，支持交互输入）
  "skipFiles": ["<node_internals>/**"]  // 跳过 Node 内部文件，避免误入
}
```

| 变量 | 含义 |
|------|------|
| `${workspaceFolder}` | 工作区根目录 |
| `${file}` | 当前打开的文件 |
| `${relativeFile}` | 相对路径的当前文件 |

### 调试当前文件

最灵活的配置——调试当前正在编辑的文件：

```json
{
  "type": "node",
  "request": "launch",
  "name": "调试当前文件",
  "program": "${file}"  // 动态获取当前文件
}
```

### 调试 npm 脚本

如果你的启动命令在 package.json 的 scripts 中：

```json
{
  "type": "node",
  "request": "launch",
  "name": "npm start",
  "runtimeExecutable": "npm",        // 使用 npm 而不是 node
  "runtimeArgs": ["run", "start"],   // npm run start
  "console": "integratedTerminal"
}
```

## 断点类型

断点不只是"在这里停下来"那么简单。

### 普通断点

点击行号左侧设置，程序执行到此处会暂停。

### 条件断点

只在满足条件时暂停——非常适合调试循环中的特定情况：

右键行号 → "添加条件断点" → 输入条件表达式

```javascript
// 例如：只在 i > 100 时暂停
for (let i = 0; i < 1000; i++) {
  process(i);  // 右键这里，添加条件 i > 100
}
```

这比在代码中写 `if (i > 100) debugger;` 方便多了！

### 日志点（Logpoint）

不暂停程序，只输出日志——相当于自动添加 console.log：

右键行号 → "添加日志点" → 输入消息模板

```
当前值: {i}, 结果: {result}
```

> **何时使用？** 当你需要查看变量但不想中断程序流程时。比如调试异步代码时，暂停可能改变时序。

### 命中计数断点

在执行第 N 次时才暂停：

右键 → "添加条件断点" → 选择"命中计数" → 输入：

```
> 10    // 命中超过 10 次后暂停
== 5    // 恰好第 5 次时暂停
```

## 调试面板详解

调试时，左侧面板提供了丰富的信息：

### 变量（Variables）

显示当前作用域的所有变量。可以展开对象查看属性，甚至可以**直接修改变量值**来测试不同场景。

### 监视（Watch）

添加你关心的表达式，程序运行时持续追踪：
- `user.name` — 监视对象属性
- `items.length` — 监视数组长度
- `result > 0` — 监视布尔表达式

### 调用堆栈（Call Stack）

显示函数调用链。当报错时，可以点击堆栈中的任意一帧，查看那一层的变量状态——比看错误日志直观得多！

### 断点（Breakpoints）

管理所有断点。可以批量启用/禁用，也可以设置在抛出异常时自动断点。

## 调试控制

| 按键 | 功能 | 何时使用 |
|------|------|----------|
| `F5` | 继续 | 运行到下一个断点 |
| `F10` | 单步跳过 | 执行当前行，不进入函数内部 |
| `F11` | 单步进入 | 进入函数内部 |
| `Shift+F11` | 单步跳出 | 从当前函数返回 |
| `Shift+F5` | 停止调试 | 结束调试会话 |
| `Ctrl+Shift+F5` | 重启 | 修改代码后重新开始 |

> **技巧**：遇到可疑的函数调用，用 F11 进去看看；确定没问题的库函数，用 F10 跳过。

## 调试控制台

在程序暂停时，调试控制台可以执行任意 JavaScript 表达式：

```javascript
> user.name
"John"

> items.filter(x => x > 0)
[1, 2, 3]

> process.env.NODE_ENV
"development"

> JSON.stringify(config, null, 2)
// 格式化输出复杂对象
```

这比 console.log 强大得多——你可以在任意时刻，执行任意代码来验证你的假设。

## 调试 TypeScript

### ts-node 方式

```json
{
  "type": "node",
  "request": "launch",
  "name": "调试 TypeScript",
  "runtimeArgs": ["-r", "ts-node/register"],
  "args": ["${workspaceFolder}/src/index.ts"],
  "env": {
    "TS_NODE_PROJECT": "${workspaceFolder}/tsconfig.json"
  }
}
```

### 编译后调试

```json
{
  "type": "node",
  "request": "launch",
  "name": "调试编译后代码",
  "program": "${workspaceFolder}/dist/index.js",
  "preLaunchTask": "tsc: build",
  "outFiles": ["${workspaceFolder}/dist/**/*.js"],
  "sourceMaps": true
}
```

## 附加到进程

调试已运行的进程：

```json
{
  "type": "node",
  "request": "attach",
  "name": "附加到进程",
  "port": 9229
}
```

先启动应用：

```bash
node --inspect src/index.js
```

然后在 VS Code 中选择 "附加到进程" 开始调试。

## 自动附加

VS Code 设置中启用 "Auto Attach"：

```json
{
  "debug.javascript.autoAttachFilter": "smart"
}
```

之后在终端运行 `node` 会自动附加调试器。

## 多配置

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "启动服务器",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/server.js"
    },
    {
      "name": "运行测试",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/jest/bin/jest",
      "args": ["--runInBand"]
    },
    {
      "name": "调试当前测试文件",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/jest/bin/jest",
      "args": ["--runInBand", "${relativeFile}"]
    }
  ]
}
```

## 本章小结

- `launch.json` 定义调试配置
- 支持普通断点、条件断点、日志点
- 调试面板查看变量、监视、调用栈
- F10 单步跳过，F11 单步进入
- 调试控制台执行表达式
- 支持 TypeScript 和附加调试

下一章我们将学习 Chrome DevTools 调试。
