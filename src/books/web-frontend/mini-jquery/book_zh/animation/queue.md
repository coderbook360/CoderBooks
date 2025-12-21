# 动画队列：让动画有序执行

当多个动画作用于同一元素时，如何保证它们按顺序执行？动画队列是解决方案。

## 问题场景

```javascript
// 这两个动画会怎样执行？
$('.box').animate({ left: 100 }, 500);
$('.box').animate({ top: 100 }, 500);
```

没有队列：两个动画同时执行，混乱。
有队列：先执行 left 动画，完成后执行 top 动画。

## 队列的本质

队列就是一个数组，存储待执行的函数：

```javascript
const queue = [
  function() { /* 动画1 */ },
  function() { /* 动画2 */ },
  function() { /* 动画3 */ }
];
```

执行时依次取出并运行，每个完成后触发下一个。

## 队列存储

使用 WeakMap 为每个元素存储队列：

```javascript
const queues = new WeakMap();

function getQueue(elem, type = 'fx') {
  if (!queues.has(elem)) {
    queues.set(elem, {});
  }
  const elemQueues = queues.get(elem);
  if (!elemQueues[type]) {
    elemQueues[type] = [];
  }
  return elemQueues[type];
}
```

## queue 方法

```javascript
jQuery.fn.queue = function(type, callback) {
  // 只传一个参数时，type 默认为 'fx'
  if (typeof type === 'function') {
    callback = type;
    type = 'fx';
  }
  
  // 不传 callback，返回队列
  if (callback === undefined) {
    return getQueue(this[0], type);
  }
  
  return this.each(function() {
    const queue = getQueue(this, type);
    queue.push(callback);
    
    // 如果队列只有这一个，立即执行
    if (queue.length === 1) {
      dequeue(this, type);
    }
  });
};
```

## dequeue 方法

```javascript
function dequeue(elem, type = 'fx') {
  const queue = getQueue(elem, type);
  
  // 取出第一个
  const fn = queue.shift();
  
  if (fn) {
    // next 函数用于触发下一个
    const next = () => dequeue(elem, type);
    fn.call(elem, next);
  }
}

jQuery.fn.dequeue = function(type = 'fx') {
  return this.each(function() {
    dequeue(this, type);
  });
};
```

## 在 animate 中使用队列

```javascript
jQuery.fn.animate = function(properties, duration, easing, callback) {
  const options = normalizeOptions(duration, easing, callback);
  
  return this.queue('fx', function(next) {
    // 这里 this 是 DOM 元素
    runAnimation(this, properties, {
      ...options,
      complete() {
        options.complete?.call(this);
        next();  // 触发队列中的下一个
      }
    });
  });
};
```

## clearQueue 方法

```javascript
jQuery.fn.clearQueue = function(type = 'fx') {
  return this.each(function() {
    const queue = getQueue(this, type);
    queue.length = 0;  // 清空队列
  });
};
```

## delay 方法

在队列中插入延时：

```javascript
jQuery.fn.delay = function(time, type = 'fx') {
  return this.queue(type, function(next) {
    setTimeout(next, time);
  });
};
```

使用：

```javascript
$('.box')
  .animate({ left: 100 }, 500)
  .delay(1000)                   // 暂停 1 秒
  .animate({ left: 0 }, 500);
```

## 完整实现

```javascript
// src/animation/queue.js

// 队列存储
const queues = new WeakMap();

function getQueue(elem, type) {
  if (!queues.has(elem)) {
    queues.set(elem, {});
  }
  const elemQueues = queues.get(elem);
  if (!elemQueues[type]) {
    elemQueues[type] = [];
  }
  return elemQueues[type];
}

function dequeue(elem, type) {
  const queue = getQueue(elem, type);
  const fn = queue.shift();
  
  if (fn) {
    // inProgress 标记防止重复执行
    if (fn !== 'inProgress') {
      queue.unshift('inProgress');
      fn.call(elem, function next() {
        queue.shift();  // 移除 inProgress
        dequeue(elem, type);
      });
    }
  }
}

export function installQueueMethods(jQuery) {
  
  // 获取或添加队列
  jQuery.fn.queue = function(type, data) {
    if (typeof type !== 'string') {
      data = type;
      type = 'fx';
    }
    
    // 获取队列
    if (data === undefined) {
      return getQueue(this[0], type);
    }
    
    // 添加到队列
    return this.each(function() {
      const queue = getQueue(this, type);
      
      if (Array.isArray(data)) {
        // 替换整个队列
        queue.length = 0;
        queue.push(...data);
      } else {
        queue.push(data);
      }
      
      // 队列为空时立即执行
      if (queue[0] !== 'inProgress') {
        dequeue(this, type);
      }
    });
  };
  
  // 执行队列中的下一个
  jQuery.fn.dequeue = function(type = 'fx') {
    return this.each(function() {
      dequeue(this, type);
    });
  };
  
  // 清空队列
  jQuery.fn.clearQueue = function(type = 'fx') {
    return this.each(function() {
      const queue = getQueue(this, type);
      queue.length = 0;
    });
  };
  
  // 延时
  jQuery.fn.delay = function(time, type = 'fx') {
    time = typeof time === 'string' 
      ? (jQuery.fx.speeds[time] || 400) 
      : time;
    
    return this.queue(type, function(next) {
      setTimeout(next, time);
    });
  };
  
  // 动画速度预设
  jQuery.fx = {
    speeds: {
      slow: 600,
      fast: 200,
      _default: 400
    }
  };
}
```

