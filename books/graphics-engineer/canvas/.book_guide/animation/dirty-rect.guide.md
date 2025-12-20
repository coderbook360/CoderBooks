# 章节写作指导：脏矩形渲染优化

## 1. 章节信息

- **章节标题**: 脏矩形渲染优化
- **文件名**: animation/dirty-rect.md
- **所属部分**: 第六部分：动画与渲染优化
- **预计阅读时间**: 30分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解脏矩形（Dirty Rectangle）优化的原理
- 掌握脏区域的计算和合并方法
- 理解局部重绘与全局重绘的权衡
- 了解脏矩形在复杂场景中的应用

### 技能目标
- 能够实现脏区域标记系统
- 能够计算和合并脏矩形
- 能够实现局部重绘
- 能够评估脏矩形优化的收益

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **脏矩形** | 需要重新绘制的屏幕区域 |
| **脏区域标记** | 标识哪些对象/区域发生了变化 |
| **区域合并** | 将多个脏矩形合并为一个或多个 |
| **局部重绘** | 只重绘发生变化的区域 |

### 关键知识点

- 对象变化时标记脏区域
- 脏矩形的计算：包含旧位置和新位置
- 多个脏矩形的合并策略
- clip() 限制绑制区域
- 脏矩形优化的收益评估

### 边界与限制

- 大量小变化可能不如全局重绘
- 矩形合并可能导致不必要的重绘
- 复杂场景中的实现复杂度

## 4. 写作要求

### 开篇方式
从性能问题引入：每帧清除整个画布并重绘所有对象，在对象数量多时会很慢。如果只有少数对象移动，能否只重绘变化的区域？这就是脏矩形优化的思想。

### 结构组织

```
1. 问题分析
   - 全局重绘的性能问题
   - 局部更新的可能性
   - 脏矩形优化思想
   
2. 脏区域标记
   - 何时标记脏
   - 如何标记脏
   - 脏状态管理
   
3. 脏矩形计算
   - 单个对象的脏矩形
   - 包含旧位置和新位置
   - 处理旋转和缩放
   
4. 矩形合并策略
   - 为什么需要合并
   - 合并算法
   - 权衡考虑
   
5. 局部重绘实现
   - 使用 clip() 限制区域
   - 重绘相关对象
   - 恢复状态
   
6. 实际应用
   - 完整示例
   - 性能对比
   - 适用场景分析
   
7. 本章小结
```

### 代码示例

1. **脏状态标记系统**
2. **脏矩形计算**
3. **矩形合并算法**
4. **局部重绘实现**
5. **完整脏矩形优化示例**
6. **性能对比演示**

### 图表需求

- **脏矩形示意图**：展示旧位置和新位置的合并区域
- **合并策略对比图**：展示不同合并策略的效果

## 5. 技术细节

### 实现要点

