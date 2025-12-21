# Deferred 延迟对象

在 Promise 成为 JavaScript 标准之前，jQuery 就已经用 Deferred 对象优雅地处理异步操作了。虽然现在我们有了原生 Promise，但理解 Deferred 仍然很有价值——它揭示了 Promise 设计背后的思想，而且 jQuery 的 Deferred 有一个原生 Promise 没有的特性：**可以从外部控制状态**。

## 一个真实的问题

假设你在封装一个图片加载函数：

```javascript
function loadImage(src) {
  const img = new Image();
  img.src = src;
  
  // 问题来了：怎么告诉调用者加载完成？
}
```

用 Promise 的话：

```javascript
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('加载失败'));
    img.src = src;
  });
}
```

这很好，但有一个限制：**resolve 和 reject 只能在 Promise 构造函数内部调用**。

如果逻辑更复杂，需要在多个地方决定成功或失败呢？这时候 Deferred 就派上用场了。

## 什么是 Deferred

Deferred 是一个可以**从外部控制状态**的 Promise：

```javascript
// 创建 Deferred
const deferred = $.Deferred();

// 关键区别：可以在任何地方 resolve
deferred.resolve('成功');

// 或 reject
deferred.reject('失败');

// 获取只读的 Promise 供外部使用
const promise = deferred.promise();
```

思考一下这个区别：

```javascript
// Promise - 只能在构造函数内 resolve
new Promise((resolve, reject) => {
  resolve('done');  // 只能在这里调用
});

// Deferred - 可以在任何地方 resolve
const deferred = $.Deferred();
setTimeout(() => {
  deferred.resolve('done');  // 1秒后调用
}, 1000);
// 甚至可以传给另一个模块去调用
```

这种灵活性在复杂场景下非常有用。

## 基础用法

让我们用 Deferred 封装一个异步操作：

```javascript
function asyncOperation() {
  const deferred = $.Deferred();
  
  setTimeout(() => {
    if (Math.random() > 0.5) {
      deferred.resolve('成功');
    } else {
      deferred.reject('失败');
    }
  }, 1000);
  
  // 注意：返回的是 promise()，不是 deferred 本身
  // 这样调用者只能监听结果，不能改变状态
  return deferred.promise();
}

asyncOperation()
  .done(result => console.log(result))
  .fail(error => console.error(error))
  .always(() => console.log('完成'));
```

注意我们返回的是 `deferred.promise()` 而不是 `deferred` 本身——这是一个重要的设计决策。`promise()` 返回一个**只读版本**，调用者可以注册回调，但不能调用 `resolve()` 或 `reject()`。这保证了状态控制权只在创建者手中。

## Deferred API 一览

在深入实现之前，先熟悉一下完整的 API：

```javascript
const deferred = $.Deferred();

// 改变状态（只有 deferred 对象有这些方法）
deferred.resolve(value);     // 成功
deferred.reject(reason);     // 失败
deferred.notify(progress);   // 进度通知（这是 Promise 没有的！）

// 注册回调（deferred 和 promise 都有）
deferred.done(fn);           // 成功回调
deferred.fail(fn);           // 失败回调
deferred.progress(fn);       // 进度回调
deferred.always(fn);         // 无论成功失败都执行

// 链式调用
deferred.then(done, fail, progress);

// 获取只读 Promise
const promise = deferred.promise();
```

`progress` 和 `notify` 是 jQuery Deferred 的独特功能——原生 Promise 没有进度通知机制。这在文件上传等场景特别有用。

## 实现 Deferred

理解了设计之后，实现就顺理成章了。核心是维护三样东西：

1. **状态**：pending | resolved | rejected
2. **结果值**：成功时的值或失败时的原因
3. **回调队列**：各种类型的回调函数
deferred.reject(reason);     // 失败
deferred.notify(progress);   // 进度通知

// 注册回调
deferred.done(fn);           // 成功回调
deferred.fail(fn);           // 失败回调
deferred.progress(fn);       // 进度回调
deferred.always(fn);         // 无论成功失败都执行

// 链式调用
deferred.then(done, fail, progress);

