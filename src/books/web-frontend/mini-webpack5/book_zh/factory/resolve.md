---
sidebar_position: 46
title: "resolve 方法与模块解析"
---

# resolve 方法与模块解析

resolve 是 NormalModuleFactory 中最复杂的步骤之一，负责将模块请求转换为实际的文件路径。本章深入理解模块解析的实现原理。

## 解析的复杂性

一个简单的 `import './utils'` 背后，需要解决：

1. **相对路径**：`./utils` → `/project/src/utils`
2. **扩展名**：尝试 `.js`、`.ts`、`.json` 等
3. **目录**：尝试 `index.js`
4. **包解析**：`lodash` → `node_modules/lodash/lodash.js`
5. **别名**：`@utils` → `/project/src/utils`
6. **条件导出**：package.json 的 `exports` 字段

## Resolver 接口

```typescript
export interface ResolveResult {
  // 解析后的完整路径
  path: string;
  
  // 查询字符串
  query: string;
  
  // 片段标识
  fragment: string;
  
  // 解析过程中读取的文件
  descriptionFilePath?: string;
  descriptionFileData?: object;
}

export interface Resolver {
  resolve(
    context: object,
    path: string,
    request: string,
    resolveContext: ResolveContext,
    callback: (err: Error | null, result?: string, data?: ResolveResult) => void
  ): void;
}
```

## 解析流程

```typescript
export class NormalModuleFactory {
  /**
   * 执行资源解析
   */
  private resolveResource(
    resolveData: ResolveData,
    callback: (err: Error | null) => void
  ): void {
    const { context, request, resolveOptions } = resolveData;
    
    // 分离查询字符串和片段
    const { path, query, fragment } = this.parsePathQueryFragment(request);
    
    // 获取配置的解析器
    const resolver = this.resolverFactory.get('normal', resolveOptions || {});
    
    // 解析上下文
    const resolveContext: ResolveContext = {
      fileDependencies: resolveData.fileDependencies,
      missingDependencies: resolveData.missingDependencies,
      contextDependencies: resolveData.contextDependencies,
    };
    
    // 执行解析
    resolver.resolve(
      {},
      context,
      path,
      resolveContext,
      (err, resourcePath, result) => {
        if (err) {
          return this.handleResolveError(err, resolveData, callback);
        }
        
        // 保存解析结果
        resolveData.resource = resourcePath!;
        resolveData.resourceQuery = query || result?.query || '';
        resolveData.resourceFragment = fragment || result?.fragment || '';
        
        // 如果解析了 package.json，保存信息
        if (result?.descriptionFileData) {
          resolveData.resourceResolveData = {
            descriptionFilePath: result.descriptionFilePath,
            descriptionFileData: result.descriptionFileData,
          };
        }
        
        callback(null);
      }
    );
  }
}
```

### 解析路径、查询、片段

```typescript
export class NormalModuleFactory {
  private parsePathQueryFragment(request: string): {
    path: string;
    query: string;
    fragment: string;
  } {
    let path = request;
    let query = '';
    let fragment = '';
    
    // 提取片段 (#后面的部分)
    const fragmentIndex = path.indexOf('#');
    if (fragmentIndex >= 0) {
      fragment = path.slice(fragmentIndex);
      path = path.slice(0, fragmentIndex);
    }
    
    // 提取查询字符串 (?后面的部分)
    const queryIndex = path.indexOf('?');
    if (queryIndex >= 0) {
      query = path.slice(queryIndex);
      path = path.slice(0, queryIndex);
    }
    
    return { path, query, fragment };
  }
}
```

## 不同类型的请求

### 相对路径

```typescript
// ./utils → /project/src/utils.js
// ../lib/helper → /project/lib/helper.js
```

解析策略：
1. 拼接 context 和 request
2. 尝试各种扩展名
3. 如果是目录，尝试 index 文件

### 绝对路径

```typescript
// /opt/lib/utils.js → /opt/lib/utils.js
```

直接使用，仅验证文件存在。

### 模块路径

```typescript
// lodash → node_modules/lodash/lodash.js
// @scope/pkg → node_modules/@scope/pkg/index.js
```

解析策略：
1. 逐级向上查找 node_modules
2. 读取 package.json
3. 解析 main/module/exports 字段

### 别名路径

```typescript
// @utils → /project/src/utils
```

在解析前进行替换。

## 解析器工厂

