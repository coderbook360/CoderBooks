# events：EventEmitter 模式精讲

事件驱动是 Node.js 的核心编程范式。`EventEmitter` 是几乎所有 Node.js 核心模块的基础：HTTP 服务器、文件流、进程对象都继承自它。

## 从浏览器事件到 Node.js 事件

在浏览器中，我们熟悉 DOM 事件：

```javascript
// 浏览器
button.addEventListener('click', handler);
button.removeEventListener('click', handler);
```

Node.js 的 EventEmitter 非常相似：

```javascript
// Node.js
emitter.on('event', handler);
emitter.off('event', handler);
```

主要区别：
- 浏览器事件有冒泡和捕获，EventEmitter 没有
- EventEmitter 的事件名是字符串（或 Symbol），不是预定义的 DOM 事件
- EventEmitter 可以传递任意数量的参数

## 基础 API

### 创建和使用

```javascript
const { EventEmitter } = require('events');

const emitter = new EventEmitter();

// 注册监听器
emitter.on('greet', (name) => {
  console.log(`Hello, ${name}!`);
});

// 触发事件
emitter.emit('greet', 'World');
// 输出: Hello, World!
```

### 核心方法

```javascript
const emitter = new EventEmitter();

// on / addListener：添加监听器
emitter.on('event', handler);
emitter.addListener('event', handler);  // 同上

// off / removeListener：移除监听器
emitter.off('event', handler);
emitter.removeListener('event', handler);  // 同上

// once：只监听一次
emitter.once('event', handler);

// emit：触发事件
emitter.emit('event', arg1, arg2);

// removeAllListeners：移除所有监听器
emitter.removeAllListeners('event');
emitter.removeAllListeners();  // 移除所有事件的监听器
```

### 传递多个参数

```javascript
emitter.on('user', (name, age, city) => {
  console.log(`${name} is ${age} years old, from ${city}`);
});

emitter.emit('user', 'Alice', 25, 'Beijing');
```

### 检查监听器

```javascript
// 获取监听器数量
emitter.listenerCount('event');

// 获取监听器数组
emitter.listeners('event');

// 获取所有事件名
emitter.eventNames();
```

## 监听器顺序

监听器按注册顺序执行：

```javascript
emitter.on('event', () => console.log('1'));
emitter.on('event', () => console.log('2'));
emitter.on('event', () => console.log('3'));

emitter.emit('event');
// 输出: 1, 2, 3
```

使用 `prependListener` 可以添加到队列最前面：

```javascript
emitter.on('event', () => console.log('1'));
emitter.prependListener('event', () => console.log('0'));

emitter.emit('event');
// 输出: 0, 1
```

## 错误事件：特殊处理

`error` 事件是特殊的。如果触发 `error` 事件但没有监听器，程序会抛出异常：

```javascript
const emitter = new EventEmitter();

// 没有 error 监听器，直接崩溃
emitter.emit('error', new Error('something went wrong'));
// 抛出: Error: something went wrong
```

**必须监听 error 事件**：

```javascript
emitter.on('error', (err) => {
  console.error('发生错误:', err.message);
});

emitter.emit('error', new Error('something went wrong'));
// 输出: 发生错误: something went wrong
```

## 内存泄漏警告

默认情况下，单个事件最多有 10 个监听器。超过会发出警告：

```javascript
// 警告: MaxListenersExceededWarning
for (let i = 0; i < 11; i++) {
  emitter.on('event', () => {});
}
```

这通常意味着存在内存泄漏。如果确实需要更多监听器：

```javascript
// 修改限制
emitter.setMaxListeners(20);

// 或者移除限制（不推荐）
emitter.setMaxListeners(0);

// 全局修改默认值
require('events').defaultMaxListeners = 20;
```

## 自定义 EventEmitter 类

### 继承方式

```javascript
const { EventEmitter } = require('events');

class FileWatcher extends EventEmitter {
  constructor(path) {
    super();
    this.path = path;
  }
  
  start() {
    // 模拟文件变化检测
    setInterval(() => {
      this.emit('change', this.path, new Date());
    }, 1000);
  }
}

// 使用
const watcher = new FileWatcher('./config.json');

watcher.on('change', (path, time) => {
  console.log(`${path} changed at ${time}`);
});

watcher.on('error', (err) => {
  console.error('Watcher error:', err);
});

watcher.start();
```

