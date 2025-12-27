# RuntimeModule 运行时模块

RuntimeModule 是 Webpack 注入到打包结果中的运行时代码，提供模块加载、Chunk 加载等核心功能。

## RuntimeModule 基类

```typescript
abstract class RuntimeModule extends Module {
  /**
   * 运行时模块名称
   */
  abstract name: string
  
  /**
   * 生成运行时代码
   */
  abstract generate(): string
  
  /**
   * 是否应该被隔离
   */
  shouldIsolate(): boolean {
    return true
  }
  
  /**
   * 获取运行时需求
   */
  getRequirements(): Set<string> {
    return new Set()
  }
}
```

## 核心 RuntimeModule

### RequireRuntimeModule

`__webpack_require__` 函数：

```typescript
class RequireRuntimeModule extends RuntimeModule {
  name = 'require'
  
  generate() {
    const { runtimeTemplate } = this.compilation
    
    return Template.asString([
      '// The module cache',
      'var __webpack_module_cache__ = {};',
      '',
      '// The require function',
      `function __webpack_require__(moduleId) {`,
      Template.indent([
        '// Check if module is in cache',
        'var cachedModule = __webpack_module_cache__[moduleId];',
        'if (cachedModule !== undefined) {',
        Template.indent('return cachedModule.exports;'),
        '}',
        '// Create a new module (and put it into the cache)',
        'var module = __webpack_module_cache__[moduleId] = {',
        Template.indent([
          'id: moduleId,',
          'loaded: false,',
          'exports: {}'
        ]),
        '};',
        '',
        '// Execute the module function',
        '__webpack_modules__[moduleId](module, module.exports, __webpack_require__);',
        '',
        '// Flag the module as loaded',
        'module.loaded = true;',
        '',
        '// Return the exports of the module',
        'return module.exports;'
      ]),
      '}'
    ])
  }
}
```

### DefinePropertyGettersRuntimeModule

`__webpack_require__.d` 定义 getter：

```typescript
class DefinePropertyGettersRuntimeModule extends RuntimeModule {
  name = 'definePropertyGetters'
  
  generate() {
    return Template.asString([
      '// define getter functions for harmony exports',
      `__webpack_require__.d = ${runtimeTemplate.basicFunction('exports, definition', [
        'for(var key in definition) {',
        Template.indent([
          `if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {`,
          Template.indent([
            'Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });'
          ]),
          '}'
        ]),
        '}'
      ])};`
    ])
  }
}
```

### MakeNamespaceObjectRuntimeModule

`__webpack_require__.r` 标记 ES Module：

```typescript
class MakeNamespaceObjectRuntimeModule extends RuntimeModule {
  name = 'makeNamespaceObject'
  
  generate() {
    return Template.asString([
      '// define __esModule on exports',
      `__webpack_require__.r = ${runtimeTemplate.basicFunction('exports', [
        `if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {`,
        Template.indent([
          `Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });`
        ]),
        '}',
        `Object.defineProperty(exports, '__esModule', { value: true });`
      ])};`
    ])
  }
}
```

### HasOwnPropertyRuntimeModule

`__webpack_require__.o` 检查属性：

```typescript
class HasOwnPropertyRuntimeModule extends RuntimeModule {
  name = 'hasOwnProperty'
  
  generate() {
    return Template.asString([
      `__webpack_require__.o = ${runtimeTemplate.returningFunction(
        'Object.prototype.hasOwnProperty.call(obj, prop)',
        'obj, prop'
      )};`
    ])
  }
}
```

### EnsureChunkRuntimeModule

`__webpack_require__.e` 加载 Chunk：

```typescript
class EnsureChunkRuntimeModule extends RuntimeModule {
  name = 'ensureChunk'
  
  generate() {
    const { chunkGraph } = this.compilation
    
    return Template.asString([
      '// This file contains only the entry chunk.',
      '// The chunk loading function for additional chunks',
      'var installedChunks = {',
      Template.indent(
        Array.from(chunkGraph.getChunkEntryModulesIterable(this.chunk))
          .map(([chunk, _]) => `${JSON.stringify(chunk.id)}: 0`)
          .join(',\n')
      ),
      '};',
      '',
      `__webpack_require__.e = ${runtimeTemplate.basicFunction('chunkId', [
        'return new Promise(function(resolve, reject) {',
        Template.indent([
          'var script = document.createElement("script");',
          'script.charset = "utf-8";',
          'script.timeout = 120;',
          'script.src = __webpack_require__.p + chunkId + ".js";',
          'var onScriptComplete = function(event) {',
          Template.indent([
            'clearTimeout(timeout);',
            'var chunk = installedChunks[chunkId];',
            'if(chunk !== 0) {',
            Template.indent([
              'if(chunk) {',
              Template.indent([
                'var errorType = event && (event.type === "load" ? "missing" : event.type);',
                'var realSrc = event && event.target && event.target.src;',
                'var error = new Error("Loading chunk " + chunkId + " failed. (" + errorType + ": " + realSrc + ")");',
                'error.type = errorType;',
                'error.request = realSrc;',
                'chunk[1](error);'
              ]),
              '}',
              'installedChunks[chunkId] = undefined;'
            ]),
            '}'
          ]),
          '};',
          'var timeout = setTimeout(function(){',
          Template.indent('onScriptComplete({ type: "timeout", target: script });'),
          '}, 120000);',
          'script.onerror = script.onload = onScriptComplete;',
          'document.head.appendChild(script);'
        ]),
        '});'
      ])};`
    ])
  }
}
```

### PublicPathRuntimeModule

`__webpack_require__.p` 公共路径：

```typescript
class PublicPathRuntimeModule extends RuntimeModule {
  name = 'publicPath'
  
  constructor(private publicPath: string) {
    super()
  }
  
  generate() {
    return Template.asString([
      `__webpack_require__.p = ${JSON.stringify(this.publicPath)};`
    ])
  }
}
```

## RuntimeModule 注册

```typescript
class Compilation {
  addRuntimeModule(chunk, runtimeModule) {
    const chunkGraph = this.chunkGraph
    
    // 检查是否已添加
    if (chunkGraph.isModuleInChunk(runtimeModule, chunk)) {
      return
    }
    
    // 添加到 chunk
    chunkGraph.connectChunkAndModule(chunk, runtimeModule)
    chunkGraph.connectChunkAndRuntimeModule(chunk, runtimeModule)
  }
}
```

## Runtime 代码生成

```typescript
class JavascriptModulesPlugin {
  renderChunk(renderContext) {
    const { chunk, chunkGraph, runtimeTemplate } = renderContext
    
    const runtimeModules = chunkGraph
      .getChunkRuntimeModulesIterable(chunk)
    
    const runtimeSource = new ConcatSource()
    
    for (const runtimeModule of runtimeModules) {
      const source = runtimeModule.generate()
      runtimeSource.add(source)
      runtimeSource.add('\n')
    }
    
    return runtimeSource
  }
}
```

## 完整运行时示例

```javascript
/******/ (() => { // webpackBootstrap
/******/   var __webpack_modules__ = ({
/******/     "./src/index.js": ((module, exports, __webpack_require__) => {
/******/       // module code
/******/     })
/******/   });

/******/   // The module cache
/******/   var __webpack_module_cache__ = {};
/******/   
/******/   // The require function
/******/   function __webpack_require__(moduleId) {
/******/     // Check if module is in cache
/******/     var cachedModule = __webpack_module_cache__[moduleId];
/******/     if (cachedModule !== undefined) {
/******/       return cachedModule.exports;
/******/     }
/******/     // Create a new module
/******/     var module = __webpack_module_cache__[moduleId] = {
/******/       exports: {}
/******/     };
/******/     
/******/     // Execute the module function
/******/     __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/     
/******/     // Return the exports
/******/     return module.exports;
/******/   }
/******/   
/******/   // define __esModule on exports
/******/   __webpack_require__.r = (exports) => {
/******/     Object.defineProperty(exports, '__esModule', { value: true });
/******/   };
/******/   
/******/   // Start execution
/******/   __webpack_require__("./src/index.js");
/******/ })();
```

## 总结

- RuntimeModule 提供运行时功能
- `__webpack_require__` 是模块加载核心
- `__webpack_require__.e` 实现 Chunk 懒加载
- `__webpack_require__.d` 定义导出 getter
- `__webpack_require__.r` 标记 ES Module
- RuntimeModule 在 seal 阶段注入到 Chunk
