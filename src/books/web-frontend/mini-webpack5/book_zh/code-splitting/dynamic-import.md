---
sidebar_position: 104
title: "动态导入与按需加载"
---

# 动态导入与按需加载

动态导入是实现按需加载的核心机制，通过 `import()` 语法在运行时异步加载模块，显著减少首屏加载时间。

## 动态导入语法

### 基本用法

```javascript
// 静态导入 - 编译时确定
import { foo } from './module';

// 动态导入 - 运行时加载
import('./module').then(module => {
  module.foo();
});

// async/await 语法
async function loadModule() {
  const module = await import('./module');
  module.foo();
}
```

### 魔法注释

```javascript
// 指定 Chunk 名称
import(/* webpackChunkName: "my-chunk" */ './module');

// 预加载
import(/* webpackPreload: true */ './critical-module');

// 预获取
import(/* webpackPrefetch: true */ './future-module');

// 指定加载模式
import(/* webpackMode: "lazy" */ './module');

// 组合使用
import(
  /* webpackChunkName: "feature" */
  /* webpackPreload: true */
  './feature'
);
```

## 解析过程

### 依赖创建

```typescript
class ImportDependency extends ModuleDependency {
  // 动态导入请求
  request: string;
  
  // 魔法注释解析结果
  referencedExports: string[][] | null;
  
  constructor(request: string, range: [number, number]) {
    super(request);
    this.range = range;
  }
  
  get type(): string {
    return 'import()';
  }
}

class ImportDependencyParserPlugin {
  apply(parser: JavascriptParser): void {
    parser.hooks.importCall.tap(
      'ImportDependencyParserPlugin',
      (expr: ImportExpression) => {
        // 解析 import() 调用
        const request = this.getRequest(expr);
        const options = this.parseComments(expr);
        
        // 创建异步依赖块
        const block = new AsyncDependenciesBlock(
          {
            name: options.chunkName,
            preload: options.preload,
            prefetch: options.prefetch,
          },
          expr.loc,
          request
        );
        
        // 创建导入依赖
        const dependency = new ImportDependency(request, expr.range);
        block.addDependency(dependency);
        
        // 添加到当前模块
        parser.state.module.addBlock(block);
        
        return true;
      }
    );
  }
}
```

### 魔法注释解析

```typescript
class MagicCommentParser {
  parse(expr: ImportExpression): ImportOptions {
    const comments = expr.leadingComments || [];
    const options: ImportOptions = {
      chunkName: undefined,
      mode: 'lazy',
      preload: false,
      prefetch: false,
      exports: undefined,
    };
    
    for (const comment of comments) {
      const value = comment.value;
      
      // webpackChunkName
      const chunkNameMatch = value.match(/webpackChunkName:\s*["']([^"']+)["']/);
      if (chunkNameMatch) {
        options.chunkName = chunkNameMatch[1];
      }
      
      // webpackMode
      const modeMatch = value.match(/webpackMode:\s*["']([^"']+)["']/);
      if (modeMatch) {
        options.mode = modeMatch[1] as ImportMode;
      }
      
      // webpackPreload
      if (/webpackPreload:\s*true/.test(value)) {
        options.preload = true;
      }
      
      // webpackPrefetch
      if (/webpackPrefetch:\s*true/.test(value)) {
        options.prefetch = true;
      }
      
      // webpackExports
      const exportsMatch = value.match(/webpackExports:\s*(\[[\s\S]*?\]|"[^"]*")/);
      if (exportsMatch) {
        options.exports = JSON.parse(exportsMatch[1].replace(/'/g, '"'));
      }
    }
    
    return options;
  }
}
```

## Chunk 创建

### 异步 Chunk 生成

```typescript
class Compilation {
  processAsyncBlocks(): void {
    for (const module of this.modules) {
      for (const block of module.blocks) {
        this.processAsyncBlock(block, module);
      }
    }
  }
  
  processAsyncBlock(
    block: AsyncDependenciesBlock,
    parentModule: Module
  ): void {
    // 获取或创建 ChunkGroup
    let chunkGroup = this.blockToChunkGroupMap.get(block);
    
    if (!chunkGroup) {
      const name = block.groupOptions?.name;
      
      // 创建新的 Chunk
      const chunk = new Chunk(name);
      
      // 创建 ChunkGroup
      chunkGroup = new ChunkGroup({
        name,
        preload: block.groupOptions?.preload,
        prefetch: block.groupOptions?.prefetch,
      });
      
      chunkGroup.pushChunk(chunk);
      chunk.addGroup(chunkGroup);
      
      // 注册
      this.chunkGroups.push(chunkGroup);
      this.chunks.add(chunk);
      this.blockToChunkGroupMap.set(block, chunkGroup);
      
      if (name) {
        this.namedChunks.set(name, chunk);
      }
    }
    
    // 建立父子关系
    const parentChunkGroup = this.getModuleChunkGroup(parentModule);
    if (parentChunkGroup) {
      parentChunkGroup.addChild(chunkGroup);
    }
    
    // 处理块内的依赖
    for (const dep of block.dependencies) {
      const depModule = this.moduleGraph.getModule(dep);
      if (depModule) {
        const chunk = chunkGroup.chunks[0];
        this.chunkGraph.connectChunkAndModule(chunk, depModule);
      }
    }
  }
}
```

