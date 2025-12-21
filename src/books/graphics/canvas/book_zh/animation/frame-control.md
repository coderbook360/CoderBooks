# 帧率控制与时间管理

首先要问一个问题：如何保证动画在不同性能的设备上运行速度一致？

答案是：正确地管理时间和帧率。一个游戏如果在高性能设备上跑得飞快，在低性能设备上慢得像幻灯片，那就是时间管理的失败。

---

## 1. 帧率基础

### 什么是帧率？

**帧率 (FPS, Frames Per Second)**：每秒显示的画面数量。

- **60 FPS**：标准流畅体验，每帧约 16.67ms
- **30 FPS**：可接受的下限，每帧约 33.33ms
- **144 FPS**：高刷新率显示器的目标
- **低于 24 FPS**：开始感觉卡顿

### 帧时间

帧时间是帧率的倒数：

```
帧时间 = 1000ms / FPS

60 FPS → 16.67ms
30 FPS → 33.33ms
```

现在我要问第二个问题：为什么要关心帧率和帧时间？

答案有三点：
1. **用户体验**：帧率决定了动画的流畅度
2. **一致性**：保证不同设备上的运行速度一致
3. **资源管理**：避免不必要的计算，节省电量

---

## 2. 帧率监控

### FPS 计数器

要优化性能，首先要能测量性能。

```javascript
class FPSCounter {
  constructor() {
    this.frames = 0;
    this.lastTime = performance.now();
    this.fps = 0;
  }
  
  update() {
    this.frames++;
    const now = performance.now();
    const elapsed = now - this.lastTime;
    
    // 每秒更新一次 FPS 显示
    if (elapsed >= 1000) {
      this.fps = Math.round(this.frames * 1000 / elapsed);
      this.frames = 0;
      this.lastTime = now;
    }
  }
  
  get currentFPS() {
    return this.fps;
  }
  
  draw(ctx) {
    ctx.fillStyle = 'black';
    ctx.font = '16px monospace';
    ctx.fillText(`FPS: ${this.fps}`, 10, 20);
  }
}

// 使用
const fpsCounter = new FPSCounter();

function animate() {
  fpsCounter.update();
  
  // ... 更新和渲染 ...
  
  fpsCounter.draw(ctx);
  requestAnimationFrame(animate);
}
```

### 平滑 FPS 显示

上面的计数器每秒跳一次，看起来不够平滑。可以使用移动平均：

```javascript
class SmoothFPSCounter {
  constructor(sampleSize = 60) {
    this.sampleSize = sampleSize;
    this.frameTimes = [];
    this.lastTime = performance.now();
    this.fps = 0;
  }
  
  update(currentTime) {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    this.frameTimes.push(deltaTime);
    if (this.frameTimes.length > this.sampleSize) {
      this.frameTimes.shift();
    }
    
    // 计算平均帧时间
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.fps = Math.round(1000 / avgFrameTime);
  }
  
  draw(ctx) {
    ctx.fillStyle = 'black';
    ctx.font = '16px monospace';
    ctx.fillText(`FPS: ${this.fps}`, 10, 20);
  }
}
```

这种方法对过去 60 帧的帧时间求平均，显示更稳定。

---

## 3. 帧率限制

### 为什么需要限制帧率？

第三个问题：既然高帧率更流畅，为什么要限制它？

答案有几个原因：
1. **节能**：不必要的高帧率浪费 CPU
2. **一致性**：在超高刷新率显示器（如 240Hz）上，动画会跑得过快
3. **物理模拟**：某些物理引擎需要稳定的帧率

### 实现帧率限制

```javascript
class FrameLimiter {
  constructor(targetFPS = 60) {
    this.targetFPS = targetFPS;
    this.frameInterval = 1000 / targetFPS;  // 每帧目标时间
    this.lastFrameTime = 0;
  }
  
  shouldUpdate(currentTime) {
    const elapsed = currentTime - this.lastFrameTime;
    
    if (elapsed >= this.frameInterval) {
      // 补偿多余的时间，避免累积误差
      this.lastFrameTime = currentTime - (elapsed % this.frameInterval);
      return true;
    }
    
    return false;
  }
}

// 使用
const limiter = new FrameLimiter(30);  // 限制为 30 FPS

function animate(time) {
  if (limiter.shouldUpdate(time)) {
    update();
    render();
  }
  
  requestAnimationFrame(animate);
}
```

