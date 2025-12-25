---
sidebar_position: 100
title: "打包与构建"
---

# 打包与构建

本章介绍如何打包和构建 RxJS 库。

## 项目结构

### 推荐目录结构

```
mini-rxjs/
├── src/
│   ├── internal/           # 内部实现
│   │   ├── Observable.ts
│   │   ├── Subject.ts
│   │   ├── Subscriber.ts
│   │   └── Scheduler.ts
│   ├── operators/          # 操作符
│   │   ├── map.ts
│   │   ├── filter.ts
│   │   └── index.ts
│   ├── ajax/               # Ajax 模块
│   │   └── index.ts
│   ├── webSocket/          # WebSocket 模块
│   │   └── index.ts
│   ├── index.ts            # 主入口
│   └── operators.ts        # 操作符入口
├── dist/                   # 构建输出
│   ├── esm/               # ES Modules
│   ├── cjs/               # CommonJS
│   ├── umd/               # UMD
│   └── types/             # 类型声明
├── package.json
├── tsconfig.json
├── rollup.config.js
└── README.md
```

### 入口文件

```typescript
// src/index.ts - 主入口
export { Observable } from './internal/Observable'
export { Subject, BehaviorSubject, ReplaySubject, AsyncSubject } from './internal/Subject'
export { Subscription } from './internal/Subscription'

// 创建函数
export { of } from './internal/of'
export { from } from './internal/from'
export { fromEvent } from './internal/fromEvent'
export { interval } from './internal/interval'
export { timer } from './internal/timer'
export { merge } from './internal/merge'
export { combineLatest } from './internal/combineLatest'
export { forkJoin } from './internal/forkJoin'
export { concat } from './internal/concat'
export { race } from './internal/race'
export { defer } from './internal/defer'
export { EMPTY, NEVER } from './internal/constants'

// 工具
export { pipe } from './internal/pipe'
export { noop, identity } from './internal/util'
```

```typescript
// src/operators.ts - 操作符入口
export { map } from './operators/map'
export { filter } from './operators/filter'
export { tap } from './operators/tap'
export { take } from './operators/take'
export { takeUntil } from './operators/takeUntil'
export { skip } from './operators/skip'
export { switchMap } from './operators/switchMap'
export { mergeMap } from './operators/mergeMap'
export { concatMap } from './operators/concatMap'
export { exhaustMap } from './operators/exhaustMap'
export { debounceTime } from './operators/debounceTime'
export { throttleTime } from './operators/throttleTime'
export { delay } from './operators/delay'
export { distinctUntilChanged } from './operators/distinctUntilChanged'
export { catchError } from './operators/catchError'
export { retry } from './operators/retry'
export { share } from './operators/share'
export { shareReplay } from './operators/shareReplay'
// ... 其他操作符
```

## TypeScript 配置

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "declaration": true,
    "declarationDir": "./dist/types",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist/esm",
    "rootDir": "./src",
    "sourceMap": true,
    "inlineSources": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}
```

### tsconfig.cjs.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "outDir": "./dist/cjs",
    "declaration": false
  }
}
```

## Rollup 配置

### 基础配置

```javascript
// rollup.config.js
import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import terser from '@rollup/plugin-terser'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const banner = `/**
 * Mini RxJS v${process.env.npm_package_version}
 * (c) ${new Date().getFullYear()}
 * Released under the MIT License.
 */`

// ESM 配置
const esmConfig = {
  input: {
    'index': 'src/index.ts',
    'operators': 'src/operators.ts',
    'ajax': 'src/ajax/index.ts',
    'webSocket': 'src/webSocket/index.ts'
  },
  output: {
    dir: 'dist/esm',
    format: 'esm',
    sourcemap: true,
    banner,
    preserveModules: true,
    preserveModulesRoot: 'src'
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: './dist/types'
    })
  ],
  external: []
}

// CJS 配置
const cjsConfig = {
  input: 'src/index.ts',
  output: {
    file: 'dist/cjs/index.js',
    format: 'cjs',
    sourcemap: true,
    banner,
    exports: 'named'
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.cjs.json'
    })
  ]
}

// UMD 配置
const umdConfig = {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/umd/mini-rxjs.js',
      format: 'umd',
      name: 'MiniRxJS',
      sourcemap: true,
      banner
    },
    {
      file: 'dist/umd/mini-rxjs.min.js',
      format: 'umd',
      name: 'MiniRxJS',
      sourcemap: true,
      banner,
      plugins: [terser()]
    }
  ],
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false
    })
  ]
}

export default [esmConfig, cjsConfig, umdConfig]
```

### 操作符单独打包

```javascript
// rollup.operators.config.js
import typescript from '@rollup/plugin-typescript'
import { readdirSync } from 'fs'
import path from 'path'

// 获取所有操作符文件
const operatorFiles = readdirSync('src/operators')
  .filter(f => f.endsWith('.ts') && f !== 'index.ts')
  .map(f => f.replace('.ts', ''))

// 为每个操作符生成配置
const operatorConfigs = operatorFiles.map(name => ({
  input: `src/operators/${name}.ts`,
  output: {
    file: `dist/esm/operators/${name}.js`,
    format: 'esm',
    sourcemap: true
  },
  plugins: [typescript()],
  external: ['../internal/Observable']
}))

export default operatorConfigs
```

## package.json 配置