```typescript
export class ResolverFactory {
  private resolverCache = new Map<string, Resolver>();
  
  /**
   * 获取解析器
   */
  get(type: 'normal' | 'loader' | 'context', options: ResolveOptions): Resolver {
    const cacheKey = `${type}|${JSON.stringify(options)}`;
    
    let resolver = this.resolverCache.get(cacheKey);
    if (resolver) return resolver;
    
    // 合并选项
    const mergedOptions = this.mergeOptions(type, options);
    
    // 创建解析器
    resolver = this.createResolver(mergedOptions);
    
    this.resolverCache.set(cacheKey, resolver);
    return resolver;
  }
  
  private mergeOptions(type: string, options: ResolveOptions): ResolveOptions {
    const baseOptions = this.baseOptions[type] || {};
    
    return {
      ...baseOptions,
      ...options,
      extensions: options.extensions || baseOptions.extensions || ['.js', '.json'],
      mainFields: options.mainFields || baseOptions.mainFields || ['main'],
      modules: options.modules || baseOptions.modules || ['node_modules'],
    };
  }
}
```

## 扩展名解析

```typescript
export class Resolver {
  private async tryExtensions(
    basePath: string,
    extensions: string[]
  ): Promise<string | undefined> {
    // 首先尝试原始路径
    if (await this.fileExists(basePath)) {
      return basePath;
    }
    
    // 尝试各种扩展名
    for (const ext of extensions) {
      const pathWithExt = basePath + ext;
      if (await this.fileExists(pathWithExt)) {
        return pathWithExt;
      }
    }
    
    return undefined;
  }
}
```

## 目录解析

```typescript
export class Resolver {
  private async resolveAsDirectory(
    dirPath: string,
    options: ResolveOptions
  ): Promise<string | undefined> {
    // 检查 package.json
    const packageJsonPath = path.join(dirPath, 'package.json');
    
    if (await this.fileExists(packageJsonPath)) {
      const packageJson = await this.readJson(packageJsonPath);
      
      // 按 mainFields 顺序尝试
      for (const field of options.mainFields) {
        if (packageJson[field]) {
          const mainPath = path.join(dirPath, packageJson[field]);
          const resolved = await this.resolveAsFile(mainPath, options);
          if (resolved) return resolved;
        }
      }
    }
    
    // 尝试 index 文件
    for (const ext of options.extensions) {
      const indexPath = path.join(dirPath, 'index' + ext);
      if (await this.fileExists(indexPath)) {
        return indexPath;
      }
    }
    
    return undefined;
  }
}
```

## 模块解析

```typescript
export class Resolver {
  private async resolveAsModule(
    request: string,
    context: string,
    options: ResolveOptions
  ): Promise<string | undefined> {
    // 分离模块名和子路径
    const { moduleName, subPath } = this.parseModuleRequest(request);
    
    // 逐级向上查找 node_modules
    let currentDir = context;
    
    while (true) {
      for (const moduleDir of options.modules) {
        const modulePath = path.isAbsolute(moduleDir)
          ? path.join(moduleDir, moduleName)
          : path.join(currentDir, moduleDir, moduleName);
        
        if (await this.directoryExists(modulePath)) {
          // 找到模块目录
          if (subPath) {
            // 有子路径
            const fullPath = path.join(modulePath, subPath);
            const resolved = await this.resolveAsFile(fullPath, options);
            if (resolved) return resolved;
          } else {
            // 解析模块入口
            const resolved = await this.resolveAsDirectory(modulePath, options);
            if (resolved) return resolved;
          }
        }
      }
      
      // 向上一级
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }
    
    return undefined;
  }
  
  private parseModuleRequest(request: string): {
    moduleName: string;
    subPath: string;
  } {
    // @scope/pkg/sub → moduleName: @scope/pkg, subPath: sub
    // lodash/fp → moduleName: lodash, subPath: fp
    const parts = request.split('/');
    
    let moduleName: string;
    let subPath: string;
    
    if (request.startsWith('@')) {
      moduleName = parts.slice(0, 2).join('/');
      subPath = parts.slice(2).join('/');
    } else {
      moduleName = parts[0];
      subPath = parts.slice(1).join('/');
    }
    
    return { moduleName, subPath };
  }
}
```

## 别名解析

```typescript
export class Resolver {
  private applyAlias(
    request: string,
    alias: Record<string, string | false>
  ): string | false {
    for (const [key, value] of Object.entries(alias)) {
      // 精确匹配
      if (request === key) {
        return value;
      }
      
      // 前缀匹配 (key$)
      if (key.endsWith('$')) {
        const prefix = key.slice(0, -1);
        if (request === prefix) {
          return value;
        }
      }
      
      // 路径匹配 (key/)
      if (request.startsWith(key + '/')) {
        if (value === false) return false;
        return value + request.slice(key.length);
      }
    }
    
    return request;
  }
}
```

## Package.json exports 字段

Webpack 5 支持 Node.js 的条件导出：

