---
sidebar_position: 101
title: "Tree Shaking 优化"
---

# Tree Shaking 优化

本章介绍如何优化 RxJS 库的 Tree Shaking。

## 什么是 Tree Shaking

Tree Shaking 是指在打包时移除未使用的代码：

```javascript
// 假设库导出了 100 个函数
import { map, filter } from 'mini-rxjs/operators'

// 只使用了 map 和 filter
// Tree Shaking 会移除其他 98 个函数
```

## 影响 Tree Shaking 的因素

### 1. 模块格式

```javascript
// ✅ ESM：支持 Tree Shaking
export function map() { }
export function filter() { }

// ❌ CJS：不支持 Tree Shaking
module.exports = { map, filter }
```

### 2. 副作用

```javascript
// ❌ 有副作用：无法被移除
let counter = 0
export function increment() {
  counter++  // 修改外部状态
  return counter
}

// ✅ 无副作用：可安全移除
export function add(a, b) {
  return a + b
}
```

### 3. 导入方式

```javascript
// ✅ 具名导入：可 Tree Shake
import { map } from 'mini-rxjs/operators'

// ❌ 命名空间导入：可能无法 Tree Shake
import * as operators from 'mini-rxjs/operators'
operators.map()

// ❌ 整体导入：无法 Tree Shake
import operators from 'mini-rxjs/operators'
```

## 库端优化

### 标记无副作用

```json
// package.json
{
  "sideEffects": false
}
```

### 指定有副作用的文件

```json
{
  "sideEffects": [
    "*.css",
    "./src/polyfills.js"
  ]
}
```

### 使用纯函数注释

```javascript
// 告诉打包工具这是纯函数调用
const result = /*#__PURE__*/ createObservable()

// 函数定义也可以标记
export const map = /*#__PURE__*/ function map(project) {
  return (source) => new Observable(subscriber => {
    // ...
  })
}
```

### 避免类的静态属性初始化

```javascript
// ❌ 问题：静态属性初始化可能被视为副作用
class Observable {
  static create = (subscribe) => new Observable(subscribe)
}

// ✅ 正确：使用静态方法
class Observable {
  static create(subscribe) {
    return new Observable(subscribe)
  }
}
```

## 代码结构优化

### 分离模块

```
src/
├── internal/       # 核心实现
│   ├── Observable.ts
│   └── Subject.ts
├── operators/      # 操作符（每个单独文件）
│   ├── map.ts
│   ├── filter.ts
│   └── index.ts
├── creation/       # 创建函数
│   ├── of.ts
│   └── from.ts
├── index.ts        # 主入口
└── operators.ts    # 操作符入口
```

### 每个操作符独立文件

```typescript
// operators/map.ts
import { Observable } from '../internal/Observable'
import { OperatorFunction } from '../types'

export function map<T, R>(
  project: (value: T, index: number) => R
): OperatorFunction<T, R> {
  return (source) => new Observable(subscriber => {
    let index = 0
    return source.subscribe({
      next(value) {
        try {
          subscriber.next(project(value, index++))
        } catch (err) {
          subscriber.error(err)
        }
      },
      error(err) { subscriber.error(err) },
      complete() { subscriber.complete() }
    })
  })
}
```

### Barrel 文件优化

```typescript
// operators/index.ts
// ✅ 正确：re-export
export { map } from './map'
export { filter } from './filter'
export { tap } from './tap'

// ❌ 错误：收集后导出
import { map } from './map'
import { filter } from './filter'
export { map, filter }  // 某些打包工具可能无法优化
```

## 避免常见陷阱

### 1. 避免导出对象

```javascript
// ❌ 错误：无法 Tree Shake
export const operators = {
  map,
  filter,
  tap
}

// ✅ 正确：分别导出
export { map } from './map'
export { filter } from './filter'
export { tap } from './tap'
```

### 2. 避免循环依赖

```javascript
// ❌ 循环依赖可能导致 Tree Shaking 失败
// a.ts
import { b } from './b'
export const a = () => b()

// b.ts
import { a } from './a'
export const b = () => a()

// ✅ 提取公共依赖
// common.ts
export const helper = () => {}

// a.ts
import { helper } from './common'
export const a = () => helper()
```

### 3. 避免全局注册

```javascript
// ❌ 错误：全局副作用
Observable.prototype.map = function(project) {
  return map(project)(this)
}

// ✅ 正确：使用 pipe
source.pipe(map(x => x * 2))
```

