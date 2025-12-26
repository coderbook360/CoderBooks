---
sidebar_position: 53
title: "解析算法与查找策略"
---

# 解析算法与查找策略

模块解析的核心是查找算法。本章详细分析 Webpack 使用的各种解析策略。

## Node.js 原生解析算法

理解 Webpack 解析之前，先回顾 Node.js 的 `require.resolve` 算法：

```
require(X) from module at path Y
1. If X is a core module,
   a. return the core module
   b. STOP
2. If X begins with '/'
   a. set Y to be the filesystem root
3. If X begins with './' or '/' or '../'
   a. LOAD_AS_FILE(Y + X)
   b. LOAD_AS_DIRECTORY(Y + X)
   c. THROW "not found"
4. If X begins with '#'
   a. LOAD_PACKAGE_IMPORTS(X, dirname(Y))
5. LOAD_PACKAGE_SELF(X, dirname(Y))
6. LOAD_NODE_MODULES(X, dirname(Y))
7. THROW "not found"
```

## Webpack 增强的解析算法

```typescript
/**
 * Webpack 解析算法伪代码
 */
function resolve(request: string, context: string): string | null {
  // 1. 解析别名
  request = resolveAlias(request);
  
  // 2. 判断请求类型
  if (isAbsolute(request)) {
    return resolveFile(request);
  }
  
  if (isRelative(request)) {
    return resolveRelative(context, request);
  }
  
  if (isInternal(request)) {
    return resolveImports(context, request);
  }
  
  // 模块请求
  return resolveModule(context, request);
}
```

## 相对路径解析

```typescript
export class RelativePathResolver {
  constructor(
    private fileSystem: FileSystem,
    private options: ResolverOptions
  ) {}
  
  /**
   * 解析相对路径
   */
  resolve(context: string, request: string): string | null {
    const absolutePath = path.resolve(context, request);
    
    // 尝试作为文件
    const asFile = this.resolveAsFile(absolutePath);
    if (asFile) return asFile;
    
    // 尝试作为目录
    const asDirectory = this.resolveAsDirectory(absolutePath);
    if (asDirectory) return asDirectory;
    
    return null;
  }
  
  /**
   * 作为文件解析
   */
  private resolveAsFile(filePath: string): string | null {
    // 1. 如果路径存在且是文件，直接返回
    if (this.isFile(filePath)) {
      return filePath;
    }
    
    // 2. 尝试添加扩展名
    for (const ext of this.options.extensions) {
      const withExt = filePath + ext;
      if (this.isFile(withExt)) {
        return withExt;
      }
    }
    
    return null;
  }
  
  /**
   * 作为目录解析
   */
  private resolveAsDirectory(dirPath: string): string | null {
    if (!this.isDirectory(dirPath)) {
      return null;
    }
    
    // 1. 读取 package.json
    const pkgPath = path.join(dirPath, 'package.json');
    if (this.isFile(pkgPath)) {
      const pkg = this.readJson(pkgPath);
      
      // 2. 尝试 exports 字段
      if (pkg.exports) {
        const resolved = this.resolveExports(dirPath, pkg.exports, '.');
        if (resolved) return resolved;
      }
      
      // 3. 尝试主字段
      for (const field of this.options.mainFields) {
        const mainValue = pkg[field];
        if (mainValue) {
          const mainPath = path.join(dirPath, mainValue);
          const resolved = this.resolveAsFile(mainPath);
          if (resolved) return resolved;
        }
      }
    }
    
    // 4. 尝试主文件（index）
    for (const mainFile of this.options.mainFiles) {
      const indexPath = path.join(dirPath, mainFile);
      const resolved = this.resolveAsFile(indexPath);
      if (resolved) return resolved;
    }
    
    return null;
  }
}
```

## 模块解析

### 层级目录查找

```typescript
export class ModuleResolver {
  /**
   * 生成模块查找路径
   */
  generateModulePaths(context: string): string[] {
    const paths: string[] = [];
    let current = context;
    
    while (true) {
      // 跳过 node_modules 目录
      if (path.basename(current) !== 'node_modules') {
        for (const modulesDir of this.options.modules) {
          if (path.isAbsolute(modulesDir)) {
            // 绝对路径只添加一次
            if (!paths.includes(modulesDir)) {
              paths.push(modulesDir);
            }
          } else {
            // 相对路径需要与当前目录组合
            paths.push(path.join(current, modulesDir));
          }
        }
      }
      
      // 向上遍历
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
    
    return paths;
  }
  
  /**
   * 解析模块
   */
  resolve(context: string, moduleName: string): string | null {
    const modulePaths = this.generateModulePaths(context);
    
    for (const modulePath of modulePaths) {
      const fullPath = path.join(modulePath, moduleName);
      
      // 尝试作为文件
      const asFile = this.resolveAsFile(fullPath);
      if (asFile) return asFile;
      
      // 尝试作为目录（包）
      const asDirectory = this.resolveAsDirectory(fullPath);
      if (asDirectory) return asDirectory;
    }
    
    return null;
  }
}
```

