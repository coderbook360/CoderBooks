---
sidebar_position: 36
title: "模块类型与 ModuleType"
---

# 模块类型与 ModuleType

Webpack 通过 `type` 字段区分不同类型的模块，不同类型的模块使用不同的 Parser 和 Generator。本章深入理解模块类型系统的设计。

## 为什么需要模块类型？

考虑这些不同的资源：

```javascript
// JavaScript 模块
import { add } from './math.js';

// ESM 模块（严格模式）
import config from './config.mjs';

// JSON 模块
import pkg from './package.json';

// CSS 模块
import styles from './style.module.css';

// WebAssembly 模块
import { fibonacci } from './math.wasm';
```

它们有不同的特性：

| 资源类型 | 解析方式 | 导出方式 | 依赖语法 |
|---------|---------|---------|---------|
| JavaScript | Acorn | CommonJS/ESM | require/import |
| JSON | JSON.parse | default export | 无 |
| CSS | CSS Parser | CSS Modules | @import/url() |
| WASM | WASM Parser | ESM exports | 无 |

**模块类型系统就是为了处理这种多样性**。

## Webpack 内置模块类型

Webpack 5 定义了丰富的模块类型：

### JavaScript 模块类型

```typescript
const JAVASCRIPT_MODULE_TYPES = {
  // 自动检测模块格式
  'javascript/auto': {
    parser: 'javascript/auto',    // 支持 CJS + ESM
    generator: 'javascript',
  },
  
  // 强制 ESM 格式
  'javascript/esm': {
    parser: 'javascript/esm',     // 只支持 ESM
    generator: 'javascript',
  },
  
  // 强制 CommonJS 格式
  'javascript/dynamic': {
    parser: 'javascript/dynamic', // 只支持 CJS
    generator: 'javascript',
  },
};
```

**什么时候用哪个？**

```javascript
// .js 文件 → javascript/auto（自动检测）
// .mjs 文件 → javascript/esm
// .cjs 文件 → javascript/dynamic

// package.json 中 "type": "module" → 所有 .js 都是 esm
```

### 资源模块类型（Asset Modules）

Webpack 5 新增了资源模块，取代了 file-loader、url-loader 等：

```typescript
const ASSET_MODULE_TYPES = {
  // 输出单独文件（类似 file-loader）
  'asset/resource': {
    parser: 'asset',
    generator: 'asset/resource',
  },
  
  // 内联为 Data URL（类似 url-loader）
  'asset/inline': {
    parser: 'asset',
    generator: 'asset/inline',
  },
  
  // 导出源内容（类似 raw-loader）
  'asset/source': {
    parser: 'asset',
    generator: 'asset/source',
  },
  
  // 自动选择（根据大小）
  'asset': {
    parser: 'asset',
    generator: 'asset',  // 根据 parser.dataUrlCondition 决定
  },
};
```

**使用示例**：

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif)$/,
        type: 'asset',  // 自动选择
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024,  // 8KB 以下内联
          },
        },
      },
      {
        test: /\.svg$/,
        type: 'asset/inline',  // 总是内联
      },
      {
        test: /\.(woff|woff2)$/,
        type: 'asset/resource',  // 总是输出文件
      },
    ],
  },
};
```

### 其他模块类型

```typescript
const OTHER_MODULE_TYPES = {
  // JSON 模块
  'json': {
    parser: 'json',
    generator: 'json',
  },
  
  // WebAssembly 模块
  'webassembly/sync': {
    parser: 'webassembly',
    generator: 'webassembly',
  },
  'webassembly/async': {
    parser: 'webassembly',
    generator: 'webassembly',
  },
};
```

## 模块类型的确定流程

模块类型的确定是一个多步骤过程：

```typescript
function determineModuleType(
  resource: string,
  rules: Rule[],
  options: WebpackOptions
): string {
  // 1. 检查规则中的显式 type
  for (const rule of rules) {
    if (matchRule(resource, rule) && rule.type) {
      return rule.type;
    }
  }
  
  // 2. 根据扩展名推断
  const ext = path.extname(resource);
  
  switch (ext) {
    case '.mjs':
      return 'javascript/esm';
    case '.cjs':
      return 'javascript/dynamic';
    case '.json':
      return 'json';
    case '.wasm':
      return 'webassembly/async';
    case '.js':
    case '.jsx':
    case '.ts':
    case '.tsx':
      // 检查 package.json 的 type 字段
      if (isModulePackage(resource)) {
        return 'javascript/esm';
      }
      return 'javascript/auto';
    default:
      return 'javascript/auto';
  }
}
```

## 实现模块类型注册系统

创建 `src/ModuleTypePlugin.ts`：

```typescript
import type { Compiler } from './Compiler';

