---
sidebar_position: 78
title: "Magic Comments 解析"
---

# Magic Comments 解析

Magic Comments 是 Webpack 特有的注释语法，用于在代码中提供额外的构建指令。

## Magic Comments 类型

### 动态导入相关

```javascript
// Chunk 命名
import(/* webpackChunkName: "my-chunk" */ './module');

// 预加载
import(/* webpackPreload: true */ './module');

// 预获取
import(/* webpackPrefetch: true */ './module');

// 导入模式
import(/* webpackMode: "lazy" */ './module');

// 过滤模块
import(/* webpackInclude: /\.json$/ */ `./data/${name}`);
import(/* webpackExclude: /\.test\.js$/ */ `./modules/${name}`);

// 导出过滤
import(/* webpackExports: ["default", "named"] */ './module');

// 忽略导入
import(/* webpackIgnore: true */ externalUrl);
```

### 其他位置

```javascript
// require.context
const context = require.context(
  /* webpackInclude: /\.stories\.js$/ */
  './stories',
  true
);

// 内联 Loader
import(/* webpackChunkName: "theme" */ '!style-loader!css-loader!./theme.css');
```

## 注释收集

### Acorn 配置

```typescript
class JavascriptParser {
  comments: Comment[] = [];
  
  parseToAst(source: string): Program {
    const comments: Comment[] = [];
    
    const ast = acorn.parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
      ranges: true,
      onComment: (
        block: boolean,
        text: string,
        start: number,
        end: number,
        startLoc?: Position,
        endLoc?: Position
      ) => {
        comments.push({
          type: block ? 'Block' : 'Line',
          value: text,
          start,
          end,
          range: [start, end],
          loc: startLoc && endLoc ? { start: startLoc, end: endLoc } : undefined,
        });
      },
    });
    
    this.comments = comments;
    return ast;
  }
}
```

### 获取关联注释

```typescript
class JavascriptParser {
  getCommentsBefore(node: Node): Comment[] {
    const result: Comment[] = [];
    
    for (const comment of this.comments) {
      // 注释在节点之前且紧邻
      if (comment.end <= node.start) {
        // 检查之间是否只有空白
        const between = this.source.slice(comment.end, node.start);
        if (/^\s*$/.test(between)) {
          result.push(comment);
        }
      }
    }
    
    return result;
  }
  
  getCommentsInside(node: Node): Comment[] {
    return this.comments.filter(
      comment => comment.start >= node.start && comment.end <= node.end
    );
  }
  
  getCommentsFor(expression: Expression): Comment[] {
    // 对于 import() 表达式，获取括号内的注释
    if (expression.type === 'CallExpression' ||
        expression.type === 'ImportExpression') {
      return this.getCommentsInside(expression);
    }
    
    return this.getCommentsBefore(expression);
  }
}
```

## Magic Comments 解析

### 解析器实现