这段代码会确保更新频率不超过 30 FPS，即使显示器是 60Hz 或更高。

---

## 4. 可变时间步 (Variable Time Step)

我们在第 25 章学过基于时间的动画——这就是可变时间步。

### 工作原理

每帧根据实际经过的时间（deltaTime）更新：

```javascript
class VariableTimeStepGame {
  constructor() {
    this.lastTime = 0;
    this.x = 0;
    this.speed = 100;  // 像素/秒
  }
  
  loop(currentTime) {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    this.update(deltaTime);
    this.render();
    
    requestAnimationFrame((t) => this.loop(t));
  }
  
  update(deltaTime) {
    // 速度 × 时间 = 位移
    this.x += this.speed * (deltaTime / 1000);
  }
  
  render() {
    // 渲染...
  }
}
```

### 优点与缺点

**优点**：
- 简单直观
- 自动适应帧率波动
- 动画速度一致

**缺点**：
- 物理模拟可能不稳定（deltaTime 大时误差累积）
- 难以复现 bug（每次运行的 deltaTime 序列不同）

---

## 5. 固定时间步 (Fixed Time Step)

### 问题分析

可变时间步在物理模拟中有个致命缺陷——**数值不稳定**。

想象一个弹跳球的模拟：
```javascript
velocityY += gravity * deltaTime;  // 受重力加速
y += velocityY * deltaTime;        // 更新位置
```

如果某一帧的 deltaTime 特别大（比如主线程阻塞了 100ms），速度和位置的更新会产生巨大误差，球可能直接穿过地面！

### 固定时间步的解决方案

思考一下：如果物理更新总是以**固定的时间间隔**（如 16ms）执行，就能保证稳定性。

但是帧率是可变的，怎么办？答案是：**累积器模式 (Accumulator Pattern)**。

```javascript
class FixedTimeStepGame {
  constructor() {
    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedDeltaTime = 16;  // 固定时间步：16ms
    
    this.x = 0;
    this.speed = 100;
  }
  
  loop(currentTime) {
    let deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // 限制最大 deltaTime，避免"死亡螺旋"
    if (deltaTime > 250) {
      deltaTime = 250;
    }
    
    this.accumulator += deltaTime;
    
    // 用固定时间步多次更新，直到消耗完累积的时间
    while (this.accumulator >= this.fixedDeltaTime) {
      this.update(this.fixedDeltaTime);
      this.accumulator -= this.fixedDeltaTime;
    }
    
    this.render();
    
    requestAnimationFrame((t) => this.loop(t));
  }
  
  update(fixedDeltaTime) {
    // 总是使用固定的 16ms 更新
    this.x += this.speed * (fixedDeltaTime / 1000);
  }
  
  render() {
    // 渲染...
  }
}
```

### 工作原理

1. 实际经过了 33ms（两帧）
2. 累积器加上 33ms
3. 循环：累积器 >= 16ms，执行一次更新，累积器 -= 16ms
4. 第一次：33 - 16 = 17，继续
5. 第二次：17 - 16 = 1，停止
6. 剩余的 1ms 留在累积器中，下一帧继续累积

有没有很巧妙？这样保证了物理更新总是以 16ms 的步长进行，无论帧率如何波动。

---

## 6. 混合方法：插值渲染

固定时间步有个小问题——渲染可能看起来"阶梯状"。

思考一下这个场景：
- 固定时间步是 16ms
- 实际帧率是 120 FPS（约 8ms 一帧）
- 物理更新只在 0ms、16ms、32ms... 发生
- 渲染在 8ms、16ms、24ms... 发生

在第 8ms 渲染时，物理位置还停留在 0ms 的状态；在第 24ms 渲染时，物理位置是 16ms 的状态。

解决方案是：**插值渲染**。

