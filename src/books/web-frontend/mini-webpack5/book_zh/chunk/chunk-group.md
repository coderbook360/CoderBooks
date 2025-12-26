---
sidebar_position: 94
title: "ChunkGroup 代码块组"
---

# ChunkGroup 代码块组

ChunkGroup 是 Chunk 的容器，用于组织有关联的 Chunk，定义加载顺序和依赖关系。

## ChunkGroup 核心概念

### 为什么需要 ChunkGroup

```
// 问题：异步加载需要多个 Chunk
import('./feature').then(module => {
  // feature 可能被分割成多个 chunk
  // 如何确保所有 chunk 都加载完成？
});
```

```
ChunkGroup 解决方案：

ChunkGroup "feature"
├── Chunk: feature-main    (主要代码)
├── Chunk: feature-vendor  (第三方库)
└── Chunk: feature-shared  (共享模块)

加载 feature 时，确保这三个 Chunk 都加载完成
```

### ChunkGroup 类型

```typescript
// 普通 ChunkGroup
const chunkGroup = new ChunkGroup({
  name: 'feature',
});

// Entrypoint（入口点，继承自 ChunkGroup）
const entrypoint = new Entrypoint({
  name: 'main',
});

// 异步 ChunkGroup
const asyncGroup = new ChunkGroup({
  name: 'async-module',
});
```

## ChunkGroup 类实现

### 核心属性

```typescript
class ChunkGroup {
  // 标识
  name?: string;
  
  // 包含的 Chunk
  chunks: Chunk[] = [];
  
  // 子 ChunkGroup（异步依赖）
  private _children: SortableSet<ChunkGroup>;
  
  // 父 ChunkGroup
  private _parents: SortableSet<ChunkGroup>;
  
  // 异步入口块
  private _asyncEntrypoints: SortableSet<Entrypoint>;
  
  // 原始来源（用于调试）
  origins: OriginRecord[] = [];
  
  // 索引（用于排序）
  index: number | null = null;
  
  constructor(options?: ChunkGroupOptions) {
    if (options) {
      this.name = options.name;
    }
    this._children = new SortableSet(undefined, compareChunkGroups);
    this._parents = new SortableSet(undefined, compareChunkGroups);
    this._asyncEntrypoints = new SortableSet(undefined, compareChunkGroups);
  }
}
```

### Chunk 管理

```typescript
class ChunkGroup {
  // 添加 Chunk
  pushChunk(chunk: Chunk): boolean {
    const idx = this.chunks.indexOf(chunk);
    if (idx >= 0) return false;
    
    this.chunks.push(chunk);
    return true;
  }
  
  // 在指定位置插入 Chunk
  insertChunk(chunk: Chunk, before: Chunk): boolean {
    const idx = this.chunks.indexOf(chunk);
    if (idx >= 0) return false;
    
    const beforeIdx = this.chunks.indexOf(before);
    if (beforeIdx < 0) {
      throw new Error('Chunk not found');
    }
    
    this.chunks.splice(beforeIdx, 0, chunk);
    return true;
  }
  
  // 移除 Chunk
  removeChunk(chunk: Chunk): boolean {
    const idx = this.chunks.indexOf(chunk);
    if (idx < 0) return false;
    
    this.chunks.splice(idx, 1);
    return true;
  }
  
  // 替换 Chunk
  replaceChunk(oldChunk: Chunk, newChunk: Chunk): boolean {
    const idx = this.chunks.indexOf(oldChunk);
    if (idx < 0) return false;
    
    const newIdx = this.chunks.indexOf(newChunk);
    if (newIdx >= 0) {
      // newChunk 已存在，只需移除 oldChunk
      this.chunks.splice(idx, 1);
      return true;
    }
    
    this.chunks[idx] = newChunk;
    return true;
  }
}
```

### 父子关系

```typescript
class ChunkGroup {
  // 添加子 ChunkGroup
  addChild(child: ChunkGroup): boolean {
    if (this._children.has(child)) return false;
    
    this._children.add(child);
    child._parents.add(this);
    return true;
  }
  
  // 移除子 ChunkGroup
  removeChild(child: ChunkGroup): boolean {
    if (!this._children.has(child)) return false;
    
    this._children.delete(child);
    child._parents.delete(this);
    return true;
  }
  
  // 获取所有子 ChunkGroup
  get childrenIterable(): Iterable<ChunkGroup> {
    return this._children;
  }
  
  // 获取所有父 ChunkGroup
  get parentsIterable(): Iterable<ChunkGroup> {
    return this._parents;
  }
  
  // 检查是否有父 ChunkGroup
  hasParent(parent: ChunkGroup): boolean {
    return this._parents.has(parent);
  }
  
  // 获取父 ChunkGroup 数量
  getNumberOfParents(): number {
    return this._parents.size;
  }
}
```

## 来源追踪

### Origin 记录

```typescript
interface OriginRecord {
  // 来源模块
  module: Module | null;
  // 代码位置
  loc: DependencyLocation | null;
  // 请求路径
  request: string | null;
}

class ChunkGroup {
  // 添加来源
  addOrigin(
    module: Module | null,
    loc: DependencyLocation | null,
    request: string | null
  ): void {
    this.origins.push({
      module,
      loc,
      request,
    });
  }
  
  // 获取所有来源
  getOrigins(): OriginRecord[] {
    return this.origins;
  }
}
```

### 调试信息