### 组合方式

```javascript
class DataProcessor {
  constructor() {
    this.events = new EventEmitter();
  }
  
  on(event, handler) {
    this.events.on(event, handler);
    return this;
  }
  
  process(data) {
    this.events.emit('start', data);
    
    try {
      const result = this.transform(data);
      this.events.emit('complete', result);
    } catch (err) {
      this.events.emit('error', err);
    }
  }
}
```

## 异步事件处理

EventEmitter 是同步的：

```javascript
emitter.on('event', () => console.log('1'));
emitter.on('event', async () => {
  await delay(100);
  console.log('2');
});
emitter.on('event', () => console.log('3'));

emitter.emit('event');
console.log('4');

// 输出顺序: 1, 3, 4, 2
// 注意：异步监听器不会阻塞
```

如果需要等待异步监听器：

```javascript
const { once } = require('events');

// 等待单个事件
async function waitForEvent() {
  const [data] = await once(emitter, 'data');
  console.log('收到数据:', data);
}

// 或自定义异步 emit
async function emitAsync(emitter, event, ...args) {
  const listeners = emitter.listeners(event);
  for (const listener of listeners) {
    await listener(...args);
  }
}
```

## 实战示例

### 任务队列

```javascript
class TaskQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.processing = false;
  }
  
  add(task) {
    this.queue.push(task);
    this.emit('added', task);
    this.process();
  }
  
  async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      this.emit('start', task);
      
      try {
        const result = await task.execute();
        this.emit('complete', task, result);
      } catch (err) {
        this.emit('error', err, task);
      }
    }
    
    this.processing = false;
    this.emit('empty');
  }
}

// 使用
const queue = new TaskQueue();

queue.on('start', task => console.log('开始:', task.name));
queue.on('complete', (task, result) => console.log('完成:', task.name));
queue.on('error', (err, task) => console.error('失败:', task.name, err));
queue.on('empty', () => console.log('队列已清空'));

queue.add({ name: 'task1', execute: () => Promise.resolve('done') });
```

### 可取消的操作

```javascript
class CancellableOperation extends EventEmitter {
  constructor() {
    super();
    this.cancelled = false;
  }
  
  async run() {
    for (let i = 0; i < 100; i++) {
      if (this.cancelled) {
        this.emit('cancelled');
        return;
      }
      
      await this.step(i);
      this.emit('progress', i + 1, 100);
    }
    
    this.emit('complete');
  }
  
  cancel() {
    this.cancelled = true;
  }
  
  async step(i) {
    await new Promise(r => setTimeout(r, 100));
  }
}

// 使用
const op = new CancellableOperation();

op.on('progress', (current, total) => {
  console.log(`进度: ${current}/${total}`);
});

op.on('cancelled', () => console.log('操作已取消'));
op.on('complete', () => console.log('操作完成'));

op.run();

// 3秒后取消
setTimeout(() => op.cancel(), 3000);
```

## 最佳实践

### 1. 始终监听 error 事件

```javascript
emitter.on('error', (err) => {
  logger.error('EventEmitter error:', err);
});
```

### 2. 及时移除监听器

```javascript
function setupHandler(emitter) {
  const handler = (data) => console.log(data);
  
  emitter.on('data', handler);
  
  // 返回清理函数
  return () => emitter.off('data', handler);
}

const cleanup = setupHandler(emitter);
// 使用完毕后
cleanup();
```

### 3. 使用命名函数便于移除

```javascript
// 不好：匿名函数无法移除
emitter.on('event', () => { /* ... */ });

// 好：命名函数可以移除
function handleEvent() { /* ... */ }
emitter.on('event', handleEvent);
emitter.off('event', handleEvent);
```

### 4. 事件命名规范

```javascript
// 使用动词或动词短语
'start', 'stop', 'pause', 'resume'
'data', 'end', 'error', 'close'
'beforeSave', 'afterSave'
'user:login', 'user:logout'  // 命名空间
```

## 本章小结

- EventEmitter 是 Node.js 事件驱动的核心
- 使用 `on`、`emit`、`off`、`once` 操作事件
- `error` 事件必须监听，否则会导致程序崩溃
- 监听器超过 10 个会警告，通常意味着内存泄漏
- 通过继承或组合创建自定义事件类
- 及时移除监听器，避免内存泄漏

下一章我们将学习加密模块的基础用法。
