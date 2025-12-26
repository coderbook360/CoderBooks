---
sidebar_position: 89
title: "ExternalsPlugin 实现"
---

# ExternalsPlugin 实现

ExternalsPlugin 是处理外部化依赖的核心插件，负责拦截模块请求并生成外部模块。

## 插件架构

### 整体设计

```
ExternalsPlugin
    ↓
NormalModuleFactory.hooks.factorize
    ↓
匹配 externals 配置
    ↓
创建 ExternalModule
    ↓
跳过正常模块解析
```

### 类结构

```typescript
class ExternalsPlugin {
  type: string;
  externals: Externals;
  
  constructor(type: string, externals: Externals) {
    this.type = type;
    this.externals = externals;
  }
  
  apply(compiler: Compiler): void {
    compiler.hooks.compile.tap('ExternalsPlugin', ({ normalModuleFactory }) => {
      new ExternalModuleFactoryPlugin(this.type, this.externals).apply(
        normalModuleFactory
      );
    });
  }
}

type Externals = 
  | string
  | RegExp
  | ExternalsObject
  | ExternalsFn
  | Externals[];

interface ExternalsObject {
  [key: string]: string | boolean | string[] | ExternalsObject;
}

type ExternalsFn = (
  data: ExternalItemFunctionData,
  callback: (err?: Error, result?: ExternalItemValue) => void
) => void | Promise<ExternalItemValue>;
```

## ExternalModuleFactoryPlugin

### 核心实现

```typescript
class ExternalModuleFactoryPlugin {
  type: string;
  externals: Externals;
  
  constructor(type: string, externals: Externals) {
    this.type = type;
    this.externals = externals;
  }
  
  apply(normalModuleFactory: NormalModuleFactory): void {
    normalModuleFactory.hooks.factorize.tapAsync(
      'ExternalModuleFactoryPlugin',
      (data, callback) => {
        const { context, request, dependencies } = data;
        const dependency = dependencies[0];
        
        this.handleExternal(
          context,
          request,
          dependency,
          (err, result) => {
            if (err) return callback(err);
            
            if (result !== undefined) {
              // 创建外部模块
              callback(null, result);
            } else {
              // 继续正常处理
              callback();
            }
          }
        );
      }
    );
  }
  
  handleExternal(
    context: string,
    request: string,
    dependency: Dependency,
    callback: (err?: Error, result?: Module) => void
  ): void {
    this.resolveExternal(
      context,
      request,
      dependency,
      this.externals,
      (err, result) => {
        if (err) return callback(err);
        
        if (result === undefined) {
          return callback();
        }
        
        if (result === false) {
          // 明确不外部化
          return callback();
        }
        
        // 创建外部模块
        const externalModule = this.createExternalModule(
          result,
          this.type,
          request
        );
        
        callback(null, externalModule);
      }
    );
  }
}
```

### 解析外部化配置

```typescript
class ExternalModuleFactoryPlugin {
  resolveExternal(
    context: string,
    request: string,
    dependency: Dependency,
    externals: Externals,
    callback: (err?: Error, result?: ExternalItemValue | false) => void
  ): void {
    // 处理数组
    if (Array.isArray(externals)) {
      this.resolveExternalArray(
        context,
        request,
        dependency,
        externals,
        callback
      );
      return;
    }
    
    // 处理字符串
    if (typeof externals === 'string') {
      if (externals === request) {
        callback(null, true);
      } else {
        callback();
      }
      return;
    }
    
    // 处理正则
    if (externals instanceof RegExp) {
      if (externals.test(request)) {
        callback(null, request);
      } else {
        callback();
      }
      return;
    }
    
    // 处理函数
    if (typeof externals === 'function') {
      this.resolveExternalFunction(
        context,
        request,
        dependency,
        externals,
        callback
      );
      return;
    }
    
    // 处理对象
    if (typeof externals === 'object') {
      this.resolveExternalObject(
        context,
        request,
        externals,
        callback
      );
      return;
    }
    
    callback();
  }
  
  resolveExternalArray(
    context: string,
    request: string,
    dependency: Dependency,
    externals: Externals[],
    callback: (err?: Error, result?: ExternalItemValue | false) => void
  ): void {
    let i = 0;
    
    const next = () => {
      if (i >= externals.length) {
        return callback();
      }
      
      this.resolveExternal(
        context,
        request,
        dependency,
        externals[i++],
        (err, result) => {
          if (err) return callback(err);
          if (result !== undefined) return callback(null, result);
          next();
        }
      );
    };
    
    next();
  }
}
```

