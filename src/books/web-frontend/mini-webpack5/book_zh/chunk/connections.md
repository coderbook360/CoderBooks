---
sidebar_position: 99
title: "Chunk 之间的连接关系"
---

# Chunk 之间的连接关系

Chunk 之间的连接关系定义了代码块的加载顺序和依赖关系，是实现按需加载和代码分割的基础。

## 连接类型

### 父子关系

```
// 同步依赖 - 父子关系
入口 Chunk (main)
    │
    ├── 同步导入: utils.js ──→ 包含在 main chunk
    │
    └── 异步导入: lazy.js ──→ 子 Chunk (lazy)
```

```typescript
class ChunkGroup {
  // 子 ChunkGroup
  private _children: SortableSet<ChunkGroup>;
  
  // 父 ChunkGroup
  private _parents: SortableSet<ChunkGroup>;
  
  // 添加子关系
  addChild(child: ChunkGroup): boolean {
    if (this._children.has(child)) return false;
    
    this._children.add(child);
    child._parents.add(this);
    return true;
  }
  
  // 获取所有子 ChunkGroup
  getChildren(): ChunkGroup[] {
    return Array.from(this._children);
  }
  
  // 获取所有父 ChunkGroup
  getParents(): ChunkGroup[] {
    return Array.from(this._parents);
  }
}
```

### 兄弟关系

```typescript
class ChunkGroup {
  // 获取兄弟 ChunkGroup（共享相同父级）
  getSiblings(): ChunkGroup[] {
    const siblings = new Set<ChunkGroup>();
    
    for (const parent of this._parents) {
      for (const child of parent._children) {
        if (child !== this) {
          siblings.add(child);
        }
      }
    }
    
    return Array.from(siblings);
  }
  
  // 检查是否是兄弟关系
  isSibling(other: ChunkGroup): boolean {
    for (const parent of this._parents) {
      if (parent._children.has(other)) {
        return true;
      }
    }
    return false;
  }
}
```

### 运行时依赖

```typescript
class Chunk {
  // 获取运行时依赖的 Chunk
  getRuntimeDependencies(): Chunk[] {
    const result: Chunk[] = [];
    
    for (const group of this.groupsIterable) {
      const runtimeChunk = group.getRuntimeChunk();
      if (runtimeChunk && runtimeChunk !== this) {
        result.push(runtimeChunk);
      }
    }
    
    return result;
  }
  
  // 检查是否依赖运行时
  dependsOnRuntime(): boolean {
    for (const group of this.groupsIterable) {
      const runtimeChunk = group.getRuntimeChunk();
      if (runtimeChunk && runtimeChunk !== this) {
        return true;
      }
    }
    return false;
  }
}
```

## 连接图构建

### 建立异步连接

```typescript
class Compilation {
  // 处理异步导入时建立连接
  processImportDependency(
    dependency: ImportDependency,
    parentModule: Module,
    parentChunkGroup: ChunkGroup
  ): void {
    // 获取或创建异步 ChunkGroup
    const block = dependency.block;
    let childChunkGroup = this.blockToChunkGroupMap.get(block);
    
    if (!childChunkGroup) {
      childChunkGroup = new ChunkGroup({
        name: block.chunkName,
      });
      
      const chunk = new Chunk(block.chunkName);
      childChunkGroup.pushChunk(chunk);
      chunk.addGroup(childChunkGroup);
      
      this.chunkGroups.push(childChunkGroup);
      this.chunks.add(chunk);
      this.blockToChunkGroupMap.set(block, childChunkGroup);
    }
    
    // 建立父子连接
    parentChunkGroup.addChild(childChunkGroup);
    
    // 记录来源
    childChunkGroup.addOrigin(
      parentModule,
      dependency.loc,
      dependency.request
    );
  }
}
```

### 连接图遍历

```typescript
class Compilation {
  // 广度优先遍历 Chunk 连接图
  traverseChunkGraph(
    startChunkGroup: ChunkGroup,
    visitor: (group: ChunkGroup, depth: number) => void
  ): void {
    const visited = new Set<ChunkGroup>();
    const queue: Array<{ group: ChunkGroup; depth: number }> = [
      { group: startChunkGroup, depth: 0 }
    ];
    
    while (queue.length > 0) {
      const { group, depth } = queue.shift()!;
      
      if (visited.has(group)) continue;
      visited.add(group);
      
      visitor(group, depth);
      
      for (const child of group.childrenIterable) {
        queue.push({ group: child, depth: depth + 1 });
      }
    }
  }
  
  // 获取所有可达的 ChunkGroup
  getReachableChunkGroups(startChunkGroup: ChunkGroup): Set<ChunkGroup> {
    const result = new Set<ChunkGroup>();
    
    this.traverseChunkGraph(startChunkGroup, (group) => {
      result.add(group);
    });
    
    return result;
  }
}
```

