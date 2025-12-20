# 动画基础：requestAnimationFrame

首先要问一个问题：如何在 Canvas 中创建流畅的动画？

答案是：使用 **requestAnimationFrame (rAF)**。这是浏览器专为动画设计的 API，能与显示器刷新率完美同步，创造出丝般顺滑的视觉效果。

---

## 1. 动画原理回顾

### 帧与帧率

动画的本质是**视觉暂留**——快速连续显示静态画面，产生运动的错觉。

- **帧 (Frame)**：动画的一个画面
- **帧率 (Frame Rate)**：每秒显示的帧数，单位是 **fps** (frames per second)
  - 电影通常是 **24fps**
  - 游戏追求 **60fps** 或更高
  - 显示器刷新率决定了能达到的最高帧率（通常是 **60Hz** = 60fps）

### 浏览器渲染循环

浏览器的渲染流程：

1. **JavaScript 执行**：处理事件、更新数据
2. **样式计算**：计算 CSS 样式
3. **布局 (Layout)**：计算元素位置和尺寸
4. **绘制 (Paint)**：绘制像素到图层
5. **合成 (Composite)**：将图层合成到屏幕

`requestAnimationFrame` 被设计为在**下一次重绘之前**执行，确保动画与屏幕刷新完美同步。

---

## 2. setInterval 的问题

在 rAF 出现之前，开发者通常使用 `setInterval` 或 `setTimeout` 创建动画：

```javascript
// ❌ 不推荐的方式
setInterval(() => {
  updatePosition();
  render();
}, 1000 / 60);  // 尝试达到 60fps
```

这种方式有三个严重问题：

### 问题1：不与屏幕刷新同步

`setInterval` 的时间间隔**不保证**与显示器刷新率对齐。结果是：
- **撕裂 (Tearing)**：动画在刷新中途更新，画面不完整
- **卡顿**：多个更新挤在一帧里，或某些帧被跳过

思考一下这个场景：显示器每 16.67ms（60Hz）刷新一次，而你的 `setInterval` 可能在第 10ms、26ms、42ms... 触发。这些时间点与刷新时机不匹配，导致丢帧或重复帧。

### 问题2：后台持续运行

当标签页切换到后台时，`setInterval` 依然执行，浪费 CPU 和电量。

### 问题3：时间不精确

JavaScript 是单线程的，如果主线程阻塞，`setInterval` 的回调会延迟执行，导致动画速度不稳定。

---

## 3. requestAnimationFrame

### 基本用法

现在我要问第二个问题：如何使用 rAF？

```javascript
function animate() {
  // 更新状态
  updatePosition();
  
  // 渲染画面
  render();
  
  // 请求下一帧
  requestAnimationFrame(animate);
}

// 启动动画
requestAnimationFrame(animate);
```

关键点：
1. `requestAnimationFrame(callback)` 会在下一次重绘前调用 callback
2. 在 callback 中再次调用 rAF，形成**动画循环**
3. 返回一个动画 ID，可用于取消动画

### 回调参数：高精度时间戳

rAF 的回调函数接收一个参数：`DOMHighResTimeStamp`。

```javascript
function animate(timestamp) {
  console.log('当前时间戳:', timestamp);  // 例如：1234567.89（毫秒）
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

这个时间戳：
- 高精度（精确到微秒）
- 从页面加载开始计时
- 用于计算动画增量时间

### 与渲染同步的魔力

rAF 的最大优势是**与浏览器渲染周期同步**：
- 浏览器会自动调整调用频率，匹配显示器刷新率
- 在 60Hz 显示器上，rAF 约每 16.67ms 执行一次
- 在 144Hz 显示器上，rAF 约每 6.94ms 执行一次

有没有很神奇？你无需关心显示器刷新率，rAF 自动适配。

---

## 4. 动画循环模式

### 基本动画循环

```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let x = 0;

function animate() {
  // 清除画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 更新状态
  x += 2;
  if (x > canvas.width) {
    x = -50;
  }
  
  // 绘制
  ctx.fillStyle = 'blue';
  ctx.fillRect(x, 100, 50, 50);
  
  // 下一帧
  requestAnimationFrame(animate);
}

animate();
```

这个示例会创建一个从左到右移动的蓝色方块。

### 启动与停止

但是这样写有个问题——动画一旦启动就无法停止。现在我要问第三个问题：如何控制动画的启动和停止？

答案是：保存动画 ID，使用 `cancelAnimationFrame`。

```javascript
class AnimationController {
  constructor() {
    this.isRunning = false;
    this.animationId = null;
  }
  
  start() {
    if (this.isRunning) return;  // 避免重复启动
    
    this.isRunning = true;
    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }
  
  stop() {
    this.isRunning = false;
    
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  loop(timestamp) {
    if (!this.isRunning) return;  // 确保已停止
    
    this.update(timestamp);
    this.render();
    
    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }
  
  update(timestamp) {
    // 子类实现
  }
  
  render() {
    // 子类实现
  }
}
```

---

## 5. 基于时间的动画

### 为什么需要时间戳？

前面的示例中，我们每帧让 x 增加固定值（`x += 2`）。这种方式有个隐患：**动画速度依赖帧率**。

如果帧率从 60fps 降到 30fps（比如设备性能差，或主线程阻塞），移动速度会**变慢一半**。

解决方案是：**基于时间增量 (delta time) 计算**。

### 增量时间计算

```javascript
class TimeBasedAnimation extends AnimationController {
  constructor() {
    super();
    this.lastTime = 0;
  }
  