### 作用域包解析

```typescript
export class ScopedPackageResolver {
  /**
   * 解析作用域包
   * @example '@babel/core' -> ['@babel', 'core']
   */
  parseScopedPackage(request: string): { scope: string; name: string; path: string } | null {
    if (!request.startsWith('@')) {
      return null;
    }
    
    const parts = request.split('/');
    if (parts.length < 2) {
      return null;
    }
    
    return {
      scope: parts[0],
      name: parts[1],
      path: parts.slice(2).join('/'),
    };
  }
  
  resolve(context: string, request: string): string | null {
    const scoped = this.parseScopedPackage(request);
    
    if (!scoped) {
      // 普通包
      return this.resolveNormalPackage(context, request);
    }
    
    // 作用域包
    const packageDir = `${scoped.scope}/${scoped.name}`;
    const subPath = scoped.path;
    
    const packagePath = this.resolvePackageDirectory(context, packageDir);
    if (!packagePath) return null;
    
    if (!subPath) {
      return this.resolveAsDirectory(packagePath);
    }
    
    return this.resolveAsFile(path.join(packagePath, subPath)) ||
           this.resolveAsDirectory(path.join(packagePath, subPath));
  }
}
```

## Exports 字段解析

Node.js 12+ 支持的条件导出：

```json
{
  "name": "my-package",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    },
    "./utils": {
      "import": "./dist/esm/utils.js",
      "require": "./dist/cjs/utils.js"
    }
  }
}
```

```typescript
export class ExportsResolver {
  constructor(private conditionNames: string[]) {}
  
  /**
   * 解析 exports 字段
   */
  resolve(
    packagePath: string,
    exports: ExportsField,
    subpath: string
  ): string | null {
    // 标准化 subpath
    const normalizedSubpath = subpath === '' ? '.' : 
      subpath.startsWith('./') ? subpath : './' + subpath;
    
    // 查找匹配的导出
    const target = this.findExportTarget(exports, normalizedSubpath);
    if (!target) return null;
    
    // 解析条件
    const resolved = this.resolveCondition(target);
    if (!resolved) return null;
    
    // 返回完整路径
    return path.join(packagePath, resolved);
  }
  
  /**
   * 查找导出目标
   */
  private findExportTarget(
    exports: ExportsField,
    subpath: string
  ): ExportsTarget | null {
    // 字符串形式
    if (typeof exports === 'string') {
      return subpath === '.' ? exports : null;
    }
    
    // 数组形式（fallback）
    if (Array.isArray(exports)) {
      for (const item of exports) {
        const result = this.findExportTarget(item, subpath);
        if (result) return result;
      }
      return null;
    }
    
    // 对象形式
    // 检查是否是条件对象
    const keys = Object.keys(exports);
    if (keys.length > 0 && !keys[0].startsWith('.')) {
      // 条件对象
      return subpath === '.' ? exports : null;
    }
    
    // 路径映射对象
    // 精确匹配
    if (exports[subpath]) {
      return exports[subpath];
    }
    
    // 通配符匹配
    for (const [pattern, target] of Object.entries(exports)) {
      if (pattern.includes('*')) {
        const matched = this.matchWildcard(pattern, subpath);
        if (matched) {
          return this.substituteWildcard(target, matched);
        }
      }
    }
    
    return null;
  }
  
  /**
   * 解析条件
   */
  private resolveCondition(target: ExportsTarget): string | null {
    if (typeof target === 'string') {
      return target;
    }
    
    if (Array.isArray(target)) {
      for (const item of target) {
        const result = this.resolveCondition(item);
        if (result) return result;
      }
      return null;
    }
    
    // 对象形式，按条件名称顺序匹配
    for (const condition of this.conditionNames) {
      if (target[condition] !== undefined) {
        const result = this.resolveCondition(target[condition]);
        if (result) return result;
      }
    }
    
    // 尝试 default
    if (target.default !== undefined) {
      return this.resolveCondition(target.default);
    }
    
    return null;
  }
  
  /**
   * 通配符匹配
   */
  private matchWildcard(pattern: string, path: string): string | null {
    const [prefix, suffix] = pattern.split('*');
    
    if (!path.startsWith(prefix)) return null;
    if (suffix && !path.endsWith(suffix)) return null;
    
    const matched = path.slice(
      prefix.length,
      suffix ? -suffix.length : undefined
    );
    
    return matched;
  }
  
  /**
   * 替换通配符
   */
  private substituteWildcard(target: ExportsTarget, matched: string): ExportsTarget {
    if (typeof target === 'string') {
      return target.replace('*', matched);
    }
    
    if (Array.isArray(target)) {
      return target.map(t => this.substituteWildcard(t, matched));
    }
    
    const result: Record<string, ExportsTarget> = {};
    for (const [key, value] of Object.entries(target)) {
      result[key] = this.substituteWildcard(value, matched);
    }
    return result;
  }
}
```

