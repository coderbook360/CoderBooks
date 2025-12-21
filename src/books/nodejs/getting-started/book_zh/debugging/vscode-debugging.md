# VS Code 调试配置详解

VS Code 是调试 Node.js 最方便的工具。

## 快速开始

1. 打开 JavaScript 文件
2. 点击行号左侧设置断点（红点）
3. 按 `F5` 开始调试
4. 选择 "Node.js"

## launch.json 配置

### 创建配置文件

1. 打开调试面板（Ctrl+Shift+D）
2. 点击 "创建 launch.json 文件"
3. 选择 "Node.js"

**.vscode/launch.json**

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

### 常用配置项

```json
{
  "type": "node",
  "request": "launch",
  "name": "调试应用",
  "program": "${workspaceFolder}/src/index.js",
  "cwd": "${workspaceFolder}",
  "args": ["--port", "3000"],
  "env": {
    "NODE_ENV": "development",
    "DEBUG": "app:*"
  },
  "console": "integratedTerminal",
  "skipFiles": ["<node_internals>/**"]
}
```

| 属性 | 说明 |
|------|------|
| program | 入口文件 |
| cwd | 工作目录 |
| args | 命令行参数 |
| env | 环境变量 |
| console | 控制台类型 |
| skipFiles | 跳过的文件 |

### 调试当前文件

```json
{
  "type": "node",
  "request": "launch",
  "name": "调试当前文件",
  "program": "${file}"
}
```

### 调试 npm 脚本

```json
{
  "type": "node",
  "request": "launch",
  "name": "npm start",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "start"],
  "console": "integratedTerminal"
}
```

## 断点类型

### 普通断点

点击行号左侧设置。

### 条件断点

右键行号 → "添加条件断点"：

```javascript
// 只在 i > 100 时暂停
for (let i = 0; i < 1000; i++) {
  process(i);  // 条件断点: i > 100
}
```

### 日志点

不暂停，只输出日志：

右键行号 → "添加日志点"：

```
当前值: {i}, 结果: {result}
```

### 命中计数断点

右键 → "添加条件断点" → "命中计数"：

```
> 10    // 命中超过10次后暂停
```

## 调试面板

### 变量

查看当前作用域的所有变量。

### 监视

添加表达式持续监视：
- `user.name`
- `items.length`
- `result > 0`

### 调用堆栈

显示函数调用链。

### 断点

管理所有断点，可以启用/禁用。

## 调试控制

| 按键 | 功能 |
|------|------|
| F5 | 继续 |
| F10 | 单步跳过 |
| F11 | 单步进入 |
| Shift+F11 | 单步跳出 |
| Shift+F5 | 停止调试 |
| Ctrl+Shift+F5 | 重启调试 |

## 调试控制台

在调试控制台中执行表达式：

```javascript
> user.name
"John"
> items.filter(x => x > 0)
[1, 2, 3]
> process.env.NODE_ENV
"development"
```

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
