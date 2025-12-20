# 章节写作指导：Canvas 绑制性能最佳实践

## 1. 章节信息

- **章节标题**: Canvas 绑制性能最佳实践
- **文件名**: animation/performance-best-practices.md
- **所属部分**: 第六部分：动画与渲染优化
- **预计阅读时间**: 35分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解 Canvas 渲染的性能瓶颈
- 掌握常见的性能优化技巧
- 理解不同绑制操作的性能成本
- 掌握性能测量和分析方法

### 技能目标
- 能够识别和解决性能问题
- 能够应用各种优化技巧
- 能够使用工具进行性能分析
- 能够设计高性能的渲染架构

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **渲染成本** | 不同绘制操作的性能开销 |
| **批量绘制** | 合并多次绘制减少状态切换 |
| **状态切换** | 改变 Canvas 状态的性能影响 |
| **GPU 加速** | 利用硬件加速提升性能 |

### 关键知识点

- 绘制操作的性能排序
- 减少状态切换
- 路径批量绘制
- 避免频繁的 getImageData
- 整数坐标优化
- requestAnimationFrame 正确使用
- 分层和离屏渲染回顾
- 性能测量工具

### 边界与限制

- 过度优化的复杂性
- 可读性与性能的权衡
- 不同浏览器的差异

## 4. 写作要求

### 开篇方式
总结性引入：前面的章节介绍了多种优化技术，本章将它们整合为系统性的最佳实践指南，并补充更多实用的性能优化技巧。

### 结构组织

```
1. 性能问题识别
   - 常见性能症状
   - 性能瓶颈分类
   - 测量方法
   
2. 绘制操作优化
   - 操作成本对比
   - 避免昂贵操作
   - 替代方案
   
3. 状态管理优化
   - 减少状态切换
   - 批量相同状态操作
   - save/restore 的成本
   
4. 路径优化
   - 路径复用（Path2D）
   - 批量路径绘制
   - 简化复杂路径
   
5. 图像和像素优化
   - 图像缓存
   - 避免频繁像素操作
   - 分辨率适配
   
6. 坐标和变换优化
   - 整数坐标
   - 变换矩阵复用
   - 避免不必要的变换
   
7. 内存优化
   - 对象复用
   - 及时释放资源
   - 避免内存泄漏
   
8. 性能测量与分析
   - Chrome DevTools
   - Performance API
   - 自定义性能监控
   
9. 本章小结
```

### 代码示例

1. **性能对比测试**
2. **状态批量优化**
3. **路径批量绘制**
4. **整数坐标优化**
5. **性能监控工具**

### 图表需求

- **操作成本对比表**：列出各种操作的相对成本
- **优化检查清单**：便于参考的优化项列表

## 5. 技术细节

### 实现要点

