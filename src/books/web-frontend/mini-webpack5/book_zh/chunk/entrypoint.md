---
sidebar_position: 95
title: "Entrypoint 入口点"
---

# Entrypoint 入口点

Entrypoint 是一种特殊的 ChunkGroup，代表应用程序的入口点，是依赖图的起始位置。

## Entrypoint 核心概念

### 与普通 ChunkGroup 的区别

```
ChunkGroup（普通）
├── 可以是异步加载
├── 可以没有入口模块
└── 不一定需要运行时

Entrypoint（入口点）
├── 必须是同步加载（initial）
├── 有明确的入口模块
└── 通常包含运行时代码
```

### 配置对应关系

```javascript
// webpack.config.js
module.exports = {
  entry: {
    main: './src/index.js',       // Entrypoint: main
    admin: './src/admin.js',      // Entrypoint: admin
  },
};
```

```
配置                          Entrypoint
entry.main ──────────────────→ Entrypoint(name="main")
                                   │
                                   ├── Chunk(main)
                                   │    └── Module(index.js)
                                   │
                                   └── Chunk(runtime~main)
                                        └── RuntimeModule

entry.admin ─────────────────→ Entrypoint(name="admin")
                                   │
                                   └── Chunk(admin)
                                        └── Module(admin.js)
```

## Entrypoint 类实现

### 继承结构

```typescript
class Entrypoint extends ChunkGroup {
  // 运行时 Chunk
  private _runtimeChunk: Chunk | null = null;
  
  // 入口依赖
  private _entryModules: Map<Module, ChunkGroup> = new Map();
  
  constructor(
    options: EntrypointOptions,
    initial: boolean = true
  ) {
    super(options);
    
    // 标记为初始加载
    this._initial = initial;
  }
  
  // 重写：Entrypoint 总是初始的
  isInitial(): boolean {
    return this._initial;
  }
}
```

### 运行时管理

```typescript
class Entrypoint extends ChunkGroup {
  // 设置运行时 Chunk
  setRuntimeChunk(chunk: Chunk): void {
    this._runtimeChunk = chunk;
  }
  
  // 获取运行时 Chunk
  getRuntimeChunk(): Chunk {
    // 如果有单独的运行时 chunk，返回它
    if (this._runtimeChunk !== null) {
      return this._runtimeChunk;
    }
    
    // 否则返回入口 chunk（第一个 chunk）
    return this.chunks[0];
  }
  
  // 获取入口 Chunk
  getEntrypointChunk(): Chunk {
    return this.chunks[0];
  }
}
```

### 入口模块

```typescript
class Entrypoint extends ChunkGroup {
  // 记录入口模块
  addEntryModule(module: Module): void {
    this._entryModules.set(module, this);
  }
  
  // 检查是否是入口模块
  hasEntryModule(module: Module): boolean {
    return this._entryModules.has(module);
  }
  
  // 获取入口模块
  getEntryModules(): Module[] {
    return Array.from(this._entryModules.keys());
  }
}
```

## Entrypoint 创建流程

### 在 Compilation 中创建

```typescript
class Compilation {
  // 入口点映射
  entrypoints: Map<string, Entrypoint> = new Map();
  
  // 添加入口
  addEntry(
    context: string,
    entry: EntryDependency,
    options: EntryOptions
  ): Promise<Module> {
    const name = options.name || 'main';
    
    // 创建或获取 Entrypoint
    let entrypoint = this.entrypoints.get(name);
    if (!entrypoint) {
      entrypoint = new Entrypoint({
        name,
        ...options,
      });
      
      // 创建入口 Chunk
      const chunk = new Chunk(name);
      entrypoint.pushChunk(chunk);
      chunk.addGroup(entrypoint);
      
      // 注册到 Compilation
      this.entrypoints.set(name, entrypoint);
      this.chunkGroups.push(entrypoint);
      this.chunks.add(chunk);
    }
    
    // 构建入口模块
    return this.buildModule(entry).then((module) => {
      // 连接入口模块到 Chunk
      const chunk = entrypoint.getEntrypointChunk();
      this.chunkGraph.connectChunkAndEntryModule(
        chunk,
        module,
        entrypoint
      );
      
      return module;
    });
  }
}
```

