---
sidebar_position: 103
title: "cacheGroups 配置解析"
---

# cacheGroups 配置解析

cacheGroups 是 SplitChunksPlugin 的核心配置，定义了代码分割的规则和策略，决定哪些模块应该被提取到哪个 Chunk 中。

## 配置结构

### 基本格式

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      cacheGroups: {
        // 每个 cacheGroup 定义一个分割规则
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: -10,
        },
        common: {
          minChunks: 2,
          name: 'common',
          chunks: 'all',
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },
  },
};
```

### 配置项定义

```typescript
interface CacheGroupConfig {
  // 匹配条件
  test?: RegExp | string | ((module: Module) => boolean);
  type?: string;
  
  // 分割条件
  chunks?: 'all' | 'async' | 'initial' | ((chunk: Chunk) => boolean);
  minSize?: number;
  maxSize?: number;
  minChunks?: number;
  maxAsyncRequests?: number;
  maxInitialRequests?: number;
  
  // 命名
  name?: string | ((module: Module, chunks: Chunk[], key: string) => string);
  automaticNameDelimiter?: string;
  idHint?: string;
  
  // 行为
  priority?: number;
  reuseExistingChunk?: boolean;
  enforce?: boolean;
  
  // 文件名
  filename?: string;
}
```

## 匹配条件

### test 配置

```typescript
class CacheGroupMatcher {
  // 正则匹配
  matchByRegex(module: Module, regex: RegExp): boolean {
    const resource = module.resource;
    if (!resource) return false;
    return regex.test(resource);
  }
  
  // 字符串匹配
  matchByString(module: Module, str: string): boolean {
    const resource = module.resource;
    if (!resource) return false;
    return resource.includes(str);
  }
  
  // 函数匹配
  matchByFunction(
    module: Module,
    fn: (module: Module) => boolean
  ): boolean {
    return fn(module);
  }
}

// 使用示例
const cacheGroups = {
  // 正则：匹配 node_modules
  vendors: {
    test: /[\\/]node_modules[\\/]/,
  },
  
  // 字符串：匹配特定目录
  utils: {
    test: 'src/utils',
  },
  
  // 函数：复杂匹配逻辑
  react: {
    test: (module) => {
      return module.resource && 
        module.resource.includes('node_modules') &&
        /react|react-dom/.test(module.resource);
    },
  },
};
```

### type 配置

```typescript
// 按模块类型匹配
const cacheGroups = {
  // 只匹配 JavaScript 模块
  js: {
    type: 'javascript/auto',
    chunks: 'all',
  },
  
  // 只匹配 JSON 模块
  json: {
    type: 'json',
    chunks: 'all',
  },
  
  // 只匹配 CSS 模块（配合 mini-css-extract-plugin）
  styles: {
    type: 'css/mini-extract',
    name: 'styles',
    chunks: 'all',
    enforce: true,
  },
};
```

## 分割条件

### chunks 配置

```typescript
class CacheGroupChunkFilter {
  filterChunks(
    chunks: Set<Chunk>,
    config: 'all' | 'async' | 'initial' | ((chunk: Chunk) => boolean)
  ): Set<Chunk> {
    const result = new Set<Chunk>();
    
    for (const chunk of chunks) {
      if (this.shouldIncludeChunk(chunk, config)) {
        result.add(chunk);
      }
    }
    
    return result;
  }
  
  shouldIncludeChunk(
    chunk: Chunk,
    config: 'all' | 'async' | 'initial' | ((chunk: Chunk) => boolean)
  ): boolean {
    if (config === 'all') {
      return true;
    }
    
    if (config === 'async') {
      return !chunk.canBeInitial();
    }
    
    if (config === 'initial') {
      return chunk.canBeInitial();
    }
    
    if (typeof config === 'function') {
      return config(chunk);
    }
    
    return false;
  }
}

// 使用示例
const cacheGroups = {
  // 所有类型的 Chunk
  all: {
    chunks: 'all',
  },
  
  // 只处理异步 Chunk
  async: {
    chunks: 'async',
  },
  
  // 只处理初始 Chunk
  initial: {
    chunks: 'initial',
  },
  
  // 自定义过滤
  custom: {
    chunks: (chunk) => {
      // 排除特定 Chunk
      return chunk.name !== 'admin';
    },
  },
};
```

### 尺寸限制

```typescript
const cacheGroups = {
  vendors: {
    test: /[\\/]node_modules[\\/]/,
    
    // 最小 30KB 才分割
    minSize: 30000,
    
    // 超过 200KB 会尝试进一步分割
    maxSize: 200000,
    
    // 强制分割阈值（超过此值忽略其他限制）
    enforceSizeThreshold: 50000,
  },
};

// 尺寸检查实现
class SizeChecker {
  checkSize(candidate: SplitCandidate, config: CacheGroupConfig): boolean {
    const size = candidate.size;
    
    // 检查强制阈值
    if (config.enforceSizeThreshold && size >= config.enforceSizeThreshold) {
      return true;  // 强制分割
    }
    
    // 检查最小尺寸
    if (config.minSize && size < config.minSize) {
      return false;
    }
    
    return true;
  }
}
```

## 命名策略

### 静态名称

```javascript
const cacheGroups = {
  vendors: {
    test: /[\\/]node_modules[\\/]/,
    name: 'vendors',  // 固定名称
  },
};

