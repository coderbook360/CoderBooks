# Node.js 内置调试器使用

Node.js 自带命令行调试器，无需安装任何工具。对于简单的调试任务或无法使用 GUI 的环境（如 SSH 远程服务器），它是一个可靠的选择。

## 何时使用内置调试器

| 场景 | 推荐工具 |
|------|----------|
| 本地开发 | VS Code 调试器（更直观） |
| 远程服务器/SSH | **内置调试器**（无需 GUI） |
| 无法安装额外工具 | **内置调试器** |
| 复杂项目调试 | Chrome DevTools |
| CI/CD 环境 | console.log + 日志 |

**内置调试器的优势**：零依赖、所有 Node.js 版本都支持、适合快速诊断。

## 启动调试

```bash
node inspect app.js
```

`inspect` 关键字启动调试模式，程序会在第一行暂停：

```
< Debugger listening on ws://127.0.0.1:9229/...
< Debugger attached.
Break on start in app.js:1
> 1 const http = require('http');   # 当前行
  2 
  3 const server = http.createServer((req, res) => {
debug>   # 等待输入调试命令
```

## 基本命令

### 执行控制

这些命令控制程序的执行流程，是调试的核心操作：

| 命令 | 简写 | 说明 | 使用场景 |
|------|------|------|----------|
| cont | c | 继续执行 | 运行到下一个断点 |
| next | n | 执行下一行（不进入函数） | 逐行检查主流程 |
| step | s | 进入函数 | 深入检查函数内部 |
| out | o | 跳出当前函数 | 不想继续看函数细节 |
| pause | - | 暂停执行 | 中断运行中的代码 |

**n vs s 的区别**：当前行是函数调用时，`n` 把整个函数当作一步执行，`s` 进入函数内部逐行执行。

### 使用示例

```javascript
// debug-example.js
function add(a, b) {
  const sum = a + b;  // 想检查这里
  return sum;
}

const result = add(1, 2);
console.log(result);
```

```bash
node inspect debug-example.js
```

```
debug> n    # 下一行（跳过 require 等初始化）
debug> n    # 到达 add 调用行
debug> s    # 进入 add 函数内部
debug> n    # 执行 const sum = a + b
debug> o    # 跳出函数，回到调用处
debug> c    # 继续执行到结束
```

## 断点

### 设置断点

```
debug> sb(3)           # 在第3行设置断点
debug> sb('app.js', 10) # 在指定文件第10行设置
debug> sb('add')        # 在函数 add 入口设置
```

### 清除断点

```
debug> cb('app.js', 3)  # 清除指定断点
```

### 列出断点

```
debug> breakpoints      # 查看所有已设置的断点
```

## 代码中设置断点

除了在调试器中设置断点，还可以直接在代码中写 `debugger` 语句。这种方式更灵活，适合在复杂条件下触发断点：

```javascript
function process(data) {
  // 只有在特定条件下才暂停
  if (data.type === 'error') {
    debugger;  // 调试器运行到这里会自动暂停
  }
  // 处理逻辑
}
```

**注意**：`debugger` 语句只在调试模式下生效，普通运行时会被忽略。但建议在提交代码前移除，避免影响代码可读性。

## 查看变量

调试的核心目的是检查程序状态。内置调试器提供两种方式查看变量：

### REPL 模式

进入 REPL（交互式解释器）可以执行任意 JavaScript 表达式：

```
debug> repl            # 进入 REPL 模式
Press Ctrl+C to leave debug repl
> result               # 查看变量值
3
> a + b               # 计算表达式
3
> process.env.NODE_ENV  # 查看环境变量
undefined
> users.filter(u => u.active)  # 执行复杂表达式
[...]
```

按 `Ctrl+C` 退出 REPL，返回调试命令模式。

### exec 命令

如果只是快速查看一个值，可以用 `exec` 而不必进入 REPL：

```
debug> exec('result')
3
debug> exec('a + b')
3
```

## Watch 表达式

监视表达式变化：

```
debug> watch('result')
debug> watch('a + b')
debug> watchers        # 查看所有监视
debug> unwatch('result') # 取消监视
```

每次暂停时自动显示监视值。

## 查看代码

```
debug> list(5)    # 显示当前位置前后5行代码
```

## 调用栈

```
debug> bt    # 显示调用栈（backtrace）
```

输出：
```
#0 add app.js:2:3
#1 <anonymous> app.js:6:16
```

## 脚本列表

```
debug> scripts  # 列出已加载的脚本
```

## 退出调试

```
debug> .exit
```

或按 `Ctrl+C` 两次。

## 实用调试流程

```javascript
// server.js
const http = require('http');

function handleRequest(req, res) {
  const url = req.url;
  const method = req.method;
  
  debugger;  // 断点
  
  if (url === '/') {
    res.end('Home');
  } else {
    res.end('Not Found');
  }
}

const server = http.createServer(handleRequest);
server.listen(3000);
```

调试步骤：

```bash
node inspect server.js
```

```
debug> c        # 继续执行，服务器启动
# 在另一个终端: curl http://localhost:3000/
# 回到调试器，已在 debugger 处暂停

debug> repl
> url
'/'
> method
'GET'
Ctrl+C

debug> n        # 继续执行
debug> c        # 完成请求
```

## 调试运行中的进程

启动时使用 `--inspect`：

```bash
node --inspect app.js
```

然后在另一个终端：

```bash
node inspect localhost:9229
```

## 本章小结

- `node inspect` 启动调试
- `n` 下一行，`s` 进入函数，`o` 跳出
- `sb()` 设置断点，`cb()` 清除
- `repl` 进入交互模式查看变量
- `watch()` 监视表达式
- `debugger` 语句在代码中设置断点

下一章我们将学习更强大的 VS Code 调试。
