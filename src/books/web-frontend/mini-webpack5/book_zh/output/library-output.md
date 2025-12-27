# output.library 库模式配置

library 配置用于将打包结果暴露为可复用的库。

## 基本配置

```javascript
output: {
  library: 'MyLibrary',
  libraryTarget: 'umd',
  umdNamedDefine: true
}
```

## 暴露方式

### 全局变量

```javascript
output: {
  library: 'MyLibrary',
  libraryTarget: 'var'
}
```

输出：

```javascript
var MyLibrary = (function() {
  // ...
  return __webpack_exports__;
})();
```

### Window 对象

```javascript
output: {
  library: 'MyLibrary',
  libraryTarget: 'window'
}
```

输出：

```javascript
window.MyLibrary = (function() {
  // ...
})();
```

### This

```javascript
output: {
  library: 'MyLibrary',
  libraryTarget: 'this'
}
```

输出：

```javascript
this.MyLibrary = (function() {
  // ...
})();
```

## 模块系统

### CommonJS

```javascript
output: {
  library: 'MyLibrary',
  libraryTarget: 'commonjs'
}
```

输出：

```javascript
exports.MyLibrary = (function() {
  // ...
})();
```

### CommonJS2

```javascript
output: {
  library: 'MyLibrary',
  libraryTarget: 'commonjs2'
}
```

输出：

```javascript
module.exports = (function() {
  // ...
})();
```

### AMD

```javascript
output: {
  library: 'MyLibrary',
  libraryTarget: 'amd'
}
```

输出：

```javascript
define('MyLibrary', [], function() {
  return (function() {
    // ...
  })();
});
```

### UMD

```javascript
output: {
  library: 'MyLibrary',
  libraryTarget: 'umd',
  umdNamedDefine: true
}
```

输出：

```javascript
(function webpackUniversalModuleDefinition(root, factory) {
  if(typeof exports === 'object' && typeof module === 'object')
    module.exports = factory();
  else if(typeof define === 'function' && define.amd)
    define('MyLibrary', [], factory);
  else if(typeof exports === 'object')
    exports.MyLibrary = factory();
  else
    root.MyLibrary = factory();
})(this, function() {
  // ...
});
```

## ES Module

```javascript
output: {
  library: {
    type: 'module'
  }
}

experiments: {
  outputModule: true
}
```

输出：

```javascript
export default (function() {
  // ...
})();
```

## library 对象配置

### 基本格式

```javascript
output: {
  library: {
    name: 'MyLibrary',
    type: 'umd',
    export: 'default',
    umdNamedDefine: true
  }
}
```

### 导出特定模块

```javascript
output: {
  library: {
    name: 'MyLibrary',
    type: 'var',
    export: ['default', 'myMethod']
  }
}
```

等同于：

```javascript
var MyLibrary = __webpack_exports__.default.myMethod;
```

## 实现原理

### LibraryTemplatePlugin

```typescript
class LibraryTemplatePlugin {
  constructor(libraryName, libraryTarget) {
    this.library = libraryName
    this.libraryTarget = libraryTarget
  }
  
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('LibraryTemplatePlugin', compilation => {
      compilation.hooks.renderManifest.tap('LibraryTemplatePlugin', (result, options) => {
        if (this.libraryTarget === 'umd') {
          this.applyUMD(result, options)
        } else if (this.libraryTarget === 'var') {
          this.applyVar(result, options)
        }
        // ...
      })
    })
  }
  
  applyUMD(result, options) {
    const { chunk } = options
    
    for (const item of result) {
      if (item.render) {
        const originalRender = item.render
        item.render = () => {
          const source = originalRender()
          return new ConcatSource(
            this.renderUMDPrefix(),
            source,
            this.renderUMDSuffix()
          )
        }
      }
    }
  }
  
  renderUMDPrefix() {
    return new RawSource(
      `(function webpackUniversalModuleDefinition(root, factory) {
        if(typeof exports === 'object' && typeof module === 'object')
          module.exports = factory();
        else if(typeof define === 'function' && define.amd)
          define(${JSON.stringify(this.library)}, [], factory);
        else if(typeof exports === 'object')
          exports[${JSON.stringify(this.library)}] = factory();
        else
          root[${JSON.stringify(this.library)}] = factory();
      })(this, function() {\n`
    )
  }
  
  renderUMDSuffix() {
    return new RawSource('\n});')
  }
}
```

## 实战示例

### React 组件库

```javascript
module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'my-react-lib.js',
    library: 'MyReactLib',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  externals: {
    react: {
      root: 'React',
      commonjs2: 'react',
      commonjs: 'react',
      amd: 'react'
    }
  }
}
```

### Vue 插件

```javascript
module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'vue-plugin.js',
    library: 'VuePlugin',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  externals: {
    vue: 'Vue'
  }
}
```

### Node.js 库

```javascript
module.exports = {
  target: 'node',
  entry: './src/index.js',
  output: {
    filename: 'lib.js',
    library: {
      type: 'commonjs2'
    }
  }
}
```

## 配合 package.json

```json
{
  "name": "my-library",
  "version": "1.0.0",
  "main": "dist/lib.js",
  "module": "dist/lib.esm.js",
  "browser": "dist/lib.umd.js",
  "exports": {
    ".": {
      "import": "./dist/lib.esm.js",
      "require": "./dist/lib.js"
    }
  }
}
```

## 总结

- library 配置将打包结果暴露为库
- libraryTarget 指定模块系统
- UMD 兼容多种环境
- 支持导出特定模块
- 配合 externals 排除依赖
- 适合开发可复用组件库
