# path 模块：跨平台路径处理

永远不要手动拼接路径字符串。

这是 Node.js 开发的第一条铁律。路径分隔符在不同操作系统上不同：Windows 用反斜杠 `\`，而 Linux 和 macOS 用正斜杠 `/`。`path` 模块帮我们处理这个差异。

## 为什么不能手动拼接

```javascript
// 错误示范
const configPath = './config' + '/' + 'app.json';

// Windows 上可能出问题
const winPath = 'C:\\Users\\admin' + '\\' + 'data';
// 在 Linux 上运行会报错
```

问题在于：

1. 分隔符不一致
2. 无法处理相对路径
3. 无法规范化 `..` 和 `.`

## path.join：安全的路径拼接

```javascript
const path = require('path');

// 自动使用正确的分隔符
const configPath = path.join('config', 'app.json');
// Windows: 'config\\app.json'
// Linux/Mac: 'config/app.json'

// 可以处理多级路径
const deepPath = path.join('src', 'components', 'Button', 'index.js');

// 自动规范化 ..
const normalized = path.join('src', 'utils', '..', 'lib');
// 结果: 'src/lib'（规范化掉了 utils/..）
```

**核心规则**：`join` 只拼接，不解析为绝对路径。

## path.resolve：解析为绝对路径

```javascript
const path = require('path');

// 从当前工作目录解析
const abs = path.resolve('src', 'index.js');
// 假设 cwd 是 /home/user/project
// 结果: '/home/user/project/src/index.js'

// 遇到绝对路径会重新开始
const abs2 = path.resolve('src', '/etc', 'config');
// 结果: '/etc/config'（从 /etc 重新开始）

// 无参数返回当前目录
path.resolve();
// 等同于 process.cwd()
```

### join vs resolve 的区别

```javascript
const path = require('path');

// join: 单纯拼接
path.join('/base', 'sub', 'file.txt');
// 结果: '/base/sub/file.txt'

// resolve: 解析为绝对路径
path.resolve('/base', 'sub', 'file.txt');
// 结果: '/base/sub/file.txt'（碰巧相同）

// 区别在这里
path.join('base', 'sub');
// 结果: 'base/sub'（相对路径）

path.resolve('base', 'sub');
// 结果: '/当前工作目录/base/sub'（绝对路径）
```

**选择指南**：
- 只需要拼接路径片段 → `path.join`
- 需要得到绝对路径 → `path.resolve`

## 路径解析：拆分路径的各个部分

### path.dirname：获取目录名

```javascript
path.dirname('/home/user/project/src/index.js');
// 结果: '/home/user/project/src'

path.dirname('src/index.js');
// 结果: 'src'
```

### path.basename：获取文件名

```javascript
path.basename('/home/user/project/src/index.js');
// 结果: 'index.js'

// 可以去掉扩展名
path.basename('/src/index.js', '.js');
// 结果: 'index'
```

### path.extname：获取扩展名

```javascript
path.extname('index.js');     // '.js'
path.extname('app.test.js');  // '.js'（最后一个点之后）
path.extname('Makefile');     // ''（无扩展名）
path.extname('.gitignore');   // ''（点号开头不算扩展名）
```

### path.parse：完整解析

```javascript
const parsed = path.parse('/home/user/project/src/index.js');
console.log(parsed);
// {
//   root: '/',
//   dir: '/home/user/project/src',
//   base: 'index.js',
//   ext: '.js',
//   name: 'index'
// }
```

### path.format：反向操作

```javascript
const pathObject = {
  dir: '/home/user',
  name: 'file',
  ext: '.txt'
};
path.format(pathObject);
// 结果: '/home/user/file.txt'
```

## __dirname 和 __filename

在 CommonJS 模块中，Node.js 提供两个特殊变量：

```javascript
console.log(__filename);  // 当前文件的绝对路径
console.log(__dirname);   // 当前文件所在目录的绝对路径
```

常见用法：

```javascript
// 相对于当前文件定位其他资源
const configPath = path.join(__dirname, 'config', 'default.json');
const templatesDir = path.join(__dirname, '..', 'templates');
```

### ES Modules 中的替代方案

ES Modules 没有 `__dirname`，需要手动获取：

```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

## 其他实用方法

### path.isAbsolute：判断绝对路径

```javascript
path.isAbsolute('/home/user');  // true
path.isAbsolute('./src');       // false
path.isAbsolute('src');         // false

// Windows
path.win32.isAbsolute('C:\\Users');  // true
path.win32.isAbsolute('\\\\server'); // true（UNC 路径）
```

### path.relative：计算相对路径

```javascript
path.relative('/home/user/project', '/home/user/project/src/index.js');
// 结果: 'src/index.js'

path.relative('/home/user/project/src', '/home/user/project/lib');
// 结果: '../lib'
```

### path.normalize：规范化路径

```javascript
path.normalize('/home/user/../user/./project');
// 结果: '/home/user/project'

path.normalize('src//utils/../lib');
// 结果: 'src/lib'
```

## 跨平台处理

### path.sep 和 path.delimiter

```javascript
// 路径分隔符
path.sep;  // Windows: '\\', POSIX: '/'

// PATH 环境变量分隔符
path.delimiter;  // Windows: ';', POSIX: ':'
```

### 指定平台的方法

```javascript
// 强制使用 POSIX 风格
path.posix.join('home', 'user');  // 'home/user'

// 强制使用 Windows 风格
path.win32.join('home', 'user');  // 'home\\user'
```

## 实战示例

### 构建配置文件路径

```javascript
const path = require('path');

function getConfigPath(env = 'development') {
  return path.join(__dirname, 'config', `${env}.json`);
}

// 使用
const config = require(getConfigPath(process.env.NODE_ENV));
```

### 确保目录存在

```javascript
const fs = require('fs');
const path = require('path');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 使用
const outputPath = path.join(__dirname, 'dist', 'output.txt');
ensureDir(outputPath);
fs.writeFileSync(outputPath, 'content');
```

### 获取文件的相关路径

```javascript
function getRelatedPaths(filePath) {
  const parsed = path.parse(filePath);
  
  return {
    sourceMap: path.join(parsed.dir, `${parsed.name}.map`),
    backup: path.join(parsed.dir, `${parsed.name}.bak${parsed.ext}`),
    temp: path.join(parsed.dir, `.${parsed.base}.tmp`)
  };
}

getRelatedPaths('/project/src/app.js');
// {
//   sourceMap: '/project/src/app.map',
//   backup: '/project/src/app.bak.js',
//   temp: '/project/src/.app.js.tmp'
// }
```

## 本章小结

- 永远使用 `path` 模块处理路径，不要手动拼接字符串
- `path.join` 拼接路径片段，`path.resolve` 解析为绝对路径
- `path.parse` 和 `path.format` 用于路径解析和构建
- `__dirname` 和 `__filename` 获取当前文件位置
- 使用 `path.posix` 和 `path.win32` 处理跨平台场景

下一章我们将学习 `fs` 模块的文件操作。