```javascript
// ===== 1. 绘制操作成本对比 =====
// 从低到高：
// - fillRect (最快)
// - drawImage
// - fill/stroke 简单路径
// - fill/stroke 复杂路径
// - 阴影
// - 滤镜
// - getImageData/putImageData

// ===== 2. 减少状态切换 =====
// ❌ 差的做法：每个对象单独设置状态
objects.forEach(obj => {
  ctx.fillStyle = obj.color;
  ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
});

// ✅ 好的做法：按颜色分组批量绘制
const groups = groupByColor(objects);
for (const [color, objs] of groups) {
  ctx.fillStyle = color;
  objs.forEach(obj => {
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
  });
}

// ===== 3. 路径批量绘制 =====
// ❌ 差的做法：每个形状单独路径
circles.forEach(c => {
  ctx.beginPath();
  ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
  ctx.fill();
});

// ✅ 好的做法：合并到单个路径
ctx.beginPath();
circles.forEach(c => {
  ctx.moveTo(c.x + c.r, c.y);
  ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
});
ctx.fill();

// ===== 4. 整数坐标 =====
// ❌ 可能导致子像素渲染
ctx.fillRect(10.3, 20.7, 50, 50);

// ✅ 使用整数坐标更快
ctx.fillRect(Math.round(10.3), Math.round(20.7), 50, 50);

// 对于 1px 线条，使用 0.5 偏移
ctx.moveTo(100.5, 50.5);
ctx.lineTo(100.5, 150.5);

// ===== 5. 避免频繁 getImageData =====
// ❌ 在动画循环中频繁调用
function animate() {
  const imageData = ctx.getImageData(0, 0, w, h);  // 慢！
  // 处理
  ctx.putImageData(imageData, 0, 0);
}

// ✅ 只在必要时调用，或使用其他方法

// ===== 6. 路径复用 =====
// 创建一次，多次使用
const starPath = new Path2D();
// ...构建路径

// 绑制时直接使用
ctx.fill(starPath);
ctx.stroke(starPath);

// ===== 7. 避免不必要的阴影 =====
// 阴影开销很大
// 如果可能，使用预渲染的阴影图像

// ===== 8. 性能监控 =====
class PerformanceMonitor {
  constructor() {
    this.frameTimes = [];
    this.maxSamples = 60;
  }
  
  startFrame() {
    this.frameStart = performance.now();
  }
  
  endFrame() {
    const frameTime = performance.now() - this.frameStart;
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }
  }
  
  getAverageFrameTime() {
    if (this.frameTimes.length === 0) return 0;
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    return sum / this.frameTimes.length;
  }
  
  getFPS() {
    const avg = this.getAverageFrameTime();
    return avg > 0 ? 1000 / avg : 0;
  }
  
  draw(ctx) {
    const fps = this.getFPS().toFixed(1);
    const frameTime = this.getAverageFrameTime().toFixed(2);
    
    ctx.fillStyle = 'black';
    ctx.font = '12px monospace';
    ctx.fillText(`FPS: ${fps}`, 10, 20);
    ctx.fillText(`Frame: ${frameTime}ms`, 10, 35);
  }
}

// ===== 9. 使用 Chrome DevTools =====
// 1. 打开 DevTools → Performance 面板
// 2. 点击录制
// 3. 执行操作
// 4. 停止录制
// 5. 分析 Frames 和 Main 线程

// ===== 10. 性能检查清单 =====
const performanceChecklist = [
  '使用 requestAnimationFrame 而非 setInterval',
  '避免在动画循环中创建对象',
  '批量相同状态的绘制操作',
  '使用整数坐标',
  '复用 Path2D 对象',
  '使用离屏 Canvas 缓存复杂图形',
  '使用分层 Canvas 分离静态和动态内容',
  '限制阴影和滤镜的使用',
  '避免频繁的 getImageData',
  '使用对象池复用对象',
  '适当降低分辨率（如移动端）',
  '使用 will-change: transform 提示 GPU 加速'
];
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 帧率不稳定 | 检查是否有变化的对象数量或复杂度 |
| 滚动时卡顿 | 使用分层或降低绘制频率 |
| 内存持续增长 | 检查对象是否正确释放 |
| 首帧渲染慢 | 预加载资源，延迟非关键渲染 |

## 6. 风格指导

### 语气语调
- 实用导向，提供可操作的建议
- 用数据和对比说明效果

### 类比方向
- 状态切换类比"换工具的时间"
- 批量绘制类比"流水线作业"

## 7. 与其他章节的关系

### 前置依赖
- 第28-30章：各种优化技术

### 后续章节铺垫
- 为整个书籍的性能意识提供总结

## 8. 章节检查清单

- [ ] 目标明确：读者掌握全面的性能优化方法
- [ ] 术语统一：各种优化术语定义清晰
- [ ] 最小实现：提供性能监控工具
- [ ] 边界处理：说明过度优化的问题
- [ ] 性能与权衡：讨论优化的成本收益
- [ ] 图示与代码：对比表与代码对应
- [ ] 总结与练习：提供性能优化检查清单
