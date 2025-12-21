# Callbacks 回调队列

$.Callbacks() 是 jQuery 内部的回调管理工具，理解它有助于理解 Deferred 的实现原理。

## 什么是 Callbacks

Callbacks 是一个回调函数列表管理器：

```javascript
const callbacks = $.Callbacks();

// 添加回调
callbacks.add(fn1);
callbacks.add(fn2);

// 触发所有回调
callbacks.fire('参数');

// 移除回调
callbacks.remove(fn1);
```

## 为什么需要它

考虑事件系统：

```javascript
// 不用 Callbacks
const listeners = [];

function on(fn) {
  listeners.push(fn);
}

function trigger(data) {
  listeners.forEach(fn => fn(data));
}

// 问题：需要重复实现移除、只执行一次等逻辑
```

Callbacks 封装了这些通用逻辑。

## 基础用法

```javascript
const callbacks = $.Callbacks();

function log(msg) {
  console.log('Log:', msg);
}

function alert(msg) {
  console.log('Alert:', msg);
}

callbacks.add(log);
callbacks.add(alert);

callbacks.fire('Hello');
// Log: Hello
// Alert: Hello

callbacks.remove(log);
callbacks.fire('World');
// Alert: World
```

## Callbacks 标志

创建时可以传入标志字符串：

```javascript
$.Callbacks('once memory unique stopOnFalse');
```

### once - 只能 fire 一次

```javascript
const callbacks = $.Callbacks('once');

callbacks.add(fn);
callbacks.fire('first');   // fn 执行
callbacks.fire('second');  // 忽略
```

### memory - 记住上次的值

```javascript
const callbacks = $.Callbacks('memory');

callbacks.add(fn1);
callbacks.fire('hello');  // fn1('hello')

// 之后添加的回调会立即执行
callbacks.add(fn2);       // fn2('hello') 立即执行
```

### unique - 防止重复添加

```javascript
const callbacks = $.Callbacks('unique');

callbacks.add(fn);
callbacks.add(fn);  // 忽略重复

callbacks.fire('test');  // fn 只执行一次
```

### stopOnFalse - 回调返回 false 时停止

```javascript
const callbacks = $.Callbacks('stopOnFalse');

callbacks.add(() => { console.log(1); return true; });
callbacks.add(() => { console.log(2); return false; });
callbacks.add(() => { console.log(3); });  // 不会执行

callbacks.fire();  // 输出 1, 2
```

## 实现 Callbacks

```javascript
function Callbacks(options) {
  // 解析选项
  const opts = {};
  if (typeof options === 'string') {
    options.split(/\s+/).forEach(flag => {
      opts[flag] = true;
    });
  }
  
  let list = [];      // 回调列表
  let fired = false;  // 是否已触发
  let memory;         // 记住的值
  let firing = false; // 正在触发中
  
  const callbacks = {
    add(...fns) {
      fns.forEach(fn => {
        if (typeof fn !== 'function') return;
        
        // unique: 检查重复
        if (opts.unique && list.includes(fn)) {
          return;
        }
        
        list.push(fn);
        
        // memory: 立即执行新添加的回调
        if (opts.memory && fired) {
          fn.apply(null, memory);
        }
      });
      
      return this;
    },
    
    remove(...fns) {
      fns.forEach(fn => {
        const index = list.indexOf(fn);
        if (index > -1) {
          list.splice(index, 1);
        }
      });
      
      return this;
    },
    
    has(fn) {
      return fn ? list.includes(fn) : list.length > 0;
    },
    
    empty() {
      list = [];
      return this;
    },
    
    disable() {
      list = undefined;
      return this;
    },
    
    disabled() {
      return !list;
    },
    
    fire(...args) {
      if (!list) return this;
      
      // once: 只触发一次
      if (opts.once && fired) {
        return this;
      }
      
      fired = true;
      memory = args;
      firing = true;
      
      for (let i = 0; i < list.length; i++) {
        const result = list[i].apply(null, args);
        
        // stopOnFalse
        if (opts.stopOnFalse && result === false) {
          break;
        }
      }
      
      firing = false;
      
      return this;
    },
    
    fireWith(context, args) {
      if (!list) return this;
      if (opts.once && fired) return this;
      
      fired = true;
      memory = args;
      firing = true;
      
      for (let i = 0; i < list.length; i++) {
        const result = list[i].apply(context, args);
        if (opts.stopOnFalse && result === false) {
          break;
        }
      }
      
      firing = false;
      return this;
    },
    
    fired() {
      return !!fired;
    }
  };
  
  return callbacks;
}
```

## 完整实现

