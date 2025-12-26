---
sidebar_position: 119
title: "RuntimeModule 运行时模块"
---

# RuntimeModule 运行时模块

RuntimeModule 是 Webpack 5 引入的概念，用于将运行时代码模块化，实现按需生成和更好的代码分离。

## 设计理念

### 传统方式 vs RuntimeModule

```javascript
// 传统方式：所有运行时代码硬编码在模板中
// 无论是否需要，都会包含全部代码

// RuntimeModule 方式：按需生成
// 只包含实际使用的运行时功能
// 每个功能是独立的模块
```

### 核心优势

```typescript
// 1. 按需生成：只包含使用到的运行时
// 2. 代码复用：多个 chunk 可共享运行时
// 3. 易于扩展：插件可添加自定义运行时
// 4. 更好的缓存：运行时可单独分离
```

## 基础结构

### RuntimeModule 基类

```typescript
abstract class RuntimeModule extends Module {
  // 运行时模块名称
  name: string;
  
  // 生成阶段
  stage: number;
  
  // 关联的 chunk
  chunk: Chunk | null = null;
  
  // 关联的 compilation
  compilation: Compilation | null = null;
  
  constructor(name: string, stage: number = 0) {
    super('runtime');
    this.name = name;
    this.stage = stage;
  }
  
  // 标识符
  identifier(): string {
    return `webpack/runtime/${this.name}`;
  }
  
  // 可读名称
  readableIdentifier(): string {
    return `webpack/runtime/${this.name}`;
  }
  
  // 子类实现：生成运行时代码
  abstract generate(): string;
  
  // 获取生成的代码
  getGeneratedCode(): string {
    return this.generate();
  }
  
  // 返回模块大小
  size(): number {
    return this.getGeneratedCode().length;
  }
}

// 生成阶段常量
RuntimeModule.STAGE_NORMAL = 0;
RuntimeModule.STAGE_BASIC = 5;
RuntimeModule.STAGE_ATTACH = 10;
RuntimeModule.STAGE_TRIGGER = 20;
```

### 运行时需求处理

```typescript
class Compilation {
  processRuntimeRequirements(): void {
    // 收集所有运行时需求
    for (const chunk of this.chunks) {
      const runtimeRequirements = this.chunkGraph.getChunkRuntimeRequirements(chunk);
      
      // 根据需求添加运行时模块
      for (const requirement of runtimeRequirements) {
        this.addRuntimeModule(chunk, requirement);
      }
    }
  }
  
  addRuntimeModule(chunk: Chunk, requirement: string): void {
    // 触发 hook，让插件添加对应的运行时模块
    const runtimeModule = this.hooks.runtimeRequirementInTree
      .for(requirement)
      .call(chunk, new Set([requirement]));
    
    if (runtimeModule) {
      this.chunkGraph.connectChunkAndRuntimeModule(chunk, runtimeModule);
    }
  }
}
```

## 核心运行时模块

### PublicPathRuntimeModule

```typescript
class PublicPathRuntimeModule extends RuntimeModule {
  constructor() {
    super('publicPath');
  }
  
  generate(): string {
    const { compilation } = this;
    const publicPath = compilation.outputOptions.publicPath;
    
    if (typeof publicPath === 'function') {
      // 动态 publicPath
      return `__webpack_require__.p = ${publicPath.toString()};`;
    }
    
    // 静态 publicPath
    return `__webpack_require__.p = ${JSON.stringify(publicPath || '')};`;
  }
}

// 注册
class RuntimePlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('RuntimePlugin', (compilation) => {
      compilation.hooks.runtimeRequirementInTree
        .for(RuntimeGlobals.publicPath)
        .tap('RuntimePlugin', (chunk) => {
          compilation.addRuntimeModule(chunk, new PublicPathRuntimeModule());
          return true;
        });
    });
  }
}
```

### DefinePropertyGettersRuntimeModule

