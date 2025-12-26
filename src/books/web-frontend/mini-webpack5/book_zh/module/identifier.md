---
sidebar_position: 37
title: "模块标识符与 Identifier"
---

# 模块标识符与 Identifier

在 Webpack 中，每个模块都需要一个唯一的标识符（Identifier）。这个标识符用于去重、缓存、和模块引用。本章深入理解标识符的设计与实现。

## 为什么需要唯一标识符？

考虑以下场景：

```javascript
// a.js
import { utils } from './shared/utils.js';

// b.js  
import { utils } from '../src/shared/utils.js';

// c.js
import { utils } from '/project/src/shared/utils.js';
```

这三个 import 指向同一个文件，但请求路径不同。Webpack 需要识别它们是同一个模块。

**模块标识符的作用**：

1. **模块去重**：确保同一文件只构建一次
2. **缓存键**：作为持久化缓存的键
3. **模块引用**：在 runtime 中标识模块
4. **Hash 计算**：参与 contenthash 计算

## 标识符的设计原则

一个好的模块标识符需要满足：

1. **唯一性**：不同模块必须有不同的标识符
2. **稳定性**：相同模块每次构建产生相同的标识符
3. **可读性**：便于调试时理解
4. **高效性**：计算和比较要快

## NormalModule 的标识符

NormalModule 的标识符由多个部分组成：

```typescript
export class NormalModule extends Module {
  identifier(): string {
    let id = this.type;          // 模块类型
    
    if (this.layer) {
      id += `|${this.layer}`;    // 模块层
    }
    
    // Loader 链（顺序敏感）
    for (const loader of this.loaders) {
      id += `|${loader.loader}`;
      if (loader.options) {
        id += `?${stringifyOptions(loader.options)}`;
      }
    }
    
    // 资源路径
    id += `|${this.resource}`;
    id += this.resourceQuery;     // 查询参数
    id += this.resourceFragment;  // 片段标识
    
    return id;
  }
}

function stringifyOptions(options: any): string {
  if (typeof options === 'string') {
    return options;
  }
  return JSON.stringify(options);
}
```

**示例**：

```typescript
// 普通 JavaScript 模块
"javascript/auto|/project/src/index.js"

// 带 Loader 的模块
"javascript/auto|/path/to/babel-loader?{\"presets\":[\"@babel/preset-env\"]}|/project/src/index.js"

// 带查询参数的模块
"javascript/auto|/project/src/worker.js?worker"

// 带层的模块
"javascript/auto|ssr|/project/src/index.js"
```

## 为什么 Loader 要包含在标识符中？

这是一个关键设计决策。考虑：

```javascript
// 两种方式导入同一个 CSS 文件
import styles from './style.css';                    // css-loader
import styleUrl from '!!url-loader!./style.css';    // url-loader
```

虽然资源文件相同，但处理结果完全不同：
- 第一个得到 CSS Modules 对象
- 第二个得到 Data URL

**它们必须是不同的模块**。

## 标识符的规范化

为了确保稳定性，标识符需要规范化处理：

```typescript
/**
 * 规范化模块标识符
 */
export function normalizeIdentifier(id: string): string {
  // 1. 规范化路径分隔符
  id = id.replace(/\\/g, '/');
  
  // 2. 规范化查询参数顺序
  id = normalizeQueryString(id);
  
  // 3. 移除不必要的路径组件
  id = id.replace(/\/\.\//g, '/');  // 移除 /./
  
  return id;
}

/**
 * 规范化查询字符串中的参数顺序
 */
function normalizeQueryString(str: string): string {
  const parts = str.split('?');
  if (parts.length <= 1) return str;
  
  const [path, query] = parts;
  const params = new URLSearchParams(query);
  
  // 按键排序
  const sortedParams = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  
  return `${path}?${sortedParams}`;
}
```

## 短标识符（Module ID）

完整标识符可能很长，在输出的代码中不够高效。Webpack 会生成短标识符（Module ID）：

