# 发布到 npm

把 mini-jQuery 发布到 npm，让其他人可以使用。

## 准备工作

### 注册 npm 账号

```bash
npm adduser
# 输入用户名、密码、邮箱
```

### 检查登录状态

```bash
npm whoami
# 显示你的用户名
```

## 配置 package.json

```json
{
  "name": "mini-jquery",
  "version": "1.0.0",
  "description": "A minimal jQuery implementation for learning purposes",
  "author": "Your Name <your@email.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/mini-jquery.git"
  },
  "homepage": "https://github.com/yourusername/mini-jquery#readme",
  "bugs": {
    "url": "https://github.com/yourusername/mini-jquery/issues"
  },
  "keywords": [
    "jquery",
    "dom",
    "mini",
    "lightweight"
  ],
  "main": "dist/mini-jquery.cjs.js",
  "module": "dist/mini-jquery.esm.js",
  "browser": "dist/mini-jquery.min.js",
  "types": "types/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/mini-jquery.esm.js",
      "require": "./dist/mini-jquery.cjs.js",
      "browser": "./dist/mini-jquery.min.js",
      "types": "./types/index.d.ts"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist",
    "types",
    "src"
  ],
  "sideEffects": false,
  "engines": {
    "node": ">=14"
  },
  "scripts": {
    "build": "rollup -c",
    "test": "vitest run",
    "prepublishOnly": "npm run build && npm test"
  }
}
```

## 字段说明

### 必需字段

```json
{
  "name": "mini-jquery",      // 包名，必须唯一
  "version": "1.0.0"          // 语义化版本
}
```

### 入口字段

```json
{
  "main": "dist/mini-jquery.cjs.js",   // CommonJS 入口
  "module": "dist/mini-jquery.esm.js", // ES Module 入口
  "browser": "dist/mini-jquery.min.js", // 浏览器入口
  "types": "types/index.d.ts"          // TypeScript 类型
}
```

### files 字段

指定发布到 npm 的文件：

```json
{
  "files": [
    "dist",    // 构建产物
    "types",   // 类型定义
    "src"      // 源码（可选）
  ]
}
```

不在 files 中但默认会包含的：
- package.json
- README.md
- LICENSE
- CHANGELOG.md

## 版本管理

### 语义化版本

```
1.2.3
│ │ │
│ │ └── Patch: 修复 bug，向后兼容
│ └──── Minor: 新功能，向后兼容
└────── Major: 破坏性变更
```

### 版本命令

```bash
# 补丁版本 1.0.0 -> 1.0.1
npm version patch

# 次版本 1.0.0 -> 1.1.0
npm version minor

# 主版本 1.0.0 -> 2.0.0
npm version major

# 预发布版本
npm version prerelease --preid=beta
# 1.0.0 -> 1.0.1-beta.0
```

## 发布流程

### 基本发布

```bash
# 1. 确保在正确的分支
git checkout main

# 2. 构建
npm run build

# 3. 测试
npm test

# 4. 发布
npm publish
```

### 发布脚本

```json
{
  "scripts": {
    "release": "npm run build && npm test && npm publish",
    "release:patch": "npm version patch && npm run release",
    "release:minor": "npm version minor && npm run release",
    "release:major": "npm version major && npm run release"
  }
}
```

### 发布检查

```bash
# 预览将要发布的文件
npm pack --dry-run

# 打包成 .tgz 文件查看
npm pack
tar -xzf mini-jquery-1.0.0.tgz
ls package/
```

## 完整发布脚本

