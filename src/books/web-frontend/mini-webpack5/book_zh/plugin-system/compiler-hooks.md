---
sidebar_position: 135
title: "Compiler Hooks 详解"
---

# Compiler Hooks 详解

Compiler 是 Webpack 的核心引擎，提供了丰富的钩子覆盖整个构建生命周期。本章详细解析每个钩子的用途和时机。

## 初始化阶段钩子

### environment

```typescript
// 在应用任何插件前触发
compiler.hooks.environment.tap('MyPlugin', () => {
  // 设置环境变量
  process.env.NODE_ENV = 'production';
});
```

### afterEnvironment

```typescript
// 环境设置完成后触发
compiler.hooks.afterEnvironment.tap('MyPlugin', () => {
  console.log('Environment configured');
});
```

### entryOption

```typescript
// 处理入口配置
compiler.hooks.entryOption.tap('MyPlugin', (context, entry) => {
  console.log('Context:', context);
  console.log('Entry:', entry);
  
  // 返回 true 阻止默认处理
  return false;
});
```

### afterPlugins

```typescript
// 所有插件应用完成后
compiler.hooks.afterPlugins.tap('MyPlugin', (compiler) => {
  console.log('All plugins applied');
  
  // 可以在这里动态添加更多插件
  new AnotherPlugin().apply(compiler);
});
```

### afterResolvers

```typescript
// 解析器配置完成后
compiler.hooks.afterResolvers.tap('MyPlugin', (compiler) => {
  // 可以修改或包装解析器
  const originalResolve = compiler.resolverFactory.get('normal');
});
```

## 运行阶段钩子

### beforeRun

```typescript
// 运行前的准备工作
compiler.hooks.beforeRun.tapAsync('MyPlugin', (compiler, callback) => {
  // 清理工作
  this.cleanup()
    .then(() => callback())
    .catch(callback);
});

// Promise 版本
compiler.hooks.beforeRun.tapPromise('MyPlugin', async (compiler) => {
  await this.initialize();
});
```

### run

```typescript
// 开始运行
compiler.hooks.run.tapAsync('MyPlugin', (compiler, callback) => {
  console.log('Compilation starting...');
  
  // 记录开始时间
  this.startTime = Date.now();
  
  callback();
});
```

### watchRun

```typescript
// Watch 模式下每次重新编译时触发
compiler.hooks.watchRun.tapAsync('MyPlugin', (compiler, callback) => {
  const changedFiles = compiler.modifiedFiles;
  const removedFiles = compiler.removedFiles;
  
  console.log('Changed:', changedFiles?.size || 0);
  console.log('Removed:', removedFiles?.size || 0);
  
  callback();
});
```

## 编译阶段钩子

### normalModuleFactory

```typescript
// 普通模块工厂创建后
compiler.hooks.normalModuleFactory.tap('MyPlugin', (nmf) => {
  // 修改模块解析行为
  nmf.hooks.beforeResolve.tap('MyPlugin', (resolveData) => {
    if (resolveData.request.startsWith('virtual:')) {
      // 处理虚拟模块
      resolveData.request = this.resolveVirtual(resolveData.request);
    }
  });
  
  nmf.hooks.afterResolve.tap('MyPlugin', (resolveData) => {
    console.log('Resolved:', resolveData.resource);
  });
});
```

### contextModuleFactory

```typescript
// 上下文模块工厂创建后
compiler.hooks.contextModuleFactory.tap('MyPlugin', (cmf) => {
  cmf.hooks.beforeResolve.tap('MyPlugin', (resolveData) => {
    // 处理动态导入
    console.log('Context request:', resolveData.request);
  });
});
```

### beforeCompile

```typescript
// 编译前
compiler.hooks.beforeCompile.tapAsync('MyPlugin', (params, callback) => {
  // params 包含编译参数
  console.log('Compiling with params:', params);
  
  // 可以修改参数
  params.customData = { timestamp: Date.now() };
  
  callback();
});
```

### compile

```typescript
// 开始编译
compiler.hooks.compile.tap('MyPlugin', (params) => {
  console.log('Compile started');
  console.log('normalModuleFactory:', params.normalModuleFactory);
});
```

### thisCompilation

```typescript
// 创建 Compilation 对象时（子编译器不触发）
compiler.hooks.thisCompilation.tap('MyPlugin', (compilation, params) => {
  // 只在主编译中执行
  console.log('Main compilation created');
});
```

### compilation

```typescript
// Compilation 创建后（子编译器也触发）
compiler.hooks.compilation.tap('MyPlugin', (compilation, params) => {
  // 在 compilation 上注册钩子
  compilation.hooks.buildModule.tap('MyPlugin', (module) => {
    console.log('Building:', module.resource);
  });
  
  compilation.hooks.succeedModule.tap('MyPlugin', (module) => {
    console.log('Built:', module.resource);
  });
});
```

### make

```typescript
// 构建阶段（并行钩子）
compiler.hooks.make.tapAsync('MyPlugin', (compilation, callback) => {
  // 可以添加入口点
  const entry = EntryPlugin.createDependency('./extra.js', 'extra');
  
  compilation.addEntry(
    compiler.context,
    entry,
    { name: 'extra' },
    callback
  );
});
```

## 完成阶段钩子

### afterCompile

