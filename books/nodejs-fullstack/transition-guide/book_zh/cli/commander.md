# Commander.js 命令行框架

在上一章中，我们学习了 `process.argv` 和 minimist 来解析命令行参数。虽然它们能完成基本任务，但当 CLI 工具变得复杂时（多个子命令、嵌套选项、帮助信息生成），手动处理就变得繁琐且容易出错。

Commander.js 是 Node.js 生态中最成熟的命令行框架，被 Vue CLI、Create React App、webpack-cli 等知名工具采用。它采用**声明式 API**，让你通过链式调用描述命令结构，框架自动处理解析、验证和帮助信息生成。

## 为什么选择 Commander.js

| 特性 | 手动解析 | Commander.js |
|------|----------|--------------|
| 帮助信息 | 手动编写 | 自动生成 |
| 版本管理 | 手动处理 | 内置 `-V` |
| 子命令 | 复杂实现 | 声明式定义 |
| 参数验证 | 手动校验 | 自动验证 |
| 学习成本 | 低 | 低（API 直观） |

## 安装

```bash
npm install commander
```

## 基本用法

Commander 采用链式 API，每个方法调用都在描述 CLI 的一个方面：

```javascript
const { program } = require('commander');

program
  .name('mycli')              // CLI 名称（显示在帮助信息中）
  .description('My CLI application')  // 描述
  .version('1.0.0');          // 版本号，自动添加 -V, --version

program.parse();  // 解析 process.argv
```

运行帮助（自动生成）：

```bash
node app.js --help
# Usage: mycli [options]
# My CLI application
# Options:
#   -V, --version  output the version number
#   -h, --help     display help for command

node app.js -V
# 1.0.0
```

## 定义选项

选项是 CLI 最常用的功能。Commander 使用特定语法来描述选项：

```javascript
const { program } = require('commander');

program
  .option('-v, --verbose', '显示详细输出')           // 布尔开关
  .option('-c, --config <path>', '配置文件路径', 'config.json')  // 必需参数+默认值
  .option('-p, --port <number>', '端口号', '3000');  // 必需参数+默认值

program.parse();

const options = program.opts();  // 获取解析后的选项
console.log(options);
```

```bash
node app.js -v --port 8080
# { verbose: true, config: 'config.json', port: '8080' }
```

### 选项语法详解

Commander 使用尖括号和方括号来区分参数是否必需：

| 语法 | 含义 | 示例 |
|------|------|------|
| `<value>` | 必需参数 | `--config <path>` 必须提供路径 |
| `[value]` | 可选参数 | `--ext [types]` 可以不提供值 |
| 无参数 | 布尔开关 | `--verbose` 存在即为 true |

**为什么这样设计**：这种语法借鉴了 Unix 命令行的惯例，让熟悉命令行的用户一眼就能理解用法。

```javascript
program
  .option('-r, --recursive', '递归处理')           // 布尔选项：存在即 true
  .option('-o, --output <dir>', '输出目录')        // 必需参数：不提供会报错
  .option('-e, --ext [extensions]', '文件扩展名')  // 可选参数：可以只写 --ext
  .option('-n, --number <n>', '数量', '10');       // 带默认值：不提供时使用 '10'
```

## 定义命令

当 CLI 工具需要支持多个操作时（如 `git add`、`git commit`），就需要定义子命令。每个命令有自己的选项和执行逻辑：

```javascript
const { program } = require('commander');

program
  .command('build')           // 命令名称
  .description('构建项目')     // 命令描述（显示在帮助中）
  .option('-m, --minify', '压缩代码')
  .option('-o, --output <dir>', '输出目录', 'dist')
  .action((options) => {      // 命令执行函数
    console.log('Building...');
    console.log('Options:', options);
  });

program
  .command('dev')
  .description('启动开发服务器')
  .option('-p, --port <number>', '端口号', '3000')
  .action((options) => {
    console.log(`Starting dev server on port ${options.port}`);
  });

program.parse();
```

```bash
node app.js build --minify
node app.js dev --port 8080
```

## 命令参数

命令可以接收位置参数（不带 `--` 前缀的参数）。参数在 `action` 回调中按顺序接收：

```javascript
program
  .command('greet <name>')    // name 是必需的位置参数
  .description('问候某人')
  .option('-l, --loud', '大声说')
  .action((name, options) => {  // 位置参数在前，选项对象在后
    const greeting = `Hello, ${name}!`;
    console.log(options.loud ? greeting.toUpperCase() : greeting);
  });

program
  .command('add <numbers...>')  // ... 表示接收多个参数
  .description('求和')
  .action((numbers) => {        // numbers 是数组
    const sum = numbers.reduce((a, b) => a + Number(b), 0);
    console.log(`Sum: ${sum}`);
  });
```

