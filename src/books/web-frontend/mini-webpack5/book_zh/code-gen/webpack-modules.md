# __webpack_modules__ 模块注册表

`__webpack_modules__` 是 Webpack 打包后的模块注册表，存储所有模块的工厂函数。

## 基本结构

```javascript
var __webpack_modules__ = {
  "./src/index.js": function(module, exports, __webpack_require__) {
    // 模块代码
  },
  "./src/math.js": function(module, exports, __webpack_require__) {
    // 模块代码
  }
};
```

## 模块工厂函数

每个模块都被包装成工厂函数：

```javascript
function(module, __webpack_exports__, __webpack_require__) {
  "use strict";
  
  // 模块代码
}
```

### 参数说明

| 参数 | 说明 | 类型 |
|------|------|------|
| `module` | 模块对象 | `{ id, loaded, exports }` |
| `__webpack_exports__` | 导出对象 | `Object` |
| `__webpack_require__` | 模块加载函数 | `Function` |

## CommonJS 模块

```javascript
"./src/math.js": function(module, exports, __webpack_require__) {
  function add(a, b) {
    return a + b;
  }
  
  function subtract(a, b) {
    return a - b;
  }
  
  module.exports = {
    add: add,
    subtract: subtract
  };
}
```

## ES Module

```javascript
"./src/math.js": function(module, __webpack_exports__, __webpack_require__) {
  "use strict";
  
  // 标记为 ES Module
  __webpack_require__.r(__webpack_exports__);
  
  // 定义导出
  __webpack_require__.d(__webpack_exports__, {
    add: () => add,
    subtract: () => subtract
  });
  
  function add(a, b) {
    return a + b;
  }
  
  function subtract(a, b) {
    return a - b;
  }
}
```

## import 语句转换

### ESM import

原始代码：

```javascript
import { add } from './math'
console.log(add(1, 2))
```

转换后：

```javascript
"./src/index.js": function(module, __webpack_exports__, __webpack_require__) {
  "use strict";
  
  __webpack_require__.r(__webpack_exports__);
  
  var _math__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/math.js");
  
  console.log(_math__WEBPACK_IMPORTED_MODULE_0__.add(1, 2));
}
```

### CommonJS require

原始代码：

```javascript
const math = require('./math')
console.log(math.add(1, 2))
```

转换后：

```javascript
"./src/index.js": function(module, exports, __webpack_require__) {
  const math = __webpack_require__("./src/math.js");
  console.log(math.add(1, 2));
}
```

### 动态 import()

原始代码：

```javascript
import('./math').then(math => {
  console.log(math.add(1, 2))
})
```

转换后：

```javascript
"./src/index.js": function(module, __webpack_exports__, __webpack_require__) {
  "use strict";
  
  __webpack_require__.r(__webpack_exports__);
  
  __webpack_require__.e(/* import() */ "src_math_js")
    .then(__webpack_require__.bind(__webpack_require__, "./src/math.js"))
    .then(math => {
      console.log(math.add(1, 2));
    });
}
```

## 模块 ID

### 数字 ID

生产环境：

```javascript
var __webpack_modules__ = {
  123: function(module, exports, __webpack_require__) {
    // 模块代码
  },
  456: function(module, exports, __webpack_require__) {
    // 模块代码
  }
};
```

### 字符串 ID

开发环境：

```javascript
var __webpack_modules__ = {
  "./src/index.js": function(module, exports, __webpack_require__) {
    // 模块代码
  },
  "./src/math.js": function(module, exports, __webpack_require__) {
    // 模块代码
  }
};
```

## 模块注册表生成

```typescript
class JavascriptModulesPlugin {
  renderModules(renderContext) {
    const { chunk, chunkGraph, moduleGraph } = renderContext
    
    const modules = chunkGraph.getChunkModules(chunk)
    const sources = []
    
    for (const module of modules) {
      const moduleId = chunkGraph.getModuleId(module)
      const moduleSource = this.renderModule(module, renderContext)
      
      sources.push(`${JSON.stringify(moduleId)}: ${moduleSource}`)
    }
    
    return new ConcatSource(
      '{\n',
      sources.join(',\n'),
      '\n}'
    )
  }
  
  renderModule(module, renderContext) {
    const { codeGenerationResults } = renderContext
    const codeGenResult = codeGenerationResults.get(module)
    const source = codeGenResult.sources.get('javascript')
    
    return new ConcatSource(
      'function(module, __webpack_exports__, __webpack_require__) {\n',
      source,
      '\n}'
    )
  }
}
```

## 完整打包示例

输入文件：

```javascript
// src/math.js
export function add(a, b) {
  return a + b
}

// src/index.js
import { add } from './math'
console.log(add(1, 2))
```

输出：

```javascript
(function(modules) {
  // Runtime code...
  return __webpack_require__("./src/index.js");
})({
  "./src/index.js": function(module, __webpack_exports__, __webpack_require__) {
    "use strict";
    __webpack_require__.r(__webpack_exports__);
    var _math__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/math.js");
    console.log(_math__WEBPACK_IMPORTED_MODULE_0__.add(1, 2));
  },
  "./src/math.js": function(module, __webpack_exports__, __webpack_require__) {
    "use strict";
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      add: () => add
    });
    function add(a, b) {
      return a + b;
    }
  }
});
```

## 模块执行流程

```
1. __webpack_require__("./src/index.js")
   ↓
2. 检查缓存：__webpack_module_cache__["./src/index.js"]
   ↓
3. 创建模块对象：{ id, loaded: false, exports: {} }
   ↓
4. 执行工厂函数：__webpack_modules__["./src/index.js"](module, exports, __webpack_require__)
   ↓
5. 内部调用：__webpack_require__("./src/math.js")
   ↓
6. 重复步骤 2-4
   ↓
7. 返回 exports
```

## 总结

- `__webpack_modules__` 存储所有模块工厂函数
- 每个模块被包装成函数
- 支持 CommonJS 和 ES Module
- 模块 ID 可以是字符串或数字
- 通过 `__webpack_require__` 调用工厂函数
- 实现模块的封装和隔离
