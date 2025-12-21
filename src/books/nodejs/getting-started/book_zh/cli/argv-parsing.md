# process.argv 与参数解析基础

Node.js 命令行工具的第一步是获取用户输入的参数。

## process.argv 结构

```javascript
console.log(process.argv);
```

运行 `node app.js hello --name=world`，输出：

```javascript
[
  '/usr/local/bin/node',     // Node.js 可执行文件路径
  '/path/to/app.js',         // 脚本文件路径
  'hello',                   // 第一个参数
  '--name=world'             // 第二个参数
]
```

**关键点**：
- `process.argv[0]`：Node.js 路径
- `process.argv[1]`：脚本路径
- `process.argv[2]` 及之后：用户传入的参数

## 获取用户参数

```javascript
const args = process.argv.slice(2);
console.log(args);
// ['hello', '--name=world']
```

## 位置参数

按位置读取参数：

```javascript
// greet.js
const args = process.argv.slice(2);
const name = args[0] || 'World';

console.log(`Hello, ${name}!`);
```

```bash
node greet.js John
# Hello, John!

node greet.js
# Hello, World!
```

## 解析选项参数

### --key=value 格式

```javascript
function parseArgs(args) {
  const result = {
    _: []  // 位置参数
  };
  
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      result[key] = value ?? true;
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      result[key] = true;
    } else {
      result._.push(arg);
    }
  }
  
  return result;
}

// 测试
const args = process.argv.slice(2);
console.log(parseArgs(args));
```

```bash
node app.js build --output=dist --minify -v
# { _: ['build'], output: 'dist', minify: true, v: true }
```

### --key value 格式

```javascript
function parseArgs(args) {
  const result = { _: [] };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      
      // 检查是否有 = 
      if (key.includes('=')) {
        const [k, v] = key.split('=');
        result[k] = v;
      } else {
        // 检查下一个参数是否是值
        const next = args[i + 1];
        if (next && !next.startsWith('-')) {
          result[key] = next;
          i++;  // 跳过下一个
        } else {
          result[key] = true;
        }
      }
    } else if (arg.startsWith('-')) {
      result[arg.slice(1)] = true;
    } else {
      result._.push(arg);
    }
  }
  
  return result;
}
```

```bash
node app.js --name John --verbose
# { _: [], name: 'John', verbose: true }
```

## 短选项组合

处理 `-abc` 等于 `-a -b -c`：

```javascript
function parseArgs(args) {
  const result = { _: [] };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (key.includes('=')) {
        const [k, v] = key.split('=');
        result[k] = v;
      } else {
        const next = args[i + 1];
        if (next && !next.startsWith('-')) {
          result[key] = next;
          i++;
        } else {
          result[key] = true;
        }
      }
    } else if (arg.startsWith('-') && arg.length > 2) {
      // 短选项组合
      for (const char of arg.slice(1)) {
        result[char] = true;
      }
    } else if (arg.startsWith('-')) {
      result[arg.slice(1)] = true;
    } else {
      result._.push(arg);
    }
  }
  
  return result;
}
```

```bash
node app.js -abc
# { _: [], a: true, b: true, c: true }
```

## 类型转换

自动转换数字和布尔值：

```javascript
function coerceValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (!isNaN(value) && value !== '') return Number(value);
  return value;
}

function parseArgs(args) {
  const result = { _: [] };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (key.includes('=')) {
        const [k, v] = key.split('=');
        result[k] = coerceValue(v);
      } else {
        const next = args[i + 1];
        if (next && !next.startsWith('-')) {
          result[key] = coerceValue(next);
          i++;
        } else {
          result[key] = true;
        }
      }
    } else if (arg.startsWith('-')) {
      result[arg.slice(1)] = true;
    } else {
      result._.push(arg);
    }
  }
  
  return result;
}
```

```bash
node app.js --port 3000 --debug true
# { _: [], port: 3000, debug: true }
```

## 使用 minimist

实际项目中推荐使用成熟的库：

```bash
npm install minimist
```

```javascript
const minimist = require('minimist');

const args = minimist(process.argv.slice(2));
console.log(args);
```

```bash
node app.js build --output dist -v --port 3000
# { _: ['build'], output: 'dist', v: true, port: 3000 }
```

### minimist 配置

```javascript
const args = minimist(process.argv.slice(2), {
  string: ['output'],      // 强制为字符串
  boolean: ['verbose'],    // 强制为布尔
  alias: {
    v: 'verbose',
    o: 'output'
  },
  default: {
    output: './dist',
    verbose: false
  }
});

console.log(args);
```

```bash
node app.js -v -o build
# { _: [], verbose: true, output: 'build', v: true, o: 'build' }
```

## 完整示例

```javascript
const minimist = require('minimist');

const args = minimist(process.argv.slice(2), {
  boolean: ['help', 'version', 'verbose'],
  string: ['config', 'output'],
  alias: {
    h: 'help',
    V: 'version',
    v: 'verbose',
    c: 'config',
    o: 'output'
  },
  default: {
    config: 'config.json',
    output: './dist'
  }
});

if (args.help) {
  console.log(`
Usage: mycli [command] [options]

Commands:
  build     Build the project
  dev       Start dev server

Options:
  -h, --help       Show help
  -V, --version    Show version
  -v, --verbose    Verbose output
  -c, --config     Config file path
  -o, --output     Output directory
  `);
  process.exit(0);
}

if (args.version) {
  console.log('1.0.0');
  process.exit(0);
}

const command = args._[0];

if (args.verbose) {
  console.log('Arguments:', args);
}

switch (command) {
  case 'build':
    console.log(`Building to ${args.output}...`);
    break;
  case 'dev':
    console.log('Starting dev server...');
    break;
  default:
    console.log('Unknown command. Use --help for usage.');
}
```

## 本章小结

- `process.argv.slice(2)` 获取用户参数
- 手动解析适合简单场景
- `minimist` 适合中等复杂度
- 复杂 CLI 使用 Commander.js（下一章介绍）

下一章我们将学习 Commander.js 命令行框架。