```typescript
class DefinePropertyGettersRuntimeModule extends RuntimeModule {
  constructor() {
    super('define property getters');
  }
  
  generate(): string {
    return `
// 定义导出属性的 getter
__webpack_require__.d = function(exports, definition) {
  for(var key in definition) {
    if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
      Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
    }
  }
};
`;
  }
}
```

### HasOwnPropertyRuntimeModule

```typescript
class HasOwnPropertyRuntimeModule extends RuntimeModule {
  constructor() {
    super('hasOwnProperty shorthand');
  }
  
  generate(): string {
    return `
__webpack_require__.o = function(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
};
`;
  }
}
```

### MakeNamespaceObjectRuntimeModule

```typescript
class MakeNamespaceObjectRuntimeModule extends RuntimeModule {
  constructor() {
    super('make namespace object');
  }
  
  generate(): string {
    return `
// 标记模块为 ES 模块
__webpack_require__.r = function(exports) {
  if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
  }
  Object.defineProperty(exports, '__esModule', { value: true });
};
`;
  }
}
```

### EnsureChunkRuntimeModule

```typescript
class EnsureChunkRuntimeModule extends RuntimeModule {
  constructor() {
    super('ensure chunk', RuntimeModule.STAGE_ATTACH);
  }
  
  generate(): string {
    const { compilation, chunk } = this;
    const { chunkGraph, outputOptions } = compilation;
    
    // 获取加载方式
    const loadingMethods = this.getLoadingMethods(chunk);
    
    return `
// 存储加载中的 chunk
__webpack_require__.f = {};

// 确保 chunk 加载完成
__webpack_require__.e = function(chunkId) {
  return Promise.all(Object.keys(__webpack_require__.f).reduce(function(promises, key) {
    __webpack_require__.f[key](chunkId, promises);
    return promises;
  }, []));
};
`;
  }
  
  getLoadingMethods(chunk: Chunk): string[] {
    // 根据目标环境选择加载方式
    const methods: string[] = [];
    
    // JSONP 加载（浏览器）
    if (this.compilation.outputOptions.chunkLoading === 'jsonp') {
      methods.push('jsonp');
    }
    
    // import() 加载
    if (this.compilation.outputOptions.chunkLoading === 'import') {
      methods.push('import');
    }
    
    return methods;
  }
}
```

## JSONP 运行时

### JsonpChunkLoadingRuntimeModule

```typescript
class JsonpChunkLoadingRuntimeModule extends RuntimeModule {
  constructor() {
    super('jsonp chunk loading', RuntimeModule.STAGE_ATTACH);
  }
  
  generate(): string {
    const { compilation, chunk } = this;
    const globalObject = compilation.outputOptions.globalObject;
    const chunkLoadingGlobal = compilation.outputOptions.chunkLoadingGlobal;
    
    return `
// JSONP chunk 加载
var installedChunks = {
  ${JSON.stringify(this.chunkGraph.getChunkId(chunk))}: 0
};

__webpack_require__.f.j = function(chunkId, promises) {
  // 检查是否已安装
  var installedChunkData = installedChunks[chunkId];
  
  if(installedChunkData !== 0) { // 0 表示已安装
    if(installedChunkData) {
      // 正在加载
      promises.push(installedChunkData[2]);
    } else {
      // 需要加载
      var promise = new Promise(function(resolve, reject) {
        installedChunkData = installedChunks[chunkId] = [resolve, reject];
      });
      promises.push(installedChunkData[2] = promise);
      
      // 开始加载
      var url = __webpack_require__.p + __webpack_require__.u(chunkId);
      var error = new Error();
      
      var loadingEnded = function(event) {
        // ...处理加载完成
      };
      
      __webpack_require__.l(url, loadingEnded, "chunk-" + chunkId, chunkId);
    }
  }
};