  start() {
    this.lastTime = performance.now();
    super.start();
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
    // 子类实现，使用 deltaTime 而非固定增量
  }
}
```

### 实践：恒定速度移动

```javascript
class MovingBox extends TimeBasedAnimation {
  constructor(canvas) {
    super();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.x = 0;
    this.speed = 200;  // 像素/秒
  }
  
  update(deltaTime) {
    // 速度 × 时间 = 距离
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
const canvas = document.getElementById('canvas');
const box = new MovingBox(canvas);
box.start();

// 按钮控制
document.getElementById('stop').addEventListener('click', () => {
  box.stop();
});
document.getElementById('start').addEventListener('click', () => {
  box.start();
});
```

关键公式：`位移 = 速度 × 时间`

- 速度单位：**像素/秒**
- deltaTime 单位：**毫秒**
- 所以 `deltaTime / 1000` 转换为秒

有没有很清晰？现在无论帧率如何变化，移动速度始终是每秒 200 像素。

---

## 6. 实践示例

### 旋转动画

```javascript
class RotatingRect extends TimeBasedAnimation {
  constructor(canvas) {
    super();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.angle = 0;
    this.rotationSpeed = Math.PI;  // 弧度/秒（180度/秒）
  }
  
  update(deltaTime) {
    this.angle += this.rotationSpeed * (deltaTime / 1000);
  }
  
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 移动到中心
    ctx.save();
    ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    ctx.rotate(this.angle);
    
    // 绘制矩形（中心对齐）
    ctx.fillStyle = 'red';
    ctx.fillRect(-50, -50, 100, 100);
    
    ctx.restore();
  }
}
```

### 弹跳球

```javascript
class BouncingBall extends TimeBasedAnimation {
  constructor(canvas) {
    super();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.y = 50;
    this.velocityY = 0;
    this.gravity = 980;  // 像素/秒²（接近真实重力 9.8m/s²）
    this.bounce = 0.8;   // 反弹系数
  }
  
  update(deltaTime) {
    const dt = deltaTime / 1000;
    
    // 受重力影响的速度
    this.velocityY += this.gravity * dt;
    
    // 更新位置
    this.y += this.velocityY * dt;
    
    // 地面碰撞检测
    const ground = this.canvas.height - 30;
    if (this.y > ground) {
      this.y = ground;
      this.velocityY = -this.velocityY * this.bounce;
    }
  }
  
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制球
    ctx.fillStyle = 'green';
    ctx.beginPath();
    ctx.arc(this.canvas.width / 2, this.y, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制地面
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.canvas.height - 2);
    ctx.lineTo(this.canvas.width, this.canvas.height - 2);
    ctx.stroke();
  }
}
```

这个弹跳球模拟了真实的物理运动——重力加速、碰撞反弹、能量损失。

---

## 7. 页面可见性处理

当标签页切到后台时，浏览器会自动暂停 rAF。但是恢复时会有个问题——`deltaTime` 会非常大（因为 `lastTime` 还停留在暂停前）。

```javascript
class SmartAnimation extends TimeBasedAnimation {
  constructor() {
    super();
    this.maxDeltaTime = 100;  // 限制最大增量时间为 100ms
    this.setupVisibilityHandler();
  }
  
  loop(timestamp) {
    if (!this.isRunning) return;
    
    let deltaTime = timestamp - this.lastTime;
    
    // 限制最大增量，避免跳跃
    if (deltaTime > this.maxDeltaTime) {
      deltaTime = this.maxDeltaTime;
    }
    
    this.lastTime = timestamp;
    
    this.update(deltaTime);
    this.render();
    
    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }
  
  setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isRunning) {
        // 页面恢复可见，重置时间基准
        this.lastTime = performance.now();
      }
    });
  }
}
```

---

## 8. 多动画管理

如果页面有多个动画对象，推荐使用**统一的动画循环**，而不是每个对象独立的 rAF。

```javascript
class AnimationManager {
  constructor() {
    this.objects = [];
    this.isRunning = false;
    this.animationId = null;
    this.lastTime = 0;
  }
  
  add(obj) {
    this.objects.push(obj);
    if (!this.isRunning) {
      this.start();
    }
  }
  
  remove(obj) {
    const index = this.objects.indexOf(obj);
    if (index > -1) {
      this.objects.splice(index, 1);
    }
    if (this.objects.length === 0) {
      this.stop();
    }
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
    
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;
    
    // 更新所有对象
    for (const obj of this.objects) {
      obj.update(deltaTime);
    }
    
    // 渲染所有对象（如果它们共享同一个 canvas）
    // 或让每个对象自己渲染
    for (const obj of this.objects) {
      obj.render();
    }
    
    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }
}

// 使用
const manager = new AnimationManager();
manager.add(new MovingBox(canvas));
manager.add(new RotatingRect(canvas));
manager.add(new BouncingBall(canvas));
```

---

## 本章小结

`requestAnimationFrame` 是创建流畅动画的基石：
- **与渲染同步**：自动匹配显示器刷新率，避免撕裂和丢帧
- **自动暂停**：后台标签页自动暂停，节省资源
- **高精度时间戳**：用于计算增量时间，保证动画速度稳定
- **基于时间的动画**：使用 `位移 = 速度 × 时间` 公式，让动画不受帧率影响

掌握 rAF 后，下一章我们将学习缓动函数，让动画从机械运动变成自然优雅的艺术。