// 获取只读 Promise
const promise = deferred.promise();
```

## 实现 Deferred

```javascript
function Deferred() {
  let state = 'pending';  // pending | resolved | rejected
  let value = undefined;
  let reason = undefined;
  
  const doneCallbacks = [];
  const failCallbacks = [];
  const progressCallbacks = [];
  const alwaysCallbacks = [];
  
  const deferred = {
    resolve(...args) {
      if (state !== 'pending') return this;
      
      state = 'resolved';
      value = args;
      
      doneCallbacks.forEach(fn => fn.apply(null, args));
      alwaysCallbacks.forEach(fn => fn.apply(null, args));
      
      return this;
    },
    
    reject(...args) {
      if (state !== 'pending') return this;
      
      state = 'rejected';
      reason = args;
      
      failCallbacks.forEach(fn => fn.apply(null, args));
      alwaysCallbacks.forEach(fn => fn.apply(null, args));
      
      return this;
    },
    
    notify(...args) {
      if (state !== 'pending') return this;
      
      progressCallbacks.forEach(fn => fn.apply(null, args));
      
      return this;
    },
    
    done(...fns) {
      fns.forEach(fn => {
        if (typeof fn !== 'function') return;
        
        if (state === 'resolved') {
          fn.apply(null, value);
        } else if (state === 'pending') {
          doneCallbacks.push(fn);
        }
      });
      return this;
    },
    
    fail(...fns) {
      fns.forEach(fn => {
        if (typeof fn !== 'function') return;
        
        if (state === 'rejected') {
          fn.apply(null, reason);
        } else if (state === 'pending') {
          failCallbacks.push(fn);
        }
      });
      return this;
    },
    
    progress(...fns) {
      if (state === 'pending') {
        fns.forEach(fn => {
          if (typeof fn === 'function') {
            progressCallbacks.push(fn);
          }
        });
      }
      return this;
    },
    
    always(...fns) {
      fns.forEach(fn => {
        if (typeof fn !== 'function') return;
        
        if (state !== 'pending') {
          fn.apply(null, state === 'resolved' ? value : reason);
        } else {
          alwaysCallbacks.push(fn);
        }
      });
      return this;
    },
    
    state() {
      return state;
    },
    
    promise(target) {
      const promise = {
        done: deferred.done.bind(deferred),
        fail: deferred.fail.bind(deferred),
        progress: deferred.progress.bind(deferred),
        always: deferred.always.bind(deferred),
        then: deferred.then.bind(deferred),
        state: deferred.state.bind(deferred),
        promise() { return this; }
      };
      
      return target ? Object.assign(target, promise) : promise;
    },
    
    then(done, fail, progress) {
      const newDeferred = Deferred();
      
      this.done((...args) => {
        if (done) {
          try {
            const result = done.apply(null, args);
            if (result && typeof result.then === 'function') {
              result.then(
                newDeferred.resolve.bind(newDeferred),
                newDeferred.reject.bind(newDeferred)
              );
            } else {
              newDeferred.resolve(result);
            }
          } catch (e) {
            newDeferred.reject(e);
          }
        } else {
          newDeferred.resolve.apply(newDeferred, args);
        }
      });
      
      this.fail((...args) => {
        if (fail) {
          try {
            const result = fail.apply(null, args);
            newDeferred.resolve(result);
          } catch (e) {
            newDeferred.reject(e);
          }
        } else {
          newDeferred.reject.apply(newDeferred, args);
        }
      });
      
      if (progress) {
        this.progress(progress);
      }
      
      return newDeferred.promise();
    }
  };
  
  return deferred;
}
```

## $.when

等待多个 Deferred 完成：

```javascript
$.when(
  $.ajax('/api/users'),
  $.ajax('/api/posts'),
  $.ajax('/api/comments')
)
.done((usersResult, postsResult, commentsResult) => {
  // 全部成功
  console.log(usersResult[0], postsResult[0], commentsResult[0]);
})
.fail((error) => {
  // 任意一个失败
  console.error(error);
});
```

### 实现

```javascript
function when(...args) {
  // 没有参数
  if (args.length === 0) {
    return Deferred().resolve().promise();
  }
  
  // 只有一个参数
  if (args.length === 1) {
    const arg = args[0];
    if (arg && typeof arg.promise === 'function') {
      return arg.promise();
    }
    return Deferred().resolve(arg).promise();
  }
  
  // 多个参数
  const master = Deferred();
  const remaining = args.length;
  let resolvedCount = 0;
  const results = new Array(args.length);
  
  args.forEach((arg, index) => {
    // 包装为 Deferred
    const deferred = arg && typeof arg.promise === 'function' 
      ? arg 
      : Deferred().resolve(arg);
    
    deferred
      .done((...values) => {
        results[index] = values.length > 1 ? values : values[0];
        resolvedCount++;
        
        if (resolvedCount === args.length) {
          master.resolve(...results);
        }
      })
      .fail((...reasons) => {
        master.reject(...reasons);
      });
  });
  
  return master.promise();
}
```

## 完整实现

```javascript
// src/advanced/deferred.js

