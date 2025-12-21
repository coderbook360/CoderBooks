# 常见错误类型与解决方案

Node.js 开发中会遇到各种错误，学会识别和解决它们。

## JavaScript 错误

### SyntaxError

语法错误，代码无法解析：

```
SyntaxError: Unexpected token '}'
    at file.js:10:5
```

**常见原因**：
- 括号不匹配
- 缺少逗号
- 字符串引号不匹配
- JSON 格式错误

**解决方法**：
- 检查报错行及前几行
- 使用 ESLint 提前发现

### ReferenceError

引用未定义的变量：

```
ReferenceError: config is not defined
    at app.js:5:15
```

**常见原因**：
- 变量名拼写错误
- 变量未声明就使用
- 作用域问题

**解决方法**：
```javascript
// 检查变量是否存在
if (typeof config !== 'undefined') {
  // 使用 config
}
```

### TypeError

类型操作错误：

```
TypeError: Cannot read properties of undefined (reading 'name')
    at app.js:10:20
```

**常见原因**：
- 访问 undefined/null 的属性
- 调用非函数
- 对非数组使用数组方法

**解决方法**：
```javascript
// 可选链
const name = user?.profile?.name;

// 空值合并
const name = user?.name ?? 'Guest';

// 类型检查
if (Array.isArray(items)) {
  items.forEach(...);
}
```

### RangeError

数值超出范围：

```
RangeError: Maximum call stack size exceeded
```

**常见原因**：
- 无限递归
- 数组长度无效
- 无效的字符串重复次数

**解决方法**：
```javascript
// 添加递归终止条件
function factorial(n) {
  if (n <= 1) return 1;  // 终止条件
  return n * factorial(n - 1);
}
```

## Node.js 系统错误

### ENOENT

文件或目录不存在：

```
Error: ENOENT: no such file or directory, open '/path/to/file'
```

**解决方法**：
```javascript
const fs = require('fs');

// 检查文件是否存在
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath);
}

// 或使用 try-catch
try {
  const content = fs.readFileSync(filePath);
} catch (err) {
  if (err.code === 'ENOENT') {
    console.log('文件不存在');
  }
}
```

### EADDRINUSE

端口被占用：

```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方法**：

```bash
# 查找占用进程
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000

# 结束进程
kill <PID>
```

```javascript
// 代码中处理
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`端口 ${port} 被占用，尝试 ${port + 1}`);
    server.listen(port + 1);
  }
});
```

### EACCES

权限不足：

```
Error: EACCES: permission denied, open '/etc/file'
```

**解决方法**：
- 检查文件权限
- 不要使用 sudo 运行 npm
- 使用有权限的目录

### ECONNREFUSED

连接被拒绝：

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**常见原因**：
- 目标服务未启动
- 端口错误
- 防火墙阻止

**解决方法**：
```javascript
// 重试机制
async function connectWithRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.code === 'ECONNREFUSED' && i < retries - 1) {
        console.log(`连接失败，${i + 1} 次重试...`);
        await new Promise(r => setTimeout(r, 1000));
      } else {
        throw err;
      }
    }
  }
}
```

### ETIMEDOUT

连接超时：

```
Error: connect ETIMEDOUT 1.2.3.4:443
```

**解决方法**：
- 检查网络连接
- 增加超时时间
- 检查目标服务器

## 模块错误

### MODULE_NOT_FOUND

模块未找到：

```
Error: Cannot find module 'express'
```

**解决方法**：
```bash
# 安装缺失的模块
npm install express

# 检查 package.json
cat package.json | grep express
```

### ERR_REQUIRE_ESM

在 CommonJS 中引入 ESM 模块：

```
Error [ERR_REQUIRE_ESM]: require() of ES Module not supported
```

**解决方法**：
```javascript
// 方案1：使用动态 import
const module = await import('esm-package');

// 方案2：使用 CommonJS 版本
const module = require('esm-package/dist/cjs');

// 方案3：将项目改为 ESM
// package.json 添加 "type": "module"
```

## 异步错误

### UnhandledPromiseRejection

未处理的 Promise 拒绝：

```
UnhandledPromiseRejectionWarning: Error: Something failed
```

**解决方法**：
```javascript
// 添加 catch
fetchData()
  .then(data => process(data))
  .catch(err => console.error(err));

// async/await 使用 try-catch
async function main() {
  try {
    const data = await fetchData();
  } catch (err) {
    console.error(err);
  }
}

// 全局处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});
```

## 错误追踪

### 保留完整堆栈

```javascript
async function fetchUser(id) {
  try {
    return await db.query(`SELECT * FROM users WHERE id = ?`, [id]);
  } catch (err) {
    // 保留原始堆栈
    const error = new Error(`获取用户 ${id} 失败`);
    error.cause = err;
    throw error;
  }
}
```

### 异步堆栈

Node.js 12+ 自动包含异步堆栈。

确保启用：

```bash
node --async-stack-traces app.js
```

## 本章小结

- 识别不同错误类型
- ENOENT 文件不存在，EADDRINUSE 端口占用
- 使用可选链和空值合并防止 TypeError
- 妥善处理 Promise 拒绝
- 保留错误原因链

下一章我们将学习日志最佳实践。
