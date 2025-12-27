# 完整 CLI 工具开发实战

> 学了这么多理论，是时候把它们组合起来了！

本章我们将开发一个**项目脚手架工具**——类似于 `create-react-app` 或 `npm init vite`。通过这个实战项目，你将学会：

- 如何组织 CLI 项目结构
- 如何将交互、样式、模板处理结合使用
- 如何发布一个可全局安装的 npm 包

## 项目结构

好的项目结构让代码易于维护和扩展：

```
create-app/
├── bin/
│   └── cli.js           # 入口文件（npm 会链接到这里）
├── src/
│   ├── commands/
│   │   └── create.js    # create 命令的具体逻辑
│   ├── templates/       # 项目模板（会被复制到用户目录）
│   │   └── basic/
│   └── utils/
│       ├── logger.js    # 日志工具（统一输出样式）
│       ├── template.js  # 模板处理（复制 + 变量替换）
│       └── git.js       # Git 操作封装
├── package.json
└── README.md
```

> **为什么这样组织？**  
> - `bin/` 放入口文件，保持简洁
> - `commands/` 每个命令一个文件，易于扩展
> - `utils/` 放可复用的工具函数
> - `templates/` 放项目模板，可以有多个

## package.json

关键配置说明：

```json
{
  "name": "create-myapp",
  "version": "1.0.0",
  "description": "项目脚手架",
  "bin": {
    "create-myapp": "./bin/cli.js"
  },
  "files": [
    "bin",
    "src"
  ],
  "dependencies": {
    "commander": "^11.0.0",
    "inquirer": "^8.2.6",
    "chalk": "^4.1.2",
    "ora": "^5.4.1",
    "fs-extra": "^11.1.1"
  }
}
```

| 字段 | 说明 |
|------|------|
| `bin` | 定义命令名到入口文件的映射。npm install -g 时会创建可执行链接 |
| `files` | 发布时包含的文件。不写则默认包含所有（除 .gitignore 忽略的） |
| `dependencies` | 运行时依赖。注意选择 ESM/CJS 兼容的版本 |

## 入口文件

入口文件应该保持简洁，只做命令注册：

**bin/cli.js**

```javascript
#!/usr/bin/env node
// ↑ 这行叫 shebang，告诉系统用 node 执行此文件

const { program } = require('commander');
const pkg = require('../package.json');
const createCommand = require('../src/commands/create');

// 设置 CLI 基本信息
program
  .name('create-myapp')
  .description('快速创建项目')
  .version(pkg.version);  // 从 package.json 读取版本

// 注册 create 命令
program
  .command('create <project-name>')  // <> 表示必填参数
  .description('创建新项目')
  .option('-t, --template <template>', '项目模板', 'basic')  // 可选参数，默认 basic
  .option('--no-git', '不初始化 Git')     // --no-xxx 会变成 options.git = false
  .option('--no-install', '不安装依赖')
  .action(createCommand);  // 命令处理函数

// 解析命令行参数
program.parse();
```

## 日志工具

统一的日志样式让输出更专业：

**src/utils/logger.js**

```javascript
const chalk = require('chalk');

/**
 * 日志工具
 * 为什么要封装？
 * 1. 统一输出格式
 * 2. 方便后续添加日志级别控制
 * 3. 一处修改，处处生效
 */
const logger = {
  // 普通信息——蓝色图标
  info(msg) {
    console.log(chalk.blue('ℹ'), msg);
  },
  
  // 成功信息——绿色对勾
  success(msg) {
    console.log(chalk.green('✓'), msg);
  },
  
  // 警告信息——黄色感叹号
  warn(msg) {
    console.log(chalk.yellow('⚠'), msg);
  },
  
  // 错误信息——红色叉号
  error(msg) {
    console.log(chalk.red('✗'), msg);
  },
  
  // 标题——青色加粗，前后空行
  title(msg) {
    console.log(chalk.bold.cyan(`\n${msg}\n`));
  }
};

module.exports = logger;
```

## 模板处理

脚手架的核心功能——复制模板并替换变量：

**src/utils/template.js**

```javascript
const fs = require('fs-extra');
const path = require('path');

/**
 * 复制模板到目标目录
 * @param {string} templateName - 模板名（对应 templates 下的文件夹）
 * @param {string} targetDir - 目标目录
 * @param {Object} variables - 要替换的变量（如 { projectName: 'my-app' }）
 */
async function copyTemplate(templateName, targetDir, variables) {
  // 计算模板目录的绝对路径
  const templateDir = path.join(__dirname, '../templates', templateName);
  
  // 检查模板是否存在
  if (!await fs.pathExists(templateDir)) {
    throw new Error(`模板不存在: ${templateName}`);
  }
  
  // 复制整个目录
  await fs.copy(templateDir, targetDir);
  
  // 替换模板变量
  await replaceVariables(targetDir, variables);
}

/**
 * 递归替换目录中所有文件的变量
 * 变量格式：{{variableName}}
 */
async function replaceVariables(dir, variables) {
  const files = await fs.readdir(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      // 递归处理子目录
      await replaceVariables(fullPath, variables);
    } else {
      // 读取文件内容
      let content = await fs.readFile(fullPath, 'utf-8');
      
      // 替换所有变量
      for (const [key, value] of Object.entries(variables)) {
        // {{projectName}} -> 实际值
        content = content.replaceAll(`{{${key}}}`, value);
      }
      
      // 写回文件
      await fs.writeFile(fullPath, content);
    }
  }
}

module.exports = { copyTemplate };
```