### 同名 Chunk 合并

```typescript
class Compilation {
  // 具有相同 chunkName 的动态导入会共享同一个 Chunk
  getOrCreateAsyncChunk(name: string): Chunk {
    if (name) {
      const existing = this.namedChunks.get(name);
      if (existing) {
        return existing;
      }
    }
    
    const chunk = new Chunk(name);
    this.chunks.add(chunk);
    
    if (name) {
      this.namedChunks.set(name, chunk);
    }
    
    return chunk;
  }
}

// 使用示例
// 这两个导入会共享同一个 Chunk
import(/* webpackChunkName: "shared" */ './a');
import(/* webpackChunkName: "shared" */ './b');
```

## 运行时代码

### 加载函数生成

```typescript
class ImportDependencyTemplate extends DependencyTemplate {
  apply(
    dependency: ImportDependency,
    source: ReplaceSource,
    templateContext: TemplateContext
  ): void {
    const { chunkGraph, runtimeTemplate } = templateContext;
    
    // 获取目标 Chunk
    const block = dependency.parent as AsyncDependenciesBlock;
    const chunkGroup = chunkGraph.getBlockChunkGroup(block);
    const chunks = chunkGroup ? Array.from(chunkGroup.chunks) : [];
    
    // 生成加载代码
    const loadCode = this.generateLoadCode(chunks, runtimeTemplate);
    
    // 替换源代码
    source.replace(
      dependency.range[0],
      dependency.range[1] - 1,
      loadCode
    );
  }
  
  generateLoadCode(
    chunks: Chunk[],
    runtimeTemplate: RuntimeTemplate
  ): string {
    if (chunks.length === 0) {
      return 'Promise.resolve()';
    }
    
    // 单个 Chunk
    if (chunks.length === 1) {
      const chunk = chunks[0];
      return `__webpack_require__.e(${JSON.stringify(chunk.id)})` +
        `.then(__webpack_require__.bind(__webpack_require__, ${JSON.stringify(chunk.id)}))`;
    }
    
    // 多个 Chunk（需要并行加载）
    const chunkIds = chunks.map(c => c.id);
    return `Promise.all([${chunkIds.map(id => 
      `__webpack_require__.e(${JSON.stringify(id)})`
    ).join(', ')}])`;
  }
}
```

### 运行时模块

```typescript
class EnsureChunkRuntimeModule extends RuntimeModule {
  constructor() {
    super('ensure chunk');
  }
  
  generate(): string {
    return Template.asString([
      '// 已加载的 Chunk',
      'var installedChunks = {',
      Template.indent(
        this.getInstalledChunks()
          .map(id => `${JSON.stringify(id)}: 0`)
          .join(',\n')
      ),
      '};',
      '',
      '// 加载 Chunk 的函数',
      '__webpack_require__.e = function(chunkId) {',
      Template.indent([
        'return Promise.all(Object.keys(__webpack_require__.f).reduce(function(promises, key) {',
        Template.indent('__webpack_require__.f[key](chunkId, promises);'),
        Template.indent('return promises;'),
        '}, []));',
      ]),
      '};',
      '',
      '// JSONP Chunk 加载',
      '__webpack_require__.f.j = function(chunkId, promises) {',
      Template.indent(this.generateJsonpLoader()),
      '};',
    ]);
  }
  
  generateJsonpLoader(): string {
    return Template.asString([
      'var installedChunkData = installedChunks[chunkId];',
      'if (installedChunkData !== 0) {',
      Template.indent([
        'if (installedChunkData) {',
        Template.indent('promises.push(installedChunkData[2]);'),
        '} else {',
        Template.indent([
          'var promise = new Promise(function(resolve, reject) {',
          Template.indent('installedChunkData = installedChunks[chunkId] = [resolve, reject];'),
          '});',
          'promises.push(installedChunkData[2] = promise);',
          '',
          'var url = __webpack_require__.p + chunkId + ".js";',
          'var script = document.createElement("script");',
          'script.src = url;',
          'document.head.appendChild(script);',
        ]),
        '}',
      ]),
      '}',
    ]);
  }
}
```

