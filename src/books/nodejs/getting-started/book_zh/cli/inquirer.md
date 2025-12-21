# Inquirer.js 交互式问询

在上一章中，我们使用 `readline` 模块实现了基本的用户输入功能。虽然 readline 能够满足简单需求，但当我们需要构建列表选择、复选框、密码输入等复杂交互时，就需要大量的手动实现工作。

Inquirer.js 正是为了解决这个问题而生的。它提供了一套开箱即用的交互组件，让我们能够快速构建专业级的命令行交互体验。

## 为什么选择 Inquirer.js

在众多 CLI 交互库中，Inquirer.js 是最成熟和流行的选择：

| 对比项 | readline | Inquirer.js |
|--------|----------|-------------|
| 输入类型 | 仅文本 | 文本、列表、复选框、确认等 |
| 验证功能 | 手动实现 | 内置 validate |
| 条件逻辑 | 手动实现 | 内置 when |
| 开发效率 | 低 | 高 |

**核心优势**：
- **声明式 API**：通过配置对象定义问题，而不是编写交互逻辑
- **丰富的组件**：8 种问题类型覆盖几乎所有场景
- **可组合性**：多个问题可以串联，后面的问题可以依赖前面的答案

## 安装

```bash
npm install inquirer
```

> **版本说明**：Inquirer.js v9+ 使用 ESM，CommonJS 项目请使用 `inquirer@^8.2.6`

## 基本用法

Inquirer 的核心是 `prompt` 函数，它接收一个问题数组，返回包含所有答案的对象：

```javascript
const inquirer = require('inquirer');

async function main() {
  // prompt 接收问题数组，返回 answers 对象
  const answers = await inquirer.prompt([
    {
      type: 'input',     // 问题类型
      name: 'username',  // 答案的键名
      message: '请输入用户名:'  // 显示给用户的提示
    }
  ]);
  
  // answers 是一个对象，键名对应问题的 name
  console.log('用户名:', answers.username);
}

main();
```

**核心概念**：
- `type`：决定交互方式（文本输入、选择列表等）
- `name`：答案在返回对象中的键名
- `message`：显示给用户的提示文字

## 问题类型

Inquirer 提供了 8 种问题类型，覆盖不同的交互场景。选择合适的类型可以显著提升用户体验。

### input - 文本输入

最基础的问题类型，适用于需要用户自由输入文本的场景（如项目名称、描述等）。

```javascript
{
  type: 'input',
  name: 'name',
  message: '你的名字:',
  default: 'Guest'  // 用户直接回车时使用的默认值
}
```

### password - 密码输入

输入时会隐藏字符，适用于密码、API Key 等敏感信息。`mask` 选项决定显示什么字符（常用 `*`）。

```javascript
{
  type: 'password',
  name: 'password',
  message: '密码:',
  mask: '*'  // 每输入一个字符显示一个 *
}
```

### confirm - 确认

二选一的是/否问题，适用于确认操作、开关选项等场景。返回布尔值。

```javascript
{
  type: 'confirm',
  name: 'proceed',
  message: '是否继续?',
  default: true  // 默认选中 Yes
}
```

### list - 单选列表

当选项是固定的几个且用户只能选一个时使用。用方向键选择，回车确认。

```javascript
{
  type: 'list',
  name: 'framework',
  message: '选择框架:',
  choices: ['React', 'Vue', 'Angular', 'Svelte']
}
```

**与 rawlist 的区别**：list 使用方向键选择，rawlist 通过输入数字序号选择。list 更适合选项较少的场景。

### checkbox - 复选框

允许用户选择多个选项，适用于功能开关、可选依赖等场景。返回选中项的数组。

```javascript
{
  type: 'checkbox',
  name: 'features',
  message: '选择功能:',
  choices: [
    { name: 'TypeScript', checked: true },  // 默认选中
    { name: 'ESLint' },
    { name: 'Prettier' },
    { name: 'Testing' }
  ]
}
```

### rawlist - 带序号的列表

与 list 类似，但用户通过输入数字序号选择，适合键盘快速操作。

```javascript
{
  type: 'rawlist',
  name: 'color',
  message: '选择颜色:',
  choices: ['红色', '绿色', '蓝色']
}
```

### expand - 扩展选择

通过单个按键快速选择，类似于 Git 的 `y/n/a/x` 风格交互。适合需要快速决策的场景。

```javascript
{
  type: 'expand',
  name: 'action',
  message: '文件已存在，如何处理?',
  choices: [
    { key: 'y', name: '覆盖', value: 'overwrite' },
    { key: 'n', name: '跳过', value: 'skip' },
    { key: 'a', name: '全部覆盖', value: 'overwrite_all' },
    { key: 'x', name: '取消', value: 'abort' }
  ]
}
```

### editor - 编辑器

当需要用户输入多行文本时使用。会打开系统默认编辑器（由 `$EDITOR` 环境变量决定），适合输入长描述、提交信息等。

```javascript
{
  type: 'editor',
  name: 'description',
  message: '输入描述 (将打开编辑器):'
}
```

## 输入验证

用户输入往往需要验证。`validate` 函数在用户提交时调用，返回 `true` 表示通过，返回字符串表示错误信息并阻止提交。

**为什么需要验证**：CLI 工具不像 Web 表单可以事后修改，一旦开始执行就难以回退，因此前置验证尤为重要。

```javascript
{
  type: 'input',
  name: 'email',
  message: '邮箱:',
  validate(input) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(input)) {
      return true;
    }
    return '请输入有效的邮箱地址';
  }
}

{
  type: 'input',
  name: 'port',
  message: '端口号:',
  validate(input) {
    const port = parseInt(input, 10);
    if (port >= 1 && port <= 65535) {
      return true;
    }
    return '端口范围: 1-65535';
  }
}
```

