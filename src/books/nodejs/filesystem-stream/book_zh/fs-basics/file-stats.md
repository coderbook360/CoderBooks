# 文件信息：stat 与 lstat

> 在操作文件之前，我们经常需要先了解它：文件有多大？什么时候修改的？是文件还是目录？`stat` 函数提供了这些关键信息。

## 获取文件状态

`stat` 返回文件或目录的详细信息：

```javascript
import { stat } from 'fs/promises';

const stats = await stat('package.json');

console.log({
  size: stats.size,           // 文件大小（字节）
  isFile: stats.isFile(),     // 是否是文件
  isDirectory: stats.isDirectory(),  // 是否是目录
  created: stats.birthtime,   // 创建时间
  modified: stats.mtime,      // 最后修改时间
  accessed: stats.atime,      // 最后访问时间
});
```

## Stats 对象详解

```javascript
const stats = await stat('file.txt');
```

### 类型判断方法

```javascript
stats.isFile()            // 是否是普通文件
stats.isDirectory()       // 是否是目录
stats.isSymbolicLink()    // 是否是符号链接（仅 lstat）
stats.isBlockDevice()     // 是否是块设备
stats.isCharacterDevice() // 是否是字符设备
stats.isFIFO()            // 是否是 FIFO（命名管道）
stats.isSocket()          // 是否是 Socket
```

### 大小和链接

```javascript
stats.size     // 文件大小（字节）
stats.blocks   // 分配的 512 字节块数
stats.blksize  // I/O 操作的块大小
stats.nlink    // 硬链接数
```

### 时间信息

```javascript
stats.atime      // Access Time: 最后访问时间
stats.mtime      // Modify Time: 最后修改时间（内容）
stats.ctime      // Change Time: 最后状态改变时间（权限等）
stats.birthtime  // Birth Time: 创建时间

// 获取毫秒级时间戳
stats.atimeMs
stats.mtimeMs
stats.ctimeMs
stats.birthtimeMs
```

```
时间线示例：
创建文件      → birthtime
写入内容      → mtime 更新
读取文件      → atime 更新
修改权限      → ctime 更新
```

### 权限和所有者

```javascript
stats.mode   // 权限模式（8进制数）
stats.uid    // 所有者用户 ID
stats.gid    // 所有者组 ID
stats.dev    // 设备 ID
stats.ino    // inode 号
```

## stat vs lstat

两者的区别在于对**符号链接**的处理：

```javascript
import { stat, lstat, symlink } from 'fs/promises';

// 创建符号链接
await symlink('target.txt', 'link.txt');

// stat 跟随链接，返回目标文件信息
const statInfo = await stat('link.txt');
console.log(statInfo.isFile());           // true（目标是文件）
console.log(statInfo.isSymbolicLink());   // false

// lstat 返回链接本身的信息
const lstatInfo = await lstat('link.txt');
console.log(lstatInfo.isFile());          // false
console.log(lstatInfo.isSymbolicLink());  // true
```

```
文件系统结构：
  target.txt  ← 实际文件
      ↑
  link.txt    ← 符号链接

stat('link.txt')   → 返回 target.txt 的信息
lstat('link.txt')  → 返回 link.txt 的信息
```

### 何时使用 lstat

- 遍历目录时检测符号链接，避免无限循环
- 需要获取链接本身的信息
- 删除符号链接而非目标文件

## 检查文件是否存在

虽然可以用 `stat` 检查文件是否存在，但有更好的方式：

```javascript
import { stat, access, constants } from 'fs/promises';

// 方式1：stat（不推荐用于仅检查存在性）
async function exists1(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

// 方式2：access（推荐，可以检查特定权限）
async function exists2(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// 方式3：直接操作，处理 ENOENT 错误（最佳实践）
import { readFile } from 'fs/promises';

async function readIfExists(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;  // 文件不存在
    }
    throw err;  // 其他错误
  }
}
```

### 为什么不建议先检查再操作

```javascript
// ❌ 竞态条件：检查和操作之间文件可能被删除
if (await exists(path)) {
  const content = await readFile(path);  // 可能失败！
}

// ✅ 直接操作，处理错误
try {
  const content = await readFile(path);
} catch (err) {
  if (err.code === 'ENOENT') {
    // 处理文件不存在
  }
}
```

## 使用 FileHandle 获取状态

如果文件已打开，可以通过 FileHandle 获取状态：

```javascript
import { open } from 'fs/promises';

const fh = await open('file.txt', 'r');
try {
  const stats = await fh.stat();
  console.log('文件大小:', stats.size);
} finally {
  await fh.close();
}
```

这比单独调用 `stat` 更高效，因为不需要再次查找文件。

## 实用示例

### 格式化文件大小

```javascript
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

const stats = await stat('video.mp4');
console.log(formatSize(stats.size));  // "1.23 GB"
```

### 检查文件是否过期

```javascript
async function isFileOlderThan(filePath, hours) {
  const stats = await stat(filePath);
  const ageMs = Date.now() - stats.mtimeMs;
  const ageHours = ageMs / (1000 * 60 * 60);
  return ageHours > hours;
}

// 缓存超过 24 小时就过期
if (await isFileOlderThan('cache.json', 24)) {
  console.log('缓存已过期，需要刷新');
}
```

### 获取目录大小

```javascript
import { stat, readdir } from 'fs/promises';
import path from 'path';

async function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  const entries = await readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      totalSize += await getDirectorySize(fullPath);  // 递归
    } else if (entry.isFile()) {
      const stats = await stat(fullPath);
      totalSize += stats.size;
    }
  }
  
  return totalSize;
}

const size = await getDirectorySize('./node_modules');
console.log('node_modules 大小:', formatSize(size));
```

## 性能考虑

`stat` 是一个系统调用，有一定开销：

```javascript
// ❌ 多次 stat 同一文件
const size = (await stat(path)).size;
const mtime = (await stat(path)).mtime;  // 又一次系统调用

// ✅ 一次获取所有信息
const stats = await stat(path);
const size = stats.size;
const mtime = stats.mtime;
```

对于批量操作，使用 `readdir` 的 `withFileTypes` 选项：

```javascript
// ❌ 每个文件都 stat
const files = await readdir('./src');
for (const file of files) {
  const stats = await stat(`./src/${file}`);
  if (stats.isDirectory()) { /* ... */ }
}

// ✅ readdir 直接返回类型信息
const entries = await readdir('./src', { withFileTypes: true });
for (const entry of entries) {
  if (entry.isDirectory()) { /* ... */ }  // 无需额外 stat
}
```

## 本章小结

- `stat` 返回文件的详细信息（大小、时间、权限等）
- `lstat` 不跟随符号链接
- 使用类型判断方法区分文件和目录
- 避免"先检查后操作"的模式，直接操作并处理错误
- 批量操作时使用 `readdir({ withFileTypes: true })` 提升性能

下一章我们将学习如何检查文件存在性和权限。