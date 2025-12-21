# 打包构建

把源码打包成可发布的库文件。

## 构建目标

一个现代 JavaScript 库需要提供多种格式：

```
dist/
├── mini-jquery.js        # UMD，支持 <script> 和 RequireJS
├── mini-jquery.min.js    # UMD 压缩版
├── mini-jquery.esm.js    # ES Module，支持现代打包工具
└── mini-jquery.cjs.js    # CommonJS，支持 Node.js
```

## 为什么需要多种格式

```javascript
// ES Module - 现代前端打包
import $ from 'mini-jquery';

// CommonJS - Node.js 环境
const $ = require('mini-jquery');

// UMD - 浏览器直接使用
<script src="mini-jquery.js"></script>
<script>
  $('.item').addClass('active');
</script>
```

## 使用 Rollup 打包

Rollup 更适合打包库：

```bash
npm install -D rollup @rollup/plugin-terser
```

配置 `rollup.config.js`：

```javascript
import terser from '@rollup/plugin-terser';

const banner = `/*!
 * mini-jquery v1.0.0
 * (c) ${new Date().getFullYear()}
 * Released under the MIT License.
 */`;

export default [
  // ES Module
  {
    input: 'src/jquery.js',
    output: {
      file: 'dist/mini-jquery.esm.js',
      format: 'es',
      banner
    }
  },
  
  // CommonJS
  {
    input: 'src/jquery.js',
    output: {
      file: 'dist/mini-jquery.cjs.js',
      format: 'cjs',
      banner,
      exports: 'default'
    }
  },
  
  // UMD
  {
    input: 'src/jquery.js',
    output: {
      file: 'dist/mini-jquery.js',
      format: 'umd',
      name: 'jQuery',
      banner
    }
  },
  
  // UMD 压缩版
  {
    input: 'src/jquery.js',
    output: {
      file: 'dist/mini-jquery.min.js',
      format: 'umd',
      name: 'jQuery',
      banner,
      sourcemap: true
    },
    plugins: [terser()]
  }
];
```

## 构建脚本

更新 `package.json`：

```json
{
  "scripts": {
    "build": "rollup -c",
    "build:watch": "rollup -c -w",
    "clean": "rimraf dist"
  }
}
```

## 入口文件配置

```json
{
  "name": "mini-jquery",
  "version": "1.0.0",
  "main": "dist/mini-jquery.cjs.js",
  "module": "dist/mini-jquery.esm.js",
  "browser": "dist/mini-jquery.js",
  "unpkg": "dist/mini-jquery.min.js",
  "jsdelivr": "dist/mini-jquery.min.js",
  "exports": {
    ".": {
      "import": "./dist/mini-jquery.esm.js",
      "require": "./dist/mini-jquery.cjs.js",
      "browser": "./dist/mini-jquery.js"
    }
  },
  "files": [
    "dist",
    "src"
  ]
}
```

## 源码组织

```
src/
├── jquery.js           # 主入口
├── core/
│   ├── init.js         # 初始化
│   ├── selector.js     # 选择器
│   └── ready.js        # DOM Ready
├── manipulation/
│   ├── append.js
│   ├── remove.js
│   └── html.js
├── events/
│   ├── on.js
│   ├── off.js
│   └── trigger.js
├── css/
│   └── css.js
├── ajax/
│   └── ajax.js
└── utils/
    └── utils.js
```

主入口文件：

```javascript
// src/jquery.js

import { jQuery } from './core/init.js';
import { installSelector } from './core/selector.js';
import { installReady } from './core/ready.js';
import { installManipulation } from './manipulation/index.js';
import { installEvents } from './events/index.js';
import { installCss } from './css/css.js';
import { installAjax } from './ajax/ajax.js';
import { installUtils } from './utils/utils.js';

// 安装模块
installSelector(jQuery);
installReady(jQuery);
installManipulation(jQuery);
installEvents(jQuery);
installCss(jQuery);
installAjax(jQuery);
installUtils(jQuery);

// 暴露到全局
if (typeof window !== 'undefined') {
  window.jQuery = window.$ = jQuery;
}

export default jQuery;
export { jQuery, jQuery as $ };
```

## Tree Shaking 支持

为了支持 Tree Shaking，每个功能独立导出：

```javascript
// src/modules.js

export { addClass, removeClass, toggleClass } from './css/class.js';
export { css } from './css/css.js';
export { on, off, trigger } from './events/on.js';
export { append, prepend, remove } from './manipulation/append.js';
// ...
```

使用时按需导入：

```javascript
// 只打包需要的功能
import { $, addClass, css } from 'mini-jquery/modules';
```

## Source Map

生产环境生成 Source Map：

```javascript
{
  output: {
    file: 'dist/mini-jquery.min.js',
    format: 'umd',
    sourcemap: true  // 生成 .map 文件
  },
  plugins: [terser()]
}
```

## 类型定义

添加 TypeScript 类型定义：

