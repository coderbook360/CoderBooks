# 命令行美化：chalk 与 ora

命令行工具的用户体验不仅取决于功能是否完善，视觉呈现同样重要。想象一下：当执行一个耗时操作时，如果终端毫无反馈，用户会以为程序卡住了；当输出一堆无差别的白色文字时，用户很难快速定位关键信息。

本章介绍两个解决这些问题的核心工具：
- **chalk**：为终端输出添加颜色，让成功、警告、错误一目了然
- **ora**：显示加载动画，让用户知道程序正在工作

## 为什么需要颜色

人类视觉系统对颜色非常敏感。在信息密集的终端输出中：
- **红色**立即吸引注意力 → 用于错误
- **绿色**传递积极信号 → 用于成功
- **黄色**警示但不紧急 → 用于警告
- **蓝色/灰色**辅助信息 → 用于提示

这不是装饰，而是**信息设计**。

## chalk 基础

```bash
npm install chalk
```

> **版本说明**：chalk v5+ 是 ESM-only，CommonJS 项目请使用 `npm install chalk@4`

```javascript
const chalk = require('chalk');

// 颜色即语义
console.log(chalk.red('错误信息'));    // 出错了
console.log(chalk.green('成功信息'));  // 操作成功
console.log(chalk.yellow('警告信息')); // 需要注意
console.log(chalk.blue('提示信息'));   // 普通信息
```

## 颜色和样式

### 前景色

chalk 支持 16 种基础颜色。选择颜色时考虑其语义含义：

```javascript
// 常用颜色（有明确语义）
console.log(chalk.red('红色'));      // 错误、危险
console.log(chalk.green('绿色'));    // 成功、安全
console.log(chalk.yellow('黄色'));   // 警告、注意
console.log(chalk.blue('蓝色'));     // 信息、链接
console.log(chalk.gray('灰色'));     // 次要信息

// 其他颜色（装饰性）
console.log(chalk.magenta('品红'));
console.log(chalk.cyan('青色'));
console.log(chalk.white('白色'));
```

### 背景色

背景色用于强调特别重要的信息，但要谨慎使用——过多的背景色会让界面混乱：

```javascript
console.log(chalk.bgRed('红色背景'));        // 严重错误
console.log(chalk.bgGreen('绿色背景'));      // 重要成功
console.log(chalk.bgYellow.black('黄色背景黑字'));  // 注意文字颜色对比度
```

### 样式

样式可以独立使用或与颜色组合：

```javascript
console.log(chalk.bold('粗体'));         // 强调
console.log(chalk.dim('暗淡'));          // 次要信息
console.log(chalk.italic('斜体'));       // 引用、注释
console.log(chalk.underline('下划线'));  // 链接
console.log(chalk.inverse('反色'));      // 高亮选中
console.log(chalk.strikethrough('删除线'));  // 废弃内容
```

## 链式调用

chalk 的强大之处在于可以链式组合多种样式。注意组合时的可读性：

```javascript
console.log(chalk.red.bold('红色粗体'));           // 严重错误
console.log(chalk.bgBlue.white.bold('蓝底白字粗体'));  // 标题
console.log(chalk.green.underline('绿色下划线'));    // 成功的链接
```

## 模板字符串

```javascript
console.log(`
  ${chalk.green('✓')} 安装成功
  ${chalk.red('✗')} 安装失败
  ${chalk.yellow('!')} 警告
`);
```

## 日志工具封装

```javascript
const chalk = require('chalk');

const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✓'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg)
};

log.info('开始处理...');
log.success('处理完成');
log.warn('文件已存在');
log.error('发生错误');
```

## ora 加载动画

```bash
npm install ora
```

> **版本说明**：ora v6+ 是 ESM-only，CommonJS 项目请使用 `npm install ora@5`

```javascript
const ora = require('ora');

// 创建并启动 spinner
const spinner = ora('加载中...').start();

// 2秒后显示成功状态
setTimeout(() => {
  spinner.succeed('加载完成');  // 替换动画为 ✓
}, 2000);
```

**工作原理**：ora 通过不断更新同一行内容来实现动画效果。它使用 ANSI 转义码控制光标位置，这也是为什么它只能在支持 ANSI 的终端中正常工作。

## spinner 状态

spinner 有多种结束状态，表达不同的操作结果：