## 加载顺序

### 计算加载顺序

```typescript
class ChunkGroup {
  // 获取加载时需要的所有 Chunk（按顺序）
  getChunksToLoad(): Chunk[] {
    const result: Chunk[] = [];
    const visited = new Set<Chunk>();
    
    // 先加载依赖的 Chunk
    for (const parent of this._parents) {
      for (const chunk of parent.chunks) {
        if (!visited.has(chunk)) {
          visited.add(chunk);
          result.push(chunk);
        }
      }
    }
    
    // 再加载自己的 Chunk
    for (const chunk of this.chunks) {
      if (!visited.has(chunk)) {
        visited.add(chunk);
        result.push(chunk);
      }
    }
    
    return result;
  }
  
  // 获取必须预先加载的 Chunk
  getPreloadChunks(): Chunk[] {
    const result: Chunk[] = [];
    
    for (const parent of this._parents) {
      const runtimeChunk = parent.getRuntimeChunk();
      if (runtimeChunk && !result.includes(runtimeChunk)) {
        result.push(runtimeChunk);
      }
    }
    
    return result;
  }
}
```

### 并行加载组

```typescript
class ChunkGroup {
  // 获取可以并行加载的 Chunk
  getParallelChunks(): Chunk[][] {
    const levels: Chunk[][] = [];
    const chunkLevel = new Map<Chunk, number>();
    
    // 计算每个 Chunk 的层级
    const calculateLevel = (chunk: Chunk): number => {
      if (chunkLevel.has(chunk)) {
        return chunkLevel.get(chunk)!;
      }
      
      let maxParentLevel = -1;
      for (const group of chunk.groupsIterable) {
        for (const parent of group.parentsIterable) {
          for (const parentChunk of parent.chunks) {
            const parentLevel = calculateLevel(parentChunk);
            maxParentLevel = Math.max(maxParentLevel, parentLevel);
          }
        }
      }
      
      const level = maxParentLevel + 1;
      chunkLevel.set(chunk, level);
      
      // 确保层级数组存在
      while (levels.length <= level) {
        levels.push([]);
      }
      levels[level].push(chunk);
      
      return level;
    };
    
    for (const chunk of this.chunks) {
      calculateLevel(chunk);
    }
    
    return levels;
  }
}
```

## 循环检测

### 检测循环依赖

```typescript
class Compilation {
  // 检测 ChunkGroup 循环依赖
  detectCircularDependencies(): CircularDependency[] {
    const circular: CircularDependency[] = [];
    const visited = new Set<ChunkGroup>();
    const stack: ChunkGroup[] = [];
    
    const dfs = (group: ChunkGroup): void => {
      if (stack.includes(group)) {
        // 找到循环
        const cycleStart = stack.indexOf(group);
        const cycle = stack.slice(cycleStart);
        cycle.push(group);
        
        circular.push({
          groups: cycle,
          path: cycle.map(g => g.name || 'unnamed'),
        });
        return;
      }
      
      if (visited.has(group)) return;
      visited.add(group);
      stack.push(group);
      
      for (const child of group.childrenIterable) {
        dfs(child);
      }
      
      stack.pop();
    };
    
    for (const group of this.chunkGroups) {
      dfs(group);
    }
    
    return circular;
  }
  
  // 打破循环依赖
  breakCircularDependencies(): void {
    const circular = this.detectCircularDependencies();
    
    for (const cycle of circular) {
      // 移除循环中的一条边
      const last = cycle.groups[cycle.groups.length - 2];
      const first = cycle.groups[cycle.groups.length - 1];
      
      last.removeChild(first);
      
      // 发出警告
      this.warnings.push(
        new WebpackError(`Circular chunk dependency detected: ${cycle.path.join(' -> ')}`)
      );
    }
  }
}
```

## 连接优化

### 连接合并

