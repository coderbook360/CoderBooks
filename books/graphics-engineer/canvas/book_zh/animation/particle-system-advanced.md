# 粒子系统深度实现：力场与发射器

首先要问一个问题：火焰、烟雾、爆炸、魔法效果——这些震撼的视觉效果是如何实现的？

答案是：**粒子系统 (Particle System)**。成千上万个微小粒子，受力场影响，按照物理规律运动，最终呈现出令人惊叹的视觉效果。

---

## 1. 粒子系统概述

### 什么是粒子系统？

粒子系统是由大量微小粒子组成的动画系统。每个粒子拥有：
- 位置、速度、加速度
- 生命周期（从诞生到消失）
- 视觉属性（颜色、大小、透明度）

### 系统架构

```
ParticleSystem
├── Emitter (发射器) - 产生粒子
├── Particle[] (粒子数组) - 存储所有活动粒子
└── ForceField[] (力场) - 影响粒子运动
```

---

## 2. 粒子类设计

```javascript
class Particle {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.ax = 0;
    this.ay = 0;
    
    this.life = 0;      // 当前生命值
    this.maxLife = 1;   // 最大生命值
    
    this.size = 5;
    this.color = { r: 255, g: 255, b: 255 };
    this.alpha = 1;
  }
  
  update(deltaTime) {
    if (!this.active) return;
    
    const dt = deltaTime / 1000;
    
    // 更新速度和位置
    this.vx += this.ax * dt;
    this.vy += this.ay * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    // 更新生命周期
    this.life -= deltaTime;
    if (this.life <= 0) {
      this.active = false;
    }
    
    // 根据生命值计算透明度
    this.alpha = this.life / this.maxLife;
  }
  
  draw(ctx) {
    if (!this.active) return;
    
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
```

---

## 3. 对象池优化

创建和销毁大量对象会导致频繁的垃圾回收，影响性能。使用**对象池**复用粒子。

```javascript
class ParticlePool {
  constructor(size) {
    this.particles = [];
    for (let i = 0; i < size; i++) {
      this.particles.push(new Particle());
    }
  }
  
  acquire() {
    // 找到一个不活动的粒子
    for (const p of this.particles) {
      if (!p.active) {
        return p;
      }
    }
    return null;  // 池已满
  }
  
  release(particle) {
    particle.reset();
  }
  
  getActiveCount() {
    return this.particles.filter(p => p.active).length;
  }
}
```

---

## 4. 发射器实现

```javascript
class Emitter {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    
    this.rate = options.rate || 50;  // 每秒发射粒子数
    this.lifeMin = options.lifeMin || 1000;  // 生命周期（毫秒）
    this.lifeMax = options.lifeMax || 2000;
    
    this.speedMin = options.speedMin || 50;  // 初始速度
    this.speedMax = options.speedMax || 100;
    
    this.angle = options.angle || 0;  // 发射角度
    this.spread = options.spread || Math.PI;  // 扩散角度
    
    this.sizeMin = options.sizeMin || 3;
    this.sizeMax = options.sizeMax || 8;
    
    this.color = options.color || { r: 255, g: 200, b: 0 };
    
    this.accumulator = 0;  // 累积时间
  }
  
  emit(pool, deltaTime) {
    this.accumulator += deltaTime;
    const interval = 1000 / this.rate;
    
    while (this.accumulator >= interval) {
      this.accumulator -= interval;
      
      const particle = pool.acquire();
      if (!particle) break;  // 池已满
      
      this.initParticle(particle);
    }
  }
  
  initParticle(particle) {
    particle.active = true;
    particle.x = this.x;
    particle.y = this.y;
    
    // 随机角度
    const angle = this.angle + (Math.random() - 0.5) * this.spread;
    const speed = this.lerp(this.speedMin, this.speedMax, Math.random());
    
    particle.vx = Math.cos(angle) * speed;
    particle.vy = Math.sin(angle) * speed;
    
    particle.ax = 0;
    particle.ay = 0;
    
    particle.life = this.lerp(this.lifeMin, this.lifeMax, Math.random());
    particle.maxLife = particle.life;
    
    particle.size = this.lerp(this.sizeMin, this.sizeMax, Math.random());
    particle.color = this.color;
    particle.alpha = 1;
  }
  
  lerp(a, b, t) {
    return a + (b - a) * t;
  }
}
```

