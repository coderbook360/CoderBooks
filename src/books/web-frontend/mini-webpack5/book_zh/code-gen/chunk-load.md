# __webpack_chunk_load__ 懒加载

`__webpack_require__.e` (ensureChunk) 实现 Chunk 的按需加载，是代码分割的核心功能。

## 基本原理

```javascript
// 懒加载 Chunk
__webpack_require__.e("chunk-id").then(() => {
  // Chunk 加载完成
  const module = __webpack_require__("./lazy-module.js")
})
```

## 完整实现

```javascript
// 已安装的 Chunk 状态
// 0: 已加载
// undefined: 未加载
// [resolve, reject, promise]: 加载中
var installedChunks = {
  "main": 0
};

__webpack_require__.e = function requireEnsure(chunkId) {
  // 构造 promises 数组
  var promises = [];
  
  // 检查 Chunk 状态
  var installedChunkData = installedChunks[chunkId];
  
  // 0 表示已加载
  if(installedChunkData !== 0) {
    
    // installedChunkData 为 [resolve, reject, promise] 表示加载中
    if(installedChunkData) {
      promises.push(installedChunkData[2]);
    } else {
      // 创建 Promise
      var promise = new Promise(function(resolve, reject) {
        installedChunkData = installedChunks[chunkId] = [resolve, reject];
      });
      promises.push(installedChunkData[2] = promise);
      
      // 开始加载 Chunk
      var url = __webpack_require__.p + __webpack_require__.u(chunkId);
      
      // 创建错误处理
      var error = new Error();
      var loadingEnded = function(event) {
        if(__webpack_require__.o(installedChunks, chunkId)) {
          installedChunkData = installedChunks[chunkId];
          if(installedChunkData !== 0) {
            installedChunks[chunkId] = undefined;
          }
          
          if(installedChunkData) {
            var errorType = event && (event.type === 'load' ? 'missing' : event.type);
            var realSrc = event && event.target && event.target.src;
            error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
            error.name = 'ChunkLoadError';
            error.type = errorType;
            error.request = realSrc;
            installedChunkData[1](error);
          }
        }
      };
      
      // 使用 script 加载
      __webpack_require__.l(url, loadingEnded, "chunk-" + chunkId, chunkId);
    }
  }
  
  return Promise.all(promises);
};
```

## 辅助函数

### __webpack_require__.u

获取 Chunk 文件名：

```javascript
__webpack_require__.u = function(chunkId) {
  // 根据 chunkId 返回文件名
  return chunkId + "." + {
    "chunk-async": "abc123",
    "chunk-vendors": "def456"
  }[chunkId] + ".js";
};
```

### __webpack_require__.l

加载脚本：

```javascript
var inProgress = {};

__webpack_require__.l = function(url, done, key, chunkId) {
  // 检查是否正在加载
  if(inProgress[url]) {
    inProgress[url].push(done);
    return;
  }
  
  var script, needAttach;
  
  // 检查现有脚本
  if(key !== undefined) {
    var scripts = document.getElementsByTagName("script");
    for(var i = 0; i < scripts.length; i++) {
      var s = scripts[i];
      if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == key) {
        script = s;
        break;
      }
    }
  }
  
  // 创建新脚本
  if(!script) {
    needAttach = true;
    script = document.createElement('script');
    
    script.charset = 'utf-8';
    script.timeout = 120;
    script.src = url;
    script.setAttribute("data-webpack", key);
  }
  
  inProgress[url] = [done];
  
  var onScriptComplete = function(prev, event) {
    script.onerror = script.onload = null;
    clearTimeout(timeout);
    
    var doneFns = inProgress[url];
    delete inProgress[url];
    
    // 调用完成回调
    doneFns && doneFns.forEach(function(fn) { return fn(event); });
    
    if(prev) return prev(event);
  };
  
  var timeout = setTimeout(
    onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }),
    120000
  );
  
  script.onerror = onScriptComplete.bind(null, script.onerror);
  script.onload = onScriptComplete.bind(null, script.onload);
  
  needAttach && document.head.appendChild(script);
};
```

## Chunk 文件结构

```javascript
// chunk-async.js
(self["webpackChunk"] = self["webpackChunk"] || []).push([
  ["chunk-async"],
  {
    "./src/async.js": function(module, __webpack_exports__, __webpack_require__) {
      "use strict";
      __webpack_require__.r(__webpack_exports__);
      // 模块代码
    }
  }
]);
```

## webpackChunkCallback

处理 Chunk 加载：

```javascript
var chunkLoadingGlobal = self["webpackChunk"] = self["webpackChunk"] || [];
chunkLoadingGlobal.push = webpackChunkCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));

function webpackChunkCallback(parentChunkLoadingFunction, data) {
  var [chunkIds, moreModules, runtime] = data;
  
  // 添加模块到 __webpack_modules__
  for(var moduleId in moreModules) {
    if(__webpack_require__.o(moreModules, moduleId)) {
      __webpack_modules__[moduleId] = moreModules[moduleId];
    }
  }
  
  // 执行运行时代码
  if(runtime) runtime(__webpack_require__);
  
  // 标记 Chunk 为已加载
  for(var i = 0; i < chunkIds.length; i++) {
    var chunkId = chunkIds[i];
    if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
      installedChunks[chunkId][0]();
    }
    installedChunks[chunkId] = 0;
  }
  
  // 调用原始 push
  return parentChunkLoadingFunction(data);
}
```

## 使用示例

### 动态 import()

原始代码：

```javascript
button.addEventListener('click', async () => {
  const module = await import('./async-module')
  module.doSomething()
})
```

转换后：

```javascript
button.addEventListener('click', async () => {
  const module = await __webpack_require__.e("src_async-module_js")
    .then(__webpack_require__.bind(__webpack_require__, "./src/async-module.js"))
  module.doSomething()
})
```

### 预加载

```javascript
// 预加载 Chunk（不执行）
__webpack_require__.e("chunk-id").then(() => {
  // Chunk 已下载但未执行
})

// 稍后使用
const module = __webpack_require__("./lazy-module.js")
```

## 加载状态管理

```javascript
// Chunk 状态
installedChunks = {
  "main": 0,                              // 已加载
  "chunk-async": undefined,               // 未加载
  "chunk-loading": [resolve, reject, promise]  // 加载中
}
```

## 错误处理

```javascript
__webpack_require__.e("chunk-id")
  .then(() => {
    // 加载成功
    const module = __webpack_require__("./module.js")
  })
  .catch(error => {
    // 加载失败
    console.error('Chunk 加载失败:', error)
  })
```

## JSONP 加载方式

旧版 Webpack 使用 JSONP：

```javascript
// chunk-async.js
webpackJsonp(["chunk-async"], {
  "./src/async.js": function(module, exports) {
    // 模块代码
  }
});
```

## 总结

- `__webpack_require__.e` 实现 Chunk 懒加载
- 使用 Promise 管理加载状态
- 动态创建 `<script>` 标签加载 Chunk
- Chunk 文件通过 `push` 注册模块
- 支持超时和错误处理
- 避免重复加载同一 Chunk
- 与代码分割紧密配合
