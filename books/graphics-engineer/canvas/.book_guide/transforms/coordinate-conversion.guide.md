# 章节写作指导：坐标系转换：屏幕坐标与 Canvas 坐标

## 1. 章节信息

- **章节标题**: 坐标系转换：屏幕坐标与 Canvas 坐标
- **文件名**: transforms/coordinate-conversion.md
- **所属部分**: 第四部分：坐标变换与矩阵
- **预计阅读时间**: 30分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解多层坐标系统：屏幕、页面、Canvas、对象本地
- 掌握各层坐标系之间的转换方法
- 理解 CSS 变换对坐标的影响
- 理解高 DPI 屏幕对坐标的影响

### 技能目标
- 能够正确处理鼠标事件的坐标转换
- 能够处理 Canvas 缩放、旋转后的坐标
- 能够实现点击检测的坐标转换
- 能够设计通用的坐标转换工具

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **屏幕坐标** | 相对于显示器左上角的坐标 |
| **页面坐标** | 相对于文档左上角的坐标（包含滚动） |
| **客户区坐标** | 相对于视口左上角的坐标（不含滚动） |
| **Canvas 坐标** | 相对于 Canvas 内部坐标系的坐标 |
| **对象本地坐标** | 相对于对象自身原点的坐标 |

### 关键知识点

- event.screenX/Y, clientX/Y, pageX/Y 的区别
- getBoundingClientRect() 获取 Canvas 位置
- CSS 尺寸与 Canvas 内部尺寸的比例
- devicePixelRatio 的影响
- 逆变换矩阵在坐标转换中的应用

### 边界与限制

- CSS 变换（transform）会影响坐标计算
- 滚动和缩放需要额外处理
- 边框和内边距的影响

## 4. 写作要求

### 开篇方式
提出常见问题：点击 Canvas 时，鼠标的位置如何准确转换为 Canvas 内部的坐标？当 Canvas 被缩放、旋转、或者页面有滚动时，坐标转换变得更加复杂。本章系统讲解各种坐标系及其转换方法。

### 结构组织

```
1. 坐标系层级概述
   - 屏幕坐标系
   - 页面/客户区坐标系
   - Canvas 坐标系
   - 对象本地坐标系
   - 坐标系关系图
   
2. 事件坐标详解
   - screenX/Y
   - clientX/Y
   - pageX/Y
   - offsetX/Y（不推荐使用）
   
3. 客户区到 Canvas 坐标
   - getBoundingClientRect()
   - CSS 尺寸与 Canvas 尺寸
   - 基本转换公式
   
4. 处理特殊情况
   - CSS 边框和内边距
   - CSS transform 变换
   - 高 DPI 屏幕
   - 页面滚动
   
5. Canvas 到对象本地坐标
   - 使用逆变换矩阵
   - 层级对象的坐标转换
   - 完整转换链
   
6. 坐标转换工具
   - 通用坐标转换类
   - 事件包装器
   - 调试辅助
   
7. 本章小结
```

### 代码示例

1. **基本坐标转换函数**
2. **考虑 DPI 的坐标转换**
3. **处理 CSS 变换的坐标转换**
4. **Canvas 坐标到对象本地坐标**
5. **完整的坐标转换工具类**
6. **坐标调试可视化**

### 图表需求

- **坐标系层级图**：展示各层坐标系的关系
- **转换流程图**：展示从鼠标事件到对象本地坐标的完整流程

## 5. 技术细节

### 实现要点

```javascript
// 基本的客户区到 Canvas 坐标转换
function getCanvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

// 考虑高 DPI
function getCanvasPointHiDPI(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

// 完整的坐标转换类
class CoordinateTransformer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }
  
  // 客户区坐标 → Canvas 坐标
  clientToCanvas(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }
  
  // Canvas 坐标 → 对象本地坐标
  canvasToLocal(canvasX, canvasY, objectMatrix) {
    const inverseMatrix = objectMatrix.invert();
    return inverseMatrix.transformPoint(canvasX, canvasY);
  }
  
  // 事件 → Canvas 坐标
  eventToCanvas(event) {
    return this.clientToCanvas(event.clientX, event.clientY);
  }
  
  // 事件 → 对象本地坐标
  eventToLocal(event, objectMatrix) {
    const canvas = this.eventToCanvas(event);
    return this.canvasToLocal(canvas.x, canvas.y, objectMatrix);
  }
}

// 处理 CSS transform 的坐标转换
function getCanvasPointWithCSSTransform(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  
  // 获取 CSS 变换矩阵
  const style = window.getComputedStyle(canvas);
  const transform = style.transform;
  
  if (transform === 'none') {
    // 无 CSS 变换，使用普通方法
    return getCanvasPoint(canvas, event);
  }
  
  // 解析 CSS matrix 并计算逆变换
  // （简化处理，实际可能更复杂）
  const matrix = new DOMMatrix(transform);
  const inverse = matrix.inverse();
  
  const point = new DOMPoint(event.clientX, event.clientY);
  const transformed = inverse.transformPoint(point);
  
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  return {
    x: (transformed.x - rect.left) * scaleX,
    y: (transformed.y - rect.top) * scaleY
  };
}

// 坐标调试工具
function debugCoordinates(canvas, event) {
  console.log('Event coordinates:', {
    screen: { x: event.screenX, y: event.screenY },
    client: { x: event.clientX, y: event.clientY },
    page: { x: event.pageX, y: event.pageY }
  });
  
  const rect = canvas.getBoundingClientRect();
  console.log('Canvas rect:', rect);
  
  const canvasPoint = getCanvasPoint(canvas, event);
  console.log('Canvas point:', canvasPoint);
}
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 点击位置与绘制位置不匹配 | 检查 CSS 尺寸与 Canvas 尺寸比例 |
| 高 DPI 屏幕上坐标偏移 | 正确处理 devicePixelRatio |
| 页面滚动后坐标错误 | 使用 clientX/Y 而非 pageX/Y |
| CSS 变换后坐标不准 | 需要考虑 CSS transform 矩阵 |

## 6. 风格指导

### 语气语调
- 系统性讲解，层层递进
- 强调实际问题和解决方案

### 类比方向
- 坐标系层级类比"从国家到省到市到街道"
- 坐标转换类比"地址翻译"

## 7. 与其他章节的关系

### 前置依赖
- 第2章：Canvas 坐标系统
- 第17章：矩阵运算与自定义变换

### 后续章节铺垫
- 为第20章"事件绑定与坐标计算"提供核心基础
- 为第21章"点击检测"提供坐标转换工具

## 8. 章节检查清单

- [ ] 目标明确：读者能正确进行各种坐标转换
- [ ] 术语统一：各种坐标系术语定义清晰
- [ ] 最小实现：提供完整的坐标转换工具类
- [ ] 边界处理：说明各种特殊情况的处理
- [ ] 性能与权衡：无特殊性能考虑
- [ ] 图示与代码：坐标系关系图与代码对应
- [ ] 总结与练习：提供坐标转换练习