```javascript
// src/advanced/callbacks.js

export function installCallbacks(jQuery) {
  
  jQuery.Callbacks = function(options) {
    const opts = parseOptions(options);
    
    let list = [];
    let queue = [];
    let fired = false;
    let memory;
    let firing = false;
    let firingIndex = -1;
    
    function parseOptions(str) {
      const opts = {};
      if (typeof str === 'string') {
        str.split(/\s+/).forEach(flag => {
          if (flag) opts[flag] = true;
        });
      }
      return opts;
    }
    
    function fire(data) {
      memory = opts.memory && data;
      fired = true;
      firingIndex = 0;
      firing = true;
      
      for (; firingIndex < list.length; firingIndex++) {
        if (list[firingIndex].apply(data[0], data[1]) === false && opts.stopOnFalse) {
          memory = false;
          break;
        }
      }
      
      firing = false;
      
      // 处理队列中的调用
      if (queue.length) {
        fire(queue.shift());
      }
    }
    
    const callbacks = {
      add(...fns) {
        if (!list) return this;
        
        const start = list.length;
        
        fns.forEach(fn => {
          if (typeof fn === 'function') {
            if (!opts.unique || !list.includes(fn)) {
              list.push(fn);
            }
          } else if (Array.isArray(fn)) {
            this.add(...fn);
          }
        });
        
        // memory 模式：立即执行新添加的回调
        if (memory) {
          for (let i = start; i < list.length; i++) {
            list[i].apply(memory[0], memory[1]);
          }
        }
        
        return this;
      },
      
      remove(...fns) {
        if (!list) return this;
        
        fns.forEach(fn => {
          let index;
          while ((index = list.indexOf(fn)) > -1) {
            list.splice(index, 1);
            
            // 调整触发索引
            if (firing && index <= firingIndex) {
              firingIndex--;
            }
          }
        });
        
        return this;
      },
      
      has(fn) {
        return fn ? list && list.includes(fn) : !!(list && list.length);
      },
      
      empty() {
        if (list) {
          list = [];
        }
        return this;
      },
      
      disable() {
        list = memory = queue = undefined;
        return this;
      },
      
      disabled() {
        return !list;
      },
      
      lock() {
        queue = [];
        if (!memory) {
          this.disable();
        }
        return this;
      },
      
      locked() {
        return !queue;
      },
      
      fireWith(context, args = []) {
        if (!list) return this;
        if (fired && opts.once) return this;
        
        const data = [context, Array.isArray(args) ? args : [args]];
        
        if (firing) {
          queue.push(data);
        } else {
          fire(data);
        }
        
        return this;
      },
      
      fire(...args) {
        return this.fireWith(this, args);
      },
      
      fired() {
        return !!fired;
      }
    };
    
    return callbacks;
  };
}
```

## 使用示例

### 实现简单的发布订阅

```javascript
function createPubSub() {
  const topics = {};
  
  return {
    subscribe(topic, callback) {
      if (!topics[topic]) {
        topics[topic] = $.Callbacks('memory');
      }
      topics[topic].add(callback);
    },
    
    unsubscribe(topic, callback) {
      if (topics[topic]) {
        topics[topic].remove(callback);
      }
    },
    
    publish(topic, ...args) {
      if (topics[topic]) {
        topics[topic].fire(...args);
      }
    }
  };
}

const pubsub = createPubSub();

pubsub.subscribe('user:login', user => {
  console.log('用户登录:', user.name);
});

pubsub.publish('user:login', { name: 'Tom' });
```

### 一次性事件

```javascript
const onReady = $.Callbacks('once memory');

// 页面加载完成时触发
document.addEventListener('DOMContentLoaded', () => {
  onReady.fire();
});

// 可以在任何时候添加回调
// 如果已经 ready，会立即执行
onReady.add(() => {
  console.log('Ready!');
});
```

### 表单验证链

```javascript
const validators = $.Callbacks('stopOnFalse');

validators.add(value => {
  if (!value) {
    console.log('不能为空');
    return false;
  }
  return true;
});

validators.add(value => {
  if (value.length < 3) {
    console.log('至少3个字符');
    return false;
  }
  return true;
});

validators.add(value => {
  if (!/^\w+$/.test(value)) {
    console.log('只能包含字母数字下划线');
    return false;
  }
  return true;
});

// 使用
function validate(input) {
  return validators.fire(input.value);
}
```

### 生命周期钩子

```javascript
const lifecycle = {
  beforeMount: $.Callbacks('memory'),
  mounted: $.Callbacks('memory'),
  beforeDestroy: $.Callbacks(),
  destroyed: $.Callbacks()
};

// 组件可以注册钩子
lifecycle.beforeMount.add(() => {
  console.log('准备挂载...');
});

lifecycle.mounted.add(() => {
  console.log('已挂载');
});

// 框架调用
function mount(component) {
  lifecycle.beforeMount.fire();
  // 执行挂载
  lifecycle.mounted.fire();
}
```

## Deferred 与 Callbacks 的关系

Deferred 内部就是用 Callbacks 实现的：

```javascript
function Deferred() {
  const doneList = $.Callbacks('once memory');
  const failList = $.Callbacks('once memory');
  const progressList = $.Callbacks('memory');
  
  const deferred = {
    done: doneList.add.bind(doneList),
    fail: failList.add.bind(failList),
    progress: progressList.add.bind(progressList),
    
    resolve(...args) {
      doneList.fireWith(this, args);
      return this;
    },
    
    reject(...args) {
      failList.fireWith(this, args);
      return this;
    },
    
    notify(...args) {
      progressList.fireWith(this, args);
      return this;
    }
  };
  
  return deferred;
}
```

这就是为什么：
- done/fail 可以多次调用添加回调（Callbacks 特性）
- resolve 后添加的 done 回调会立即执行（memory 标志）
- resolve 只能调用一次（once 标志）

## 本章小结

Callbacks 是回调函数管理器：

| 标志 | 效果 |
|------|------|
| once | 只能 fire 一次 |
| memory | 记住上次的值，新回调立即执行 |
| unique | 防止重复添加同一个函数 |
| stopOnFalse | 回调返回 false 时停止 |

应用场景：
- 发布订阅模式
- 事件系统内部实现
- 一次性初始化回调
- 验证链
- 生命周期钩子

下一章，我们实现插件机制。

---

**思考题**：如何用 Callbacks 实现一个支持取消订阅的 EventEmitter？
