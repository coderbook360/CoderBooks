---
sidebar_position: 75
title: "动态 import() 解析"
---

# 动态 import() 解析

动态 import() 是 ES2020 引入的异步模块加载语法，是 Webpack 代码分割的核心机制。

## import() 语法

### 基本用法

```javascript
// 基本动态导入
import('./module').then(module => {
  console.log(module.default);
});

// async/await
const module = await import('./module');

// 解构
const { foo, bar } = await import('./module');
```

### Magic Comments

```javascript
// 指定 chunk 名称
import(/* webpackChunkName: "my-chunk" */ './module');

// 预加载
import(/* webpackPreload: true */ './module');

// 预获取
import(/* webpackPrefetch: true */ './module');

// 导入模式
import(/* webpackMode: "lazy" */ './module');
import(/* webpackMode: "eager" */ './module');
import(/* webpackMode: "weak" */ './module');
import(/* webpackMode: "lazy-once" */ './module');

// 包含/排除
import(/* webpackInclude: /\.json$/ */ `./data/${name}`);
import(/* webpackExclude: /\.test\.js$/ */ `./modules/${name}`);

// 组合使用
import(
  /* webpackChunkName: "feature" */
  /* webpackPreload: true */
  './feature'
);
```

## AST 结构

```typescript
// import('./module')
{
  type: 'ImportExpression',
  source: {
    type: 'Literal',
    value: './module'
  }
}

// await import('./module')
{
  type: 'AwaitExpression',
  argument: {
    type: 'ImportExpression',
    source: {
      type: 'Literal',
      value: './module'
    }
  }
}
```

## 解析实现

### ImportParserPlugin

```typescript
class ImportParserPlugin {
  apply(parser: JavascriptParser): void {
    parser.hooks.importCall = new SyncBailHook(['expression']);
    
    // 处理 import() 表达式
    parser.hooks.call.for('import').tap(
      'ImportParserPlugin',
      (expression) => {
        return this.processImportCall(parser, expression);
      }
    );
  }
  
  processImportCall(
    parser: JavascriptParser,
    expression: ImportExpression
  ): boolean | void {
    const source = expression.source;
    
    // 提取 magic comments
    const comments = parser.getCommentsFor(expression);
    const options = this.extractMagicComments(comments);
    
    // 尝试求值
    const result = parser.evaluateExpression(source);
    
    if (result.isString()) {
      // 静态路径
      return this.processStaticImport(
        parser,
        expression,
        result.string!,
        options
      );
    }
    
    // 动态路径
    return this.processDynamicImport(
      parser,
      expression,
      source,
      options
    );
  }
  
  processStaticImport(
    parser: JavascriptParser,
    expression: ImportExpression,
    request: string,
    options: ImportOptions
  ): boolean {
    const dep = new ImportDependency(request, expression.range, options);
    dep.loc = expression.loc;
    
    // 设置依赖属性
    if (options.chunkName) {
      dep.chunkName = options.chunkName;
    }
    if (options.prefetch) {
      dep.prefetch = options.prefetch;
    }
    if (options.preload) {
      dep.preload = options.preload;
    }
    
    parser.state.module.addDependency(dep);
    return true;
  }
  
  processDynamicImport(
    parser: JavascriptParser,
    expression: ImportExpression,
    source: Expression,
    options: ImportOptions
  ): boolean {
    // 分析动态表达式
    const context = this.parseContextPattern(parser, source);
    
    const dep = new ImportContextDependency({
      request: context?.request || './',
      recursive: context?.recursive ?? true,
      regExp: context?.regExp,
      include: options.include,
      exclude: options.exclude,
      mode: options.mode || 'lazy',
      chunkName: options.chunkName,
      category: 'esm',
    });
    
    dep.range = expression.range;
    dep.loc = expression.loc;
    
    parser.state.module.addDependency(dep);
    return true;
  }
}
```

### Magic Comments 解析

