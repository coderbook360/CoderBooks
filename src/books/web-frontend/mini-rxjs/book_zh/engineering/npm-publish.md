---
sidebar_position: 104
title: "发布到 npm"
---

# 发布到 npm

本章介绍如何将 Mini RxJS 发布到 npm 供他人使用。

## 发布前准备

### package.json 配置

```json
{
  "name": "mini-rxjs",
  "version": "1.0.0",
  "description": "A minimal RxJS implementation for learning purposes",
  "keywords": ["rxjs", "reactive", "observable", "stream"],
  "homepage": "https://github.com/your-name/mini-rxjs",
  "bugs": {
    "url": "https://github.com/your-name/mini-rxjs/issues"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-name/mini-rxjs.git"
  },
  "license": "MIT",
  "author": "Your Name <your@email.com>",
  "sideEffects": false,
  "type": "module",
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    },
    "./operators": {
      "types": "./dist/types/operators/index.d.ts",
      "import": "./dist/esm/operators/index.js",
      "require": "./dist/cjs/operators/index.js"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "npm run build:esm && npm run build:cjs && npm run build:types",
    "build:esm": "tsc -p tsconfig.esm.json",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:types": "tsc -p tsconfig.types.json",
    "test": "jest",
    "prepublishOnly": "npm test && npm run build"
  },
  "peerDependencies": {},
  "devDependencies": {
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0"
  },
  "engines": {
    "node": ">=16"
  }
}
```

### TypeScript 配置

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}

// tsconfig.esm.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Node",
    "target": "ES2020",
    "outDir": "./dist/esm",
    "declaration": false
  }
}

// tsconfig.cjs.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "target": "ES2019",
    "outDir": "./dist/cjs",
    "declaration": false
  }
}

// tsconfig.types.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "declaration": true,
    "emitDeclarationOnly": true,
    "outDir": "./dist/types"
  }
}
```

## README 文档

```markdown
# Mini RxJS

A minimal RxJS implementation for learning reactive programming.

## Installation

```bash
npm install mini-rxjs
```

## Quick Start

```typescript
import { of, interval } from 'mini-rxjs'
import { map, filter, take } from 'mini-rxjs/operators'

// Basic usage
of(1, 2, 3)
  .pipe(
    map(x => x * 2),
    filter(x => x > 2)
  )
  .subscribe(console.log)

// Time-based
interval(1000)
  .pipe(take(5))
  .subscribe(x => console.log('Tick:', x))
```

## API Reference

### Creation

- `of(...values)` - Emit values in sequence
- `from(input)` - Convert iterable/promise to Observable
- `interval(period)` - Emit numbers at interval
- `timer(delay, period?)` - Emit after delay

### Operators

- `map(fn)` - Transform values
- `filter(predicate)` - Filter values
- `take(count)` - Take first n values
- `switchMap(fn)` - Switch to new Observable
- `mergeMap(fn)` - Merge inner Observables
- `debounceTime(ms)` - Debounce emissions

### Subjects

- `Subject` - Multicast Observable
- `BehaviorSubject` - Subject with current value
- `ReplaySubject` - Subject with replay buffer

## License

MIT
```

## 版本管理

### 语义化版本

```bash
# 补丁版本：bug 修复
npm version patch  # 1.0.0 → 1.0.1

# 次版本：新功能（向后兼容）
npm version minor  # 1.0.1 → 1.1.0

# 主版本：破坏性变更
npm version major  # 1.1.0 → 2.0.0
```

### 变更日志

```markdown
# Changelog

## [1.1.0] - 2024-01-15

### Added
- `retry` operator
- `catchError` operator
- `finalize` operator

### Fixed
- Memory leak in `switchMap`

## [1.0.0] - 2024-01-01

### Added
- Initial release
- Core Observable, Subject, Subscription
- Basic operators: map, filter, take, skip
- Time operators: debounceTime, throttleTime
```

## 发布流程

### 首次发布

```bash
# 1. 注册/登录 npm
npm login

# 2. 检查包名是否可用
npm search mini-rxjs

# 3. 构建项目
npm run build

# 4. 本地测试
npm pack
tar -xzf mini-rxjs-1.0.0.tgz
ls package/

# 5. 发布
npm publish

# 6. 验证
npm info mini-rxjs
```

### 更新发布

```bash
# 1. 更新版本
npm version patch -m "Fix memory leak"

# 2. 构建和测试
npm run build
npm test

# 3. 发布
npm publish

# 4. 推送 tag
git push --follow-tags
```

## 发布前检查

### 检查脚本

```javascript
// scripts/prepublish-check.js
const fs = require('fs')
const path = require('path')

function check() {
  const errors = []
  
  // 检查 dist 目录
  if (!fs.existsSync('dist')) {
    errors.push('dist directory not found')
  }
  
  // 检查类型定义
  if (!fs.existsSync('dist/types/index.d.ts')) {
    errors.push('Type definitions not found')
  }
  
  // 检查 README
  if (!fs.existsSync('README.md')) {
    errors.push('README.md not found')
  }
  
  // 检查 LICENSE
  if (!fs.existsSync('LICENSE')) {
    errors.push('LICENSE not found')
  }
  
  // 检查 package.json
  const pkg = require('../package.json')
  
  if (!pkg.main) errors.push('main field missing')
  if (!pkg.types) errors.push('types field missing')
  if (!pkg.files) errors.push('files field missing')
  
  if (errors.length > 0) {
    console.error('Pre-publish checks failed:')
    errors.forEach(e => console.error(`  - ${e}`))
    process.exit(1)
  }
  
  console.log('All pre-publish checks passed!')
}

check()
```

### 包大小检查

```bash
# 安装 size-limit
npm install --save-dev size-limit @size-limit/preset-small-lib

# package.json 配置
{
  "size-limit": [
    {
      "path": "dist/esm/index.js",
      "limit": "10 KB"
    }
  ],
  "scripts": {
    "size": "size-limit"
  }
}

# 检查大小
npm run size
```

## 作用域包

### 创建作用域包

```json
{
  "name": "@your-scope/mini-rxjs",
  "publishConfig": {
    "access": "public"
  }
}
```

### 发布作用域包

```bash
# 首次发布
npm publish --access public

# 后续发布
npm publish
```

## CI/CD 自动发布

### GitHub Actions

```yaml
# .github/workflows/publish.yml
name: Publish

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      
      - run: npm ci
      - run: npm test
      - run: npm run build
      
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 配置 npm token

1. 在 npm 生成 access token
2. 在 GitHub 仓库 Settings → Secrets 添加 `NPM_TOKEN`

## 本章小结

- package.json 完整配置
- 多格式构建（ESM/CJS/Types）
- README 文档编写
- 语义化版本和变更日志
- 发布前检查清单
- CI/CD 自动发布配置

下一章进入附录：源码对照分析。