```typescript
// 编译完成后
compiler.hooks.afterCompile.tapAsync('MyPlugin', (compilation, callback) => {
  // 添加额外的文件监听
  compilation.fileDependencies.add('/path/to/config.json');
  
  // 收集统计信息
  const stats = {
    modules: compilation.modules.size,
    chunks: compilation.chunks.size,
  };
  
  callback();
});
```

### shouldEmit

```typescript
// 决定是否输出
compiler.hooks.shouldEmit.tap('MyPlugin', (compilation) => {
  // 如果有错误，不输出
  if (compilation.errors.length > 0) {
    console.log('Skipping emit due to errors');
    return false;
  }
  
  return true;
});
```

### emit

```typescript
// 输出资源前
compiler.hooks.emit.tapAsync('MyPlugin', (compilation, callback) => {
  // 修改或添加资源
  const assets = compilation.assets;
  
  // 添加新资源
  assets['version.txt'] = new RawSource(
    `Build time: ${new Date().toISOString()}`
  );
  
  // 修改现有资源
  for (const [name, source] of Object.entries(assets)) {
    if (name.endsWith('.js')) {
      // 添加头部注释
      assets[name] = new ConcatSource(
        '/* Generated by MyPlugin */\n',
        source
      );
    }
  }
  
  callback();
});
```

### afterEmit

```typescript
// 输出资源后
compiler.hooks.afterEmit.tapAsync('MyPlugin', (compilation, callback) => {
  const outputPath = compilation.outputOptions.path;
  
  // 执行后处理
  console.log(`Files emitted to: ${outputPath}`);
  
  // 发送通知
  this.notifyBuildComplete(outputPath)
    .then(() => callback())
    .catch(callback);
});
```

### assetEmitted

```typescript
// 单个资源输出后
compiler.hooks.assetEmitted.tapAsync(
  'MyPlugin',
  (file, { content, source, outputPath, compilation, targetPath }, callback) => {
    console.log(`Emitted: ${file}`);
    console.log(`Size: ${content.length} bytes`);
    console.log(`Path: ${targetPath}`);
    
    callback();
  }
);
```

### done

```typescript
// 编译完成
compiler.hooks.done.tapAsync('MyPlugin', (stats, callback) => {
  // 打印统计信息
  console.log(stats.toString({
    colors: true,
    modules: false,
  }));
  
  // 检查结果
  if (stats.hasErrors()) {
    console.error('Build failed with errors');
  } else if (stats.hasWarnings()) {
    console.warn('Build completed with warnings');
  } else {
    console.log('Build succeeded');
  }
  
  callback();
});
```

### failed

```typescript
// 编译失败
compiler.hooks.failed.tap('MyPlugin', (error) => {
  console.error('Build failed:', error.message);
  
  // 发送错误报告
  this.reportError(error);
});
```

## Watch 相关钩子

### watchClose

```typescript
// Watch 模式关闭
compiler.hooks.watchClose.tap('MyPlugin', () => {
  console.log('Watch mode stopped');
  
  // 清理资源
  this.cleanup();
});
```

### invalid

```typescript
// 文件变化导致编译无效
compiler.hooks.invalid.tap('MyPlugin', (filename, changeTime) => {
  console.log(`File changed: ${filename}`);
  console.log(`Change time: ${new Date(changeTime).toISOString()}`);
});
```

## 实用模式

### 条件执行

```typescript
class ConditionalPlugin {
  constructor(private condition: () => boolean) {}
  
  apply(compiler: Compiler): void {
    compiler.hooks.emit.tap('ConditionalPlugin', (compilation) => {
      if (!this.condition()) {
        return;
      }
      
      // 执行逻辑
    });
  }
}
```

### 钩子链

```typescript
class ChainedPlugin {
  apply(compiler: Compiler): void {
    // 使用 stage 控制执行顺序
    compiler.hooks.emit.tap(
      { name: 'ChainedPlugin', stage: -100 },
      (compilation) => {
        console.log('First');
      }
    );
    
    compiler.hooks.emit.tap(
      { name: 'ChainedPlugin', stage: 100 },
      (compilation) => {
        console.log('Last');
      }
    );
  }
}
```

### 子编译器

```typescript
class ChildCompilerPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.make.tapAsync('ChildCompilerPlugin', (compilation, callback) => {
      // 创建子编译器
      const childCompiler = compilation.createChildCompiler(
        'ChildCompiler',
        { filename: 'child-[name].js' },
        []
      );
      
      // 添加入口
      new EntryPlugin(compiler.context, './child-entry.js', 'child')
        .apply(childCompiler);
      
      // 运行子编译
      childCompiler.runAsChild((err, entries, childCompilation) => {
        if (err) return callback(err);
        
        console.log('Child compilation complete');
        callback();
      });
    });
  }
}
```

## 总结

Compiler Hooks 的核心要点：

**初始化阶段**：
- environment：环境设置
- entryOption：入口配置
- afterPlugins：插件加载完成

**运行阶段**：
- beforeRun/run：编译开始
- watchRun：Watch 模式编译

**编译阶段**：
- compilation：创建编译对象
- make：构建模块
- afterCompile：编译完成

**输出阶段**：
- emit：资源输出
- done：全部完成

**下一章**：我们将深入学习 Compilation Hooks。