## 预加载与预获取

### Preload 实现

```typescript
class PreloadChunkRuntimeModule extends RuntimeModule {
  generate(): string {
    return Template.asString([
      '// Preload Chunk',
      '__webpack_require__.preloadChunk = function(chunkId) {',
      Template.indent([
        'var link = document.createElement("link");',
        'link.rel = "preload";',
        'link.as = "script";',
        'link.href = __webpack_require__.p + chunkId + ".js";',
        'document.head.appendChild(link);',
      ]),
      '};',
    ]);
  }
}

// 在入口 Chunk 中注入 preload 标签
class HtmlWebpackPlugin {
  generatePreloadTags(compilation: Compilation): string[] {
    const tags: string[] = [];
    
    for (const chunkGroup of compilation.chunkGroups) {
      if (chunkGroup.options?.preload) {
        for (const chunk of chunkGroup.chunks) {
          for (const file of chunk.files) {
            tags.push(`<link rel="preload" as="script" href="${file}">`);
          }
        }
      }
    }
    
    return tags;
  }
}
```

### Prefetch 实现

```typescript
class PrefetchChunkRuntimeModule extends RuntimeModule {
  generate(): string {
    return Template.asString([
      '// Prefetch Chunk（空闲时加载）',
      '__webpack_require__.prefetchChunk = function(chunkId) {',
      Template.indent([
        'if (typeof requestIdleCallback === "function") {',
        Template.indent([
          'requestIdleCallback(function() {',
          Template.indent([
            'var link = document.createElement("link");',
            'link.rel = "prefetch";',
            'link.href = __webpack_require__.p + chunkId + ".js";',
            'document.head.appendChild(link);',
          ]),
          '});',
        ]),
        '} else {',
        Template.indent([
          'setTimeout(function() {',
          Template.indent([
            'var link = document.createElement("link");',
            'link.rel = "prefetch";',
            'link.href = __webpack_require__.p + chunkId + ".js";',
            'document.head.appendChild(link);',
          ]),
          '}, 0);',
        ]),
        '}',
      ]),
      '};',
    ]);
  }
}
```

## 加载模式

### 不同模式对比

```javascript
// lazy（默认）- 每个动态导入生成单独的 Chunk
import(/* webpackMode: "lazy" */ `./locale/${lang}`);

// lazy-once - 所有可能的模块打包到一个 Chunk
import(/* webpackMode: "lazy-once" */ `./locale/${lang}`);

// eager - 不生成额外 Chunk，模块打包到当前 Chunk
import(/* webpackMode: "eager" */ `./locale/${lang}`);

// weak - 只有模块已加载时才解析成功
import(/* webpackMode: "weak" */ `./locale/${lang}`);
```

### 模式实现

```typescript
class ImportParserPlugin {
  handleDynamicImport(
    expr: ImportExpression,
    mode: ImportMode
  ): void {
    switch (mode) {
      case 'lazy':
        // 创建异步块
        this.createAsyncBlock(expr);
        break;
        
      case 'lazy-once':
        // 创建单个异步块，包含所有可能的模块
        this.createLazyOnceBlock(expr);
        break;
        
      case 'eager':
        // 不创建异步块，同步依赖
        this.createEagerDependency(expr);
        break;
        
      case 'weak':
        // 创建弱依赖
        this.createWeakDependency(expr);
        break;
    }
  }
  
  createWeakDependency(expr: ImportExpression): void {
    // weak 模式下，模块不会被打包
    // 只在运行时检查模块是否已存在
    const dependency = new WeakImportDependency(
      this.getRequest(expr),
      expr.range
    );
    this.parser.state.module.addDependency(dependency);
  }
}
```

## 总结

动态导入与按需加载的核心要点：

**语法支持**：
- import() 动态导入
- 魔法注释配置

**解析过程**：
- 创建 ImportDependency
- 解析魔法注释
- 创建异步块

**Chunk 生成**：
- 自动创建异步 Chunk
- 同名 Chunk 合并

**运行时支持**：
- __webpack_require__.e
- JSONP 加载

**优化策略**：
- Preload 预加载
- Prefetch 预获取
- 不同加载模式

**下一章**：我们将学习 Runtime Chunk 运行时分离。
