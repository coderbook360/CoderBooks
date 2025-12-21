# stop 与 finish：动画控制

动画执行过程中，有时需要中途停止或快速完成。stop() 和 finish() 就是为此设计的。

## stop 方法

停止当前动画，可选择是否清除队列、是否跳到终点：

```javascript
$('.box').stop();              // 停止当前动画
$('.box').stop(true);          // 停止并清除队列
$('.box').stop(true, true);    // 停止、清队列、跳到终点
```

## finish 方法

停止所有动画并跳到最终状态：

```javascript
$('.box').finish();  // 所有队列动画立即完成
```

## stop 的三种模式

### 模式 1：stop()

停止当前动画，元素保持在当前位置，队列中的下一个动画开始。

```javascript
$('.box')
  .animate({ left: 200 }, 2000)
  .animate({ top: 200 }, 2000);

// 1秒后调用 stop()
// left 停在 100 附近，top 动画立即开始
```

### 模式 2：stop(true)

停止当前动画，清除队列，后续动画不执行。

```javascript
$('.box')
  .animate({ left: 200 }, 2000)
  .animate({ top: 200 }, 2000);

// 1秒后调用 stop(true)
// left 停在 100 附近，top 动画不执行
```

### 模式 3：stop(true, true)

停止当前动画，清除队列，跳到当前动画的终点。

```javascript
$('.box')
  .animate({ left: 200 }, 2000)
  .animate({ top: 200 }, 2000);

// 1秒后调用 stop(true, true)
// left 立即跳到 200，top 动画不执行
```

## 动画状态存储

要实现 stop()，需要跟踪当前运行的动画：

```javascript
const runningAnimations = new WeakMap();

function setRunningAnimation(elem, animation) {
  runningAnimations.set(elem, animation);
}

function getRunningAnimation(elem) {
  return runningAnimations.get(elem);
}

function clearRunningAnimation(elem) {
  runningAnimations.delete(elem);
}
```

## 修改动画执行器

```javascript
function runAnimation(elem, animations, options) {
  const startTime = performance.now();
  const duration = options.duration;
  const easingFn = getEasing(options.easing);
  
  let rafId = null;
  let stopped = false;
  
  // 动画控制对象
  const controller = {
    stop(jumpToEnd) {
      stopped = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (jumpToEnd) {
        // 跳到终点
        for (const anim of animations) {
          elem.style[anim.prop] = anim.end + anim.unit;
        }
      }
      clearRunningAnimation(elem);
    },
    
    finish() {
      // 跳到终点并触发完成回调
      this.stop(true);
      options.complete?.call(elem);
    },
    
    animations  // 保存动画数据，finish 可能需要
  };
  
  // 保存控制器
  setRunningAnimation(elem, controller);
  
  function tick(currentTime) {
    if (stopped) return;
    
    const elapsed = currentTime - startTime;
    let progress = elapsed / duration;
    
    if (progress >= 1) {
      progress = 1;
      for (const anim of animations) {
        elem.style[anim.prop] = anim.end + anim.unit;
      }
      clearRunningAnimation(elem);
      options.complete?.call(elem);
      return;
    }
    
    const easedProgress = easingFn(progress);
    
    for (const anim of animations) {
      const value = anim.start + (anim.end - anim.start) * easedProgress;
      elem.style[anim.prop] = value + anim.unit;
    }
    
    rafId = requestAnimationFrame(tick);
  }
  
  rafId = requestAnimationFrame(tick);
  
  return controller;
}
```

## stop 实现

```javascript
jQuery.fn.stop = function(clearQueue = false, jumpToEnd = false) {
  return this.each(function() {
    const elem = this;
    
    // 停止当前动画
    const controller = getRunningAnimation(elem);
    if (controller) {
      controller.stop(jumpToEnd);
    }
    
    // 清除队列
    if (clearQueue) {
      $(elem).clearQueue();
    } else {
      // 触发队列中的下一个
      $(elem).dequeue();
    }
  });
};
```

## finish 实现

```javascript
jQuery.fn.finish = function(type = 'fx') {
  return this.each(function() {
    const elem = this;
    const $elem = $(elem);
    
    // 获取队列
    const queue = $elem.queue(type);
    
    // 清除队列
    $elem.clearQueue(type);
    
    // 停止当前动画并跳到终点
    const controller = getRunningAnimation(elem);
    if (controller) {
      controller.finish();
    }
    
    // 执行队列中所有动画的终点状态
    for (const fn of queue) {
      if (typeof fn === 'function') {
        // 创建一个立即完成的动画
        // 实际实现中需要更复杂的逻辑来获取终点值
      }
    }
  });
};
```

## 完整实现