```typescript
// 使用示例
// 当解析 import('./feature') 时
const chunkGroup = new ChunkGroup({ name: 'feature' });

chunkGroup.addOrigin(
  currentModule,                    // 发起导入的模块
  { start: { line: 10 } },         // 代码位置
  './feature'                       // 请求路径
);

// 调试时可以追踪 ChunkGroup 的来源
for (const origin of chunkGroup.origins) {
  console.log(`来自 ${origin.module?.identifier()} 的 ${origin.request}`);
}
```

## ChunkGroup 遍历

### 获取所有相关 Chunk

```typescript
class ChunkGroup {
  // 获取当前组及所有子组的 Chunk
  getFiles(): Set<string> {
    const files = new Set<string>();
    
    for (const chunk of this.chunks) {
      for (const file of chunk.files) {
        files.add(file);
      }
    }
    
    return files;
  }
  
  // 遍历所有父级 ChunkGroup
  visitParents(
    fn: (group: ChunkGroup, parents: Set<ChunkGroup>) => void
  ): void {
    const visited = new Set<ChunkGroup>();
    
    const visit = (group: ChunkGroup) => {
      if (visited.has(group)) return;
      visited.add(group);
      
      fn(group, visited);
      
      for (const parent of group._parents) {
        visit(parent);
      }
    };
    
    visit(this);
  }
  
  // 遍历所有子级 ChunkGroup
  visitChildren(
    fn: (group: ChunkGroup, children: Set<ChunkGroup>) => void
  ): void {
    const visited = new Set<ChunkGroup>();
    
    const visit = (group: ChunkGroup) => {
      if (visited.has(group)) return;
      visited.add(group);
      
      fn(group, visited);
      
      for (const child of group._children) {
        visit(child);
      }
    };
    
    visit(this);
  }
}
```

### 块迭代器

```typescript
class ChunkGroup {
  // 获取所有 Chunk（按顺序）
  *chunksIterable(): IterableIterator<Chunk> {
    for (const chunk of this.chunks) {
      yield chunk;
    }
  }
  
  // 获取所有相关的 Chunk（包括子组）
  *getAllChunks(): IterableIterator<Chunk> {
    const visited = new Set<ChunkGroup>();
    const queue = [this];
    
    while (queue.length > 0) {
      const group = queue.shift()!;
      if (visited.has(group)) continue;
      visited.add(group);
      
      for (const chunk of group.chunks) {
        yield chunk;
      }
      
      for (const child of group._children) {
        queue.push(child);
      }
    }
  }
}
```

## ChunkGroup 排序

### 索引分配

```typescript
class Compilation {
  assignChunkGroupIndices(): void {
    let index = 0;
    
    // 广度优先遍历
    const queue: ChunkGroup[] = [];
    const visited = new Set<ChunkGroup>();
    
    // 从入口点开始
    for (const entrypoint of this.entrypoints.values()) {
      queue.push(entrypoint);
    }
    
    while (queue.length > 0) {
      const group = queue.shift()!;
      
      if (visited.has(group)) continue;
      visited.add(group);
      
      // 分配索引
      group.index = index++;
      
      // 添加子组到队列
      for (const child of group.childrenIterable) {
        queue.push(child);
      }
    }
  }
}
```

### 比较函数

```typescript
function compareChunkGroups(
  a: ChunkGroup,
  b: ChunkGroup
): number {
  // 按索引排序
  if (a.index !== null && b.index !== null) {
    return a.index - b.index;
  }
  
  // 按名称排序
  if (a.name && b.name) {
    return a.name.localeCompare(b.name);
  }
  
  return 0;
}

function compareChunkGroupsByIndex(
  a: ChunkGroup,
  b: ChunkGroup
): number {
  const aIndex = a.index ?? Infinity;
  const bIndex = b.index ?? Infinity;
  return aIndex - bIndex;
}
```

## ChunkGroup 合并

```typescript
class ChunkGroup {
  // 整合另一个 ChunkGroup
  integrate(other: ChunkGroup): void {
    // 合并 chunks
    for (const chunk of other.chunks) {
      if (!this.chunks.includes(chunk)) {
        this.chunks.push(chunk);
        chunk.addGroup(this);
      }
    }
    
    // 合并子组
    for (const child of other._children) {
      this.addChild(child);
    }
    
    // 合并来源
    for (const origin of other.origins) {
      this.origins.push(origin);
    }
    
    // 从父组中移除 other
    for (const parent of Array.from(other._parents)) {
      parent.removeChild(other);
      parent.addChild(this);
    }
  }
}

class Compilation {
  // 合并相同模块的 ChunkGroup
  integrateChunkGroups(): void {
    const chunkGroupsByModules = new Map<string, ChunkGroup[]>();
    
    // 按模块内容分组
    for (const group of this.chunkGroups) {
      const key = this.getChunkGroupModulesKey(group);
      const groups = chunkGroupsByModules.get(key) || [];
      groups.push(group);
      chunkGroupsByModules.set(key, groups);
    }
    
    // 合并相同的组
    for (const groups of chunkGroupsByModules.values()) {
      if (groups.length > 1) {
        const first = groups[0];
        for (let i = 1; i < groups.length; i++) {
          first.integrate(groups[i]);
          this.chunkGroups.delete(groups[i]);
        }
      }
    }
  }
}
```

## 总结

ChunkGroup 代码块组的核心要点：

**核心作用**：
- 组织相关 Chunk
- 定义加载顺序
- 管理依赖关系

**结构特点**：
- 包含多个 Chunk
- 支持父子关系
- 追踪来源信息

**遍历方式**：
- 父级遍历
- 子级遍历
- 块迭代

**索引排序**：
- 广度优先分配
- 支持比较排序

**下一章**：我们将学习 Entrypoint 入口点。