## animate 集成队列

```javascript
// 修改 animate 方法
jQuery.fn.animate = function(props, duration, easing, callback) {
  const options = normalizeOptions(duration, easing, callback);
  const queue = options.queue !== false;  // 默认使用队列
  
  return this.each(function() {
    const elem = this;
    
    function doAnimation(next) {
      runAnimation(elem, props, {
        ...options,
        complete() {
          options.complete?.call(elem);
          if (typeof next === 'function') {
            next();
          }
        }
      });
    }
    
    if (queue) {
      $(elem).queue('fx', doAnimation);
    } else {
      // 不使用队列，立即执行
      doAnimation();
    }
  });
};
```

## 禁用队列

```javascript
// queue: false 表示立即执行，不排队
$('.box').animate({ left: 100 }, { duration: 500, queue: false });
$('.box').animate({ top: 100 }, { duration: 500, queue: false });
// 两个动画同时执行
```

## 使用示例

### 链式动画

```javascript
$('.box')
  .animate({ left: 100 }, 500)
  .animate({ top: 100 }, 500)
  .animate({ left: 0 }, 500)
  .animate({ top: 0 }, 500);
// 依次执行：右→下→左→上
```

### 带延时的动画

```javascript
$('.box')
  .fadeIn(300)
  .delay(1000)
  .fadeOut(300);
// 淡入 → 等 1 秒 → 淡出
```

### 查看队列

```javascript
$('.box').animate({ left: 100 }, 500);
$('.box').animate({ top: 100 }, 500);

console.log($('.box').queue());  // 查看当前队列
// [inProgress, function, function]
```

### 清空队列

```javascript
$('.box')
  .animate({ left: 100 }, 500)
  .animate({ top: 100 }, 500)
  .animate({ left: 0 }, 500);

// 点击时清空后续动画
$('.stop-btn').on('click', function() {
  $('.box').clearQueue();
});
```

### 自定义队列

```javascript
// 使用自定义队列名
$('.box')
  .queue('myQueue', function(next) {
    console.log('Step 1');
    setTimeout(next, 1000);
  })
  .queue('myQueue', function(next) {
    console.log('Step 2');
    next();
  })
  .dequeue('myQueue');  // 手动启动自定义队列
```

## 实际应用场景

### 场景 1：复杂动画序列

```javascript
function animateCard($card) {
  $card
    .css({ opacity: 0, scale: 0.8 })
    .animate({ opacity: 1 }, 200)
    .animate({ scale: 1 }, 300)
    .delay(2000)
    .animate({ opacity: 0 }, 200)
    .queue(function(next) {
      $(this).remove();
      next();
    });
}
```

### 场景 2：逐个动画元素

```javascript
function animateList($items) {
  $items.each(function(index) {
    $(this)
      .delay(index * 100)
      .animate({ opacity: 1, left: 0 }, 300);
  });
}
```

### 场景 3：动画完成后执行操作

```javascript
$('.modal')
  .fadeIn(300)
  .queue(function(next) {
    // 动画完成后绑定事件
    $(this).find('.close').on('click', closeModal);
    next();
  });
```

## inProgress 标记的作用

```javascript
// 队列状态
['inProgress', fn1, fn2, fn3]
//  ↑ 正在执行      ↑ 待执行
```

`inProgress` 防止在动画执行期间重复调用 `dequeue`：

```javascript
if (fn !== 'inProgress') {
  queue.unshift('inProgress');  // 标记开始
  fn.call(elem, function next() {
    queue.shift();              // 移除标记
    dequeue(elem, type);        // 执行下一个
  });
}
```

## 本章小结

队列方法：

- **queue()**：获取或添加队列
- **dequeue()**：执行下一个
- **clearQueue()**：清空队列
- **delay()**：插入延时

实现要点：

- WeakMap 存储每个元素的队列
- `inProgress` 防止重复执行
- `next` 回调触发下一个
- animate 默认使用 `fx` 队列

下一章，我们实现 stop() 和 finish() 方法。

---

**思考题**：如果动画队列中有 10 个动画，用户点击"跳过"按钮想直接看到最终状态，应该如何实现？