export function installDeferred(jQuery) {
  
  jQuery.Deferred = function(func) {
    let state = 'pending';
    let value;
    
    const callbacks = {
      done: [],
      fail: [],
      progress: [],
      always: []
    };
    
    function fire(type, args) {
      callbacks[type].forEach(fn => fn.apply(null, args));
      callbacks.always.forEach(fn => fn.apply(null, args));
    }
    
    const deferred = {
      resolve(...args) {
        if (state !== 'pending') return this;
        state = 'resolved';
        value = args;
        fire('done', args);
        return this;
      },
      
      reject(...args) {
        if (state !== 'pending') return this;
        state = 'rejected';
        value = args;
        fire('fail', args);
        return this;
      },
      
      notify(...args) {
        if (state !== 'pending') return this;
        callbacks.progress.forEach(fn => fn.apply(null, args));
        return this;
      },
      
      state() { return state; },
      
      done(...fns) { return addCallbacks('done', fns, this); },
      fail(...fns) { return addCallbacks('fail', fns, this); },
      progress(...fns) { return addCallbacks('progress', fns, this); },
      always(...fns) { return addCallbacks('always', fns, this); },
      
      then(doneFn, failFn, progressFn) {
        const newDeferred = jQuery.Deferred();
        
        this.done(handleCallback(doneFn, newDeferred, 'resolve'));
        this.fail(handleCallback(failFn, newDeferred, 'reject'));
        
        if (progressFn) {
          this.progress(progressFn);
        }
        
        return newDeferred.promise();
      },
      
      promise(obj) {
        const promise = {
          done: this.done.bind(this),
          fail: this.fail.bind(this),
          progress: this.progress.bind(this),
          always: this.always.bind(this),
          then: this.then.bind(this),
          state: this.state.bind(this),
          promise() { return this; }
        };
        return obj ? Object.assign(obj, promise) : promise;
      }
    };
    
    function addCallbacks(type, fns, context) {
      fns.forEach(fn => {
        if (typeof fn !== 'function') return;
        
        if (state === 'pending') {
          callbacks[type].push(fn);
        } else if ((type === 'done' && state === 'resolved') ||
                   (type === 'fail' && state === 'rejected') ||
                   type === 'always') {
          fn.apply(null, value);
        }
      });
      return context;
    }
    
    function handleCallback(fn, deferred, action) {
      return (...args) => {
        if (fn) {
          try {
            const result = fn.apply(null, args);
            if (result && typeof result.then === 'function') {
              result.then(
                (...v) => deferred.resolve(...v),
                (...e) => deferred.reject(...e)
              );
            } else {
              deferred.resolve(result);
            }
          } catch (e) {
            deferred.reject(e);
          }
        } else {
          deferred[action].apply(deferred, args);
        }
      };
    }
    
    // 支持初始化函数
    if (func) {
      func.call(deferred, deferred);
    }
    
    return deferred;
  };
  
  jQuery.when = function(...args) {
    if (args.length === 0) {
      return jQuery.Deferred().resolve().promise();
    }
    
    if (args.length === 1) {
      const arg = args[0];
      return arg && typeof arg.then === 'function'
        ? arg
        : jQuery.Deferred().resolve(arg).promise();
    }
    
    const master = jQuery.Deferred();
    let remaining = args.length;
    const results = new Array(args.length);
    
    args.forEach((arg, i) => {
      jQuery.Deferred().resolve(arg).promise()
        .then(
          value => {
            results[i] = value;
            if (--remaining === 0) {
              master.resolve(...results);
            }
          },
          master.reject.bind(master)
        );
    });
    
    return master.promise();
  };
}
```

## 使用示例

### 封装异步操作

```javascript
function loadImage(src) {
  const deferred = $.Deferred();
  
  const img = new Image();
  
  img.onload = () => deferred.resolve(img);
  img.onerror = () => deferred.reject(new Error('Failed to load'));
  
  img.src = src;
  
  return deferred.promise();
}

loadImage('/images/photo.jpg')
  .done(img => document.body.appendChild(img))
  .fail(err => console.error(err));
```

### 进度通知

```javascript
function uploadFile(file) {
  const deferred = $.Deferred();
  
  const xhr = new XMLHttpRequest();
  
  xhr.upload.onprogress = e => {
    if (e.lengthComputable) {
      deferred.notify(e.loaded / e.total * 100);
    }
  };
  
  xhr.onload = () => deferred.resolve(xhr.response);
  xhr.onerror = () => deferred.reject(new Error('Upload failed'));
  
  xhr.open('POST', '/upload');
  xhr.send(file);
  
  return deferred.promise();
}

uploadFile(file)
  .progress(percent => console.log(`${percent}%`))
  .done(result => console.log('完成'))
  .fail(err => console.error(err));
```

### 并行请求

```javascript
$.when(
  $.get('/api/user'),
  $.get('/api/settings'),
  $.get('/api/notifications')
)
.done((user, settings, notifications) => {
  initApp({ user, settings, notifications });
});
```

## 本章小结

Deferred 特点：

- **外部控制**：可以从创建位置之外 resolve/reject
- **进度通知**：notify/progress 支持进度回调
- **Promise 分离**：promise() 返回只读版本
- **多回调**：done/fail 可以多次调用添加回调

现代替代：

- 标准 Promise 已足够大多数场景
- 进度可用自定义事件代替
- $.when 可用 Promise.all 代替

下一章，我们实现 Callbacks 回调队列。

---

**思考题**：为什么 Deferred 需要 promise() 方法返回"只读"版本？直接返回 deferred 有什么问题？