// webpackChunk 回调
var webpackJsonpCallback = function(parentChunkLoadingFunction, data) {
  var chunkIds = data[0];
  var moreModules = data[1];
  var runtime = data[2];
  
  // 添加模块
  for(var moduleId in moreModules) {
    if(__webpack_require__.o(moreModules, moduleId)) {
      __webpack_require__.m[moduleId] = moreModules[moduleId];
    }
  }
  
  // 执行运行时
  if(runtime) runtime(__webpack_require__);
  
  // 标记 chunk 已加载
  while(chunkIds.length) {
    var chunkId = chunkIds.pop();
    if(installedChunks[chunkId]) {
      installedChunks[chunkId][0]();
    }
    installedChunks[chunkId] = 0;
  }
};

var chunkLoadingGlobal = ${globalObject}[${JSON.stringify(chunkLoadingGlobal)}] = ${globalObject}[${JSON.stringify(chunkLoadingGlobal)}] || [];
chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
`;
  }
}
```

## 模块 ID 运行时

### GetChunkFilenameRuntimeModule

```typescript
class GetChunkFilenameRuntimeModule extends RuntimeModule {
  constructor(
    private contentType: string,
    private name: string,
    private global: string,
    private getFilenameForChunk: (chunk: Chunk) => string
  ) {
    super(`get ${name} chunk filename`);
  }
  
  generate(): string {
    const { compilation, chunk } = this;
    const { chunkGraph } = compilation;
    
    // 收集所有可能加载的 chunk
    const chunks: Map<string, string> = new Map();
    
    for (const c of chunk.getAllAsyncChunks()) {
      const id = chunkGraph.getChunkId(c);
      const filename = this.getFilenameForChunk(c);
      chunks.set(id, filename);
    }
    
    if (chunks.size === 0) {
      return `${this.global} = function() { return ''; };`;
    }
    
    // 生成映射
    const chunksObject = Object.fromEntries(chunks);
    
    return `
${this.global} = function(chunkId) {
  var map = ${JSON.stringify(chunksObject)};
  return map[chunkId];
};
`;
  }
}
```

## 自定义运行时模块

### 创建自定义模块

```typescript
class MyCustomRuntimeModule extends RuntimeModule {
  constructor() {
    super('my-custom-runtime');
  }
  
  generate(): string {
    return `
// 自定义运行时功能
__webpack_require__.myCustom = function(value) {
  console.log('Custom runtime:', value);
  return value;
};
`;
  }
}

// 注册插件
class MyRuntimePlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('MyRuntimePlugin', (compilation) => {
      compilation.hooks.runtimeRequirementInTree
        .for('myCustomRequirement')
        .tap('MyRuntimePlugin', (chunk, set) => {
          compilation.addRuntimeModule(
            chunk,
            new MyCustomRuntimeModule()
          );
          return true;
        });
    });
  }
}
```

## 运行时排序

### Stage 机制

```typescript
// 按 stage 排序运行时模块
class Compilation {
  getRuntimeModules(chunk: Chunk): RuntimeModule[] {
    const modules = this.chunkGraph.getChunkRuntimeModulesIterable(chunk);
    
    // 按 stage 排序
    return [...modules].sort((a, b) => a.stage - b.stage);
  }
}

// Stage 定义
// STAGE_NORMAL (0): 普通运行时模块
// STAGE_BASIC (5): 基础功能
// STAGE_ATTACH (10): 附加功能（如 chunk 加载）
// STAGE_TRIGGER (20): 触发器（如启动代码）
```

## 总结

RuntimeModule 运行时模块的核心要点：

**设计理念**：
- 按需生成
- 模块化组织
- 易于扩展

**核心模块**：
- PublicPathRuntimeModule
- DefinePropertyGettersRuntimeModule
- EnsureChunkRuntimeModule
- JsonpChunkLoadingRuntimeModule

**实现机制**：
- 基于 runtimeRequirements
- Hook 驱动的注册
- Stage 排序

**自定义扩展**：
- 继承 RuntimeModule
- 实现 generate 方法
- 通过 Hook 注册

**下一章**：我们将学习 Hash 计算与内容寻址。