```typescript
class Compilation {
  // 合并相同依赖的 ChunkGroup
  mergeEquivalentChunkGroups(): void {
    const groupsByModules = new Map<string, ChunkGroup[]>();
    
    // 按模块内容分组
    for (const group of this.chunkGroups) {
      const key = this.getChunkGroupContentKey(group);
      const groups = groupsByModules.get(key) || [];
      groups.push(group);
      groupsByModules.set(key, groups);
    }
    
    // 合并相同内容的组
    for (const groups of groupsByModules.values()) {
      if (groups.length > 1) {
        const primary = groups[0];
        
        for (let i = 1; i < groups.length; i++) {
          this.mergeChunkGroups(primary, groups[i]);
        }
      }
    }
  }
  
  private mergeChunkGroups(target: ChunkGroup, source: ChunkGroup): void {
    // 转移父关系
    for (const parent of Array.from(source.parentsIterable)) {
      parent.removeChild(source);
      parent.addChild(target);
    }
    
    // 转移子关系
    for (const child of Array.from(source.childrenIterable)) {
      source.removeChild(child);
      target.addChild(child);
    }
    
    // 转移来源信息
    for (const origin of source.origins) {
      target.addOrigin(origin.module, origin.loc, origin.request);
    }
    
    // 移除源 ChunkGroup
    const index = this.chunkGroups.indexOf(source);
    if (index >= 0) {
      this.chunkGroups.splice(index, 1);
    }
  }
  
  private getChunkGroupContentKey(group: ChunkGroup): string {
    const moduleIds: string[] = [];
    
    for (const chunk of group.chunks) {
      const modules = this.chunkGraph.getChunkModules(chunk);
      for (const module of modules) {
        moduleIds.push(module.identifier());
      }
    }
    
    return moduleIds.sort().join('|');
  }
}
```

### 冗余连接清理

```typescript
class Compilation {
  // 清理冗余的父子连接
  cleanupRedundantConnections(): void {
    for (const group of this.chunkGroups) {
      const directParents = new Set(group.parentsIterable);
      const indirectParents = new Set<ChunkGroup>();
      
      // 收集间接父级（祖先）
      for (const parent of directParents) {
        this.collectAncestors(parent, indirectParents);
      }
      
      // 如果直接父级也是间接父级，则连接冗余
      for (const parent of directParents) {
        if (indirectParents.has(parent)) {
          parent.removeChild(group);
        }
      }
    }
  }
  
  private collectAncestors(
    group: ChunkGroup,
    result: Set<ChunkGroup>
  ): void {
    for (const parent of group.parentsIterable) {
      if (!result.has(parent)) {
        result.add(parent);
        this.collectAncestors(parent, result);
      }
    }
  }
}
```

## 连接可视化

### 生成连接图

```typescript
class Compilation {
  // 生成 Graphviz DOT 格式
  generateChunkGraphDot(): string {
    let dot = 'digraph ChunkGraph {\n';
    dot += '  rankdir=TB;\n';
    dot += '  node [shape=box];\n\n';
    
    // 节点
    for (const group of this.chunkGroups) {
      const label = group.name || 'unnamed';
      const isEntry = group instanceof Entrypoint;
      const style = isEntry ? 'filled' : '';
      const color = isEntry ? 'lightblue' : 'white';
      
      dot += `  "${label}" [label="${label}", style="${style}", fillcolor="${color}"];\n`;
    }
    
    dot += '\n';
    
    // 边
    for (const group of this.chunkGroups) {
      const fromLabel = group.name || 'unnamed';
      
      for (const child of group.childrenIterable) {
        const toLabel = child.name || 'unnamed';
        dot += `  "${fromLabel}" -> "${toLabel}";\n`;
      }
    }
    
    dot += '}\n';
    return dot;
  }
  
  // 生成 JSON 格式
  generateChunkGraphJSON(): ChunkGraphJSON {
    return {
      nodes: this.chunkGroups.map(group => ({
        id: group.name || String(this.chunkGroups.indexOf(group)),
        name: group.name,
        isEntry: group instanceof Entrypoint,
        chunks: group.chunks.map(c => c.name || String(c.id)),
      })),
      edges: this.chunkGroups.flatMap(group => 
        Array.from(group.childrenIterable).map(child => ({
          from: group.name || String(this.chunkGroups.indexOf(group)),
          to: child.name || String(this.chunkGroups.indexOf(child)),
        }))
      ),
    };
  }
}
```

## 总结

Chunk 之间连接关系的核心要点：

**连接类型**：
- 父子关系
- 兄弟关系
- 运行时依赖

**图构建**：
- 异步导入建立连接
- 图遍历算法

**加载顺序**：
- 依赖优先
- 并行加载组

**循环处理**：
- 循环检测
- 循环打破

**连接优化**：
- 等价合并
- 冗余清理

**下一章**：我们将进入代码分割部分，学习 SplitChunksPlugin 设计理念。