### 复杂入口配置

```javascript
// webpack.config.js
module.exports = {
  entry: {
    main: {
      import: './src/index.js',
      dependOn: 'shared',        // 依赖其他入口
      runtime: 'runtime',        // 单独的运行时
    },
    shared: ['lodash', 'react'],
    runtime: {
      import: false,             // 无入口文件
      runtime: true,             // 作为运行时
    },
  },
};
```

```typescript
class EntryPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.make.tapAsync('EntryPlugin', (compilation, callback) => {
      const { entry, name, options } = this;
      
      // 处理 dependOn
      if (options.dependOn) {
        const deps = Array.isArray(options.dependOn)
          ? options.dependOn
          : [options.dependOn];
        
        for (const dep of deps) {
          const depEntrypoint = compilation.entrypoints.get(dep);
          if (depEntrypoint) {
            entrypoint.addParent(depEntrypoint);
          }
        }
      }
      
      // 处理 runtime
      if (options.runtime) {
        const runtimeName = typeof options.runtime === 'string'
          ? options.runtime
          : name;
        
        let runtimeChunk = compilation.namedChunks.get(runtimeName);
        if (!runtimeChunk) {
          runtimeChunk = new Chunk(runtimeName);
          compilation.namedChunks.set(runtimeName, runtimeChunk);
          compilation.chunks.add(runtimeChunk);
        }
        
        entrypoint.setRuntimeChunk(runtimeChunk);
      }
      
      callback();
    });
  }
}
```

## dependOn 依赖关系

### 共享依赖

```javascript
// 配置
module.exports = {
  entry: {
    app: {
      import: './src/app.js',
      dependOn: 'vendor',
    },
    vendor: ['react', 'react-dom'],
  },
};
```

```typescript
class Compilation {
  // 处理 dependOn
  handleDependOn(entrypoint: Entrypoint, dependOnNames: string[]): void {
    for (const name of dependOnNames) {
      const dependentEntrypoint = this.entrypoints.get(name);
      
      if (!dependentEntrypoint) {
        throw new Error(`Entry "${name}" not found`);
      }
      
      // 建立依赖关系
      dependentEntrypoint.addChild(entrypoint);
      
      // 检查循环依赖
      if (this.hasCircularDependency(entrypoint, dependentEntrypoint)) {
        throw new Error('Circular dependency detected');
      }
    }
  }
  
  // 检查循环依赖
  hasCircularDependency(
    entrypoint: Entrypoint,
    target: Entrypoint
  ): boolean {
    const visited = new Set<ChunkGroup>();
    
    const check = (group: ChunkGroup): boolean => {
      if (visited.has(group)) return false;
      visited.add(group);
      
      if (group === target) return true;
      
      for (const child of group.childrenIterable) {
        if (check(child)) return true;
      }
      
      return false;
    };
    
    return check(entrypoint);
  }
}
```

### 加载顺序

```typescript
class Entrypoint extends ChunkGroup {
  // 获取所有依赖的入口点（按顺序）
  getDependentEntrypoints(): Entrypoint[] {
    const result: Entrypoint[] = [];
    const visited = new Set<Entrypoint>();
    
    const collect = (ep: Entrypoint) => {
      if (visited.has(ep)) return;
      visited.add(ep);
      
      // 先收集依赖的入口点
      for (const parent of ep.parentsIterable) {
        if (parent instanceof Entrypoint) {
          collect(parent);
        }
      }
      
      result.push(ep);
    };
    
    collect(this);
    
    return result;
  }
}

// 使用示例
const entrypoint = compilation.entrypoints.get('app');
const loadOrder = entrypoint.getDependentEntrypoints();
// ['vendor', 'app']  vendor 先加载
```

## 运行时 Chunk 分离