```typescript
export class Compilation {
  private moduleIds = new Map<Module, string | number>();
  
  /**
   * 分配模块 ID
   */
  assignModuleIds(): void {
    const modules = this.getModules();
    
    // 不同的 ID 分配策略
    switch (this.options.optimization.moduleIds) {
      case 'natural':
        this.assignNaturalModuleIds(modules);
        break;
      case 'named':
        this.assignNamedModuleIds(modules);
        break;
      case 'deterministic':
        this.assignDeterministicModuleIds(modules);
        break;
      case 'size':
        this.assignSizeModuleIds(modules);
        break;
    }
  }
  
  /**
   * 自然数 ID（按遇到顺序）
   */
  private assignNaturalModuleIds(modules: Module[]): void {
    let id = 0;
    for (const module of modules) {
      this.moduleIds.set(module, id++);
    }
  }
  
  /**
   * 命名 ID（使用可读路径）
   */
  private assignNamedModuleIds(modules: Module[]): void {
    for (const module of modules) {
      const name = module.readableIdentifier(this.requestShortener);
      this.moduleIds.set(module, name);
    }
  }
  
  /**
   * 确定性 ID（基于内容的短 hash）
   */
  private assignDeterministicModuleIds(modules: Module[]): void {
    for (const module of modules) {
      const hash = createHash('md5');
      hash.update(module.identifier());
      const id = parseInt(hash.digest('hex').slice(0, 8), 16);
      this.moduleIds.set(module, id);
    }
  }
}
```

**ID 策略对比**：

| 策略 | 优点 | 缺点 | 使用场景 |
|------|------|------|---------|
| natural | 最小体积 | 不稳定 | 开发环境 |
| named | 可读性好 | 体积大 | 开发调试 |
| deterministic | 稳定、体积小 | 计算成本 | 生产环境 |
| size | 按大小优化 | 不稳定 | 特殊优化 |

## 可读标识符

用于日志、错误信息等人类可读的场景：

```typescript
export class NormalModule extends Module {
  readableIdentifier(requestShortener: RequestShortener): string {
    return requestShortener.shorten(this.userRequest);
  }
}

/**
 * 请求路径缩短器
 */
export class RequestShortener {
  private contextRoot: string;
  
  constructor(context: string) {
    this.contextRoot = context;
  }
  
  shorten(request: string): string {
    // 移除上下文前缀
    if (request.startsWith(this.contextRoot)) {
      request = '.' + request.slice(this.contextRoot.length);
    }
    
    // 移除 node_modules 前缀
    request = request.replace(
      /node_modules\//g,
      ''
    );
    
    // 移除 loader 路径中的绝对路径
    request = request.replace(
      /!\/[^!]+\//g,
      '!'
    );
    
    return request;
  }
}
```

**示例**：

```typescript
// 完整标识符
"/users/dev/project/node_modules/lodash/index.js"

// 缩短后
"lodash/index.js"

// 带 Loader 的完整标识符
"/users/dev/project/node_modules/babel-loader/lib/index.js!/users/dev/project/src/index.js"

// 缩短后
"babel-loader!./src/index.js"
```

## 标识符与缓存

标识符在持久化缓存中起关键作用：

```typescript
export class ModuleCache {
  private cache = new Map<string, CachedModule>();
  
  /**
   * 获取缓存的模块
   */
  get(module: Module): CachedModule | undefined {
    const key = this.getCacheKey(module);
    return this.cache.get(key);
  }
  
  /**
   * 缓存模块
   */
  set(module: Module, cached: CachedModule): void {
    const key = this.getCacheKey(module);
    this.cache.set(key, cached);
  }
  
  /**
   * 生成缓存键
   */
  private getCacheKey(module: Module): string {
    // 基于标识符计算缓存键
    const identifier = module.identifier();
    const hash = createHash('md5');
    hash.update(identifier);
    return hash.digest('hex');
  }
}
```

## 标识符比较与去重

```typescript
export class Compilation {
  private modulesByIdentifier = new Map<string, Module>();
  
  /**
   * 添加模块（自动去重）
   */
  addModule(module: Module): Module {
    const identifier = module.identifier();
    
    // 检查是否已存在
    const existing = this.modulesByIdentifier.get(identifier);
    if (existing) {
      return existing;  // 返回已存在的模块
    }
    
    // 添加新模块
    this.modulesByIdentifier.set(identifier, module);
    this._modules.push(module);
    
    return module;
  }
  
  /**
   * 查找模块
   */
  findModule(identifier: string): Module | undefined {
    return this.modulesByIdentifier.get(identifier);
  }
}
```

## 总结

模块标识符是 Webpack 模块系统的基础：

**设计要点**：
1. **包含所有影响构建结果的因素**：类型、Loader、资源路径、查询参数
2. **确保唯一性和稳定性**：规范化处理
3. **支持多种表示形式**：完整标识符、短 ID、可读标识符

**关键方法**：
- `identifier()`：返回完整的唯一标识符
- `readableIdentifier()`：返回人类可读的标识符
- Module ID：输出代码中使用的短标识符

**最佳实践**：
- 开发环境使用 `named` ID 便于调试
- 生产环境使用 `deterministic` ID 确保稳定性和缓存效率

下一章我们将详细介绍模块构建流程。