```javascript
// 矩形类
class Rect {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
  
  // 矩形合并（返回包含两个矩形的最小矩形）
  union(other) {
    const x = Math.min(this.x, other.x);
    const y = Math.min(this.y, other.y);
    const right = Math.max(this.x + this.width, other.x + other.width);
    const bottom = Math.max(this.y + this.height, other.y + other.height);
    return new Rect(x, y, right - x, bottom - y);
  }
  
  // 矩形相交检测
  intersects(other) {
    return !(this.x + this.width < other.x ||
             other.x + other.width < this.x ||
             this.y + this.height < other.y ||
             other.y + other.height < this.y);
  }
  
  // 扩展边距
  expand(margin) {
    return new Rect(
      this.x - margin,
      this.y - margin,
      this.width + margin * 2,
      this.height + margin * 2
    );
  }
}

// 可脏标记的对象
class DirtyObject {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this._dirty = true;
    this._previousBounds = null;
  }
  
  get dirty() {
    return this._dirty;
  }
  
  markDirty() {
    if (!this._dirty) {
      this._previousBounds = this.getBounds();
      this._dirty = true;
    }
  }
  
  clearDirty() {
    this._dirty = false;
    this._previousBounds = null;
  }
  
  getBounds() {
    return new Rect(this.x, this.y, this.width, this.height);
  }
  
  getDirtyRect() {
    if (!this._dirty) return null;
    
    const currentBounds = this.getBounds();
    if (this._previousBounds) {
      return currentBounds.union(this._previousBounds);
    }
    return currentBounds;
  }
  
  // 属性设置时自动标记脏
  setPosition(x, y) {
    if (x !== this.x || y !== this.y) {
      this.markDirty();
      this.x = x;
      this.y = y;
    }
  }
}

// 脏矩形管理器
class DirtyRectManager {
  constructor() {
    this.dirtyRects = [];
  }
  
  addDirtyRect(rect) {
    this.dirtyRects.push(rect);
  }
  
  // 合并所有矩形为一个
  mergeAll() {
    if (this.dirtyRects.length === 0) return null;
    
    let merged = this.dirtyRects[0];
    for (let i = 1; i < this.dirtyRects.length; i++) {
      merged = merged.union(this.dirtyRects[i]);
    }
    return merged;
  }
  
  // 智能合并：只合并相交或接近的矩形
  mergeOverlapping(threshold = 10) {
    const rects = [...this.dirtyRects];
    const merged = [];
    
    while (rects.length > 0) {
      let current = rects.pop().expand(threshold);
      let didMerge = true;
      
      while (didMerge) {
        didMerge = false;
        for (let i = rects.length - 1; i >= 0; i--) {
          if (current.intersects(rects[i].expand(threshold))) {
            current = current.union(rects[i]);
            rects.splice(i, 1);
            didMerge = true;
          }
        }
      }
      
      merged.push(current);
    }
    
    return merged;
  }
  
  clear() {
    this.dirtyRects = [];
  }
}

// 使用脏矩形的渲染器
class DirtyRectRenderer {
  constructor(canvas, objects) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.objects = objects;
    this.dirtyManager = new DirtyRectManager();
  }
  
  render() {
    // 收集脏矩形
    this.objects.forEach(obj => {
      if (obj.dirty) {
        const dirtyRect = obj.getDirtyRect();
        if (dirtyRect) {
          this.dirtyManager.addDirtyRect(dirtyRect);
        }
      }
    });
    
    // 合并脏矩形
    const dirtyRects = this.dirtyManager.mergeOverlapping();
    
    if (dirtyRects.length === 0) return;  // 无需重绘
    
    // 对每个脏矩形进行局部重绘
    dirtyRects.forEach(rect => {
      this.ctx.save();
      
      // 裁剪到脏区域
      this.ctx.beginPath();
      this.ctx.rect(rect.x, rect.y, rect.width, rect.height);
      this.ctx.clip();
      
      // 清除脏区域
      this.ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
      
      // 重绘与脏区域相交的对象
      this.objects.forEach(obj => {
        if (obj.getBounds().intersects(rect)) {
          obj.draw(this.ctx);
        }
      });
      
      this.ctx.restore();
    });
    
    // 清理脏状态
    this.objects.forEach(obj => obj.clearDirty());
    this.dirtyManager.clear();
  }
}
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 脏矩形计算不准确 | 确保包含旧位置和新位置 |
| 局部重绘后出现残影 | 检查脏矩形边界是否正确 |
| 优化后反而更慢 | 评估场景是否适合脏矩形优化 |
| 旋转对象脏矩形过大 | 使用轴对齐包围盒 |

## 6. 风格指导

### 语气语调
- 从性能问题出发
- 强调权衡和适用场景

### 类比方向
- 脏矩形类比"只擦黑板上写错的部分"
- 合并类比"把几块需要擦的区域合并成一块大的"

## 7. 与其他章节的关系

### 前置依赖
- 第25章：动画基础

### 后续章节铺垫
- 为第29章"分层 Canvas"提供理论基础
- 为第32章"性能最佳实践"提供具体技术

## 8. 章节检查清单

- [ ] 目标明确：读者能实现脏矩形优化
- [ ] 术语统一：脏矩形、局部重绘等术语定义清晰
- [ ] 最小实现：提供完整的脏矩形系统
- [ ] 边界处理：说明不适用的场景
- [ ] 性能与权衡：详细讨论性能收益
- [ ] 图示与代码：脏矩形示意图与代码对应
- [ ] 总结与练习：提供优化实践练习