### 处理对象配置

```typescript
class ExternalModuleFactoryPlugin {
  resolveExternalObject(
    context: string,
    request: string,
    externals: ExternalsObject,
    callback: (err?: Error, result?: ExternalItemValue | false) => void
  ): void {
    if (!Object.prototype.hasOwnProperty.call(externals, request)) {
      return callback();
    }
    
    const value = externals[request];
    
    // boolean
    if (typeof value === 'boolean') {
      if (value) {
        callback(null, request);
      } else {
        callback(null, false);  // 明确不外部化
      }
      return;
    }
    
    // string
    if (typeof value === 'string') {
      callback(null, value);
      return;
    }
    
    // array
    if (Array.isArray(value)) {
      callback(null, value);
      return;
    }
    
    // object (多环境配置)
    if (typeof value === 'object') {
      callback(null, value);
      return;
    }
    
    callback();
  }
}
```

### 处理函数配置

```typescript
class ExternalModuleFactoryPlugin {
  resolveExternalFunction(
    context: string,
    request: string,
    dependency: Dependency,
    fn: ExternalsFn,
    callback: (err?: Error, result?: ExternalItemValue | false) => void
  ): void {
    const data: ExternalItemFunctionData = {
      context,
      request,
      contextInfo: {
        issuer: dependency.loc?.start ? dependency.loc : undefined,
      },
      getResolve: (options) => (context, request, callback) => {
        // 提供解析器
        this.resolver.resolve({}, context, request, {}, callback);
      },
    };
    
    const result = fn(data, (err, result) => {
      if (err) return callback(err);
      callback(null, result);
    });
    
    // 支持 Promise
    if (result && typeof result.then === 'function') {
      result.then(
        (r) => callback(null, r),
        (err) => callback(err)
      );
    }
  }
}
```

## ExternalModule 创建

### 创建外部模块

```typescript
class ExternalModuleFactoryPlugin {
  createExternalModule(
    value: ExternalItemValue,
    type: string,
    request: string
  ): ExternalModule {
    // 解析类型和请求
    let externalType = type;
    let userRequest = request;
    let externalRequest: string | string[];
    
    if (typeof value === 'string') {
      // 检查类型前缀
      const match = /^(\w+)\s+(.+)$/.exec(value);
      if (match) {
        externalType = match[1];
        externalRequest = match[2];
      } else {
        externalRequest = value;
      }
    } else if (Array.isArray(value)) {
      externalRequest = value;
    } else if (typeof value === 'object') {
      // 多环境配置，根据当前类型选择
      externalRequest = value[externalType] || value.root || request;
    } else {
      externalRequest = request;
    }
    
    return new ExternalModule(
      externalRequest,
      externalType,
      userRequest
    );
  }
}
```

### ExternalModule 类

```typescript
class ExternalModule extends Module {
  request: string | string[];
  externalType: string;
  userRequest: string;
  
  constructor(
    request: string | string[],
    type: string,
    userRequest: string
  ) {
    super('javascript/dynamic', null);
    this.request = request;
    this.externalType = type;
    this.userRequest = userRequest;
  }
  
  identifier(): string {
    return `external ${JSON.stringify(this.request)}`;
  }
  
  readableIdentifier(): string {
    return `external ${JSON.stringify(this.request)}`;
  }
  
  needBuild(context: NeedBuildContext, callback: Callback): void {
    // 外部模块不需要构建
    callback(null, false);
  }
  
  build(options: object, compilation: Compilation, resolver: Resolver, fs: FileSystem, callback: Callback): void {
    // 设置构建信息
    this.buildMeta = {
      async: false,
      exportsType: undefined,
    };
    this.buildInfo = {
      strict: true,
    };
    
    callback();
  }
  
  getSourceForGlobalVariableExternal(
    variableName: string | string[],
    type: string
  ): string {
    if (!Array.isArray(variableName)) {
      return `module.exports = ${variableName};`;
    }
    
    // 嵌套访问
    const expression = variableName
      .map((r, i) => i === 0 ? r : `[${JSON.stringify(r)}]`)
      .join('');
    
    return `module.exports = ${expression};`;
  }
}
```