```javascript
class InterpolatedGame extends FixedTimeStepGame {
  constructor() {
    super();
    this.prevX = 0;  // 上一次物理更新的 X
    this.currX = 0;  // 当前物理更新的 X
  }
  
  update(fixedDeltaTime) {
    this.prevX = this.currX;
    
    // 物理更新
    this.currX += this.speed * (fixedDeltaTime / 1000);
  }
  
  loop(currentTime) {
    let deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    if (deltaTime > 250) deltaTime = 250;
    
    this.accumulator += deltaTime;
    
    while (this.accumulator >= this.fixedDeltaTime) {
      this.update(this.fixedDeltaTime);
      this.accumulator -= this.fixedDeltaTime;
    }
    
    // 计算插值因子
    const alpha = this.accumulator / this.fixedDeltaTime;
    this.render(alpha);
    
    requestAnimationFrame((t) => this.loop(t));
  }
  
  render(alpha) {
    // 在 prevX 和 currX 之间插值
    const renderX = this.prevX + (this.currX - this.prevX) * alpha;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'blue';
    ctx.fillRect(renderX, 100, 50, 50);
  }
}
```

### 插值原理

累积器中剩余的时间，表示"下一次物理更新已经过去了多少比例"。

例如：
- 固定时间步 16ms
- 累积器剩余 8ms
- alpha = 8 / 16 = 0.5

说明当前渲染时间点，在上一次物理更新和下一次物理更新的"中间"。所以渲染位置也应该在 prevX 和 currX 的中间。

有没有很精妙？这样动画既有固定时间步的物理稳定性，又有高帧率的视觉流畅性。

---

## 7. 实践：完整游戏循环

```javascript
class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // 时间管理
    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedDeltaTime = 16;  // 62.5 FPS 的物理更新
    
    // FPS 监控
    this.fpsCounter = new SmoothFPSCounter();
    
    // 游戏状态
    this.objects = [];
  }
  
  start() {
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }
  
  loop(currentTime) {
    // 计算帧时间
    let deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // 限制最大帧时间，避免"死亡螺旋"
    if (deltaTime > 250) {
      console.warn('Frame took too long:', deltaTime);
      deltaTime = 250;
    }
    
    // 累积时间
    this.accumulator += deltaTime;
    
    // 固定时间步更新
    let updates = 0;
    while (this.accumulator >= this.fixedDeltaTime) {
      this.update(this.fixedDeltaTime);
      this.accumulator -= this.fixedDeltaTime;
      
      updates++;
      if (updates > 5) {
        // 避免"死亡螺旋"：最多连续更新 5 次
        this.accumulator = 0;
        break;
      }
    }
    
    // 插值渲染
    const alpha = this.accumulator / this.fixedDeltaTime;
    this.render(alpha);
    
    // FPS 显示
    this.fpsCounter.update(currentTime);
    this.fpsCounter.draw(this.ctx);
    
    requestAnimationFrame((t) => this.loop(t));
  }
  
  update(fixedDeltaTime) {
    // 物理/逻辑更新
    for (const obj of this.objects) {
      obj.update(fixedDeltaTime);
    }
  }
  
  render(alpha) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 渲染所有对象（使用插值）
    for (const obj of this.objects) {
      obj.render(this.ctx, alpha);
    }
  }
}

// 可插值的游戏对象
class GameObject {
  constructor(x, y) {
    this.prevX = x;
    this.currX = x;
    this.prevY = y;
    this.currY = y;
    
    this.velocityX = 100;  // 像素/秒
    this.velocityY = 0;
  }
  
  update(fixedDeltaTime) {
    this.prevX = this.currX;
    this.prevY = this.currY;
    
    // 物理更新
    this.currX += this.velocityX * (fixedDeltaTime / 1000);
    this.currY += this.velocityY * (fixedDeltaTime / 1000);
  }
  
  render(ctx, alpha) {
    // 插值位置
    const x = this.prevX + (this.currX - this.prevX) * alpha;
    const y = this.prevY + (this.currY - this.prevY) * alpha;
    
    ctx.fillStyle = 'blue';
    ctx.fillRect(x, y, 50, 50);
  }
}
```

---

## 本章小结

时间管理是动画和游戏的核心：
- **FPS 监控**：测量性能的第一步
- **帧率限制**：节能和一致性
- **可变时间步**：简单直观，适合简单动画
- **固定时间步**：物理模拟的标准方案，使用累积器模式
- **插值渲染**：结合固定时间步的稳定性和高帧率的流畅性

选择合适的时间管理策略，能让你的动画在各种设备上都稳定流畅地运行。