```javascript
const ora = require('ora');

async function process() {
  const spinner = ora('下载中...').start();
  
  try {
    await download();
    spinner.succeed('下载完成');  // 操作成功
  } catch (err) {
    spinner.fail('下载失败');     // 操作失败
  }
}
```

### 状态方法详解

每个状态会停止动画并显示对应图标：

```javascript
spinner.start('开始处理');   // ⏳ 开始动画
spinner.stop();              // 停止，不显示任何图标
spinner.succeed('成功');     // ✓ 绿色勾
spinner.fail('失败');        // ✗ 红色叉
spinner.warn('警告');        // ⚠ 黄色警告
spinner.info('信息');        // ℹ 蓝色信息
```

**最佳实践**：始终用状态方法结束 spinner，否则动画会一直运行。

### 更新文本

长时间操作时，可以动态更新提示文本让用户了解进度：

```javascript
const spinner = ora('步骤 1/3: 下载依赖...').start();

setTimeout(() => {
  spinner.text = '步骤 2/3: 编译代码...';  // 更新文本，动画继续
}, 1000);

setTimeout(() => {
  spinner.text = '步骤 3/3: 生成文档...';
}, 2000);

setTimeout(() => {
  spinner.succeed('全部完成');  // 停止动画
}, 3000);
```

## 自定义 spinner

```javascript
const spinner = ora({
  text: '处理中...',
  spinner: 'dots',  // 动画类型
  color: 'cyan'
}).start();
```

可用的动画类型：`dots`, `dots2`, `line`, `star`, `hamburger`, `balloon` 等。

## 组合使用

```javascript
const chalk = require('chalk');
const ora = require('ora');

async function deploy() {
  console.log(chalk.bold('\n🚀 开始部署\n'));
  
  // 步骤 1
  const build = ora('构建项目...').start();
  await sleep(1500);
  build.succeed('构建完成');
  
  // 步骤 2
  const upload = ora('上传文件...').start();
  await sleep(2000);
  upload.succeed('上传完成');
  
  // 步骤 3
  const restart = ora('重启服务...').start();
  await sleep(1000);
  restart.succeed('服务已重启');
  
  console.log(chalk.green.bold('\n✓ 部署成功！\n'));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

deploy();
```

## 进度条

使用 cli-progress：

```bash
npm install cli-progress
```

```javascript
const cliProgress = require('cli-progress');

const bar = new cliProgress.SingleBar({
  format: '进度 |{bar}| {percentage}% | {value}/{total}',
  barCompleteChar: '█',
  barIncompleteChar: '░'
});

bar.start(100, 0);

let value = 0;
const timer = setInterval(() => {
  value += 10;
  bar.update(value);
  
  if (value >= 100) {
    clearInterval(timer);
    bar.stop();
    console.log('\n完成！');
  }
}, 200);
```

## 完整示例

```javascript
const chalk = require('chalk');
const ora = require('ora');
const cliProgress = require('cli-progress');

async function install() {
  console.log(chalk.bold.cyan('\n📦 安装依赖\n'));
  
  const packages = ['express', 'lodash', 'axios', 'dayjs', 'uuid'];
  
  const bar = new cliProgress.SingleBar({
    format: `${chalk.cyan('{bar}')} {percentage}% | {package}`,
    barCompleteChar: '█',
    barIncompleteChar: '░',
    hideCursor: true
  });
  
  bar.start(packages.length, 0, { package: '' });
  
  for (let i = 0; i < packages.length; i++) {
    bar.update(i + 1, { package: packages[i] });
    await sleep(500);
  }
  
  bar.stop();
  
  console.log(chalk.green('\n✓ 安装完成！\n'));
  
  console.log(chalk.gray('已安装的包:'));
  packages.forEach(pkg => {
    console.log(`  ${chalk.green('+')} ${pkg}`);
  });
  console.log();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

install();
```

## chalk v5+ (ESM)

新版本使用 ESM：

```javascript
import chalk from 'chalk';

console.log(chalk.red('错误'));
```

CommonJS 项目使用 v4：

```bash
npm install chalk@4
```

## 本章小结

- chalk 提供彩色输出，支持链式调用
- ora 显示加载动画，支持多种状态
- cli-progress 显示进度条
- 组合使用提升用户体验
- 注意 ESM/CommonJS 兼容性

下一章我们将学习文件批处理实战。