## Git 操作

封装 Git 初始化逻辑：

**src/utils/git.js**

```javascript
const { execSync } = require('child_process');

/**
 * 初始化 Git 仓库并创建首次提交
 * @param {string} cwd - 工作目录
 * @returns {boolean} 是否成功
 */
function initGit(cwd) {
  try {
    // stdio: 'ignore' 隐藏 git 的输出
    execSync('git init', { cwd, stdio: 'ignore' });
    execSync('git add .', { cwd, stdio: 'ignore' });
    execSync('git commit -m "Initial commit"', { cwd, stdio: 'ignore' });
    return true;
  } catch {
    // 可能的失败原因：git 未配置 user.name/email
    return false;
  }
}

/**
 * 检查 Git 是否已安装
 */
function isGitInstalled() {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

module.exports = { initGit, isGitInstalled };
```

## Create 命令

这是脚手架的核心——整合所有模块：

**src/commands/create.js**

```javascript
const path = require('path');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const ora = require('ora');
const { execSync } = require('child_process');
const logger = require('../utils/logger');
const { copyTemplate } = require('../utils/template');
const { initGit, isGitInstalled } = require('../utils/git');

/**
 * create 命令的处理函数
 * @param {string} projectName - 项目名（来自命令行参数）
 * @param {Object} options - 选项（--template, --git, --install）
 */
async function create(projectName, options) {
  logger.title('🚀 创建新项目');
  
  // 计算目标目录的绝对路径
  const targetDir = path.resolve(process.cwd(), projectName);
  
  // ===== 第一步：检查目录是否存在 =====
  if (await fs.pathExists(targetDir)) {
    // 目录存在，询问用户是否覆盖
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `目录 ${projectName} 已存在，是否覆盖?`,
        default: false
      }
    ]);
    
    if (!overwrite) {
      logger.info('已取消');
      return;
    }
    
    // 删除旧目录
    await fs.remove(targetDir);
  }
  
  // ===== 第二步：收集项目信息 =====
  const answers = await inquirer.prompt([
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
      name: 'packageManager',
      message: '包管理器:',
      choices: ['npm', 'pnpm', 'yarn']
    }
  ]);
  
  console.log();  // 空行，美观
  
  // ===== 第三步：创建项目 =====
  
  // 创建目录
  const spinner = ora('创建项目目录...').start();
  await fs.ensureDir(targetDir);
  spinner.succeed('目录创建完成');
  
  // 复制模板
  spinner.start('复制项目模板...');
  await copyTemplate(options.template, targetDir, {
    projectName,
    description: answers.description,
    author: answers.author
  });
  spinner.succeed('模板复制完成');
  
  // 初始化 Git（如果用户没有禁用）
  if (options.git && isGitInstalled()) {
    spinner.start('初始化 Git 仓库...');
    if (initGit(targetDir)) {
      spinner.succeed('Git 仓库初始化完成');
    } else {
      spinner.warn('Git 初始化失败（可能未配置 user.name/email）');
    }
  }
  
  // 安装依赖
  if (options.install) {
    spinner.start('安装依赖...');
    try {
      // yarn 不需要 install 子命令
      const cmd = answers.packageManager === 'yarn' 
        ? 'yarn' 
        : `${answers.packageManager} install`;
      execSync(cmd, { cwd: targetDir, stdio: 'ignore' });
      spinner.succeed('依赖安装完成');
    } catch {
      spinner.warn('依赖安装失败，请手动执行');
    }
  }
  
  // ===== 第四步：显示后续步骤 =====
  logger.title('✨ 项目创建成功！');
  
  console.log('  下一步:');
  console.log(`    cd ${projectName}`);
  
  if (!options.install) {
    console.log(`    ${answers.packageManager} install`);
  }
  
  // npm 需要 run，pnpm/yarn 不需要
  const runCmd = answers.packageManager === 'npm' ? 'npm run dev' : `${answers.packageManager} dev`;
  console.log(`    ${runCmd}`);
  console.log();
}

module.exports = create;
```

## 项目模板

**src/templates/basic/package.json**

```json
{
  "name": "{{projectName}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "author": "{{author}}",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js"
  }
}
```

**src/templates/basic/src/index.js**

```javascript
console.log('Hello from {{projectName}}!');
```

**src/templates/basic/.gitignore**

```
node_modules/
.DS_Store
*.log
```

## 使用方式

```bash
# 开发时
node bin/cli.js create my-project

# 安装后
npx create-myapp create my-project
create-myapp create my-project --template express --no-git
```

## 错误处理

添加全局错误处理：

**bin/cli.js**

```javascript
#!/usr/bin/env node

const chalk = require('chalk');

// 未捕获的 Promise 错误
process.on('unhandledRejection', (err) => {
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});

// 主程序
const { program } = require('commander');
// ... 其余代码
```

## 本章小结

- 清晰的项目结构便于维护
- 入口文件处理命令行参数
- 模块化拆分：命令、工具、模板
- 交互式收集用户输入
- 进度提示提升体验
- 错误处理确保程序健壮

下一章我们将学习如何发布到 npm。