/**
 * 模块类型配置
 */
interface ModuleTypeConfig {
  /** Parser 类型 */
  parser: string;
  /** Generator 类型 */
  generator: string;
  /** 默认的 Parser 选项 */
  parserOptions?: Record<string, any>;
  /** 默认的 Generator 选项 */
  generatorOptions?: Record<string, any>;
}

/**
 * 模块类型注册表
 */
const moduleTypes = new Map<string, ModuleTypeConfig>();

/**
 * 注册模块类型
 */
export function registerModuleType(
  type: string,
  config: ModuleTypeConfig
): void {
  moduleTypes.set(type, config);
}

/**
 * 获取模块类型配置
 */
export function getModuleTypeConfig(type: string): ModuleTypeConfig | undefined {
  return moduleTypes.get(type);
}

/**
 * 模块类型插件
 * 在 Compiler 初始化时注册所有内置模块类型
 */
export class ModuleTypePlugin {
  apply(compiler: Compiler): void {
    // 注册 JavaScript 模块类型
    registerModuleType('javascript/auto', {
      parser: 'javascript/auto',
      generator: 'javascript',
    });
    
    registerModuleType('javascript/esm', {
      parser: 'javascript/esm',
      generator: 'javascript',
    });
    
    registerModuleType('javascript/dynamic', {
      parser: 'javascript/dynamic',
      generator: 'javascript',
    });
    
    // 注册 JSON 模块类型
    registerModuleType('json', {
      parser: 'json',
      generator: 'json',
    });
    
    // 注册资源模块类型
    registerModuleType('asset', {
      parser: 'asset',
      generator: 'asset',
    });
    
    registerModuleType('asset/resource', {
      parser: 'asset',
      generator: 'asset/resource',
    });
    
    registerModuleType('asset/inline', {
      parser: 'asset',
      generator: 'asset/inline',
    });
    
    registerModuleType('asset/source', {
      parser: 'asset',
      generator: 'asset/source',
    });
    
    // 注册 WebAssembly 模块类型
    registerModuleType('webassembly/async', {
      parser: 'webassembly',
      generator: 'webassembly',
    });
    
    registerModuleType('webassembly/sync', {
      parser: 'webassembly',
      generator: 'webassembly',
    });
  }
}
```

## Parser 与 Generator 的选择

根据模块类型选择合适的 Parser 和 Generator：

```typescript
export class NormalModuleFactory {
  private parserCache = new Map<string, Parser>();
  private generatorCache = new Map<string, Generator>();
  
  /**
   * 获取 Parser 实例
   */
  getParser(type: string, options: Record<string, any> = {}): Parser {
    const cacheKey = `${type}|${JSON.stringify(options)}`;
    
    if (this.parserCache.has(cacheKey)) {
      return this.parserCache.get(cacheKey)!;
    }
    
    const parser = this.createParser(type, options);
    this.parserCache.set(cacheKey, parser);
    return parser;
  }
  
  /**
   * 创建 Parser 实例
   */
  private createParser(type: string, options: Record<string, any>): Parser {
    switch (type) {
      case 'javascript/auto':
        return new JavascriptParser({
          ...options,
          sourceType: 'auto',
        });
        
      case 'javascript/esm':
        return new JavascriptParser({
          ...options,
          sourceType: 'module',
        });
        
      case 'javascript/dynamic':
        return new JavascriptParser({
          ...options,
          sourceType: 'script',
        });
        
      case 'json':
        return new JsonParser(options);
        
      case 'asset':
        return new AssetParser(options);
        
      case 'webassembly':
        return new WebAssemblyParser(options);
        
      default:
        throw new Error(`Unknown parser type: ${type}`);
    }
  }
  
