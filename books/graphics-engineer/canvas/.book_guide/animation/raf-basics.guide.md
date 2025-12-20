# 章节写作指导：动画基础：requestAnimationFrame

## 1. 章节信息

- **章节标题**: 动画基础：requestAnimationFrame
- **文件名**: animation/raf-basics.md
- **所属部分**: 第六部分：动画与渲染优化
- **预计阅读时间**: 25分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解浏览器渲染循环与动画的关系
- 掌握 requestAnimationFrame (rAF) 的工作原理
- 理解 rAF 相比 setInterval/setTimeout 的优势
- 理解动画循环的基本模式

### 技能目标
- 能够使用 rAF 创建流畅动画
- 能够正确管理动画循环的启动和停止
- 能够实现基于时间的动画
- 能够处理后台标签页的动画暂停

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **requestAnimationFrame** | 浏览器提供的动画 API，与显示器刷新同步 |
| **帧 (Frame)** | 动画的一个画面，通常 60fps = 每帧约 16.67ms |
| **动画循环** | 持续调用自身的递归渲染函数 |
| **时间戳** | rAF 回调函数接收的高精度时间参数 |

### 关键知识点

- rAF vs setInterval/setTimeout 对比
- rAF 的自动暂停（后台标签页）
- 动画 ID 与 cancelAnimationFrame
- DOMHighResTimeStamp 时间戳
- 多个 rAF 回调的执行顺序

### 边界与限制

- rAF 在后台会暂停
- 帧率受限于显示器刷新率
- 长时间任务会导致跳帧

## 4. 写作要求

### 开篇方式
从动画原理引入：动画本质上是快速连续显示的一系列静态画面。在 Web 中，requestAnimationFrame 是创建流畅动画的最佳选择。

### 结构组织

```
1. 动画原理回顾
   - 帧与帧率
   - 浏览器渲染循环
   - 为什么需要 rAF
   
2. setInterval 的问题
   - 不与屏幕刷新同步
   - 后台持续运行
   - 时间不精确
   
3. requestAnimationFrame
   - 基本用法
   - 回调参数（时间戳）
   - 与渲染同步
   
4. 动画循环模式
   - 基本动画循环
   - 启动与停止
   - 状态管理
   
5. 时间戳的使用
   - DOMHighResTimeStamp
   - 计算增量时间
   - 时间基准动画
   
6. 实践示例
   - 移动动画
   - 旋转动画
   - 弹跳动画
   
7. 本章小结
```

### 代码示例

1. **setInterval vs rAF 对比**
2. **基本动画循环**
3. **可控制的动画类**
4. **基于时间的动画**
5. **移动、旋转、弹跳示例**

### 图表需求

- **浏览器渲染流程图**：展示 rAF 在渲染流程中的位置
- **帧时间线图**：展示 rAF 与显示器刷新的同步

## 5. 技术细节

### 实现要点

```javascript
// setInterval 的问题示例
// ❌ 不推荐
setInterval(() => {
  update();
  render();
}, 1000 / 60);  // 尝试 60fps

// ✅ 使用 requestAnimationFrame
function animate(timestamp) {
  update();
  render();
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// 动画控制类
class Animation {
  constructor() {
    this.isRunning = false;
    this.animationId = null;
    this.lastTime = 0;
  }
  
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }
  
  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  loop(timestamp) {
    if (!this.isRunning) return;
    
    // 计算增量时间（毫秒）
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;
    
    this.update(deltaTime);
    this.render();
    
    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }
  
  update(deltaTime) {
    // 子类实现
  }
  
  render() {
    // 子类实现
  }
}

// 基于时间的动画示例
class MovingBox extends Animation {
  constructor(canvas) {
    super();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.x = 0;
    this.speed = 100;  // 像素/秒
  }
  
  update(deltaTime) {
    // 使用增量时间保证速度一致
    this.x += this.speed * (deltaTime / 1000);
    
    // 循环移动
    if (this.x > this.canvas.width) {
      this.x = -50;
    }
  }
  
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = 'blue';
    this.ctx.fillRect(this.x, 100, 50, 50);
  }
}

// 使用
const box = new MovingBox(canvas);
box.start();

// 页面可见性处理
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // 页面不可见时可能需要特殊处理
    console.log('Animation paused by browser');
  } else {
    // 恢复时重置时间基准
    box.lastTime = performance.now();
  }
});
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 动画速度不稳定 | 使用基于时间的增量计算 |
| 切换标签页后动画跳跃 | 重置 lastTime 或限制最大 deltaTime |
| 动画无法停止 | 正确使用 cancelAnimationFrame |
| 多个动画同步问题 | 使用统一的动画循环管理 |

## 6. 风格指导

### 语气语调
- 从原理出发，解释为什么
- 强调最佳实践

### 类比方向
- rAF 类比"电影放映机的快门"
- 帧率类比"翻页动画的速度"

## 7. 与其他章节的关系

### 前置依赖
- 无特殊前置

### 后续章节铺垫
- 为第26章"缓动函数"提供动画基础
- 为所有动画相关章节提供基础

## 8. 章节检查清单

- [ ] 目标明确：读者能使用 rAF 创建流畅动画
- [ ] 术语统一：帧、帧率、rAF 等术语定义清晰
- [ ] 最小实现：提供动画控制类
- [ ] 边界处理：说明后台标签页和跳帧问题
- [ ] 性能与权衡：解释 rAF 的性能优势
- [ ] 图示与代码：渲染流程图与代码对应
- [ ] 总结与练习：提供动画实现练习