```typescript
interface ImportOptions {
  chunkName?: string;
  prefetch?: boolean | number;
  preload?: boolean | number;
  mode?: 'lazy' | 'eager' | 'weak' | 'lazy-once';
  include?: RegExp;
  exclude?: RegExp;
  exports?: string[];
}

class ImportParserPlugin {
  extractMagicComments(comments: Comment[]): ImportOptions {
    const options: ImportOptions = {};
    
    for (const comment of comments) {
      if (comment.type !== 'Block') continue;
      
      const text = comment.value.trim();
      
      // webpackChunkName: "name"
      const chunkNameMatch = text.match(
        /webpackChunkName:\s*(?:"([^"]+)"|'([^']+)')/
      );
      if (chunkNameMatch) {
        options.chunkName = chunkNameMatch[1] || chunkNameMatch[2];
      }
      
      // webpackPreload: true
      const preloadMatch = text.match(
        /webpackPreload:\s*(true|false|\d+)/
      );
      if (preloadMatch) {
        options.preload = preloadMatch[1] === 'true' ? true :
          preloadMatch[1] === 'false' ? false :
          parseInt(preloadMatch[1], 10);
      }
      
      // webpackPrefetch: true
      const prefetchMatch = text.match(
        /webpackPrefetch:\s*(true|false|\d+)/
      );
      if (prefetchMatch) {
        options.prefetch = prefetchMatch[1] === 'true' ? true :
          prefetchMatch[1] === 'false' ? false :
          parseInt(prefetchMatch[1], 10);
      }
      
      // webpackMode: "lazy"
      const modeMatch = text.match(
        /webpackMode:\s*"(lazy|eager|weak|lazy-once)"/
      );
      if (modeMatch) {
        options.mode = modeMatch[1] as ImportOptions['mode'];
      }
      
      // webpackInclude: /\.json$/
      const includeMatch = text.match(
        /webpackInclude:\s*\/(.+)\/([gimsuy]*)/
      );
      if (includeMatch) {
        options.include = new RegExp(includeMatch[1], includeMatch[2]);
      }
      
      // webpackExclude: /\.test\.js$/
      const excludeMatch = text.match(
        /webpackExclude:\s*\/(.+)\/([gimsuy]*)/
      );
      if (excludeMatch) {
        options.exclude = new RegExp(excludeMatch[1], excludeMatch[2]);
      }
      
      // webpackExports: ["default", "named"]
      const exportsMatch = text.match(
        /webpackExports:\s*\[([^\]]+)\]/
      );
      if (exportsMatch) {
        options.exports = exportsMatch[1]
          .split(',')
          .map(s => s.trim().replace(/["']/g, ''));
      }
    }
    
    return options;
  }
}
```

## 导入模式

### lazy 模式（默认）

```javascript
// 源代码
import('./module');

// 生成代码 - 创建新 chunk
__webpack_require__.e(/* import() */ "module")
  .then(__webpack_require__.bind(__webpack_require__, "./module.js"));
```

### eager 模式

```javascript
// 源代码
import(/* webpackMode: "eager" */ './module');

// 生成代码 - 不创建新 chunk，但仍是 Promise
Promise.resolve(__webpack_require__("./module.js"));
```

### weak 模式

```javascript
// 源代码
import(/* webpackMode: "weak" */ './module');

// 生成代码 - 只在模块已加载时成功
__webpack_require__.m["./module.js"]
  ? Promise.resolve(__webpack_require__("./module.js"))
  : Promise.reject(new Error("Module not found"));
```

### lazy-once 模式

```javascript
// 源代码
import(/* webpackMode: "lazy-once" */ `./locales/${lang}`);

// 生成代码 - 上下文中所有模块放在同一个 chunk
__webpack_require__.e(/* import() */ "locales")
  .then(__webpack_require__.bind(__webpack_require__, "./locales/" + lang));
```

## 动态路径处理

### 模板字符串

```javascript
// 源代码
import(`./modules/${name}.js`);
```

```typescript
class ImportParserPlugin {
  parseTemplatePattern(
    parser: JavascriptParser,
    template: TemplateLiteral
  ): ContextPattern | null {
    const quasis = template.quasis;
    const expressions = template.expressions;
    
    if (quasis.length < 2) return null;
    
    // 提取静态前缀
    const prefix = quasis[0].value.cooked || '';
    
    // 提取静态后缀
    const suffix = quasis[quasis.length - 1].value.cooked || '';
    
    // 构建正则
    let regExpStr = '^' + escapeRegExp(prefix);
    
    for (let i = 0; i < expressions.length; i++) {
      regExpStr += '(.*)';
      if (i + 1 < quasis.length - 1) {
        regExpStr += escapeRegExp(quasis[i + 1].value.cooked || '');
      }
    }
    
    regExpStr += escapeRegExp(suffix) + '$';
    
    return {
      request: prefix || './',
      recursive: prefix.includes('/'),
      regExp: new RegExp(regExpStr),
    };
  }
}
```

