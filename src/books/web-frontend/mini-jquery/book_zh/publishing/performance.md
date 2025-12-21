# 性能优化

mini-jQuery 虽然轻量，但仍有优化空间。本章讨论常见的性能优化策略。

## 性能度量

优化前先度量：

```javascript
// 简单计时
console.time('selector');
for (let i = 0; i < 10000; i++) {
  $('.item');
}
console.timeEnd('selector');

// Performance API
const start = performance.now();
// ... 操作
const end = performance.now();
console.log(`耗时: ${end - start}ms`);
```

## 选择器优化

### 缓存选择结果

```javascript
// 差：重复查询
function update() {
  $('.list').addClass('active');
  $('.list').css('color', 'red');
  $('.list').html('Updated');
}

// 好：缓存结果
function update() {
  const $list = $('.list');
  $list.addClass('active');
  $list.css('color', 'red');
  $list.html('Updated');
}
```

### 缩小查询范围

```javascript
// 差：全局查询
$('.item');

// 好：限定范围
$('#container').find('.item');
// 或
$('.item', '#container');
```

### 优化选择器实现

```javascript
// 优化前：每次都创建正则
function matchesSelector(elem, selector) {
  if (selector.match(/^#[\w-]+$/)) {
    // ...
  }
}

// 优化后：预编译正则
const ID_SELECTOR = /^#[\w-]+$/;
const CLASS_SELECTOR = /^\.[\w-]+$/;
const TAG_SELECTOR = /^[\w-]+$/;

function matchesSelector(elem, selector) {
  if (ID_SELECTOR.test(selector)) {
    return elem.id === selector.slice(1);
  }
  // ...
}
```

## DOM 操作优化

### 批量操作

```javascript
// 差：多次 DOM 操作
items.forEach(item => {
  $('<li>').text(item).appendTo('.list');
});

// 好：一次性插入
const fragment = document.createDocumentFragment();
items.forEach(item => {
  const li = document.createElement('li');
  li.textContent = item;
  fragment.appendChild(li);
});
$('.list').append(fragment);
```

### 使用 DocumentFragment

```javascript
$.fn.appendMultiple = function(items) {
  return this.each(function() {
    const fragment = document.createDocumentFragment();
    
    items.forEach(item => {
      if (typeof item === 'string') {
        const temp = document.createElement('div');
        temp.innerHTML = item;
        while (temp.firstChild) {
          fragment.appendChild(temp.firstChild);
        }
      } else {
        fragment.appendChild(item);
      }
    });
    
    this.appendChild(fragment);
  });
};
```

### 离线 DOM 操作

```javascript
// 复杂操作先移除，操作完再插入
$.fn.detachOperate = function(fn) {
  return this.each(function() {
    const parent = this.parentNode;
    const next = this.nextSibling;
    
    // 移除
    parent.removeChild(this);
    
    // 操作（不会触发重排）
    fn.call(this);
    
    // 插入回去
    if (next) {
      parent.insertBefore(this, next);
    } else {
      parent.appendChild(this);
    }
  });
};
```

## 事件优化

### 事件委托

```javascript
// 差：每个元素绑定事件
$('.item').each(function() {
  $(this).on('click', handler);
});

// 好：委托到父元素
$('.list').on('click', '.item', handler);
```

### 防抖和节流

```javascript
// 防抖
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 节流
function throttle(fn, delay) {
  let last = 0;
  return function(...args) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    }
  };
}

// 使用
$(window).on('scroll', throttle(handleScroll, 100));
$(input).on('input', debounce(search, 300));
```

### 添加到 jQuery

```javascript
$.debounce = function(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

$.throttle = function(fn, delay) {
  let last = 0;
  return function(...args) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    }
  };
};
```

## 内存优化

### 避免内存泄漏

```javascript
// 问题：移除元素但事件还在
$('#btn').on('click', handler);
$('#btn').remove();  // handler 可能还被引用

// 解决：使用 off 或让 remove 自动清理
$.fn.remove = function() {
  return this.each(function() {
    // 清理事件
    $(this).off();
    
    // 清理数据
    $(this).removeData();
    
    // 移除 DOM
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  });
};
```

### 使用 WeakMap

```javascript
// 用 WeakMap 存储元素数据，元素移除时自动回收
const dataStore = new WeakMap();

function data(elem, key, value) {
  let elemData = dataStore.get(elem);
  
  if (value === undefined) {
    return elemData?.[key];
  }
  
  if (!elemData) {
    elemData = {};
    dataStore.set(elem, elemData);
  }
  
  elemData[key] = value;
}
```

### 及时解绑

```javascript
// 组件销毁时清理
class Component {
  constructor($el) {
    this.$el = $el;
    this.bindEvents();
  }
  
  bindEvents() {
    this.$el.on('click.myComponent', this.handleClick.bind(this));
  }
  
  destroy() {
    this.$el.off('.myComponent');
    this.$el.removeData('component');
  }
}
```