  /**
   * 获取 Generator 实例
   */
  getGenerator(type: string, options: Record<string, any> = {}): Generator {
    const cacheKey = `${type}|${JSON.stringify(options)}`;
    
    if (this.generatorCache.has(cacheKey)) {
      return this.generatorCache.get(cacheKey)!;
    }
    
    const generator = this.createGenerator(type, options);
    this.generatorCache.set(cacheKey, generator);
    return generator;
  }
  
  /**
   * 创建 Generator 实例
   */
  private createGenerator(type: string, options: Record<string, any>): Generator {
    switch (type) {
      case 'javascript':
        return new JavascriptGenerator(options);
        
      case 'json':
        return new JsonGenerator(options);
        
      case 'asset':
        return new AssetGenerator(options);
        
      case 'asset/resource':
        return new AssetGenerator({ ...options, emit: true });
        
      case 'asset/inline':
        return new AssetGenerator({ ...options, emit: false, dataUrl: true });
        
      case 'asset/source':
        return new AssetSourceGenerator(options);
        
      case 'webassembly':
        return new WebAssemblyGenerator(options);
        
      default:
        throw new Error(`Unknown generator type: ${type}`);
    }
  }
}
```

## 自定义模块类型

用户可以通过配置自定义模块类型的处理：

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.graphql$/,
        type: 'javascript/auto',  // 使用 JavaScript 模块类型
        use: ['graphql-loader'],  // 但用 Loader 预处理
      },
      {
        test: /\.ya?ml$/,
        type: 'json',  // 当作 JSON 处理
        use: ['yaml-loader'],  // 先用 Loader 转换
      },
    ],
  },
};
```

也可以通过插件添加新的模块类型：

```javascript
class CustomModuleTypePlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('CustomModuleTypePlugin', (compilation) => {
      // 注册自定义 Parser
      compilation.hooks.normalModuleFactory.tap('CustomModuleTypePlugin', (factory) => {
        factory.hooks.parser.for('my-custom/type').tap('CustomModuleTypePlugin', (parser) => {
          // 配置自定义 Parser
        });
        
        factory.hooks.generator.for('my-custom/type').tap('CustomModuleTypePlugin', (generator) => {
          // 配置自定义 Generator
        });
      });
    });
  }
}
```

## 模块类型与规则匹配

规则中的 `type` 字段会覆盖默认的模块类型：

```typescript
interface Rule {
  test?: RegExp | string | Function;
  type?: string;  // 覆盖模块类型
  use?: Loader[];
  parser?: Record<string, any>;  // 覆盖 Parser 选项
  generator?: Record<string, any>;  // 覆盖 Generator 选项
}

function applyRule(
  rule: Rule,
  module: NormalModule
): void {
  // 应用模块类型
  if (rule.type) {
    module.type = rule.type;
  }
  
  // 应用 Parser 选项
  if (rule.parser) {
    Object.assign(module.parserOptions, rule.parser);
  }
  
  // 应用 Generator 选项
  if (rule.generator) {
    Object.assign(module.generatorOptions, rule.generator);
  }
}
```

## 总结

模块类型系统是 Webpack 处理多种资源的基础：

**核心概念**：
1. **模块类型**：决定如何解析和生成代码
2. **Parser**：负责解析模块内容，提取依赖
3. **Generator**：负责生成最终的运行时代码

**设计要点**：
- 类型字符串格式：`category/subcategory`（如 `javascript/esm`）
- Parser 和 Generator 分离，可以独立扩展
- 支持用户通过配置覆盖默认行为
- 实例缓存，相同配置复用同一实例

**内置模块类型**：
- `javascript/*`：JavaScript 模块
- `json`：JSON 模块
- `asset/*`：资源模块（Webpack 5 新增）
- `webassembly/*`：WebAssembly 模块

下一章我们将讨论模块标识符（Identifier）的设计。