## 输入过滤

`filter` 函数用于在存储答案之前对输入进行转换。与 `validate` 不同，`filter` 不会阻止提交，而是静默地转换数据。

**典型场景**：
- 去除首尾空格
- 统一大小写
- 转换数据类型（字符串转数字）

```javascript
{
  type: 'input',
  name: 'username',
  message: '用户名:',
  filter(input) {
    // 用户输入 "  John  " -> 存储为 "john"
    return input.toLowerCase().trim();
  }
}

{
  type: 'input',
  name: 'port',
  message: '端口:',
  filter(input) {
    // 用户输入 "3000" -> 存储为数字 3000
    return parseInt(input, 10);
  }
}
```

**执行顺序**：`filter` 先于 `validate` 执行，所以 `validate` 收到的是过滤后的值。

## 条件问题

`when` 函数让问题的显示取决于之前的回答，这是构建动态问卷的关键功能。

**为什么需要条件问题**：避免向用户询问不相关的问题。例如，只有在用户选择"需要数据库"时，才询问数据库类型。

```javascript
const answers = await inquirer.prompt([
  {
    type: 'confirm',
    name: 'useDatabase',
    message: '需要数据库支持吗?'
  },
  {
    type: 'list',
    name: 'database',
    message: '选择数据库:',
    choices: ['MySQL', 'PostgreSQL', 'MongoDB'],
    when: (answers) => answers.useDatabase  // 只有选择了数据库才显示
  },
  {
    type: 'input',
    name: 'dbHost',
    message: '数据库地址:',
    default: 'localhost',
    when: (answers) => answers.useDatabase  // 同样依赖 useDatabase
  }
]);
```

## 动态选项

有时选项需要在运行时生成，比如列出当前目录的文件。`choices` 可以是一个函数，在问题展示时执行。

```javascript
{
  type: 'list',
  name: 'file',
  message: '选择文件:',
  choices() {
    // 运行时读取目录，动态生成选项
    const fs = require('fs');
    return fs.readdirSync('.').filter(f => f.endsWith('.js'));
  }
}
```

**注意**：`choices` 函数也可以是 async 函数，支持异步获取选项（如从 API 获取）。

## 完整示例：项目初始化

下面是一个综合运用各种功能的项目初始化向导，展示了验证、过滤、条件问题的组合使用：

```javascript
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');

async function initProject() {
  console.log('\n🚀 项目初始化向导\n');
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '项目名称:',
      default: path.basename(process.cwd()),  // 默认使用当前目录名
      validate: (input) => {
        // npm 包名规范：小写字母、数字、连字符
        if (/^[a-z0-9-]+$/.test(input)) return true;
        return '只能包含小写字母、数字和连字符';
      }
    },
    {
      type: 'input',
      name: 'description',
      message: '项目描述:'
    },
    {
      type: 'input',
      name: 'author',
      message: '作者:'
    },
    {
      type: 'list',
      name: 'language',
      message: '选择语言:',
      choices: ['JavaScript', 'TypeScript']
    },
    {
      type: 'list',
      name: 'framework',
      message: '选择框架:',
      choices: ['Express', 'Koa', 'Fastify', '无框架']
    },
    {
      type: 'checkbox',
      name: 'features',
      message: '选择功能:',
      choices: [
        { name: 'ESLint', checked: true },
        { name: 'Prettier', checked: true },
        { name: 'Jest 测试' },
        { name: 'Docker 支持' },
        { name: 'CI/CD 配置' }
      ]
    },
    {
      type: 'confirm',
      name: 'useDatabase',
      message: '需要数据库?'
    },
    {
      type: 'list',
      name: 'database',
      message: '选择数据库:',
      choices: ['MySQL', 'PostgreSQL', 'MongoDB', 'SQLite'],
      when: (answers) => answers.useDatabase
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: '确认创建项目?'
    }
  ]);
  
  if (!answers.confirm) {
    console.log('已取消');
    return;
  }
  
  console.log('\n📦 项目配置:\n');
  console.log(`  名称: ${answers.name}`);
  console.log(`  语言: ${answers.language}`);
  console.log(`  框架: ${answers.framework}`);
  console.log(`  功能: ${answers.features.join(', ') || '无'}`);
  if (answers.database) {
    console.log(`  数据库: ${answers.database}`);
  }
  
  // 创建 package.json
  const pkg = {
    name: answers.name,
    version: '1.0.0',
    description: answers.description,
    author: answers.author,
    main: answers.language === 'TypeScript' ? 'dist/index.js' : 'src/index.js',
    scripts: {
      start: 'node src/index.js'
    }
  };
  
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
  console.log('\n✅ 项目创建成功！');
}

initProject();
```

## Inquirer.js v9+ (ESM)

新版本默认使用 ESM：

```javascript
import inquirer from 'inquirer';

const answers = await inquirer.prompt([
  {
    type: 'input',
    name: 'name',
    message: 'Name:'
  }
]);
```

或使用独立包：

```bash
npm install @inquirer/prompts
```

```javascript
import { input, select, confirm } from '@inquirer/prompts';

const name = await input({ message: 'Name:' });
const framework = await select({
  message: 'Framework:',
  choices: ['React', 'Vue', 'Angular']
});
const proceed = await confirm({ message: 'Continue?' });
```

## 本章小结

- Inquirer.js 提供丰富的交互组件
- `validate` 验证输入，`filter` 转换输入
- `when` 实现条件问题
- 动态 `choices` 支持运行时生成选项
- 新版本支持独立导入各组件

下一章我们将学习命令行美化。