// 输出：vendors.js
```

### 动态名称

```typescript
const cacheGroups = {
  // 函数生成名称
  vendors: {
    test: /[\\/]node_modules[\\/]/,
    name: (module, chunks, cacheGroupKey) => {
      // 根据入口点命名
      const allChunksNames = chunks.map((c) => c.name).join('~');
      return `${cacheGroupKey}~${allChunksNames}`;
    },
  },
};

// 实现
class ChunkNamer {
  getName(
    modules: Set<Module>,
    chunks: Set<Chunk>,
    config: CacheGroupConfig,
    cacheGroupKey: string
  ): string | undefined {
    if (typeof config.name === 'function') {
      // 取第一个模块作为参数（保持兼容）
      const firstModule = modules.values().next().value;
      return config.name(firstModule, Array.from(chunks), cacheGroupKey);
    }
    
    if (typeof config.name === 'string') {
      return config.name;
    }
    
    // 自动生成名称
    return this.generateAutomaticName(chunks, cacheGroupKey, config);
  }
  
  generateAutomaticName(
    chunks: Set<Chunk>,
    cacheGroupKey: string,
    config: CacheGroupConfig
  ): string {
    const delimiter = config.automaticNameDelimiter || '-';
    const chunkNames = Array.from(chunks)
      .map(c => c.name || c.id)
      .sort()
      .join(delimiter);
    
    return `${cacheGroupKey}${delimiter}${chunkNames}`;
  }
}
```

## 优先级

### priority 配置

```javascript
const cacheGroups = {
  // 高优先级：React 相关
  react: {
    test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
    name: 'react',
    priority: 20,  // 最高优先级
  },
  
  // 中优先级：其他第三方库
  vendors: {
    test: /[\\/]node_modules[\\/]/,
    name: 'vendors',
    priority: 10,
  },
  
  // 低优先级：公共代码
  common: {
    minChunks: 2,
    name: 'common',
    priority: 0,
  },
  
  // 最低优先级：默认
  default: {
    minChunks: 2,
    priority: -20,
    reuseExistingChunk: true,
  },
};
```

### 优先级处理

```typescript
class CacheGroupProcessor {
  // 按优先级排序 cacheGroups
  sortByPriority(
    cacheGroups: Map<string, CacheGroupConfig>
  ): Array<[string, CacheGroupConfig]> {
    return Array.from(cacheGroups.entries()).sort((a, b) => {
      const priorityA = a[1].priority ?? 0;
      const priorityB = b[1].priority ?? 0;
      return priorityB - priorityA;
    });
  }
  
  // 模块只会被匹配到第一个符合条件的 cacheGroup
  findMatchingCacheGroup(
    module: Module,
    sortedGroups: Array<[string, CacheGroupConfig]>
  ): [string, CacheGroupConfig] | null {
    for (const [key, config] of sortedGroups) {
      if (this.matches(module, config)) {
        return [key, config];
      }
    }
    return null;
  }
}
```

## 复用策略

### reuseExistingChunk

```typescript
const cacheGroups = {
  default: {
    minChunks: 2,
    reuseExistingChunk: true,  // 如果模块已在某个 Chunk 中，复用该 Chunk
  },
};

// 实现
class ChunkReuser {
  tryReuseExistingChunk(
    compilation: Compilation,
    modules: Set<Module>,
    config: CacheGroupConfig
  ): Chunk | null {
    if (!config.reuseExistingChunk) {
      return null;
    }
    
    const chunkGraph = compilation.chunkGraph;
    
    // 查找只包含这些模块的现有 Chunk
    for (const chunk of compilation.chunks) {
      const chunkModules = new Set(chunkGraph.getChunkModules(chunk));
      
      // 检查是否完全相同
      if (chunkModules.size === modules.size) {
        let matches = true;
        for (const module of modules) {
          if (!chunkModules.has(module)) {
            matches = false;
            break;
          }
        }
        
        if (matches) {
          return chunk;
        }
      }
    }
    
    return null;
  }
}
```

## 常用配置模式

### 分离第三方库

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      cacheGroups: {
        // 核心框架
        framework: {
          test: /[\\/]node_modules[\\/](react|react-dom|vue|@vue)[\\/]/,
          name: 'framework',
          priority: 40,
          chunks: 'all',
        },
        
        // UI 库
        ui: {
          test: /[\\/]node_modules[\\/](antd|@ant-design|element-ui)[\\/]/,
          name: 'ui',
          priority: 30,
          chunks: 'all',
        },
        
        // 其他第三方库
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 20,
          chunks: 'all',
        },
      },
    },
  },
};
```

### 分离公共代码

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      cacheGroups: {
        // 被多个页面共享的代码
        common: {
          name: 'common',
          minChunks: 2,
          priority: 10,
          chunks: 'all',
          minSize: 0,
        },
        
        // 工具函数
        utils: {
          test: /[\\/]src[\\/]utils[\\/]/,
          name: 'utils',
          priority: 15,
          chunks: 'all',
        },
      },
    },
  },
};
```

## 总结

cacheGroups 配置解析的核心要点：

**匹配条件**：
- test：正则/字符串/函数
- type：模块类型
- chunks：Chunk 类型过滤

**分割条件**：
- minSize/maxSize：尺寸限制
- minChunks：共享次数
- 请求数限制

**命名策略**：
- 静态名称
- 动态函数
- 自动生成

**优先级**：
- priority 数值
- 高优先级优先匹配

**复用策略**：
- reuseExistingChunk
- enforce

**下一章**：我们将学习动态导入与按需加载。