```json
{
  "exports": {
    ".": {
      "import": "./esm/index.js",
      "require": "./cjs/index.js"
    },
    "./utils": {
      "import": "./esm/utils.js",
      "require": "./cjs/utils.js"
    }
  }
}
```

```typescript
export class Resolver {
  private resolveExports(
    packageJson: any,
    subPath: string,
    conditions: string[]
  ): string | undefined {
    const exports = packageJson.exports;
    if (!exports) return undefined;
    
    // 构建导出键
    const exportKey = subPath ? `./${subPath}` : '.';
    
    // 查找匹配的导出
    let exportValue = exports[exportKey];
    
    if (!exportValue && exports['.']) {
      // 尝试通配符
      for (const [key, value] of Object.entries(exports)) {
        if (key.endsWith('/*')) {
          const prefix = key.slice(0, -1);
          if (exportKey.startsWith(prefix)) {
            const rest = exportKey.slice(prefix.length);
            exportValue = (value as string).replace('*', rest);
            break;
          }
        }
      }
    }
    
    if (!exportValue) return undefined;
    
    // 解析条件
    return this.resolveConditions(exportValue, conditions);
  }
  
  private resolveConditions(
    exportValue: any,
    conditions: string[]
  ): string | undefined {
    if (typeof exportValue === 'string') {
      return exportValue;
    }
    
    if (typeof exportValue === 'object') {
      for (const condition of conditions) {
        if (exportValue[condition]) {
          return this.resolveConditions(exportValue[condition], conditions);
        }
      }
      
      // default 条件
      if (exportValue.default) {
        return this.resolveConditions(exportValue.default, conditions);
      }
    }
    
    return undefined;
  }
}
```

## 错误处理

```typescript
export class NormalModuleFactory {
  private handleResolveError(
    err: Error,
    resolveData: ResolveData,
    callback: (err: Error) => void
  ): void {
    const { request, context, contextInfo } = resolveData;
    
    // 创建详细的错误信息
    const error = new ModuleNotFoundError(`
Module not found: Error: Can't resolve '${request}' in '${context}'

Possible reasons:
- The module doesn't exist
- The path is incorrect
- Missing npm install

Did you mean:
${this.suggestAlternatives(request)}
    `.trim());
    
    // 添加额外信息
    error.module = {
      request,
      context,
      issuer: contextInfo.issuer,
    };
    
    callback(error);
  }
  
  private suggestAlternatives(request: string): string {
    // 简单的拼写建议
    const suggestions: string[] = [];
    
    if (request.startsWith('./')) {
      suggestions.push(`Check if the file exists at ${request}`);
    } else {
      suggestions.push(`Run: npm install ${request}`);
    }
    
    return suggestions.map((s) => `  - ${s}`).join('\n');
  }
}
```

## 解析缓存

```typescript
export class Resolver {
  private cache = new Map<string, Promise<string | undefined>>();
  
  async resolve(
    context: string,
    request: string,
    options: ResolveOptions
  ): Promise<string | undefined> {
    const cacheKey = `${context}|${request}|${JSON.stringify(options)}`;
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // 执行解析并缓存 Promise
    const promise = this.doResolve(context, request, options);
    this.cache.set(cacheKey, promise);
    
    return promise;
  }
}
```

## 与 enhanced-resolve 的关系

Webpack 使用 enhanced-resolve 库进行模块解析，它提供了更强大的功能：

```typescript
import { ResolverFactory as EnhancedResolverFactory } from 'enhanced-resolve';

export class ResolverFactory {
  createResolver(options: ResolveOptions): Resolver {
    return EnhancedResolverFactory.createResolver({
      fileSystem: this.fileSystem,
      ...options,
      
      // 条件名称
      conditionNames: options.conditionNames || [
        'webpack',
        'development',
        'module',
      ],
      
      // 扩展名
      extensions: options.extensions || ['.js', '.json', '.wasm'],
      
      // 主字段
      mainFields: options.mainFields || ['browser', 'module', 'main'],
      
      // 模块目录
      modules: options.modules || ['node_modules'],
      
      // 别名
      alias: options.alias || {},
      
      // 回退
      fallback: options.fallback || {},
    });
  }
}
```

## 总结

模块解析是 Webpack 的基础能力：

**解析类型**：
- **相对路径**：基于 context 解析
- **绝对路径**：直接使用
- **模块路径**：查找 node_modules
- **别名路径**：替换后解析

**关键步骤**：
1. 分离路径、查询、片段
2. 应用别名
3. 尝试扩展名
4. 解析目录（package.json、index）
5. 处理条件导出

**优化手段**：
- 解析器缓存
- 结果缓存
- 并行解析

下一章我们将实现 Loader 匹配与应用。