### 配置方式

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    runtimeChunk: 'single',    // 所有入口共享一个运行时
    // 或
    runtimeChunk: 'multiple',  // 每个入口有自己的运行时
    // 或
    runtimeChunk: {
      name: 'runtime',         // 指定运行时 chunk 名称
    },
  },
};
```

### 实现逻辑

```typescript
class RuntimeChunkPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.thisCompilation.tap('RuntimeChunkPlugin', (compilation) => {
      compilation.hooks.addEntry.tap('RuntimeChunkPlugin', (entry, options) => {
        const name = options.name;
        
        if (this.options.runtimeChunk === 'single') {
          // 单一运行时
          this.setupSingleRuntime(compilation, name);
        } else if (this.options.runtimeChunk === 'multiple') {
          // 多个运行时
          this.setupMultipleRuntime(compilation, name);
        }
      });
    });
  }
  
  setupSingleRuntime(compilation: Compilation, entryName: string): void {
    const runtimeName = 'runtime';
    
    let runtimeChunk = compilation.namedChunks.get(runtimeName);
    if (!runtimeChunk) {
      runtimeChunk = new Chunk(runtimeName);
      compilation.namedChunks.set(runtimeName, runtimeChunk);
      compilation.chunks.add(runtimeChunk);
    }
    
    const entrypoint = compilation.entrypoints.get(entryName);
    if (entrypoint) {
      entrypoint.setRuntimeChunk(runtimeChunk);
    }
  }
  
  setupMultipleRuntime(compilation: Compilation, entryName: string): void {
    const runtimeName = `runtime~${entryName}`;
    
    const runtimeChunk = new Chunk(runtimeName);
    compilation.namedChunks.set(runtimeName, runtimeChunk);
    compilation.chunks.add(runtimeChunk);
    
    const entrypoint = compilation.entrypoints.get(entryName);
    if (entrypoint) {
      entrypoint.setRuntimeChunk(runtimeChunk);
    }
  }
}
```

## Entrypoint 输出

### 生成入口文件

```typescript
class Compilation {
  // 获取入口点的输出文件
  getEntrypointFiles(name: string): string[] {
    const entrypoint = this.entrypoints.get(name);
    if (!entrypoint) return [];
    
    const files: string[] = [];
    
    // 收集所有 chunk 的文件（按顺序）
    for (const chunk of entrypoint.chunks) {
      for (const file of chunk.files) {
        files.push(file);
      }
    }
    
    return files;
  }
  
  // 生成 HTML 资源引用
  getAssetTags(name: string): { scripts: string[]; styles: string[] } {
    const files = this.getEntrypointFiles(name);
    const scripts: string[] = [];
    const styles: string[] = [];
    
    for (const file of files) {
      if (file.endsWith('.js')) {
        scripts.push(file);
      } else if (file.endsWith('.css')) {
        styles.push(file);
      }
    }
    
    return { scripts, styles };
  }
}
```

### 入口清单

```typescript
class Compilation {
  // 生成入口点清单
  getEntrypointsManifest(): Record<string, string[]> {
    const manifest: Record<string, string[]> = {};
    
    for (const [name, entrypoint] of this.entrypoints) {
      manifest[name] = [];
      
      // 先添加依赖的入口点
      for (const dep of entrypoint.getDependentEntrypoints()) {
        if (dep.name !== name) {
          manifest[name].push(...this.getEntrypointFiles(dep.name));
        }
      }
      
      // 再添加自己的文件
      manifest[name].push(...this.getEntrypointFiles(name));
    }
    
    return manifest;
  }
}

// 输出示例
{
  "main": ["runtime.js", "vendors.js", "main.js"],
  "admin": ["runtime.js", "vendors.js", "admin.js"]
}
```

## 总结

Entrypoint 入口点的核心要点：

**核心特征**：
- 继承自 ChunkGroup
- 代表应用入口
- 包含运行时

**与普通 ChunkGroup**：
- 必须是初始加载
- 有入口模块
- 支持 dependOn

**运行时管理**：
- 可分离运行时
- 支持共享运行时
- 管理加载顺序

**输出处理**：
- 生成文件列表
- 处理依赖顺序
- 输出清单

**下一章**：我们将学习 seal 方法：封装阶段。