### 二元表达式

```javascript
// 源代码
import('./modules/' + name + '.js');
```

```typescript
class ImportParserPlugin {
  parseConcatPattern(
    parser: JavascriptParser,
    expression: BinaryExpression
  ): ContextPattern | null {
    const parts: Array<string | null> = [];
    
    // 展开连接表达式
    const flatten = (expr: Expression): void => {
      if (expr.type === 'BinaryExpression' && expr.operator === '+') {
        flatten(expr.left);
        flatten(expr.right);
      } else {
        const result = parser.evaluateExpression(expr);
        if (result.isString()) {
          parts.push(result.string!);
        } else {
          parts.push(null); // 变量
        }
      }
    };
    
    flatten(expression);
    
    // 提取前缀（直到第一个变量）
    const prefixParts = [];
    let i = 0;
    while (i < parts.length && parts[i] !== null) {
      prefixParts.push(parts[i]);
      i++;
    }
    const prefix = prefixParts.join('');
    
    // 构建正则
    const regExpParts = parts.map(p => 
      p === null ? '(.*)' : escapeRegExp(p)
    );
    
    return {
      request: prefix || './',
      recursive: true,
      regExp: new RegExp('^' + regExpParts.join('') + '$'),
    };
  }
}
```

## Chunk 命名

### 静态命名

```javascript
import(/* webpackChunkName: "feature" */ './feature');
// 生成: feature.js
```

### 动态命名

```javascript
import(/* webpackChunkName: "[request]" */ `./modules/${name}`);
// 生成: modules-name.js

import(/* webpackChunkName: "i18n-[index]" */ `./locales/${lang}`);
// 生成: i18n-0.js, i18n-1.js, ...
```

```typescript
class ImportDependency extends Dependency {
  getChunkName(module: Module): string | null {
    if (!this.chunkName) return null;
    
    let name = this.chunkName;
    
    // 替换 [request]
    if (name.includes('[request]')) {
      const request = this.request.replace(/^\.\//, '').replace(/\//g, '-');
      name = name.replace('[request]', request);
    }
    
    // 替换 [index]
    if (name.includes('[index]')) {
      const index = this.getIndexInContext();
      name = name.replace('[index]', String(index));
    }
    
    return name;
  }
}
```

## 预加载与预获取

### 实现原理

```typescript
class ImportDependency extends Dependency {
  updateHash(hash: Hash): void {
    super.updateHash(hash);
    hash.update(`preload:${this.preload}`);
    hash.update(`prefetch:${this.prefetch}`);
  }
}

class JsonpChunkLoadingRuntimeModule {
  generate(): string {
    // 生成预加载代码
    return `
      // Preload
      ${this.generatePreloadCode()}
      
      // Prefetch
      ${this.generatePrefetchCode()}
    `;
  }
  
  generatePreloadCode(): string {
    const preloadChunks = this.getPreloadChunks();
    if (preloadChunks.length === 0) return '';
    
    return `
      // Preload: 高优先级，立即加载
      ${preloadChunks.map(chunk => `
        __webpack_require__.preload(${JSON.stringify(chunk.id)});
      `).join('\n')}
    `;
  }
  
  generatePrefetchCode(): string {
    const prefetchChunks = this.getPrefetchChunks();
    if (prefetchChunks.length === 0) return '';
    
    return `
      // Prefetch: 低优先级，空闲时加载
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(function() {
          ${prefetchChunks.map(chunk => `
            __webpack_require__.prefetch(${JSON.stringify(chunk.id)});
          `).join('\n')}
        });
      }
    `;
  }
}
```

### 生成的 HTML

```html
<!-- Preload: 立即加载 -->
<link rel="preload" href="feature.js" as="script">

<!-- Prefetch: 空闲时加载 -->
<link rel="prefetch" href="feature.js">
```

## 总结

动态 import() 解析的核心要点：

**语法解析**：
- ImportExpression AST 节点
- 支持静态和动态路径
- 提取 Magic Comments

**导入模式**：
- lazy：创建新 chunk
- eager：不分离但异步
- weak：仅使用已加载模块
- lazy-once：上下文共享 chunk

**动态路径**：
- 模板字符串分析
- 二元表达式分析
- 生成 ContextDependency

**优化指令**：
- chunkName：自定义 chunk 名
- prefetch：预获取（低优先级）
- preload：预加载（高优先级）
- include/exclude：过滤模块

**下一章**：我们将学习 Dependency 依赖对象创建。
