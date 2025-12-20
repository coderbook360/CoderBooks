# 完整 CLI 工具开发实战

综合运用前面所学，开发一个项目脚手架工具。

## 项目结构

```
create-app/
├── bin/
│   └── cli.js           # 入口文件
├── src/
│   ├── commands/
│   │   └── create.js    # create 命令
│   ├── templates/        # 项目模板
│   │   └── basic/
│   └── utils/
│       ├── logger.js     # 日志工具
│       ├── template.js   # 模板处理
│       └── git.js        # Git 操作
├── package.json
└── README.md
```

## package.json

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

## 入口文件

**bin/cli.js**

```javascript
#!/usr/bin/env node

const { program } = require('commander');
const pkg = require('../package.json');
const createCommand = require('../src/commands/create');

program
  .name('create-myapp')
  .description('快速创建项目')
  .version(pkg.version);

program
  .command('create <project-name>')
  .description('创建新项目')
  .option('-t, --template <template>', '项目模板', 'basic')
  .option('--no-git', '不初始化 Git')
  .option('--no-install', '不安装依赖')
  .action(createCommand);

program.parse();
```

## 日志工具

**src/utils/logger.js**

```javascript
const chalk = require('chalk');

const logger = {
  info(msg) {
    console.log(chalk.blue('ℹ'), msg);
  },
  
  success(msg) {
    console.log(chalk.green('✓'), msg);
  },
  
  warn(msg) {
    console.log(chalk.yellow('⚠'), msg);
  },
  
  error(msg) {
    console.log(chalk.red('✗'), msg);
  },
  
  title(msg) {
    console.log(chalk.bold.cyan(`\n${msg}\n`));
  }
};

module.exports = logger;
```

## 模板处理

**src/utils/template.js**

```javascript
const fs = require('fs-extra');
const path = require('path');

async function copyTemplate(templateName, targetDir, variables) {
  const templateDir = path.join(__dirname, '../templates', templateName);
  
  if (!await fs.pathExists(templateDir)) {
    throw new Error(`模板不存在: ${templateName}`);
  }
  
  // 复制模板
  await fs.copy(templateDir, targetDir);
  
  // 替换变量
  await replaceVariables(targetDir, variables);
}

async function replaceVariables(dir, variables) {
  const files = await fs.readdir(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      await replaceVariables(fullPath, variables);
    } else {
      let content = await fs.readFile(fullPath, 'utf-8');
      
      for (const [key, value] of Object.entries(variables)) {
        content = content.replaceAll(`{{${key}}}`, value);
      }
      
      await fs.writeFile(fullPath, content);
    }
  }
}

module.exports = { copyTemplate };
```

## Git 操作

**src/utils/git.js**

```javascript
const { execSync } = require('child_process');

function initGit(cwd) {
  try {
    execSync('git init', { cwd, stdio: 'ignore' });
    execSync('git add .', { cwd, stdio: 'ignore' });
    execSync('git commit -m "Initial commit"', { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

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

async function create(projectName, options) {
  logger.title('🚀 创建新项目');
  
  const targetDir = path.resolve(process.cwd(), projectName);
  
  // 检查目录是否存在
  if (await fs.pathExists(targetDir)) {
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
    
    await fs.remove(targetDir);
  }
  
  // 收集项目信息
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
  
  console.log();
  
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
  
  // 初始化 Git
  if (options.git && isGitInstalled()) {
    spinner.start('初始化 Git 仓库...');
    if (initGit(targetDir)) {
      spinner.succeed('Git 仓库初始化完成');
    } else {
      spinner.warn('Git 初始化失败');
    }
  }
  
  // 安装依赖
  if (options.install) {
    spinner.start('安装依赖...');
    try {
      const cmd = answers.packageManager === 'yarn' ? 'yarn' : `${answers.packageManager} install`;
      execSync(cmd, { cwd: targetDir, stdio: 'ignore' });
      spinner.succeed('依赖安装完成');
    } catch {
      spinner.warn('依赖安装失败，请手动执行');
    }
  }
  
  // 完成提示
  logger.title('✨ 项目创建成功！');
  
  console.log('  下一步:');
  console.log(`    cd ${projectName}`);
  
  if (!options.install) {
    console.log(`    ${answers.packageManager} install`);
  }
  
  console.log(`    ${answers.packageManager} ${answers.packageManager === 'npm' ? 'run ' : ''}dev`);
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
