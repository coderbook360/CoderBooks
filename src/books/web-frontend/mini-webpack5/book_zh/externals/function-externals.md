---
sidebar_position: 91
title: "函数形式的 externals 配置"
---

# 函数形式的 externals 配置

函数形式的 externals 提供最大的灵活性，允许动态决定是否外部化以及如何外部化。

## 函数签名

### 回调形式

```typescript
type ExternalsFn = (
  data: ExternalItemFunctionData,
  callback: (err?: Error, result?: ExternalItemValue) => void
) => void;

interface ExternalItemFunctionData {
  context: string;           // 请求发起的目录
  request: string;           // 模块请求字符串
  contextInfo: {
    issuer: string;         // 发起请求的文件
  };
  getResolve: (options: ResolveOptions) => ResolverFn;
}

type ExternalItemValue = 
  | string 
  | boolean 
  | string[] 
  | { [key: string]: string };
```

### Promise 形式

```typescript
type ExternalsFnAsync = (
  data: ExternalItemFunctionData
) => Promise<ExternalItemValue | void>;
```

## 基础用法

### 简单匹配

```javascript
module.exports = {
  externals: [
    function({ request }, callback) {
      // 外部化 lodash
      if (request === 'lodash') {
        return callback(null, 'commonjs lodash');
      }
      
      // 继续正常处理
      callback();
    },
  ],
};
```

### 模式匹配

```javascript
externals: [
  function({ request }, callback) {
    // 外部化所有 @babel/runtime 模块
    if (/^@babel\/runtime/.test(request)) {
      return callback(null, 'commonjs ' + request);
    }
    
    // 外部化所有 lodash 子模块
    if (/^lodash\//.test(request)) {
      return callback(null, 'commonjs ' + request);
    }
    
    callback();
  },
],
```

## 高级用法

### 基于上下文决策

```javascript
externals: [
  function({ context, request, contextInfo }, callback) {
    // 获取发起请求的文件
    const issuer = contextInfo.issuer;
    
    // 测试文件中不外部化
    if (issuer && issuer.includes('.test.')) {
      return callback();
    }
    
    // 生产环境外部化
    if (process.env.NODE_ENV === 'production') {
      if (request === 'react') {
        return callback(null, 'React');
      }
    }
    
    callback();
  },
],
```

### 使用解析器

```javascript
externals: [
  async function({ context, request, getResolve }) {
    // 获取解析器
    const resolve = getResolve({
      // 解析选项
      extensions: ['.js', '.json'],
    });
    
    try {
      // 尝试解析模块路径
      const resolvedPath = await new Promise((res, rej) => {
        resolve(context, request, (err, result) => {
          if (err) rej(err);
          else res(result);
        });
      });
      
      // 如果解析到 node_modules，外部化
      if (resolvedPath.includes('node_modules')) {
        return 'commonjs ' + request;
      }
    } catch {
      // 解析失败，继续正常处理
    }
    
    return undefined;
  },
],
```

### 条件类型

```javascript
externals: [
  function({ request }, callback) {
    // 根据模块决定类型
    const cdnModules = {
      react: 'React',
      'react-dom': 'ReactDOM',
      vue: 'Vue',
    };
    
    if (cdnModules[request]) {
      // 使用全局变量
      return callback(null, cdnModules[request]);
    }
    
    // Node.js 内置模块
    const builtins = ['fs', 'path', 'http', 'https', 'crypto'];
    if (builtins.includes(request)) {
      return callback(null, 'commonjs2 ' + request);
    }
    
    callback();
  },
],
```

## 实际应用场景

### 场景一：Node.js 应用

```javascript
const builtinModules = require('module').builtinModules;

module.exports = {
  target: 'node',
  externals: [
    // 外部化所有内置模块
    function({ request }, callback) {
      if (builtinModules.includes(request)) {
        return callback(null, 'commonjs2 ' + request);
      }
      callback();
    },
    
    // 外部化 node_modules
    function({ context, request }, callback) {
      // 相对路径和绝对路径不外部化
      if (/^\./.test(request) || path.isAbsolute(request)) {
        return callback();
      }
      
      // 其他都外部化
      callback(null, 'commonjs2 ' + request);
    },
  ],
};
```

### 场景二：微前端应用

```javascript
const sharedDeps = ['react', 'react-dom', 'react-router-dom'];

module.exports = {
  externals: [
    function({ request }, callback) {
      // 共享依赖从主应用获取
      if (sharedDeps.includes(request)) {
        // 使用主应用的 __shared_modules__
        return callback(null, `window.__shared_modules__["${request}"]`);
      }
      
      callback();
    },
  ],
};
```