## Imports 字段解析

package.json 中的 imports 字段用于包内部导入：

```json
{
  "imports": {
    "#internal/*": "./src/internal/*.js",
    "#utils": {
      "import": "./src/utils/index.mjs",
      "require": "./src/utils/index.cjs"
    }
  }
}
```

```typescript
export class ImportsResolver {
  constructor(private conditionNames: string[]) {}
  
  /**
   * 解析 imports 字段
   */
  resolve(
    packagePath: string,
    imports: ImportsField,
    request: string
  ): string | null {
    if (!request.startsWith('#')) {
      return null;
    }
    
    // 查找匹配的导入
    for (const [pattern, target] of Object.entries(imports)) {
      const matched = this.matchPattern(pattern, request);
      if (matched !== null) {
        const resolvedTarget = this.resolveTarget(target, matched);
        if (resolvedTarget) {
          return path.join(packagePath, resolvedTarget);
        }
      }
    }
    
    return null;
  }
  
  private matchPattern(pattern: string, request: string): string | null {
    if (pattern === request) {
      return '';
    }
    
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (request.startsWith(prefix)) {
        return request.slice(prefix.length);
      }
    }
    
    return null;
  }
  
  private resolveTarget(target: ImportsTarget, matched: string): string | null {
    if (typeof target === 'string') {
      return target.replace('*', matched);
    }
    
    // 条件解析
    for (const condition of this.conditionNames) {
      if (target[condition]) {
        return this.resolveTarget(target[condition], matched);
      }
    }
    
    if (target.default) {
      return this.resolveTarget(target.default, matched);
    }
    
    return null;
  }
}
```

## 性能优化策略

### 路径缓存

```typescript
export class CachedResolver {
  private cache = new Map<string, string | null>();
  
  resolve(context: string, request: string): string | null {
    const cacheKey = `${context}\0${request}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    const result = this.doResolve(context, request);
    this.cache.set(cacheKey, result);
    
    return result;
  }
  
  invalidate(path?: string): void {
    if (path) {
      // 删除涉及该路径的缓存
      for (const [key, value] of this.cache) {
        if (key.includes(path) || value?.includes(path)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}
```

### 批量解析

```typescript
export class BatchResolver {
  private pending = new Map<string, Promise<string | null>>();
  
  async resolve(context: string, request: string): Promise<string | null> {
    const key = `${context}\0${request}`;
    
    // 复用正在进行的解析
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }
    
    const promise = this.doResolve(context, request);
    this.pending.set(key, promise);
    
    try {
      return await promise;
    } finally {
      this.pending.delete(key);
    }
  }
}
```

### 负缓存

```typescript
export class NegativeCacheResolver {
  private positiveCache = new Map<string, string>();
  private negativeCache = new Set<string>();
  
  resolve(context: string, request: string): string | null {
    const key = `${context}\0${request}`;
    
    // 检查正缓存
    if (this.positiveCache.has(key)) {
      return this.positiveCache.get(key)!;
    }
    
    // 检查负缓存
    if (this.negativeCache.has(key)) {
      return null;
    }
    
    const result = this.doResolve(context, request);
    
    if (result) {
      this.positiveCache.set(key, result);
    } else {
      this.negativeCache.add(key);
    }
    
    return result;
  }
}
```

## 总结

Webpack 解析算法的核心：

**分类处理**：
- 相对路径直接解析
- 模块请求层级查找
- 别名优先处理

**增强功能**：
- exports/imports 字段支持
- 条件导出匹配
- 通配符模式

**性能优化**：
- 多级缓存
- 负缓存避免重复失败
- 批量解析去重

**下一章**：我们将深入别名（alias）解析机制。