### 4. 类型导入单独处理

```typescript
// ✅ 正确：类型导入在编译后会被移除
import type { Observer } from './types'
import type { Subscription } from './Subscription'

// 或使用 import type
import { Observable, type OperatorFunction } from './internal'
```

## 验证 Tree Shaking

### 使用 webpack-bundle-analyzer

```javascript
// webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin()
  ]
}
```

### 检查打包大小

```javascript
// scripts/check-bundle-size.js
import { rollup } from 'rollup'
import { terser } from 'rollup-plugin-terser'
import virtual from '@rollup/plugin-virtual'
import resolve from '@rollup/plugin-node-resolve'
import gzip from 'gzip-size'

async function checkSize(imports) {
  const bundle = await rollup({
    input: 'entry',
    plugins: [
      virtual({
        entry: imports
      }),
      resolve(),
      terser()
    ]
  })
  
  const { output } = await bundle.generate({ format: 'esm' })
  const code = output[0].code
  
  console.log(`Minified: ${(code.length / 1024).toFixed(2)} KB`)
  console.log(`Gzipped: ${(gzip.sync(code) / 1024).toFixed(2)} KB`)
}

// 测试只导入 map
await checkSize(`
  import { Observable } from 'mini-rxjs'
  import { map } from 'mini-rxjs/operators'
  console.log(Observable, map)
`)

// 测试导入多个
await checkSize(`
  import { Observable, of, from } from 'mini-rxjs'
  import { map, filter, switchMap } from 'mini-rxjs/operators'
  console.log(Observable, of, from, map, filter, switchMap)
`)
```

### 对比测试

```javascript
// 创建测试用例
const testCases = [
  {
    name: 'Observable only',
    code: `import { Observable } from 'mini-rxjs'`
  },
  {
    name: 'Observable + of',
    code: `import { Observable, of } from 'mini-rxjs'`
  },
  {
    name: 'Observable + map',
    code: `
      import { Observable } from 'mini-rxjs'
      import { map } from 'mini-rxjs/operators'
    `
  },
  {
    name: 'Common usage',
    code: `
      import { Observable, of, from, Subject } from 'mini-rxjs'
      import { map, filter, tap, switchMap } from 'mini-rxjs/operators'
    `
  },
  {
    name: 'Full import',
    code: `
      import * as Rx from 'mini-rxjs'
      import * as operators from 'mini-rxjs/operators'
    `
  }
]

for (const test of testCases) {
  console.log(`\n${test.name}:`)
  await checkSize(test.code)
}
```

## 优化 Observable 核心

### 分离静态方法

```typescript
// ❌ 所有方法在 Observable 类上
class Observable {
  static of(...values) { }
  static from(input) { }
  static interval(period) { }
  // ... 更多静态方法
}

// ✅ 静态方法分离为独立函数
// of.ts
export function of<T>(...values: T[]): Observable<T> {
  return new Observable(subscriber => {
    values.forEach(v => subscriber.next(v))
    subscriber.complete()
  })
}

// from.ts
export function from<T>(input: ObservableInput<T>): Observable<T> {
  // ...
}
```

### 最小化 Observable 类

```typescript
// internal/Observable.ts
export class Observable<T> {
  constructor(private subscribe: SubscribeFunction<T>) {}
  
  // 只保留核心方法
  subscribe(observer: Observer<T>): Subscription {
    // ...
  }
  
  pipe(...operators: OperatorFunction<any, any>[]): Observable<any> {
    return operators.reduce((source, op) => op(source), this)
  }
}

// 其他方法作为独立函数导出
```

## 最佳实践总结

### 库开发者

1. 使用 ESM 格式
2. 设置 `"sideEffects": false`
3. 每个功能单独文件
4. 使用 `/*#__PURE__*/` 注释
5. 避免类的静态属性初始化
6. 避免修改原型
7. 避免循环依赖

### 库使用者

1. 具名导入需要的功能
2. 避免 `import *`
3. 使用支持 Tree Shaking 的打包工具
4. 检查打包产物大小

## 本章小结

- Tree Shaking 移除未使用代码
- ESM 格式是 Tree Shaking 的前提
- `sideEffects: false` 声明无副作用
- 每个功能独立文件便于精确导入
- 使用工具验证 Tree Shaking 效果
- 避免常见陷阱保证优化生效

下一章学习性能分析技术。