```typescript
interface MagicCommentOptions {
  chunkName?: string;
  prefetch?: boolean | number;
  preload?: boolean | number;
  mode?: 'lazy' | 'eager' | 'weak' | 'lazy-once';
  include?: RegExp;
  exclude?: RegExp;
  exports?: string[];
  ignore?: boolean;
}

class MagicCommentParser {
  parse(comments: Comment[]): MagicCommentOptions {
    const options: MagicCommentOptions = {};
    
    for (const comment of comments) {
      // 只处理块注释
      if (comment.type !== 'Block') continue;
      
      const text = comment.value.trim();
      this.parseComment(text, options);
    }
    
    return options;
  }
  
  parseComment(text: string, options: MagicCommentOptions): void {
    // webpackChunkName: "name"
    this.parseStringOption(text, 'webpackChunkName', (value) => {
      options.chunkName = value;
    });
    
    // webpackPreload: true | 1
    this.parseBoolOrNumberOption(text, 'webpackPreload', (value) => {
      options.preload = value;
    });
    
    // webpackPrefetch: true | 1
    this.parseBoolOrNumberOption(text, 'webpackPrefetch', (value) => {
      options.prefetch = value;
    });
    
    // webpackMode: "lazy"
    this.parseStringOption(text, 'webpackMode', (value) => {
      if (['lazy', 'eager', 'weak', 'lazy-once'].includes(value)) {
        options.mode = value as MagicCommentOptions['mode'];
      }
    });
    
    // webpackInclude: /pattern/
    this.parseRegExpOption(text, 'webpackInclude', (value) => {
      options.include = value;
    });
    
    // webpackExclude: /pattern/
    this.parseRegExpOption(text, 'webpackExclude', (value) => {
      options.exclude = value;
    });
    
    // webpackExports: ["default", "named"]
    this.parseArrayOption(text, 'webpackExports', (value) => {
      options.exports = value;
    });
    
    // webpackIgnore: true
    this.parseBoolOption(text, 'webpackIgnore', (value) => {
      options.ignore = value;
    });
  }
  
  parseStringOption(
    text: string,
    name: string,
    callback: (value: string) => void
  ): void {
    const match = text.match(
      new RegExp(`${name}:\\s*(?:"([^"]+)"|'([^']+)')`)
    );
    if (match) {
      callback(match[1] || match[2]);
    }
  }
  
  parseBoolOption(
    text: string,
    name: string,
    callback: (value: boolean) => void
  ): void {
    const match = text.match(
      new RegExp(`${name}:\\s*(true|false)`)
    );
    if (match) {
      callback(match[1] === 'true');
    }
  }
  
  parseBoolOrNumberOption(
    text: string,
    name: string,
    callback: (value: boolean | number) => void
  ): void {
    const match = text.match(
      new RegExp(`${name}:\\s*(true|false|\\d+)`)
    );
    if (match) {
      if (match[1] === 'true') {
        callback(true);
      } else if (match[1] === 'false') {
        callback(false);
      } else {
        callback(parseInt(match[1], 10));
      }
    }
  }
  
  parseRegExpOption(
    text: string,
    name: string,
    callback: (value: RegExp) => void
  ): void {
    const match = text.match(
      new RegExp(`${name}:\\s*\\/(.+)\\/([gimsuy]*)`)
    );
    if (match) {
      try {
        callback(new RegExp(match[1], match[2]));
      } catch {
        // 无效的正则，忽略
      }
    }
  }
  
  parseArrayOption(
    text: string,
    name: string,
    callback: (value: string[]) => void
  ): void {
    const match = text.match(
      new RegExp(`${name}:\\s*\\[([^\\]]+)\\]`)
    );
    if (match) {
      const items = match[1]
        .split(',')
        .map(s => s.trim().replace(/["']/g, ''))
        .filter(Boolean);
      callback(items);
    }
  }
}
```

## 在 Import Parser 中使用

```typescript
class ImportParserPlugin {
  private magicCommentParser = new MagicCommentParser();
  
  apply(parser: JavascriptParser): void {
    parser.hooks.importCall.tap('ImportParserPlugin', (expression) => {
      // 获取注释
      const comments = parser.getCommentsFor(expression);
      
      // 解析 magic comments
      const options = this.magicCommentParser.parse(comments);
      
      // 检查是否忽略
      if (options.ignore) {
        // 创建外部依赖或跳过
        return true;
      }
      
      // 创建依赖
      const source = expression.source;
      const result = parser.evaluateExpression(source);
      
      if (result.isString()) {
        const dep = new ImportDependency(
          result.string!,
          expression.range,
          {
            chunkName: options.chunkName,
            prefetch: options.prefetch,
            preload: options.preload,
            exports: options.exports,
          }
        );
        parser.state.module.addDependency(dep);
      } else {
        const dep = new ImportContextDependency({
          request: this.getContextRequest(source),
          mode: options.mode || 'lazy',
          include: options.include,
          exclude: options.exclude,
          chunkName: options.chunkName,
        });
        parser.state.module.addDependency(dep);
      }
      
      return true;
    });
  }
}
```

## Chunk 名称处理

### 占位符替换

```typescript
class ImportDependency extends Dependency {
  resolveChunkName(request: string): string | null {
    if (!this.chunkName) return null;
    
    let name = this.chunkName;
    
    // [request] - 模块请求路径
    if (name.includes('[request]')) {
      const cleanRequest = request
        .replace(/^\.\//, '')
        .replace(/\//g, '-')
        .replace(/\.[^.]+$/, '');
      name = name.replace('[request]', cleanRequest);
    }
    
    // [index] - 在上下文中的索引
    if (name.includes('[index]')) {
      const index = this.getIndexInContext();
      name = name.replace('[index]', String(index));
    }
    
    return name;
  }
}

// 示例
// import(/* webpackChunkName: "page-[request]" */ `./pages/${page}`)
// page = 'home' => 'page-home'
// page = 'users/list' => 'page-users-list'
```

### 验证 Chunk 名称

```typescript
function validateChunkName(name: string): string | null {
  // 检查无效字符
  if (/[<>:"|?*]/.test(name)) {
    return null; // 文件名非法字符
  }
  
  // 检查保留名称
  const reserved = ['con', 'prn', 'aux', 'nul', 'com1', 'lpt1'];
  if (reserved.includes(name.toLowerCase())) {
    return null;
  }
  
  // 规范化
  return name
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');
}
```

## 预加载与预获取

### 优先级处理

```typescript
class ImportDependency extends Dependency {
  get prefetchOrder(): number | null {
    if (this.prefetch === true) return 0;
    if (typeof this.prefetch === 'number') return this.prefetch;
    return null;
  }
  
  get preloadOrder(): number | null {
    if (this.preload === true) return 0;
    if (typeof this.preload === 'number') return this.preload;
    return null;
  }
}

// 数字表示优先级，数字越大优先级越高
// import(/* webpackPrefetch: 1 */ './a');  // 优先级 1
// import(/* webpackPrefetch: 2 */ './b');  // 优先级 2，先预获取
```

### 代码生成

```typescript
class ChunkLoadingRuntimeModule {
  generatePrefetchCode(): string {
    const prefetchChunks = this.compilation.chunks
      .filter(chunk => chunk.prefetchOrder !== null)
      .sort((a, b) => (b.prefetchOrder || 0) - (a.prefetchOrder || 0));
    
    if (prefetchChunks.length === 0) return '';
    
    return `
      // 空闲时预获取
      var prefetchChunks = ${JSON.stringify(prefetchChunks.map(c => c.id))};
      var prefetch = function() {
        prefetchChunks.forEach(function(chunkId) {
          var link = document.createElement('link');
          link.rel = 'prefetch';
          link.as = 'script';
          link.href = __webpack_require__.p + __webpack_require__.u(chunkId);
          document.head.appendChild(link);
        });
      };
      
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(prefetch);
      } else {
        setTimeout(prefetch, 0);
      }
    `;
  }
  
  generatePreloadCode(): string {
    const preloadChunks = this.compilation.chunks
      .filter(chunk => chunk.preloadOrder !== null)
      .sort((a, b) => (b.preloadOrder || 0) - (a.preloadOrder || 0));
    
    if (preloadChunks.length === 0) return '';
    
    return `
      // 立即预加载
      var preloadChunks = ${JSON.stringify(preloadChunks.map(c => c.id))};
      preloadChunks.forEach(function(chunkId) {
        var link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'script';
        link.href = __webpack_require__.p + __webpack_require__.u(chunkId);
        document.head.appendChild(link);
      });
    `;
  }
}
```

## webpackExports 优化

### 部分导出

```javascript
// 只使用 default 导出
import(/* webpackExports: "default" */ './module');

// 使用多个导出
import(/* webpackExports: ["foo", "bar"] */ './module');
```

```typescript
class ImportDependency extends Dependency {
  getReferencedExports(moduleGraph: ModuleGraph): string[][] {
    if (this.exports) {
      // 只引用指定的导出
      return this.exports.map(e => [e]);
    }
    
    // 引用全部
    return [[]];
  }
}
```

## 错误处理

### 无效注释警告

```typescript
class MagicCommentParser {
  parse(comments: Comment[]): MagicCommentOptions {
    const options: MagicCommentOptions = {};
    const warnings: string[] = [];
    
    for (const comment of comments) {
      if (comment.type !== 'Block') continue;
      
      const text = comment.value.trim();
      
      // 检查是否是 webpack magic comment
      if (!text.startsWith('webpack')) continue;
      
      try {
        this.parseComment(text, options);
      } catch (err) {
        warnings.push(`Invalid magic comment: ${text}`);
      }
    }
    
    return { ...options, warnings };
  }
}

// 在解析时报告警告
if (options.warnings?.length) {
  for (const warning of options.warnings) {
    parser.state.module.addWarning(new Warning(warning));
  }
}
```

## 总结

Magic Comments 解析的核心要点：

**注释收集**：
- 使用 Acorn onComment 回调
- 根据位置关联到 AST 节点

**支持的指令**：
- webpackChunkName：命名 chunk
- webpackPrefetch/Preload：加载策略
- webpackMode：导入模式
- webpackInclude/Exclude：模块过滤
- webpackExports：导出过滤
- webpackIgnore：忽略导入

**处理流程**：
- 获取表达式关联的注释
- 解析提取选项
- 应用到依赖创建

**优化应用**：
- Chunk 命名影响输出
- 预加载提升性能
- 导出过滤支持 Tree Shaking

**下一章**：我们将学习顶层 await 支持。