## 代码生成

### 不同类型的代码生成

```typescript
class ExternalModule extends Module {
  codeGeneration(context: CodeGenerationContext): CodeGenerationResult {
    const { runtimeTemplate, chunkGraph } = context;
    const sources = new Map<string, Source>();
    
    const sourceString = this.getSourceString(
      runtimeTemplate,
      chunkGraph
    );
    
    sources.set('javascript', new RawSource(sourceString));
    
    return {
      sources,
      runtimeRequirements: this.getRuntimeRequirements(),
    };
  }
  
  getSourceString(
    runtimeTemplate: RuntimeTemplate,
    chunkGraph: ChunkGraph
  ): string {
    switch (this.externalType) {
      case 'var':
      case 'global':
        return this.getSourceForGlobalVariable();
      case 'commonjs':
      case 'commonjs2':
        return this.getSourceForCommonjs();
      case 'amd':
        return this.getSourceForAmd();
      case 'module':
        return this.getSourceForModule();
      case 'import':
        return this.getSourceForImport();
      default:
        return this.getSourceForGlobalVariable();
    }
  }
  
  getSourceForGlobalVariable(): string {
    const request = this.request;
    
    if (!Array.isArray(request)) {
      return `module.exports = ${request};`;
    }
    
    const expression = request
      .map((r, i) => i === 0 ? r : `[${JSON.stringify(r)}]`)
      .join('');
    
    return `module.exports = ${expression};`;
  }
  
  getSourceForCommonjs(): string {
    const request = this.request;
    
    if (Array.isArray(request)) {
      const expr = request
        .map((r, i) => i === 0 ? `require(${JSON.stringify(r)})` : `[${JSON.stringify(r)}]`)
        .join('');
      return `module.exports = ${expr};`;
    }
    
    return `module.exports = require(${JSON.stringify(request)});`;
  }
  
  getSourceForAmd(): string {
    return `
      define([${JSON.stringify(this.request)}], function(__WEBPACK_EXTERNAL_MODULE__) {
        return __WEBPACK_EXTERNAL_MODULE__;
      });
    `;
  }
  
  getSourceForModule(): string {
    const request = this.request;
    const id = JSON.stringify(typeof request === 'string' ? request : request[0]);
    
    return `import * as __WEBPACK_EXTERNAL_MODULE__ from ${id};
export default __WEBPACK_EXTERNAL_MODULE__;
export * from ${id};`;
  }
}
```

## 与编译流程集成

### 注册工厂

```typescript
class WebpackOptionsApply {
  process(options: WebpackOptions, compiler: Compiler): void {
    if (options.externals) {
      new ExternalsPlugin(
        options.externalsType || 'var',
        options.externals
      ).apply(compiler);
    }
  }
}
```

### 处理优先级

```typescript
class ExternalModuleFactoryPlugin {
  apply(normalModuleFactory: NormalModuleFactory): void {
    // 使用 tapAsync 确保在正常模块处理之前
    normalModuleFactory.hooks.factorize.tapAsync(
      {
        name: 'ExternalModuleFactoryPlugin',
        stage: -100,  // 高优先级
      },
      (data, callback) => {
        this.handleExternal(data, callback);
      }
    );
  }
}
```

## 总结

ExternalsPlugin 实现的核心要点：

**插件结构**：
- ExternalsPlugin 注册到 compile hook
- ExternalModuleFactoryPlugin 处理模块工厂

**配置解析**：
- 支持多种配置形式
- 递归处理数组
- 函数支持 Promise

**模块创建**：
- ExternalModule 替代正常模块
- 不需要构建和解析
- 直接生成引用代码

**代码生成**：
- 根据类型生成不同代码
- 支持嵌套属性访问
- 多模块系统兼容

**下一章**：我们将学习外部化类型详解。