```bash
node app.js greet John --loud
# HELLO, JOHN!

node app.js add 1 2 3 4 5
# Sum: 15
```

### 参数语法详解

| 语法 | 含义 | 示例 |
|------|------|------|
| `<name>` | 必需参数 | `greet <name>` 不提供会报错 |
| `[name]` | 可选参数 | `greet [name]` 可以不提供 |
- `<names...>`：多个必需参数
- `[names...]`：多个可选参数

## 子命令模式

```javascript
const { program } = require('commander');

// user 命令组
const user = program.command('user').description('用户管理');

user
  .command('list')
  .description('列出所有用户')
  .action(() => {
    console.log('User list...');
  });

user
  .command('add <name>')
  .description('添加用户')
  .option('-e, --email <email>', '邮箱')
  .action((name, options) => {
    console.log(`Adding user ${name}, email: ${options.email}`);
  });

user
  .command('delete <id>')
  .description('删除用户')
  .action((id) => {
    console.log(`Deleting user ${id}`);
  });

program.parse();
```

```bash
node app.js user list
node app.js user add John --email john@example.com
node app.js user delete 123
```

## 类型转换

```javascript
function parseInteger(value) {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error('Not a valid number');
  }
  return parsed;
}

function collect(value, previous) {
  return previous.concat([value]);
}

program
  .option('-p, --port <number>', '端口号', parseInteger, 3000)
  .option('-t, --tag <tag>', '标签', collect, []);

program.parse();
console.log(program.opts());
```

```bash
node app.js --port 8080 --tag a --tag b --tag c
# { port: 8080, tag: ['a', 'b', 'c'] }
```

## 必需选项

```javascript
program
  .requiredOption('-c, --config <path>', '配置文件路径是必需的');

program.parse();
```

```bash
node app.js
# error: required option '-c, --config <path>' not specified
```

## 自定义帮助

```javascript
program
  .name('mycli')
  .description('My awesome CLI')
  .version('1.0.0')
  .addHelpText('after', `

Examples:
  $ mycli build --minify
  $ mycli dev --port 8080
  $ mycli user add John --email john@example.com
`);

program.parse();
```

## 错误处理

```javascript
program
  .command('process <file>')
  .action((file) => {
    try {
      // 处理文件
      if (!require('fs').existsSync(file)) {
        throw new Error(`File not found: ${file}`);
      }
      console.log(`Processing ${file}...`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });
```

## 完整示例

```javascript
const { program } = require('commander');
const fs = require('fs');
const path = require('path');

program
  .name('filetool')
  .description('文件处理工具')
  .version('1.0.0');

// list 命令
program
  .command('list [dir]')
  .description('列出目录内容')
  .option('-a, --all', '显示隐藏文件')
  .option('-l, --long', '详细信息')
  .action((dir = '.', options) => {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      if (!options.all && file.startsWith('.')) continue;
      
      if (options.long) {
        const stats = fs.statSync(path.join(dir, file));
        const type = stats.isDirectory() ? 'd' : '-';
        const size = stats.size.toString().padStart(10);
        console.log(`${type} ${size} ${file}`);
      } else {
        console.log(file);
      }
    }
  });

// copy 命令
program
  .command('copy <src> <dest>')
  .description('复制文件')
  .option('-f, --force', '覆盖已存在的文件')
  .action((src, dest, options) => {
    if (fs.existsSync(dest) && !options.force) {
      console.error('目标文件已存在，使用 --force 覆盖');
      process.exit(1);
    }
    
    fs.copyFileSync(src, dest);
    console.log(`Copied ${src} to ${dest}`);
  });

// find 命令
program
  .command('find <pattern>')
  .description('搜索文件')
  .option('-d, --dir <dir>', '搜索目录', '.')
  .option('-t, --type <type>', '文件类型 (f=文件, d=目录)')
  .action((pattern, options) => {
    function search(dir) {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          if (options.type !== 'f' && file.includes(pattern)) {
            console.log(fullPath);
          }
          search(fullPath);
        } else {
          if (options.type !== 'd' && file.includes(pattern)) {
            console.log(fullPath);
          }
        }
      }
    }
    
    search(options.dir);
  });

program.parse();
```

使用：

```bash
node filetool.js list -la
node filetool.js copy src.txt dest.txt --force
node filetool.js find .js --dir ./src
```

## 本章小结

- Commander.js 提供声明式的命令定义
- `option()` 定义选项，`command()` 定义命令
- `<>` 表示必需，`[]` 表示可选
- `action()` 定义命令执行函数
- 支持子命令、类型转换、自定义帮助

下一章我们将学习命令行交互。
