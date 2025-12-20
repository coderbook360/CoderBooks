# 章节写作指导：分层 Canvas 策略

## 1. 章节信息

- **章节标题**: 分层 Canvas 策略
- **文件名**: animation/layered-canvas.md
- **所属部分**: 第六部分：动画与渲染优化
- **预计阅读时间**: 25分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解分层 Canvas 的优化原理
- 掌握分层策略的设计方法
- 理解静态层与动态层的区分
- 了解分层带来的权衡

### 技能目标
- 能够设计合理的图层结构
- 能够实现分层 Canvas 系统
- 能够管理多个 Canvas 的同步
- 能够评估分层的性能收益

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **分层 Canvas** | 使用多个堆叠的 Canvas 元素，每层负责不同的内容 |
| **静态层** | 不常变化的内容，如背景、网格 |
| **动态层** | 频繁变化的内容，如动画对象 |
| **UI 层** | 用户界面元素，如控制点、工具提示 |

### 关键知识点

- 图层的堆叠与定位（CSS position: absolute）
- 图层分类策略
- 图层间的事件处理
- 图层同步更新
- 图层合并与分离的时机

### 边界与限制

- 过多图层增加内存占用
- 图层管理的复杂度
- 事件穿透问题

## 4. 写作要求

### 开篇方式
从场景引入：图形编辑器中，背景网格几乎不变，而用户拖拽的对象不断移动。如果能把不变的背景和变化的对象分开，只重绘变化的部分，效率会大大提高。

### 结构组织

```
1. 为什么分层
   - 单 Canvas 的性能瓶颈
   - 分层的优化思路
   - 典型分层场景
   
2. 分层策略设计
   - 静态 vs 动态
   - 常见分层方案
   - 选择依据
   
3. 技术实现
   - Canvas 堆叠布局
   - 图层管理类
   - 渲染控制
   
4. 事件处理
   - 事件穿透
   - pointer-events 属性
   - 事件分发
   
5. 图层同步
   - 视口同步
   - 变换同步
   - 状态管理
   
6. 实际应用
   - 图形编辑器分层示例
   - 游戏分层示例
   - 性能对比
   
7. 本章小结
```

### 代码示例

1. **Canvas 堆叠 CSS**
2. **图层管理器类**
3. **按需重绘各层**
4. **事件穿透处理**
5. **完整分层系统**

### 图表需求

- **分层结构图**：展示多层 Canvas 的堆叠关系
- **重绘范围对比图**：展示分层前后的重绘区域

## 5. 技术细节

### 实现要点

```html
<!-- HTML 结构 -->
<div class="canvas-container">
  <canvas id="background-layer"></canvas>
  <canvas id="content-layer"></canvas>
  <canvas id="ui-layer"></canvas>
</div>

<style>
.canvas-container {
  position: relative;
  width: 800px;
  height: 600px;
}

.canvas-container canvas {
  position: absolute;
  top: 0;
  left: 0;
}

/* UI 层接收事件 */
#ui-layer {
  z-index: 3;
}

/* 内容层不接收事件，穿透到 UI 层 */
#content-layer {
  z-index: 2;
  pointer-events: none;
}

/* 背景层最底 */
#background-layer {
  z-index: 1;
  pointer-events: none;
}
</style>
```

```javascript
// 图层管理器
class LayerManager {
  constructor(container, width, height) {
    this.container = container;
    this.width = width;
    this.height = height;
    this.layers = new Map();
  }
  
  createLayer(name, zIndex) {
    const canvas = document.createElement('canvas');
    canvas.id = `${name}-layer`;
    canvas.width = this.width;
    canvas.height = this.height;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = zIndex;
    
    this.container.appendChild(canvas);
    
    const layer = {
      canvas,
      ctx: canvas.getContext('2d'),
      dirty: true,
      objects: []
    };
    
    this.layers.set(name, layer);
    return layer;
  }
  
  getLayer(name) {
    return this.layers.get(name);
  }
  
  markDirty(name) {
    const layer = this.layers.get(name);
    if (layer) layer.dirty = true;
  }
  
  render() {
    this.layers.forEach((layer, name) => {
      if (layer.dirty) {
        this.renderLayer(layer);
        layer.dirty = false;
      }
    });
  }
  
  renderLayer(layer) {
    const { ctx, canvas, objects } = layer;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    objects.forEach(obj => obj.draw(ctx));
  }
}

// 使用示例
const container = document.querySelector('.canvas-container');
const layerManager = new LayerManager(container, 800, 600);

// 创建图层
const bgLayer = layerManager.createLayer('background', 1);
const contentLayer = layerManager.createLayer('content', 2);
const uiLayer = layerManager.createLayer('ui', 3);

// 背景层（几乎不变）
bgLayer.objects.push(new GridBackground());

// 内容层（对象移动时标记脏）
contentLayer.objects.push(...shapes);

// UI 层（控制点等）
uiLayer.objects.push(...controls);

// 事件监听在最上层
uiLayer.canvas.addEventListener('mousedown', (e) => {
  // 处理事件
  // ...
  
  // 标记需要重绘的层
  layerManager.markDirty('content');
  layerManager.markDirty('ui');
  // 背景层不需要重绘
});

// 动画循环
function animate() {
  layerManager.render();
  requestAnimationFrame(animate);
}
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 事件无法触发 | 检查 pointer-events 设置 |
| 图层位置不同步 | 确保所有 Canvas 使用相同的变换 |
| 图层之间有缝隙 | 检查 CSS 定位和尺寸 |
| 内存占用过高 | 减少不必要的图层，或动态创建销毁 |

## 6. 风格指导

### 语气语调
- 从实际场景出发
- 强调权衡和适用场景

### 类比方向
- 分层类比"动画电影的赛璐珞片"
- 静态层类比"不动的背景"
- 动态层类比"活动的角色"

## 7. 与其他章节的关系

### 前置依赖
- 第28章：脏矩形渲染优化

### 后续章节铺垫
- 为第43章"图层管理"提供实现基础

## 8. 章节检查清单

- [ ] 目标明确：读者能设计和实现分层 Canvas
- [ ] 术语统一：图层、静态/动态等术语定义清晰
- [ ] 最小实现：提供图层管理器代码
- [ ] 边界处理：说明事件穿透和内存问题
- [ ] 性能与权衡：讨论分层的收益和成本
- [ ] 图示与代码：分层结构图与代码对应
- [ ] 总结与练习：提供分层设计练习
