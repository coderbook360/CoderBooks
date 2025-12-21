# fs 进阶：文件监听与目录操作

除了基础的文件读写，`fs` 模块还提供了文件监听、目录操作等高级功能。

## 目录操作

### 创建目录

```javascript
const fs = require('fs/promises');

// 创建单层目录
await fs.mkdir('./logs');

// 递归创建多层目录
await fs.mkdir('./data/cache/images', { recursive: true });
```

递归创建的好处是不用担心父目录是否存在：

```javascript
async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}
```

### 读取目录内容

```javascript
// 获取文件名列表
const files = await fs.readdir('./src');
console.log(files);  // ['index.js', 'utils', 'config.json']

// 获取详细信息
const entries = await fs.readdir('./src', { withFileTypes: true });
for (const entry of entries) {
  if (entry.isDirectory()) {
    console.log(`目录: ${entry.name}`);
  } else if (entry.isFile()) {
    console.log(`文件: ${entry.name}`);
  }
}
```

### 删除目录

```javascript
// 删除空目录
await fs.rmdir('./empty-dir');

// 递归删除目录及其内容（Node.js 14.14+）
await fs.rm('./directory', { recursive: true, force: true });
```

`force: true` 表示目录不存在时不报错。

## 目录遍历

### 递归遍历所有文件

```javascript
async function* walkDir(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      yield* walkDir(fullPath);  // 递归
    } else {
      yield fullPath;
    }
  }
}

// 使用
for await (const file of walkDir('./src')) {
  console.log(file);
}
```

### 查找特定文件

```javascript
async function findFiles(dir, pattern) {
  const results = [];
  
  for await (const file of walkDir(dir)) {
    if (pattern.test(file)) {
      results.push(file);
    }
  }
  
  return results;
}

// 查找所有 .js 文件
const jsFiles = await findFiles('./src', /\.js$/);
```

## 文件信息：stat

```javascript
const stats = await fs.stat('./file.txt');

console.log({
  size: stats.size,              // 文件大小（字节）
  isFile: stats.isFile(),        // 是否是文件
  isDirectory: stats.isDirectory(), // 是否是目录
  isSymbolicLink: stats.isSymbolicLink(), // 是否是符号链接
  birthtime: stats.birthtime,    // 创建时间
  mtime: stats.mtime,            // 修改时间
  atime: stats.atime             // 访问时间
});
```

### stat vs lstat

```javascript
// stat 会跟随符号链接
const stats = await fs.stat('./link');

// lstat 不跟随符号链接，返回链接本身的信息
const lstats = await fs.lstat('./link');
```

### 格式化文件大小

```javascript
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let index = 0;
  
  while (bytes >= 1024 && index < units.length - 1) {
    bytes /= 1024;
    index++;
  }
  
  return `${bytes.toFixed(2)} ${units[index]}`;
}

const stats = await fs.stat('./video.mp4');
console.log(formatSize(stats.size));  // '156.78 MB'
```

## 文件监听

### fs.watch：高效的文件监听

```javascript
const fs = require('fs');

const watcher = fs.watch('./src', { recursive: true }, (eventType, filename) => {
  console.log(`${eventType}: ${filename}`);
});

// 停止监听
watcher.close();
```

事件类型：
- `rename`：文件创建、删除或重命名
- `change`：文件内容变化

### fs.watchFile：轮询方式监听

```javascript
fs.watchFile('./config.json', { interval: 1000 }, (curr, prev) => {
  if (curr.mtime !== prev.mtime) {
    console.log('配置文件已更新');
  }
});

// 停止监听
fs.unwatchFile('./config.json');
```

### watch vs watchFile 对比

| 特性 | fs.watch | fs.watchFile |
|------|----------|--------------|
| 机制 | 系统事件 | 轮询 |
| 性能 | 高 | 低 |
| 可靠性 | 平台差异大 | 稳定 |
| 网络文件 | 不支持 | 支持 |
| 递归监听 | 部分平台支持 | 不支持 |

**推荐**：优先使用 `fs.watch`，网络文件系统用 `fs.watchFile`。

### 实战：配置热重载

```javascript
const fs = require('fs');
const path = require('path');

class ConfigWatcher {
  constructor(configPath) {
    this.path = configPath;
    this.config = null;
    this.callbacks = [];
  }
  
  async load() {
    const content = await fs.promises.readFile(this.path, 'utf8');
    this.config = JSON.parse(content);
    return this.config;
  }
  
  watch() {
    // 防抖处理，避免重复触发
    let timeout;
    
    fs.watch(this.path, async () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        try {
          await this.load();
          console.log('配置已重新加载');
          this.callbacks.forEach(cb => cb(this.config));
        } catch (err) {
          console.error('配置加载失败:', err.message);
        }
      }, 100);
    });
  }
  
  onChange(callback) {
    this.callbacks.push(callback);
  }
}

// 使用
const configWatcher = new ConfigWatcher('./config.json');
await configWatcher.load();
configWatcher.watch();
configWatcher.onChange(config => {
  console.log('配置更新:', config);
});
```

## 符号链接

```javascript
// 创建符号链接
await fs.symlink('./original.txt', './link.txt');

// 读取链接目标
const target = await fs.readlink('./link.txt');
console.log(target);  // './original.txt'

// 获取真实路径
const realPath = await fs.realpath('./link.txt');
```

## 文件权限

```javascript
// 修改权限
await fs.chmod('./script.sh', 0o755);  // rwxr-xr-x

// 修改所有者（需要权限）
await fs.chown('./file.txt', uid, gid);

// 检查访问权限
try {
  await fs.access('./file.txt', fs.constants.R_OK | fs.constants.W_OK);
  console.log('可读写');
} catch {
  console.log('权限不足');
}
```

权限常量：
- `fs.constants.R_OK`：可读
- `fs.constants.W_OK`：可写
- `fs.constants.X_OK`：可执行
- `fs.constants.F_OK`：文件存在

## 实战示例

### 清理临时文件

```javascript
async function cleanTempFiles(dir, maxAgeMs = 24 * 60 * 60 * 1000) {
  const now = Date.now();
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    
    const filePath = path.join(dir, entry.name);
    const stats = await fs.stat(filePath);
    
    if (now - stats.mtime.getTime() > maxAgeMs) {
      await fs.unlink(filePath);
      console.log(`已删除: ${entry.name}`);
    }
  }
}

// 清理超过 24 小时的临时文件
await cleanTempFiles('./temp');
```

### 复制目录

```javascript
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
```

### 目录大小统计

```javascript
async function getDirSize(dir) {
  let total = 0;
  
  for await (const file of walkDir(dir)) {
    const stats = await fs.stat(file);
    total += stats.size;
  }
  
  return total;
}

const size = await getDirSize('./node_modules');
console.log(`node_modules 大小: ${formatSize(size)}`);
```

## 本章小结

- 使用 `recursive: true` 递归创建或删除目录
- `readdir` 配合 `withFileTypes` 获取文件类型
- `fs.watch` 高效但平台差异大，`fs.watchFile` 稳定但性能低
- `stat` 获取文件详细信息，`lstat` 不跟随符号链接
- 文件监听需要防抖处理避免重复触发

下一章我们将学习 URL 解析。
