# 章节写作指导：粒子系统深度实现：力场与发射器

## 1. 章节信息

- **章节标题**: 粒子系统深度实现：力场与发射器
- **文件名**: animation/particle-system-advanced.md
- **所属部分**: 第六部分：动画与渲染优化
- **预计阅读时间**: 40分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解粒子系统的架构设计
- 掌握粒子发射器的各种模式
- 理解力场对粒子的影响
- 掌握粒子生命周期管理

### 技能目标
- 能够实现完整的粒子系统
- 能够创建各种粒子效果（火焰、烟雾、爆炸等）
- 能够实现力场影响（重力、风力、吸引/排斥）
- 能够优化大量粒子的性能

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **粒子 (Particle)** | 具有位置、速度、生命周期等属性的基本单元 |
| **发射器 (Emitter)** | 控制粒子产生的位置、方向、速率 |
| **力场 (Force Field)** | 影响粒子运动的外部力 |
| **对象池** | 复用粒子对象以减少内存分配 |

### 关键知识点

- 粒子属性：位置、速度、加速度、生命周期、颜色、大小
- 发射器模式：点发射、线发射、区域发射
- 发射参数：速率、初始速度范围、扩散角度
- 力场类型：重力、风力、吸引、排斥、湍流
- 粒子更新与渲染
- 对象池优化

### 边界与限制

- 大量粒子的性能问题
- 复杂力场的计算开销
- 视觉效果与性能的权衡

## 4. 写作要求

### 开篇方式
从视觉效果引入：火焰、烟雾、爆炸、魔法效果……这些震撼的视觉效果都依赖于粒子系统。本章深入探讨粒子系统的完整实现。

### 结构组织

```
1. 粒子系统概述
   - 什么是粒子系统
   - 典型应用场景
   - 系统架构
   
2. 粒子类设计
   - 粒子属性
   - 生命周期
   - 更新与渲染
   
3. 发射器实现
   - 发射器类型
   - 发射参数
   - 粒子初始化
   
4. 力场系统
   - 重力
   - 风力
   - 吸引/排斥
   - 湍流噪声
   
5. 性能优化
   - 对象池
   - 批量渲染
   - 粒子数量限制
   
6. 效果实现
   - 火焰效果
   - 烟雾效果
   - 爆炸效果
   - 雪花效果
   
7. 本章小结
```

### 代码示例

1. **粒子类**
2. **发射器类**
3. **力场类**
4. **对象池**
5. **完整粒子系统**
6. **各种效果示例**

### 图表需求

- **粒子系统架构图**：展示各组件的关系
- **力场影响示意图**：展示力场如何影响粒子运动

## 5. 技术细节

### 实现要点

