# __webpack_require__ 实现

`__webpack_require__` 是 Webpack 运行时的核心函数，负责模块的加载和缓存。

## 基本实现

```javascript
// 模块缓存
var __webpack_module_cache__ = {};

// 模块加载函数
function __webpack_require__(moduleId) {
  // 检查缓存
  var cachedModule = __webpack_module_cache__[moduleId];
  if (cachedModule !== undefined) {
    return cachedModule.exports;
  }
  
  // 创建模块对象
  var module = __webpack_module_cache__[moduleId] = {
    id: moduleId,
    loaded: false,
    exports: {}
  };
  
  // 执行模块函数
  __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
  
  // 标记为已加载
  module.loaded = true;
  
  // 返回导出
  return module.exports;
}
```

## 扩展属性

### __webpack_require__.d

定义 getter 导出：

```javascript
__webpack_require__.d = function(exports, definition) {
  for(var key in definition) {
    if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
      Object.defineProperty(exports, key, {
        enumerable: true,
        get: definition[key]
      });
    }
  }
};
```

使用示例：

```javascript
__webpack_require__.d(__webpack_exports__, {
  add: () => add,
  subtract: () => subtract
});
```

### __webpack_require__.o

检查对象属性：

```javascript
__webpack_require__.o = function(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
};
```

### __webpack_require__.r

标记 ES Module：

```javascript
__webpack_require__.r = function(exports) {
  if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
  }
  Object.defineProperty(exports, '__esModule', { value: true });
};
```

### __webpack_require__.n

兼容 CommonJS：

```javascript
__webpack_require__.n = function(module) {
  var getter = module && module.__esModule ?
    function() { return module['default']; } :
    function() { return module; };
  __webpack_require__.d(getter, { a: getter });
  return getter;
};
```

使用示例：

```javascript
// import moment from 'moment'
var moment = __webpack_require__.n(__webpack_require__("moment"));
console.log(moment().format());
```

### __webpack_require__.p

公共路径：

```javascript
__webpack_require__.p = "/dist/";
```

### __webpack_require__.e

加载 Chunk：

```javascript
var installedChunks = {
  "main": 0
};

__webpack_require__.e = function(chunkId) {
  return new Promise(function(resolve, reject) {
    // 检查是否已加载
    var installedChunkData = installedChunks[chunkId];
    if(installedChunkData !== 0) {
      // 0 表示已加载
      
      if(installedChunkData) {
        // Promise 已存在
        return installedChunkData[2];
      }
      
      // 创建 Promise
      var promise = new Promise(function(resolve, reject) {
        installedChunkData = installedChunks[chunkId] = [resolve, reject];
      });
      installedChunkData[2] = promise;
      
      // 加载脚本
      var script = document.createElement('script');
      script.src = __webpack_require__.p + chunkId + ".js";
      script.onload = onScriptComplete;
      script.onerror = onScriptComplete;
      document.head.appendChild(script);
      
      return promise;
    }
  });
};
```

### __webpack_require__.l

加载脚本：

```javascript
__webpack_require__.l = function(url, done, key, chunkId) {
  if(inProgress[url]) {
    inProgress[url].push(done);
    return;
  }
  
  var script, needAttach;
  if(key !== undefined) {
    var scripts = document.getElementsByTagName("script");
    for(var i = 0; i < scripts.length; i++) {
      var s = scripts[i];
      if(s.getAttribute("src") == url) {
        script = s;
        break;
      }
    }
  }
  
  if(!script) {
    needAttach = true;
    script = document.createElement('script');
    script.charset = 'utf-8';
    script.timeout = 120;
    script.src = url;
  }
  
  inProgress[url] = [done];
  
  var onScriptComplete = function(event) {
    script.onerror = script.onload = null;
    clearTimeout(timeout);
    
    var doneFns = inProgress[url];
    delete inProgress[url];
    
    if(doneFns) {
      var fn = doneFns.shift();
      fn(event);
    }
  };
  
  var timeout = setTimeout(function() {
    onScriptComplete({ type: 'timeout', target: script });
  }, 120000);
  
  script.onerror = script.onload = onScriptComplete;
  
  if(needAttach) {
    document.head.appendChild(script);
  }
};
```

### __webpack_require__.t

创建命名空间：

```javascript
__webpack_require__.t = function(value, mode) {
  // mode & 1: value 是 module id
  // mode & 2: 合并所有属性到 ns
  // mode & 4: 返回 value（已是 ns）
  // mode & 8|1: 行为类似 require
  
  if(mode & 1) value = this(value);
  if(mode & 8) return value;
  
  if((mode & 4) && typeof value === 'object' && value && value.__esModule) {
    return value;
  }
  
  var ns = Object.create(null);
  __webpack_require__.r(ns);
  
  Object.defineProperty(ns, 'default', { enumerable: true, value: value });
  
  if(mode & 2 && typeof value != 'string') {
    for(var key in value) {
      __webpack_require__.d(ns, key, function(key) {
        return value[key];
      }.bind(null, key));
    }
  }
  
  return ns;
};
```

## 完整示例

```javascript
/******/ (() => { // webpackBootstrap
/******/   var __webpack_modules__ = ({
/******/     "./src/math.js": ((module, exports, __webpack_require__) => {
/******/       __webpack_require__.r(exports);
/******/       __webpack_require__.d(exports, {
/******/         add: () => add
/******/       });
/******/       function add(a, b) { return a + b; }
/******/     }),
/******/     "./src/index.js": ((module, exports, __webpack_require__) => {
/******/       var math = __webpack_require__("./src/math.js");
/******/       console.log(math.add(1, 2));
/******/     })
/******/   });
/******/   
/******/   var __webpack_module_cache__ = {};
/******/   
/******/   function __webpack_require__(moduleId) {
/******/     var cachedModule = __webpack_module_cache__[moduleId];
/******/     if (cachedModule !== undefined) {
/******/       return cachedModule.exports;
/******/     }
/******/     
/******/     var module = __webpack_module_cache__[moduleId] = {
/******/       exports: {}
/******/     };
/******/     
/******/     __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/     
/******/     return module.exports;
/******/   }
/******/   
/******/   __webpack_require__.d = (exports, definition) => {
/******/     for(var key in definition) {
/******/       if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/         Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/       }
/******/     }
/******/   };
/******/   
/******/   __webpack_require__.o = (obj, prop) => {
/******/     return Object.prototype.hasOwnProperty.call(obj, prop);
/******/   };
/******/   
/******/   __webpack_require__.r = (exports) => {
/******/     Object.defineProperty(exports, '__esModule', { value: true });
/******/   };
/******/   
/******/   __webpack_require__("./src/index.js");
/******/ })();
```

## 实现细节

### 模块对象结构

```javascript
{
  id: './src/math.js',      // 模块 ID
  loaded: true,             // 是否已加载
  exports: {                // 导出对象
    add: function add(a, b) { return a + b; }
  }
}
```

### Chunk 加载状态

```javascript
{
  0: "已加载",
  [resolve, reject]: "Promise 对象",
  [resolve, reject, promise]: "Promise 对象（包含 promise）"
}
```

## 总结

- `__webpack_require__` 是模块加载核心
- 实现模块缓存避免重复执行
- `.d` 定义 getter 导出
- `.r` 标记 ES Module
- `.e` 实现 Chunk 懒加载
- `.t` 创建命名空间对象
- `.n` 兼容 CommonJS 模块
