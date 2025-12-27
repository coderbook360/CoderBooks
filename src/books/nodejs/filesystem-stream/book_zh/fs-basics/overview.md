# fs 模块概览与 API 设计

> 在浏览器中，JavaScript 被严格限制在沙箱内，无法访问用户的文件系统。但 Node.js 打破了这个限制——通过 fs 模块，你可以读写文件、创建目录、监控变化。

这是从前端到后端最直观的能力升级。

## 为什么 fs 模块如此重要？

后端开发中，文件操作无处不在：

- **配置文件**：读取 JSON/YAML 配置
- **日志系统**：写入运行日志
- **数据处理**：导入导出 CSV、Excel
- **静态资源**：管理图片、视频、文档
- **临时文件**：处理上传、缓存中间结果

可以说，几乎所有后端应用都需要与文件系统打交道。

## fs 模块的三套 API

Node.js 的 fs 模块提供了**三套风格**的 API，这是前端开发者容易困惑的地方：

```javascript
const fs = require('fs');

// ===== 1. 回调风格（最早的 API）=====
fs.readFile('data.txt', 'utf8', (err, data) => {
  if (err) throw err;
  console.log(data);
});

// ===== 2. 同步风格（阻塞主线程）=====
const data = fs.readFileSync('data.txt', 'utf8');
console.log(data);

// ===== 3. Promise 风格（推荐）=====
const fsPromises = require('fs/promises');
// 或 const { promises: fsPromises } = require('fs');

const data = await fsPromises.readFile('data.txt', 'utf8');
console.log(data);
```

### 三种风格对比

| 特性 | 回调风格 | 同步风格 | Promise 风格 |
|------|---------|---------|-------------|
| 命名 | `readFile` | `readFileSync` | `readFile` |
| 模块 | `fs` | `fs` | `fs/promises` |
| 阻塞 | ✗ | ✓ | ✗ |
| 错误处理 | 回调第一参数 | try/catch | try/catch / .catch |
| 适用场景 | 兼容旧代码 | 脚本、CLI、启动配置 | 现代异步代码 |

### 推荐选择

```javascript
// ✅ 推荐：Promise 风格 + async/await
import { readFile, writeFile } from 'fs/promises';

async function processFile() {
  try {
    const content = await readFile('input.txt', 'utf8');
    await writeFile('output.txt', content.toUpperCase());
  } catch (err) {
    console.error('文件操作失败:', err.message);
  }
}

// ⚠️ 谨慎使用：同步 API
// 只在这些场景使用：
// - 应用启动时读取配置
// - CLI 工具的简单脚本
// - require() 内部（必须同步）
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// ❌ 不推荐：回调风格（除非维护旧代码）
fs.readFile('file.txt', (err, data) => {
  // 回调地狱的开始...
});
```

## 为什么有三套 API？

这是 Node.js 的历史演进：

```
2009 ──► 回调风格
         最初的 Node.js 只有回调 API
         符合"Node 风格回调"约定（err-first）
         
2015 ──► 同步 API 逐渐完善
         脚本场景需要简单的同步操作
         
2018 ──► Promise API（实验性）
         Node.js 10 引入 fs.promises
         
2020 ──► fs/promises 稳定
         Node.js 14 正式推荐使用
```

## fs 模块核心功能

```javascript
import * as fs from 'fs/promises';

// ===== 文件操作 =====
await fs.readFile(path);        // 读取文件
await fs.writeFile(path, data); // 写入文件
await fs.appendFile(path, data);// 追加内容
await fs.copyFile(src, dest);   // 复制文件
await fs.rename(old, new);      // 重命名/移动
await fs.unlink(path);          // 删除文件

// ===== 目录操作 =====
await fs.mkdir(path, { recursive: true });  // 创建目录
await fs.readdir(path);                     // 读取目录
await fs.rmdir(path, { recursive: true });  // 删除目录
await fs.rm(path, { recursive: true });     // 删除（推荐）

// ===== 信息查询 =====
await fs.stat(path);            // 获取文件信息
await fs.access(path);          // 检查权限
await fs.realpath(path);        // 获取真实路径

// ===== 监控变化 =====
const watcher = fs.watch(path); // 监控文件/目录变化

// ===== 底层操作 =====
const fd = await fs.open(path, 'r');  // 打开文件描述符
await fd.read(buffer, ...);           // 底层读取
await fd.close();                     // 关闭描述符
```

## 路径处理：必须使用 path 模块

这是新手常犯的错误：

```javascript
// ❌ 错误：字符串拼接路径
const filePath = __dirname + '/data/' + filename;

// ❌ 错误：硬编码分隔符
const filePath = 'data/config.json';  // Windows 上可能出问题

// ✅ 正确：使用 path 模块
import path from 'path';
const filePath = path.join(__dirname, 'data', filename);
```

**为什么？**

1. **跨平台**：Windows 用 `\`，Unix 用 `/`
2. **规范化**：处理 `..`、`.`、多余的分隔符
3. **安全性**：防止路径注入攻击

## 编码与 Buffer

fs 模块处理两种数据类型：

```javascript
// 不指定编码：返回 Buffer（二进制数据）
const buffer = await fs.readFile('image.png');
console.log(buffer);  // <Buffer 89 50 4e 47 ...>

// 指定编码：返回字符串
const text = await fs.readFile('text.txt', 'utf8');
console.log(text);  // "Hello, World!"
```

| 场景 | 使用 |
|------|------|
| 文本文件（JSON、HTML、代码） | 指定 `'utf8'` 编码 |
| 二进制文件（图片、视频、压缩包） | 不指定编码，处理 Buffer |
| 需要精确控制的文本 | 先读 Buffer，再手动转换 |

## 错误处理

fs 操作可能失败，必须处理错误：

```javascript
import { readFile, access, constants } from 'fs/promises';

async function safeRead(filePath) {
  try {
    // 可选：先检查文件是否存在
    await access(filePath, constants.R_OK);
    
    return await readFile(filePath, 'utf8');
  } catch (err) {
    // 根据错误码处理
    switch (err.code) {
      case 'ENOENT':
        console.error('文件不存在:', filePath);
        break;
      case 'EACCES':
        console.error('无读取权限:', filePath);
        break;
      case 'EISDIR':
        console.error('这是目录，不是文件:', filePath);
        break;
      default:
        console.error('读取失败:', err.message);
    }
    return null;
  }
}
```

常见错误码：

| 错误码 | 含义 |
|--------|------|
| ENOENT | 文件/目录不存在 |
| EACCES | 权限不足 |
| EEXIST | 文件已存在（创建时） |
| EISDIR | 期望文件但得到目录 |
| ENOTDIR | 期望目录但得到文件 |
| EMFILE | 打开的文件太多 |
| ENOSPC | 磁盘空间不足 |

## 本章小结

- fs 模块有三套 API：回调、同步、Promise，**推荐使用 `fs/promises`**
- 同步 API 会阻塞事件循环，只用于启动阶段或 CLI 脚本
- 路径处理必须使用 `path` 模块，不要字符串拼接
- 文本文件指定 `'utf8'` 编码，二进制文件处理 Buffer
- 错误处理时根据 `err.code` 判断具体原因

下一章我们将深入学习文件读取的各种方式。