### 场景三：服务端渲染

```javascript
module.exports = {
  externals: [
    function({ request }, callback) {
      // 客户端代码不外部化
      if (request.includes('.css') || request.includes('.scss')) {
        return callback();
      }
      
      // 服务端外部化所有 npm 包
      if (!request.startsWith('.') && !request.startsWith('/')) {
        return callback(null, 'commonjs ' + request);
      }
      
      callback();
    },
  ],
};
```

### 场景四：Monorepo 内部包

```javascript
module.exports = {
  externals: [
    function({ request }, callback) {
      // 外部化内部包
      if (request.startsWith('@myorg/')) {
        return callback(null, 'commonjs ' + request);
      }
      
      // 保持外部包
      if (request.startsWith('@external/')) {
        return callback(null, 'commonjs ' + request);
      }
      
      callback();
    },
  ],
};
```

## 与其他配置组合

### 数组组合

```javascript
externals: [
  // 函数优先
  function({ request }, callback) {
    if (request === 'special') {
      return callback(null, 'SpecialGlobal');
    }
    callback();
  },
  
  // 对象作为后备
  {
    react: 'React',
    'react-dom': 'ReactDOM',
  },
  
  // 正则匹配
  /^@babel\/runtime/,
],
```

### 继承基础配置

```javascript
const baseExternals = {
  react: 'React',
  'react-dom': 'ReactDOM',
};

module.exports = {
  externals: [
    // 先尝试对象配置
    baseExternals,
    
    // 再尝试函数动态决策
    function({ request }, callback) {
      if (shouldExternalize(request)) {
        return callback(null, getExternalConfig(request));
      }
      callback();
    },
  ],
};
```

## 实现细节

### 函数调用流程

```typescript
class ExternalModuleFactoryPlugin {
  resolveExternalFunction(
    context: string,
    request: string,
    dependency: Dependency,
    fn: ExternalsFn,
    callback: Callback
  ): void {
    const data: ExternalItemFunctionData = {
      context,
      request,
      contextInfo: {
        issuer: this.getIssuer(dependency),
      },
      getResolve: this.createGetResolve(),
    };
    
    // 调用用户函数
    const maybePromise = fn(data, (err, result) => {
      if (err) return callback(err);
      
      // undefined 表示不外部化
      if (result === undefined) {
        return callback();
      }
      
      // 处理结果
      callback(null, result);
    });
    
    // 处理 Promise 返回
    if (maybePromise && typeof maybePromise.then === 'function') {
      maybePromise.then(
        (result) => {
          if (result === undefined) {
            callback();
          } else {
            callback(null, result);
          }
        },
        (err) => callback(err)
      );
    }
  }
  
  createGetResolve(): GetResolve {
    return (options) => {
      const resolver = this.resolverFactory.get('normal', options);
      
      return (context, request, callback) => {
        resolver.resolve({}, context, request, {}, callback);
      };
    };
  }
}
```

### 错误处理

```javascript
externals: [
  async function({ request }) {
    try {
      // 尝试外部化逻辑
      if (await shouldExternalize(request)) {
        return 'commonjs ' + request;
      }
    } catch (error) {
      // 记录错误但不中断构建
      console.warn(`Externals check failed for ${request}:`, error);
    }
    
    // 继续正常处理
    return undefined;
  },
],
```

## 调试技巧

### 日志输出

```javascript
externals: [
  function({ context, request, contextInfo }, callback) {
    const decision = decideExternal(request);
    
    if (process.env.DEBUG_EXTERNALS) {
      console.log({
        request,
        issuer: contextInfo.issuer,
        external: decision !== undefined,
        result: decision,
      });
    }
    
    callback(null, decision);
  },
],
```

### 验证配置

```javascript
// 测试 externals 函数
function testExternals(externalsConfig, testCases) {
  testCases.forEach(({ request, expected }) => {
    externalsConfig({
      context: '/app',
      request,
      contextInfo: { issuer: '/app/index.js' },
    }, (err, result) => {
      const actual = result === undefined ? 'bundled' : result;
      console.log(`${request}: ${actual} (expected: ${expected})`);
    });
  });
}
```

## 总结

函数形式 externals 的核心要点：

**函数签名**：
- 回调形式和 Promise 形式
- 丰富的上下文信息
- 可用解析器

**决策方式**：
- undefined 继续打包
- 返回值表示外部化
- 支持各种类型

**应用场景**：
- Node.js 应用
- 微前端
- SSR
- Monorepo

**最佳实践**：
- 组合多种配置
- 适当的错误处理
- 调试日志

**下一章**：我们将学习正则表达式匹配外部模块。