```javascript
// src/animation/stop-finish.js

const runningAnimations = new WeakMap();

export function installStopMethods(jQuery) {
  
  jQuery.fn.stop = function(clearQueue = false, jumpToEnd = false) {
    return this.each(function() {
      const elem = this;
      const $elem = $(elem);
      
      // 停止当前动画
      const controller = runningAnimations.get(elem);
      if (controller) {
        controller.stop(jumpToEnd);
        runningAnimations.delete(elem);
      }
      
      // 清除或继续队列
      if (clearQueue) {
        $elem.clearQueue('fx');
      } else {
        $elem.dequeue('fx');
      }
    });
  };
  
  jQuery.fn.finish = function(type = 'fx') {
    return this.each(function() {
      const elem = this;
      const $elem = $(elem);
      
      // 获取队列副本
      const queue = [...$elem.queue(type)];
      
      // 清除队列
      $elem.clearQueue(type);
      
      // 完成当前动画
      const controller = runningAnimations.get(elem);
      if (controller) {
        // 跳到终点
        for (const anim of controller.animations) {
          elem.style[anim.prop] = anim.end + anim.unit;
        }
        runningAnimations.delete(elem);
      }
      
      // 执行队列中所有待执行的动画到终点
      for (const fn of queue) {
        if (typeof fn === 'function' && fn !== 'inProgress') {
          // 用 duration: 0 立即完成
          // 这里简化处理，实际 jQuery 更复杂
        }
      }
    });
  };
  
  // 暴露给 animate 使用
  jQuery._setRunningAnimation = function(elem, controller) {
    runningAnimations.set(elem, controller);
  };
  
  jQuery._clearRunningAnimation = function(elem) {
    runningAnimations.delete(elem);
  };
}
```

## 修改 animate 集成

```javascript
function runAnimation(elem, animations, options) {
  const startTime = performance.now();
  const duration = options.duration;
  let rafId = null;
  let stopped = false;
  
  const controller = {
    stop(jumpToEnd) {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (jumpToEnd) {
        for (const anim of animations) {
          elem.style[anim.prop] = anim.end + anim.unit;
        }
      }
    },
    animations
  };
  
  // 注册到全局
  jQuery._setRunningAnimation(elem, controller);
  
  function tick(currentTime) {
    if (stopped) return;
    
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const eased = getEasing(options.easing)(progress);
    
    for (const anim of animations) {
      const value = anim.start + (anim.end - anim.start) * eased;
      elem.style[anim.prop] = value + anim.unit;
    }
    
    if (progress < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      jQuery._clearRunningAnimation(elem);
      options.complete?.call(elem);
    }
  }
  
  rafId = requestAnimationFrame(tick);
}
```

## 使用示例

### 防止动画堆积

```javascript
$('.menu').hover(
  function() {
    $(this).stop().animate({ height: 300 }, 300);
  },
  function() {
    $(this).stop().animate({ height: 50 }, 300);
  }
);
```

如果不用 `stop()`，快速移入移出会导致动画堆积。

### 取消动画

```javascript
$('.cancel-btn').on('click', function() {
  $('.animated').stop(true);  // 停止并清除队列
});
```

### 跳过动画

```javascript
$('.skip-btn').on('click', function() {
  $('.animated').finish();  // 直接到最终状态
});
```

### 平滑切换

```javascript
function showPanel(id) {
  // 停止所有面板动画
  $('.panel').stop(true);
  
  // 隐藏当前面板
  $('.panel.active').removeClass('active').fadeOut(200);
  
  // 显示目标面板
  $(`#${id}`).addClass('active').fadeIn(200);
}
```

## stop 与 finish 对比

| 特性 | stop() | stop(true) | stop(true, true) | finish() |
|------|--------|------------|------------------|----------|
| 停止当前动画 | ✓ | ✓ | ✓ | ✓ |
| 清除队列 | ✗ | ✓ | ✓ | ✓ |
| 跳到当前动画终点 | ✗ | ✗ | ✓ | ✓ |
| 执行队列所有终点 | ✗ | ✗ | ✗ | ✓ |

## 实际应用场景

### 场景 1：选项卡切换

```javascript
$('.tab').on('click', function() {
  const target = $(this).data('target');
  
  // 停止之前的动画，立即切换
  $('.content').stop(true, true).hide();
  $(target).stop(true, true).fadeIn(300);
});
```

### 场景 2：可中断的长动画

```javascript
function startLongAnimation() {
  $('.progress-bar')
    .css('width', 0)
    .animate({ width: '100%' }, 10000, function() {
      console.log('完成！');
    });
}

$('.abort-btn').on('click', function() {
  $('.progress-bar').stop(true);
  console.log('已取消');
});

$('.skip-btn').on('click', function() {
  $('.progress-bar').stop(true, true);
  console.log('已跳过');
});
```

### 场景 3：响应式动画

```javascript
// 窗口大小改变时重新计算动画
$(window).on('resize', function() {
  // 停止当前动画
  $('.responsive-elem').stop(true);
  
  // 重新计算并动画到新位置
  const newPos = calculatePosition();
  $('.responsive-elem').animate(newPos, 300);
});
```

## 本章小结

动画控制方法：

- **stop()**：停止当前动画，继续队列
- **stop(true)**：停止并清除队列
- **stop(true, true)**：停止、清队列、跳到终点
- **finish()**：停止所有动画并跳到最终状态

实现要点：

- WeakMap 存储动画控制器
- cancelAnimationFrame 停止动画
- 通过 controller 对象控制动画状态
- 与队列系统配合工作

下一章，我们研究 requestAnimationFrame 性能优化。

---

**思考题**：如果页面上有 100 个元素同时动画，调用 `$('.all').stop()` 时性能如何？有什么优化方案？
