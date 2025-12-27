# libraryTarget 与 UMD 输出

libraryTarget 定义库的输出格式，UMD 是最常用的通用格式。

## libraryTarget 类型

### var (默认)

输出为全局变量：

```javascript
output: {
  library: 'MyLib',
  libraryTarget: 'var'
}
```

输出：

```javascript
var MyLib = (function() {
  return __webpack_exports__;
})();
```

### assign

直接赋值，不声明：

```javascript
output: {
  library: 'MyLib',
  libraryTarget: 'assign'
}
```

输出：

```javascript
MyLib = (function() {
  return __webpack_exports__;
})();
```

### this

挂载到 this：

```javascript
output: {
  library: 'MyLib',
  libraryTarget: 'this'
}
```

输出：

```javascript
this.MyLib = (function() {
  return __webpack_exports__;
})();
```

### window

挂载到 window：

```javascript
output: {
  library: 'MyLib',
  libraryTarget: 'window'
}
```

输出：

```javascript
window.MyLib = (function() {
  return __webpack_exports__;
})();
```

### global

挂载到 global：

```javascript
output: {
  library: 'MyLib',
  libraryTarget: 'global'
}
```

输出：

```javascript
global.MyLib = (function() {
  return __webpack_exports__;
})();
```

### commonjs

CommonJS exports：

```javascript
output: {
  library: 'MyLib',
  libraryTarget: 'commonjs'
}
```

输出：

```javascript
exports.MyLib = (function() {
  return __webpack_exports__;
})();
```

### commonjs2

CommonJS module.exports：

```javascript
output: {
  libraryTarget: 'commonjs2'
}
```

输出：

```javascript
module.exports = (function() {
  return __webpack_exports__;
})();
```

### amd

AMD 模块：

```javascript
output: {
  library: 'MyLib',
  libraryTarget: 'amd'
}
```

输出：

```javascript
define('MyLib', [], function() {
  return (function() {
    return __webpack_exports__;
  })();
});
```

### umd

Universal Module Definition：

```javascript
output: {
  library: 'MyLib',
  libraryTarget: 'umd',
  umdNamedDefine: true
}
```

## UMD 详解

### UMD 输出格式

```javascript
(function webpackUniversalModuleDefinition(root, factory) {
  // CommonJS2
  if(typeof exports === 'object' && typeof module === 'object')
    module.exports = factory();
  // AMD
  else if(typeof define === 'function' && define.amd)
    define('MyLib', [], factory);
  // CommonJS
  else if(typeof exports === 'object')
    exports['MyLib'] = factory();
  // 全局变量
  else
    root['MyLib'] = factory();
})(typeof self !== 'undefined' ? self : this, function() {
  return (function() {
    // Webpack bundle
    var __webpack_modules__ = ({ /* ... */ });
    
    var __webpack_exports__ = {};
    // ...
    
    return __webpack_exports__;
  })();
});
```

### UMD 配置选项

```javascript
output: {
  library: {
    name: 'MyLib',
    type: 'umd',
    umdNamedDefine: true  // 为 AMD 模块命名
  },
  globalObject: 'this'    // 全局对象
}
```

### 带依赖的 UMD

```javascript
output: {
  library: {
    name: 'MyLib',
    type: 'umd',
    umdNamedDefine: true
  }
},
externals: {
  lodash: {
    commonjs: 'lodash',
    commonjs2: 'lodash',
    amd: 'lodash',
    root: '_'
  }
}
```

输出：

```javascript
(function webpackUniversalModuleDefinition(root, factory) {
  if(typeof exports === 'object' && typeof module === 'object')
    module.exports = factory(require("lodash"));
  else if(typeof define === 'function' && define.amd)
    define("MyLib", ["lodash"], factory);
  else if(typeof exports === 'object')
    exports["MyLib"] = factory(require("lodash"));
  else
    root["MyLib"] = factory(root["_"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_lodash__) {
  return (function() {
    // ...
  })();
});
```

## 实现原理

### UMD Template

```typescript
class UmdTemplatePlugin {
  apply(compilation) {
    const { mainTemplate } = compilation
    
    mainTemplate.hooks.render.tap('UmdTemplatePlugin', (source, chunk, hash, moduleTemplate, dependencyTemplates) => {
      const prefix = this.renderUmdPrefix(chunk)
      const suffix = this.renderUmdSuffix()
      
      return new ConcatSource(prefix, source, suffix)
    })
  }
  
  renderUmdPrefix(chunk) {
    const { library, globalObject } = this.options
    const dependencies = this.getExternalDependencies(chunk)
    
    const amdDeps = dependencies.map(d => JSON.stringify(d.amd)).join(', ')
    const commonjsDeps = dependencies.map(d => `require(${JSON.stringify(d.commonjs)})`).join(', ')
    const rootDeps = dependencies.map(d => `root[${JSON.stringify(d.root)}]`).join(', ')
    
    return `(function webpackUniversalModuleDefinition(root, factory) {
      if(typeof exports === 'object' && typeof module === 'object')
        module.exports = factory(${commonjsDeps});
      else if(typeof define === 'function' && define.amd)
        define(${JSON.stringify(library)}, [${amdDeps}], factory);
      else if(typeof exports === 'object')
        exports[${JSON.stringify(library)}] = factory(${commonjsDeps});
      else
        root[${JSON.stringify(library)}] = factory(${rootDeps});
    })(${globalObject}, function(${dependencies.map(d => d.param).join(', ')}) {\n`
  }
  
  renderUmdSuffix() {
    return '\nreturn __webpack_exports__;\n});'
  }
}
```

## 实战示例

### jQuery 插件

```javascript
module.exports = {
  entry: './src/plugin.js',
  output: {
    filename: 'jquery.plugin.js',
    library: 'jQueryPlugin',
    libraryTarget: 'umd'
  },
  externals: {
    jquery: {
      commonjs: 'jquery',
      commonjs2: 'jquery',
      amd: 'jquery',
      root: 'jQuery'
    }
  }
}
```

### React 组件

```javascript
module.exports = {
  entry: './src/Component.js',
  output: {
    filename: 'Component.js',
    library: 'MyComponent',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: 'this'
  },
  externals: {
    react: 'react',
    'react-dom': 'react-dom'
  }
}
```

### 多入口库

```javascript
module.exports = {
  entry: {
    'lib': './src/index.js',
    'lib.min': './src/index.js'
  },
  output: {
    filename: '[name].js',
    library: 'MyLib',
    libraryTarget: 'umd'
  }
}
```

## 使用库

### 浏览器

```html
<script src="https://cdn.example.com/my-lib.js"></script>
<script>
  MyLib.doSomething();
</script>
```

### CommonJS

```javascript
const MyLib = require('my-lib');
MyLib.doSomething();
```

### ES Module

```javascript
import MyLib from 'my-lib';
MyLib.doSomething();
```

### AMD

```javascript
require(['my-lib'], function(MyLib) {
  MyLib.doSomething();
});
```

## 总结

- libraryTarget 指定模块输出格式
- UMD 兼容多种环境
- 支持 CommonJS、AMD、全局变量
- externals 配置外部依赖
- umdNamedDefine 为 AMD 模块命名
- globalObject 指定全局对象
- 适合开发通用JavaScript库