```json
{
  "name": "mini-rxjs",
  "version": "1.0.0",
  "description": "A minimal RxJS implementation",
  "main": "dist/cjs/index.js",
  "module": "dist/esm/index.js",
  "types": "dist/types/index.d.ts",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    },
    "./operators": {
      "types": "./dist/types/operators.d.ts",
      "import": "./dist/esm/operators.js",
      "require": "./dist/cjs/operators.js"
    },
    "./ajax": {
      "types": "./dist/types/ajax/index.d.ts",
      "import": "./dist/esm/ajax/index.js"
    },
    "./webSocket": {
      "types": "./dist/types/webSocket/index.d.ts",
      "import": "./dist/esm/webSocket/index.js"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist",
    "src"
  ],
  "scripts": {
    "build": "npm run clean && npm run build:esm && npm run build:cjs && npm run build:umd",
    "build:esm": "tsc",
    "build:cjs": "tsc --project tsconfig.cjs.json",
    "build:umd": "rollup -c rollup.umd.config.js",
    "clean": "rimraf dist",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "prepublishOnly": "npm run build && npm test"
  },
  "devDependencies": {
    "@rollup/plugin-commonjs": "^25.0.0",
    "@rollup/plugin-node-resolve": "^15.0.0",
    "@rollup/plugin-terser": "^0.4.0",
    "@rollup/plugin-typescript": "^11.0.0",
    "@types/jest": "^29.0.0",
    "jest": "^29.0.0",
    "rimraf": "^5.0.0",
    "rollup": "^4.0.0",
    "ts-jest": "^29.0.0",
    "typescript": "^5.0.0"
  },
  "keywords": [
    "rxjs",
    "reactive",
    "observable",
    "stream"
  ],
  "license": "MIT"
}
```

## Tree Shaking 优化

### 确保 Tree Shaking 生效

```typescript
// ✅ 正确：每个操作符单独导出
// operators/map.ts
export function map(project) {
  return (source) => new Observable(...)
}

// ✅ 正确：使用 barrel 文件
// operators/index.ts
export { map } from './map'
export { filter } from './filter'
// ...
```

```typescript
// ❌ 错误：默认导出对象
// 这会导致所有操作符被打包
export default {
  map,
  filter,
  // ...
}
```

### 标记无副作用

```json
// package.json
{
  "sideEffects": false
}
```

### 用户正确导入

```javascript
// ✅ 正确：只导入需要的
import { Observable, of } from 'mini-rxjs'
import { map, filter } from 'mini-rxjs/operators'

// ❌ 错误：导入全部
import * as Rx from 'mini-rxjs'
```

## 构建脚本

### build.js

```javascript
// scripts/build.js
import { execSync } from 'child_process'
import { rmSync, mkdirSync } from 'fs'

const run = (cmd) => {
  console.log(`> ${cmd}`)
  execSync(cmd, { stdio: 'inherit' })
}

// 清理
console.log('Cleaning dist...')
rmSync('dist', { recursive: true, force: true })
mkdirSync('dist')

// TypeScript 编译
console.log('\nBuilding ESM...')
run('tsc')

console.log('\nBuilding CJS...')
run('tsc --project tsconfig.cjs.json')

// Rollup UMD
console.log('\nBuilding UMD...')
run('rollup -c rollup.umd.config.js')

// 生成 package.json 副本
console.log('\nGenerating package.json for dist...')
// 为 dist/esm 和 dist/cjs 创建 package.json

console.log('\n✅ Build complete!')
```

### 构建验证

```javascript
// scripts/verify-build.js
import { readFileSync, existsSync } from 'fs'

const requiredFiles = [
  'dist/esm/index.js',
  'dist/cjs/index.js',
  'dist/umd/mini-rxjs.js',
  'dist/umd/mini-rxjs.min.js',
  'dist/types/index.d.ts'
]

let failed = false

requiredFiles.forEach(file => {
  if (existsSync(file)) {
    const size = readFileSync(file).length
    console.log(`✅ ${file} (${(size / 1024).toFixed(2)} KB)`)
  } else {
    console.log(`❌ ${file} not found`)
    failed = true
  }
})

if (failed) {
  process.exit(1)
}
```

## 发布配置

### .npmignore

```
src/
scripts/
tests/
*.config.js
tsconfig*.json
.eslintrc
.prettierrc
```

### 发布前检查

```json
// package.json scripts
{
  "scripts": {
    "prepublishOnly": "npm run build && npm run test && npm run verify",
    "verify": "node scripts/verify-build.js"
  }
}
```

### 版本管理

```javascript
// scripts/release.js
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'

const type = process.argv[2] || 'patch'

// 更新版本
execSync(`npm version ${type} --no-git-tag-version`)

// 读取新版本
const pkg = JSON.parse(readFileSync('package.json'))
const version = pkg.version

// 构建
execSync('npm run build', { stdio: 'inherit' })

// 测试
execSync('npm test', { stdio: 'inherit' })

// 提交
execSync(`git add -A`)
execSync(`git commit -m "chore: release v${version}"`)
execSync(`git tag v${version}`)

console.log(`\nReady to publish v${version}`)
console.log('Run: npm publish && git push --follow-tags')
```

## 本章小结

- 分离 ESM、CJS、UMD 多种格式
- TypeScript 生成类型声明
- Rollup 处理打包和压缩
- 正确配置 package.json exports
- sideEffects: false 启用 Tree Shaking
- 构建脚本自动化流程

下一章学习 Tree Shaking 优化技巧。