---

## 5. 力场系统

```javascript
class ForceField {
  apply(particle, deltaTime) {
    // 子类实现
  }
}

class Gravity extends ForceField {
  constructor(strength = 980) {
    super();
    this.strength = strength;  // 像素/秒²
  }
  
  apply(particle) {
    particle.ay += this.strength / 1000;  // 转换为毫秒
  }
}

class Wind extends ForceField {
  constructor(vx, vy) {
    super();
    this.vx = vx;
    this.vy = vy;
  }
  
  apply(particle) {
    particle.ax += this.vx;
    particle.ay += this.vy;
  }
}

class Attractor extends ForceField {
  constructor(x, y, strength) {
    super();
    this.x = x;
    this.y = y;
    this.strength = strength;
  }
  
  apply(particle) {
    const dx = this.x - particle.x;
    const dy = this.y - particle.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);
    
    if (dist < 1) return;  // 避免除零
    
    const force = this.strength / distSq;
    particle.ax += (dx / dist) * force;
    particle.ay += (dy / dist) * force;
  }
}
```

---

## 6. 完整粒子系统

```javascript
class ParticleSystem {
  constructor(poolSize = 1000) {
    this.pool = new ParticlePool(poolSize);
    this.emitters = [];
    this.forceFields = [];
  }
  
  addEmitter(emitter) {
    this.emitters.push(emitter);
  }
  
  addForceField(field) {
    this.forceFields.push(field);
  }
  
  update(deltaTime) {
    // 发射新粒子
    for (const emitter of this.emitters) {
      emitter.emit(this.pool, deltaTime);
    }
    
    // 更新粒子
    for (const particle of this.pool.particles) {
      if (!particle.active) continue;
      
      // 重置加速度
      particle.ax = 0;
      particle.ay = 0;
      
      // 应用力场
      for (const field of this.forceFields) {
        field.apply(particle, deltaTime);
      }
      
      particle.update(deltaTime);
    }
  }
  
  render(ctx) {
    for (const particle of this.pool.particles) {
      particle.draw(ctx);
    }
  }
}
```

---

## 7. 效果实现

### 火焰效果

```javascript
const fireSystem = new ParticleSystem(500);

const fireEmitter = new Emitter(400, 550, {
  rate: 100,
  lifeMin: 500,
  lifeMax: 1500,
  speedMin: 80,
  speedMax: 150,
  angle: -Math.PI / 2,  // 向上
  spread: Math.PI / 6,  // 小扩散
  sizeMin: 5,
  sizeMax: 15,
  color: { r: 255, g: 100, b: 0 }
});

fireSystem.addEmitter(fireEmitter);
fireSystem.addForceField(new Wind(0, -50));  // 向上的风

function animate(time) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  fireSystem.update(16);  // 固定时间步
  fireSystem.render(ctx);
  
  requestAnimationFrame(animate);
}
```

### 爆炸效果

```javascript
function createExplosion(x, y) {
  const explosionSystem = new ParticleSystem(300);
  
  const explosionEmitter = new Emitter(x, y, {
    rate: 5000,  // 瞬间发射大量粒子
    lifeMin: 500,
    lifeMax: 1500,
    speedMin: 100,
    speedMax: 300,
    angle: 0,
    spread: Math.PI * 2,  // 全方向
    sizeMin: 3,
    sizeMax: 10,
    color: { r: 255, g: 150, b: 0 }
  });
  
  explosionSystem.addEmitter(explosionEmitter);
  explosionSystem.addForceField(new Gravity(200));
  
  // 停止发射（爆炸是一次性的）
  setTimeout(() => {
    explosionSystem.emitters = [];
  }, 100);
  
  return explosionSystem;
}
```

---

## 本章小结

粒子系统是创造震撼视觉效果的核心技术：
- **粒子**：拥有位置、速度、生命周期等属性
- **发射器**：控制粒子的产生方式
- **力场**：影响粒子运动（重力、风力、吸引）
- **对象池**：复用粒子对象，提升性能

掌握粒子系统后，你就能创造出火焰、爆炸、魔法等各种效果。下一章，我们将学习 Canvas 绘制的性能最佳实践。