```typescript
// types/index.d.ts

declare class jQuery {
  constructor(selector: string | Element | Element[]);
  
  length: number;
  
  // 遍历
  each(callback: (index: number, element: Element) => void): this;
  eq(index: number): jQuery;
  first(): jQuery;
  last(): jQuery;
  
  // DOM
  html(): string;
  html(value: string): this;
  text(): string;
  text(value: string): this;
  
  // 属性
  attr(name: string): string | undefined;
  attr(name: string, value: string): this;
  attr(attrs: Record<string, string>): this;
  
  // 样式
  css(name: string): string;
  css(name: string, value: string | number): this;
  css(styles: Record<string, string | number>): this;
  
  addClass(className: string): this;
  removeClass(className?: string): this;
  toggleClass(className: string, force?: boolean): this;
  hasClass(className: string): boolean;
  
  // 事件
  on(event: string, handler: EventListener): this;
  on(event: string, selector: string, handler: EventListener): this;
  off(event?: string, handler?: EventListener): this;
  trigger(event: string, data?: unknown): this;
  
  // DOM 操作
  append(content: string | Element | jQuery): this;
  prepend(content: string | Element | jQuery): this;
  remove(): this;
  empty(): this;
  clone(): jQuery;
  
  // 遍历
  find(selector: string): jQuery;
  parent(): jQuery;
  children(selector?: string): jQuery;
  siblings(selector?: string): jQuery;
  
  // 数据
  data(key: string): unknown;
  data(key: string, value: unknown): this;
}

interface JQueryStatic {
  (selector: string | Element | Element[] | Function): jQuery;
  
  ajax(options: AjaxOptions): Promise<unknown>;
  get(url: string, data?: object): Promise<unknown>;
  post(url: string, data?: object): Promise<unknown>;
  
  each<T>(collection: T[], callback: (index: number, value: T) => void): T[];
  extend<T>(target: T, ...sources: Partial<T>[]): T;
  extend<T>(deep: boolean, target: T, ...sources: Partial<T>[]): T;
  
  type(value: unknown): string;
  isArray(value: unknown): value is unknown[];
  isFunction(value: unknown): value is Function;
  isPlainObject(value: unknown): value is object;
  
  Deferred(): Deferred;
  when(...deferreds: Deferred[]): Promise<unknown[]>;
  
  fn: typeof jQuery.prototype;
  noConflict(deep?: boolean): JQueryStatic;
}

interface AjaxOptions {
  url: string;
  method?: string;
  data?: object | string;
  headers?: Record<string, string>;
  timeout?: number;
  beforeSend?: (xhr: XMLHttpRequest) => void;
  success?: (data: unknown) => void;
  error?: (error: Error) => void;
  complete?: () => void;
}

interface Deferred {
  resolve(...args: unknown[]): this;
  reject(...args: unknown[]): this;
  notify(...args: unknown[]): this;
  done(...callbacks: Function[]): this;
  fail(...callbacks: Function[]): this;
  progress(...callbacks: Function[]): this;
  always(...callbacks: Function[]): this;
  then(done?: Function, fail?: Function, progress?: Function): Promise<unknown>;
  promise(): Promise<unknown>;
  state(): 'pending' | 'resolved' | 'rejected';
}

declare const $: JQueryStatic;
export default $;
export { $, jQuery, JQueryStatic };
```

配置 `package.json`：

```json
{
  "types": "types/index.d.ts"
}
```

## 完整构建流程

```javascript
// scripts/build.js

import { rollup } from 'rollup';
import terser from '@rollup/plugin-terser';
import { gzipSync } from 'zlib';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

async function build() {
  console.log('Building...\n');
  
  // 清理
  mkdirSync('dist', { recursive: true });
  
  const configs = [
    { format: 'es', file: 'dist/mini-jquery.esm.js' },
    { format: 'cjs', file: 'dist/mini-jquery.cjs.js' },
    { format: 'umd', file: 'dist/mini-jquery.js', name: 'jQuery' },
  ];
  
  for (const config of configs) {
    const bundle = await rollup({ input: 'src/jquery.js' });
    await bundle.write({
      file: config.file,
      format: config.format,
      name: config.name,
      exports: 'default'
    });
    console.log(`✓ ${config.file}`);
  }
  
  // 压缩版
  const bundle = await rollup({
    input: 'src/jquery.js',
    plugins: [terser()]
  });
  
  await bundle.write({
    file: 'dist/mini-jquery.min.js',
    format: 'umd',
    name: 'jQuery',
    sourcemap: true
  });
  console.log('✓ dist/mini-jquery.min.js');
  
  // 报告大小
  reportSize();
}

function reportSize() {
  console.log('\nBundle sizes:');
  
  const files = [
    'dist/mini-jquery.esm.js',
    'dist/mini-jquery.min.js'
  ];
  
  files.forEach(file => {
    const content = readFileSync(file);
    const gzipped = gzipSync(content);
    
    console.log(`  ${file}`);
    console.log(`    Size: ${(content.length / 1024).toFixed(2)} KB`);
    console.log(`    Gzip: ${(gzipped.length / 1024).toFixed(2)} KB`);
  });
}

build().catch(console.error);
```

## 本章小结

构建要点：

| 格式 | 用途 | 入口字段 |
|------|------|---------|
| ESM | 现代打包工具 | module |
| CJS | Node.js | main |
| UMD | 浏览器 script | browser |
| UMD.min | CDN | unpkg, jsdelivr |

发布清单：

- 多格式构建（ESM/CJS/UMD）
- 压缩版 + Source Map
- TypeScript 类型定义
- package.json 入口配置
- files 字段指定发布文件

下一章，我们发布到 npm。

---

**思考题**：如何实现按功能模块的按需打包，让用户只打包使用的功能？