```javascript
// scripts/release.js

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import readline from 'readline';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

async function release() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (q) => new Promise(r => rl.question(q, r));
  
  console.log(`Current version: ${pkg.version}\n`);
  console.log('Select version type:');
  console.log('  1) patch');
  console.log('  2) minor');
  console.log('  3) major');
  console.log('  4) custom');
  
  const choice = await question('\nChoice: ');
  
  let versionType;
  switch (choice) {
    case '1': versionType = 'patch'; break;
    case '2': versionType = 'minor'; break;
    case '3': versionType = 'major'; break;
    case '4': 
      versionType = await question('Enter version: ');
      break;
    default:
      console.log('Invalid choice');
      process.exit(1);
  }
  
  rl.close();
  
  // 检查 Git 状态
  try {
    execSync('git diff-index --quiet HEAD --');
  } catch {
    console.error('Error: You have uncommitted changes');
    process.exit(1);
  }
  
  console.log('\n📦 Building...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('\n🧪 Testing...');
  execSync('npm test', { stdio: 'inherit' });
  
  console.log(`\n📝 Bumping version (${versionType})...`);
  execSync(`npm version ${versionType}`, { stdio: 'inherit' });
  
  console.log('\n🚀 Publishing...');
  execSync('npm publish', { stdio: 'inherit' });
  
  console.log('\n📤 Pushing to git...');
  execSync('git push && git push --tags', { stdio: 'inherit' });
  
  console.log('\n✅ Done!');
}

release().catch(console.error);
```

## README 模板

```markdown
# mini-jquery

A minimal jQuery implementation for learning purposes.

## Installation

```bash
npm install mini-jquery
```

## Usage

### ES Module

```javascript
import $ from 'mini-jquery';

$('.item').addClass('active');
```

### CommonJS

```javascript
const $ = require('mini-jquery');

$('.item').addClass('active');
```

### Browser

```html
<script src="https://unpkg.com/mini-jquery"></script>
<script>
  $('.item').addClass('active');
</script>
```

## API

### Selection

```javascript
$('#id')           // ID selector
$('.class')        // Class selector
$('div')           // Tag selector
$(element)         // Wrap element
$(function() {})   // DOM ready
```

### DOM Manipulation

```javascript
.html()            // Get/set innerHTML
.text()            // Get/set textContent
.append()          // Append content
.prepend()         // Prepend content
.remove()          // Remove elements
.clone()           // Clone elements
```

### CSS & Classes

```javascript
.css()             // Get/set styles
.addClass()        // Add class
.removeClass()     // Remove class
.toggleClass()     // Toggle class
.hasClass()        // Check class
```

### Events

```javascript
.on()              // Attach event handler
.off()             // Remove event handler
.trigger()         // Trigger event
.one()             // One-time event
```

### Ajax

```javascript
$.ajax()           // Ajax request
$.get()            // GET request
$.post()           // POST request
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
```

## CHANGELOG 规范

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2024-01-15

### Added
- Event delegation support for `.on()` method
- `$.ajax()` request interceptors

### Changed
- Improved selector performance

### Fixed
- Memory leak in `.remove()` method

## [1.0.1] - 2024-01-10

### Fixed
- `.addClass()` duplicate class issue

## [1.0.0] - 2024-01-01

### Added
- Initial release
- Core jQuery-like API
- DOM manipulation methods
- Event handling
- Ajax support
```

## 发布后检查

```bash
# 查看包信息
npm info mini-jquery

# 安装测试
npm install mini-jquery

# 检查 CDN
curl https://unpkg.com/mini-jquery
```

## 本章小结

发布清单：

- [ ] 完善 package.json 信息
- [ ] 配置正确的入口字段
- [ ] 设置 files 字段
- [ ] 编写 README.md
- [ ] 添加 LICENSE 文件
- [ ] 维护 CHANGELOG.md
- [ ] 构建并测试通过
- [ ] npm publish

版本规则：

| 变更类型 | 版本号 | 示例 |
|---------|--------|------|
| Bug 修复 | patch | 1.0.0 → 1.0.1 |
| 新功能 | minor | 1.0.0 → 1.1.0 |
| 破坏性变更 | major | 1.0.0 → 2.0.0 |

下一章，我们总结整本书的内容。

---

**思考题**：如何设置 npm 的发布权限，让团队成员都能发布？
