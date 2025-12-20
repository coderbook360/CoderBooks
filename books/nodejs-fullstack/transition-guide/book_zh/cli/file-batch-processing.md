# 文件操作批处理实战

命令行工具常见场景是批量处理文件。

## 递归遍历目录

```javascript
const fs = require('fs');
const path = require('path');

function* walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      yield* walkDir(fullPath);
    } else {
      yield fullPath;
    }
  }
}

// 使用
for (const file of walkDir('./src')) {
  console.log(file);
}
```

## 异步版本

```javascript
const fs = require('fs').promises;
const path = require('path');

async function* walkDirAsync(dir) {
  const files = await fs.readdir(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      yield* walkDirAsync(fullPath);
    } else {
      yield fullPath;
    }
  }
}

// 使用
async function main() {
  for await (const file of walkDirAsync('./src')) {
    console.log(file);
  }
}

main();
```

## 使用 glob

```bash
npm install glob
```

```javascript
const { glob } = require('glob');

async function findFiles() {
  // 查找所有 JS 文件
  const jsFiles = await glob('**/*.js', { ignore: 'node_modules/**' });
  console.log('JS 文件:', jsFiles);
  
  // 查找多种类型
  const files = await glob('**/*.{js,ts,json}', { ignore: 'node_modules/**' });
  console.log('所有文件:', files);
}

findFiles();
```

## 批量重命名

```javascript
const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

async function batchRename(pattern, transform) {
  const files = await glob(pattern);
  
  for (const file of files) {
    const dir = path.dirname(file);
    const oldName = path.basename(file);
    const newName = transform(oldName);
    
    if (oldName !== newName) {
      const oldPath = file;
      const newPath = path.join(dir, newName);
      
      await fs.rename(oldPath, newPath);
      console.log(`${oldName} -> ${newName}`);
    }
  }
}

// 示例：将文件名转为小写
batchRename('images/*', (name) => name.toLowerCase());

// 示例：添加前缀
batchRename('*.txt', (name) => `backup_${name}`);

// 示例：替换扩展名
batchRename('*.jpeg', (name) => name.replace('.jpeg', '.jpg'));
```

## 批量查找替换

```javascript
const fs = require('fs').promises;
const { glob } = require('glob');

async function batchReplace(pattern, search, replace, options = {}) {
  const files = await glob(pattern, { ignore: options.ignore });
  let totalChanges = 0;
  
  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const newContent = content.replaceAll(search, replace);
    
    if (content !== newContent) {
      if (!options.dryRun) {
        await fs.writeFile(file, newContent);
      }
      
      const changes = (content.match(new RegExp(search, 'g')) || []).length;
      console.log(`${file}: ${changes} 处替换`);
      totalChanges += changes;
    }
  }
  
  console.log(`\n共替换 ${totalChanges} 处`);
}

// 使用
batchReplace(
  'src/**/*.js',
  'console.log',
  'logger.debug',
  { ignore: 'node_modules/**', dryRun: false }
);
```

## 并发控制

处理大量文件时需要控制并发：

```javascript
async function processWithConcurrency(items, fn, concurrency = 5) {
  const results = [];
  let index = 0;
  
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }
  
  await Promise.all(
    Array(Math.min(concurrency, items.length))
      .fill()
      .map(worker)
  );
  
  return results;
}

// 使用
const files = await glob('images/*.jpg');

await processWithConcurrency(files, async (file) => {
  console.log(`Processing ${file}...`);
  // 处理文件
}, 5);
```

## 进度显示

```javascript
const cliProgress = require('cli-progress');
const { glob } = require('glob');
const fs = require('fs').promises;

async function processFiles(pattern) {
  const files = await glob(pattern);
  
  const bar = new cliProgress.SingleBar({
    format: '处理中 |{bar}| {percentage}% | {value}/{total} | {file}',
    barCompleteChar: '█',
    barIncompleteChar: '░'
  });
  
  bar.start(files.length, 0, { file: '' });
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    bar.update(i + 1, { file: file.slice(-30) });
    
    // 处理文件
    const content = await fs.readFile(file, 'utf-8');
    // ... 处理逻辑
  }
  
  bar.stop();
  console.log('\n处理完成');
}
```

## 完整示例：代码格式化工具

```javascript
const { program } = require('commander');
const { glob } = require('glob');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');

program
  .name('format')
  .description('代码格式化工具')
  .argument('<pattern>', '文件匹配模式')
  .option('--indent <size>', '缩进大小', '2')
  .option('--trailing-comma', '添加尾逗号')
  .option('--dry-run', '仅预览，不修改')
  .action(async (pattern, options) => {
    const spinner = ora('查找文件...').start();
    
    try {
      const files = await glob(pattern, {
        ignore: ['node_modules/**', 'dist/**']
      });
      
      spinner.succeed(`找到 ${files.length} 个文件`);
      
      if (files.length === 0) return;
      
      let modified = 0;
      
      for (const file of files) {
        const ext = path.extname(file);
        
        if (ext === '.json') {
          const content = await fs.readFile(file, 'utf-8');
          const formatted = JSON.stringify(
            JSON.parse(content),
            null,
            parseInt(options.indent)
          );
          
          if (content !== formatted) {
            if (!options.dryRun) {
              await fs.writeFile(file, formatted);
            }
            console.log(`${chalk.green('✓')} ${file}`);
            modified++;
          }
        }
      }
      
      console.log();
      if (options.dryRun) {
        console.log(chalk.yellow(`预览模式：${modified} 个文件将被修改`));
      } else {
        console.log(chalk.green(`已修改 ${modified} 个文件`));
      }
      
    } catch (err) {
      spinner.fail('处理失败');
      console.error(chalk.red(err.message));
      process.exit(1);
    }
  });

program.parse();
```

使用：

```bash
node format.js "**/*.json" --indent 4
node format.js "config/*.json" --dry-run
```

## 批量图片处理

```bash
npm install sharp
```

```javascript
const sharp = require('sharp');
const { glob } = require('glob');
const path = require('path');
const fs = require('fs').promises;

async function resizeImages(pattern, width, outputDir) {
  await fs.mkdir(outputDir, { recursive: true });
  
  const files = await glob(pattern);
  
  for (const file of files) {
    const name = path.basename(file);
    const output = path.join(outputDir, name);
    
    await sharp(file)
      .resize(width)
      .toFile(output);
    
    console.log(`Resized: ${name}`);
  }
}

// 使用
resizeImages('images/*.jpg', 800, 'images/resized');
```

## 本章小结

- 使用生成器递归遍历目录
- glob 模式匹配文件
- 并发控制避免资源耗尽
- 进度条提升用户体验
- 组合工具库实现复杂功能

下一章我们将学习配置文件管理。
