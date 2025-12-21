# requestAnimationFrame 性能优化

动画性能是用户体验的关键。本章深入探讨如何利用 requestAnimationFrame 实现流畅的动画。

## 为什么不用 setInterval

```javascript
// 传统方式
setInterval(() => {
  element.style.left = x++ + 'px';
}, 16);  // 约 60fps
```

问题：

- **不精确**：setInterval 的间隔不精确
- **掉帧**：即使页面不可见也在运行
- **卡顿**：可能在错误时机更新，导致丢帧

## requestAnimationFrame 的优势

```javascript
function animate() {
  element.style.left = x++ + 'px';
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

优势：

- **精确同步**：在浏览器下一次重绘前执行
- **自动节流**：页面隐藏时暂停
- **高精度时间**：提供精确的时间戳

## 时间戳的正确用法

```javascript
function animate(timestamp) {
  // timestamp 是高精度时间戳（毫秒）
  const elapsed = timestamp - startTime;
  const progress = elapsed / duration;
  
  // 基于时间计算位置，而不是帧数
  element.style.left = startValue + delta * progress + 'px';
  
  if (progress < 1) {
    requestAnimationFrame(animate);
  }
}

const startTime = performance.now();
requestAnimationFrame(animate);
```

为什么基于时间？

- 帧率可能变化（60fps/120fps/30fps）
- 跳帧时仍能正确计算位置
- 动画时长稳定

## 批量动画优化

多个动画应该合并到一个 RAF 循环：

```javascript
// 不好：每个元素一个 RAF
elements.forEach(elem => {
  requestAnimationFrame(() => animate(elem));
});

// 好：一个 RAF 处理所有元素
function animateAll(timestamp) {
  elements.forEach(elem => update(elem, timestamp));
  requestAnimationFrame(animateAll);
}
requestAnimationFrame(animateAll);
```

## 全局动画管理器

```javascript
// src/animation/animator.js

class Animator {
  constructor() {
    this.animations = new Set();
    this.running = false;
    this.rafId = null;
  }
  
  add(animation) {
    this.animations.add(animation);
    this.start();
  }
  
  remove(animation) {
    this.animations.delete(animation);
    if (this.animations.size === 0) {
      this.stop();
    }
  }
  
  start() {
    if (this.running) return;
    this.running = true;
    this.tick();
  }
  
  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
  
  tick = (timestamp) => {
    if (!this.running) return;
    
    // 更新所有动画
    for (const animation of this.animations) {
      const done = animation.update(timestamp);
      if (done) {
        this.animations.delete(animation);
      }
    }
    
    if (this.animations.size > 0) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.running = false;
    }
  };
}

// 全局单例
export const animator = new Animator();
```

## Animation 类

```javascript
class Animation {
  constructor(elem, props, options) {
    this.elem = elem;
    this.props = this.parseProps(props);
    this.duration = options.duration;
    this.easing = getEasing(options.easing);
    this.complete = options.complete;
    this.startTime = null;
  }
  
  parseProps(props) {
    const result = [];
    for (const prop in props) {
      result.push({
        prop,
        start: getCurrentValue(this.elem, prop),
        end: parseValue(props[prop]),
        unit: getUnit(prop)
      });
    }
    return result;
  }
  
  update(timestamp) {
    if (!this.startTime) {
      this.startTime = timestamp;
    }
    
    const elapsed = timestamp - this.startTime;
    let progress = elapsed / this.duration;
    
    if (progress >= 1) {
      progress = 1;
      this.applyValues(1);
      this.complete?.call(this.elem);
      return true;  // 动画完成
    }
    
    this.applyValues(this.easing(progress));
    return false;  // 继续
  }
  
  applyValues(progress) {
    for (const { prop, start, end, unit } of this.props) {
      const value = start + (end - start) * progress;
      this.elem.style[prop] = value + unit;
    }
  }
  
  stop(jumpToEnd) {
    if (jumpToEnd) {
      this.applyValues(1);
    }
    animator.remove(this);
  }
}
```

## 使用全局动画器

```javascript
jQuery.fn.animate = function(props, duration, easing, callback) {
  const options = normalizeOptions(duration, easing, callback);
  
  return this.queue('fx', function(next) {
    const animation = new Animation(this, props, {
      ...options,
      complete() {
        options.complete?.call(this);
        next();
      }
    });
    
    animator.add(animation);
  });
};
```

## 性能优化技巧

### 1. 使用 transform 代替位置属性

```javascript
// 不推荐：触发布局
element.style.left = x + 'px';
element.style.top = y + 'px';