```javascript
// 粒子类
class Particle {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.ax = 0;
    this.ay = 0;
    this.life = 0;
    this.maxLife = 1000;
    this.size = 5;
    this.color = 'rgba(255, 100, 0, 1)';
    this.alpha = 1;
    this.isAlive = false;
  }
  
  init(x, y, vx, vy, life, size, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
    this.alpha = 1;
    this.isAlive = true;
  }
  
  update(dt, forces) {
    if (!this.isAlive) return;
    
    // 应用力场
    this.ax = 0;
    this.ay = 0;
    forces.forEach(force => {
      const f = force.apply(this);
      this.ax += f.x;
      this.ay += f.y;
    });
    
    // 更新速度和位置
    this.vx += this.ax * dt;
    this.vy += this.ay * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    // 更新生命周期
    this.life -= dt * 1000;
    this.alpha = Math.max(0, this.life / this.maxLife);
    
    if (this.life <= 0) {
      this.isAlive = false;
    }
  }
  
  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// 对象池
class ParticlePool {
  constructor(size) {
    this.pool = [];
    for (let i = 0; i < size; i++) {
      this.pool.push(new Particle());
    }
  }
  
  get() {
    for (const p of this.pool) {
      if (!p.isAlive) {
        return p;
      }
    }
    // 池已满，创建新粒子（或返回 null）
    const p = new Particle();
    this.pool.push(p);
    return p;
  }
}

// 发射器
class Emitter {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.rate = 10;  // 每秒发射数量
    this.spreadAngle = Math.PI / 4;  // 扩散角度
    this.speed = { min: 50, max: 100 };
    this.life = { min: 500, max: 1500 };
    this.size = { min: 2, max: 5 };
    this.direction = -Math.PI / 2;  // 向上
    this.accumulator = 0;
  }
  
  emit(dt, pool) {
    this.accumulator += this.rate * dt;
    const count = Math.floor(this.accumulator);
    this.accumulator -= count;
    
    const particles = [];
    for (let i = 0; i < count; i++) {
      const p = pool.get();
      if (p) {
        this.initParticle(p);
        particles.push(p);
      }
    }
    return particles;
  }
  
  initParticle(p) {
    const angle = this.direction + (Math.random() - 0.5) * this.spreadAngle;
    const speed = this.randomRange(this.speed.min, this.speed.max);
    const life = this.randomRange(this.life.min, this.life.max);
    const size = this.randomRange(this.size.min, this.size.max);
    
    p.init(
      this.x,
      this.y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      life,
      size,
      'rgba(255, 100, 0, 1)'
    );
  }
  
  randomRange(min, max) {
    return min + Math.random() * (max - min);
  }
}

// 力场基类
class ForceField {
  apply(particle) {
    return { x: 0, y: 0 };
  }
}

// 重力
class Gravity extends ForceField {
  constructor(strength = 9.8) {
    super();
    this.strength = strength;
  }
  
  apply(particle) {
    return { x: 0, y: this.strength };
  }
}

// 风力
class Wind extends ForceField {
  constructor(vx, vy) {
    super();
    this.vx = vx;
    this.vy = vy;
  }
  
  apply(particle) {
    return { x: this.vx, y: this.vy };
  }
}

// 吸引/排斥
class Attractor extends ForceField {
  constructor(x, y, strength, radius) {
    super();
    this.x = x;
    this.y = y;
    this.strength = strength;  // 正值吸引，负值排斥
    this.radius = radius;
  }
  
  apply(particle) {
    const dx = this.x - particle.x;
    const dy = this.y - particle.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > this.radius || dist < 1) return { x: 0, y: 0 };
    
    const force = this.strength / (dist * dist);
    return {
      x: (dx / dist) * force,
      y: (dy / dist) * force
    };
  }
}

// 粒子系统
class ParticleSystem {
  constructor() {
    this.pool = new ParticlePool(1000);
    this.particles = [];
    this.emitters = [];
    this.forces = [];
  }
  
  addEmitter(emitter) {
    this.emitters.push(emitter);
  }
  
  addForce(force) {
    this.forces.push(force);
  }
  
  update(dt) {
    // 发射新粒子
    this.emitters.forEach(emitter => {
      const newParticles = emitter.emit(dt, this.pool);
      this.particles.push(...newParticles);
    });
    
    // 更新所有粒子
    this.particles.forEach(p => p.update(dt, this.forces));
    
    // 移除死亡粒子
    this.particles = this.particles.filter(p => p.isAlive);
  }
  
  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
  }
}

// 使用示例：火焰效果
const fireSystem = new ParticleSystem();
const emitter = new Emitter(400, 500);
emitter.rate = 50;
emitter.direction = -Math.PI / 2;
emitter.spreadAngle = Math.PI / 6;
emitter.speed = { min: 80, max: 150 };
emitter.life = { min: 300, max: 800 };

fireSystem.addEmitter(emitter);
fireSystem.addForce(new Wind(-5, -20));  // 轻微上升气流
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 粒子数量过多导致卡顿 | 使用对象池、限制最大粒子数 |
| 粒子效果不自然 | 调整参数、添加随机性 |
| 力场效果不明显 | 调整力场强度和作用范围 |
| 内存持续增长 | 正确回收死亡粒子 |

## 6. 风格指导

### 语气语调
- 从视觉效果出发
- 强调参数调整的艺术性

### 类比方向
- 粒子类比"微小的独立个体"
- 发射器类比"喷泉的喷头"
- 力场类比"看不见的影响力"

## 7. 与其他章节的关系

### 前置依赖
- 第25-27章：动画基础

### 后续章节铺垫
- 为高级视觉效果提供技术基础

## 8. 章节检查清单

- [ ] 目标明确：读者能实现完整粒子系统
- [ ] 术语统一：粒子、发射器、力场等术语定义清晰
- [ ] 最小实现：提供完整粒子系统代码
- [ ] 边界处理：说明性能优化策略
- [ ] 性能与权衡：详细讨论优化方法
- [ ] 图示与代码：架构图与代码对应
- [ ] 总结与练习：提供效果实现练习