## 动画优化

### 使用 requestAnimationFrame

```javascript
// 差：setTimeout
function animate() {
  elem.style.left = x + 'px';
  setTimeout(animate, 16);
}

// 好：requestAnimationFrame
function animate() {
  elem.style.left = x + 'px';
  requestAnimationFrame(animate);
}
```

### 使用 CSS transform

```javascript
// 差：改变 left/top 触发重排
$.fn.moveTo = function(x, y) {
  return this.css({ left: x, top: y });
};

// 好：使用 transform 只触发合成
$.fn.moveTo = function(x, y) {
  return this.css('transform', `translate(${x}px, ${y}px)`);
};
```

### 使用 will-change

```javascript
// 提前告知浏览器要动画的属性
$.fn.prepareAnimation = function() {
  return this.css('will-change', 'transform, opacity');
};

$.fn.cleanupAnimation = function() {
  return this.css('will-change', 'auto');
};
```

## 链式调用优化

### 减少中间对象

```javascript
// 每次调用都创建新 jQuery 对象
$('.item')
  .filter('.active')
  .find('span')
  .addClass('highlight');

// 可以在需要时减少创建
$.fn.addClassToChildren = function(selector, className) {
  return this.each(function() {
    const children = this.querySelectorAll(selector);
    children.forEach(child => child.classList.add(className));
  });
};

$('.item.active').addClassToChildren('span', 'highlight');
```

## 延迟加载

### 懒初始化

```javascript
let _complexFeature = null;

$.fn.complexFeature = function() {
  if (!_complexFeature) {
    // 第一次使用时才初始化
    _complexFeature = initComplexFeature();
  }
  
  return _complexFeature(this);
};
```

### 按需加载模块

```javascript
// 动态导入
$.fn.datepicker = async function(options) {
  const { Datepicker } = await import('./plugins/datepicker.js');
  
  return this.each(function() {
    new Datepicker(this, options);
  });
};
```

## 性能检测工具

```javascript
// 简单性能统计
$.fn.profile = function(name, fn) {
  const start = performance.now();
  const result = fn.call(this);
  const end = performance.now();
  
  console.log(`${name}: ${(end - start).toFixed(2)}ms`);
  
  return result;
};

// 使用
$('.items').profile('addClass', function() {
  return this.addClass('active');
});
```

## 完整优化示例

```javascript
// src/performance.js

export function installPerformanceUtils(jQuery) {
  
  // 防抖
  jQuery.debounce = function(fn, delay, immediate = false) {
    let timer = null;
    let result;
    
    return function(...args) {
      const callNow = immediate && !timer;
      
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (!immediate) {
          result = fn.apply(this, args);
        }
      }, delay);
      
      if (callNow) {
        result = fn.apply(this, args);
      }
      
      return result;
    };
  };
  
  // 节流
  jQuery.throttle = function(fn, delay, options = {}) {
    let last = 0;
    let timer = null;
    const { leading = true, trailing = true } = options;
    
    return function(...args) {
      const now = Date.now();
      
      if (!last && !leading) {
        last = now;
      }
      
      const remaining = delay - (now - last);
      
      if (remaining <= 0 || remaining > delay) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        last = now;
        fn.apply(this, args);
      } else if (!timer && trailing) {
        timer = setTimeout(() => {
          last = leading ? Date.now() : 0;
          timer = null;
          fn.apply(this, args);
        }, remaining);
      }
    };
  };
  
  // 批量 DOM 操作
  jQuery.fn.batchAppend = function(items, createFn) {
    return this.each(function() {
      const fragment = document.createDocumentFragment();
      
      items.forEach((item, index) => {
        const elem = createFn(item, index);
        if (elem) {
          fragment.appendChild(elem);
        }
      });
      
      this.appendChild(fragment);
    });
  };
  
  // 性能计时
  jQuery.fn.time = function(label, fn) {
    console.time(label);
    const result = fn.call(this);
    console.timeEnd(label);
    return result;
  };
}
```

## 本章小结

性能优化策略：

| 类别 | 优化方法 |
|------|---------|
| 选择器 | 缓存结果、缩小范围、预编译正则 |
| DOM | 批量操作、DocumentFragment、离线操作 |
| 事件 | 事件委托、防抖节流 |
| 内存 | WeakMap、及时解绑、remove 时清理 |
| 动画 | RAF、transform、will-change |

关键原则：

- **先度量再优化**：不要过早优化
- **减少重排重绘**：批量 DOM 操作
- **复用资源**：缓存选择结果和正则
- **及时清理**：避免内存泄漏

下一章，我们讨论打包发布。

---

**思考题**：如何设计一个自动检测并警告性能问题的开发模式？