// 推荐：只触发合成
element.style.transform = `translate(${x}px, ${y}px)`;
```

### 2. 使用 will-change

```javascript
// 动画开始前
element.style.willChange = 'transform, opacity';

// 动画结束后
element.style.willChange = 'auto';
```

### 3. 避免读写交错

```javascript
// 不好：读写交错导致强制同步布局
elements.forEach(elem => {
  const width = elem.offsetWidth;  // 读
  elem.style.width = width + 10 + 'px';  // 写
});

// 好：先读后写
const widths = elements.map(elem => elem.offsetWidth);  // 批量读
elements.forEach((elem, i) => {
  elem.style.width = widths[i] + 10 + 'px';  // 批量写
});
```

### 4. 减少 DOM 操作

```javascript
// 不好：多次操作
elem.style.left = '100px';
elem.style.top = '100px';
elem.style.width = '200px';

// 好：一次性设置
elem.style.cssText += '; left: 100px; top: 100px; width: 200px';

// 更好：使用 class
elem.classList.add('animated-state');
```

## 完整优化实现

```javascript
// src/animation/optimized-animator.js

const animator = {
  animations: new Map(),  // elem -> Set<Animation>
  running: false,
  rafId: null,
  
  add(elem, animation) {
    if (!this.animations.has(elem)) {
      this.animations.set(elem, new Set());
    }
    this.animations.get(elem).add(animation);
    this.start();
  },
  
  remove(elem, animation) {
    const anims = this.animations.get(elem);
    if (anims) {
      anims.delete(animation);
      if (anims.size === 0) {
        this.animations.delete(elem);
      }
    }
    if (this.animations.size === 0) {
      this.stop();
    }
  },
  
  stopAll(elem) {
    const anims = this.animations.get(elem);
    if (anims) {
      anims.clear();
      this.animations.delete(elem);
    }
  },
  
  start() {
    if (this.running) return;
    this.running = true;
    this.rafId = requestAnimationFrame(this.tick);
  },
  
  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  },
  
  tick: function(timestamp) {
    if (!animator.running) return;
    
    // 收集需要删除的动画
    const toRemove = [];
    
    // 更新所有动画
    for (const [elem, anims] of animator.animations) {
      for (const anim of anims) {
        if (anim.update(timestamp)) {
          toRemove.push({ elem, anim });
        }
      }
    }
    
    // 批量删除完成的动画
    for (const { elem, anim } of toRemove) {
      animator.remove(elem, anim);
    }
    
    // 继续循环
    if (animator.animations.size > 0) {
      animator.rafId = requestAnimationFrame(animator.tick);
    } else {
      animator.running = false;
    }
  }
};

export { animator };
```

## 帧率监控

```javascript
class FPSMonitor {
  constructor() {
    this.frames = [];
    this.lastTime = performance.now();
  }
  
  tick() {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    
    this.frames.push(delta);
    if (this.frames.length > 60) {
      this.frames.shift();
    }
  }
  
  getFPS() {
    if (this.frames.length === 0) return 0;
    const avg = this.frames.reduce((a, b) => a + b) / this.frames.length;
    return Math.round(1000 / avg);
  }
}
```

## 低性能设备适配

```javascript
function getAnimationDuration(baseDuration) {
  // 检测低性能设备
  if (navigator.hardwareConcurrency <= 2) {
    return baseDuration * 0.5;  // 缩短动画
  }
  
  // 用户偏好减少动态效果
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 0;  // 禁用动画
  }
  
  return baseDuration;
}
```

## 可见性处理

```javascript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    animator.pause();
  } else {
    animator.resume();
  }
});
```

## 本章小结

性能优化要点：

- **使用 requestAnimationFrame**：精确同步浏览器刷新
- **基于时间计算**：而非帧数
- **批量处理**：一个 RAF 循环处理所有动画
- **全局管理器**：避免多个独立循环
- **使用 transform/opacity**：触发 GPU 加速
- **避免读写交错**：防止强制同步布局
- **尊重用户偏好**：prefers-reduced-motion

动画性能的关键是减少主线程工作，让 GPU 处理渲染。

---

**思考题**：如何实现动画的"时间缩放"功能？比如让所有动画以 0.5x 速度播放（调试用），或 2x 速度（跳过长动画）？
