# Day 22: 第一个里程碑项目 - 响应式计数器

你好，我是你的技术导师。

纸上得来终觉浅，绝知此事要躬行。
我们花了整整两周时间，一行一行敲出了 Vue 3 的响应式系统。
今天，我们要用自己亲手造的轮子，来跑一个真实的应用 —— **响应式计数器**。

这不仅仅是一个简单的 `count++`，它包含了：
-   **状态管理**：使用 `reactive` 管理应用状态。
-   **派生数据**：使用 `computed` 实时计算统计信息。
-   **副作用**：使用 `effect` 驱动 DOM 更新。
-   **侦听器**：使用 `watch` 记录操作历史。

这将是你第一次感受到"数据驱动"的魔力。

## 1. 项目准备

首先，我们需要在 `examples` 目录下创建一个 `counter` 文件夹。

```bash
mkdir -p examples/counter
```

我们需要三个文件：
1.  `index.html`：页面结构。
2.  `style.css`：页面样式（我已经为你准备了一套很酷的 UI）。
3.  `main.js`：核心逻辑。

## 2. 页面结构 (index.html)

这是一个标准的 HTML5 模板，引入了我们的样式和脚本。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Mini Vue3 Counter</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">
    <div class="card">
      <h1>响应式计数器</h1>
      
      <!-- 核心计数显示 -->
      <div class="display">
        <span id="count">0</span>
      </div>

      <!-- 控制按钮 -->
      <div class="controls">
        <button id="dec">-</button>
        <button id="reset">重置</button>
        <button id="inc">+</button>
      </div>

      <!-- 步长选择 -->
      <div class="step-control">
        <span>步长：</span>
        <input type="number" id="step" value="1">
      </div>

      <!-- 统计信息 (Computed) -->
      <div class="stats">
        <p>双倍值: <span id="double">0</span></p>
        <p>状态: <span id="status">偶数</span></p>
      </div>

      <!-- 历史记录 (Watch) -->
      <div class="history">
        <h3>操作日志</h3>
        <ul id="logs"></ul>
      </div>
    </div>
  </div>

  <!-- 引入我们的 main.js -->
  <script type="module" src="main.js"></script>
</body>
</html>
```

## 3. 核心逻辑 (main.js)

这是今天的重头戏。我们要用 `mini-vue3` 的 API 来驱动这个页面。

### 3.1 引入 API

首先，我们需要从源码中引入我们实现的 API。
假设你的构建工具支持直接导入 TS 源码，或者你已经编译出了 JS 文件。
这里我们假设直接从源码导入（需要浏览器支持 ES Module）。

```javascript
// 相对路径可能需要根据你的目录结构调整
import { reactive, computed, effect, watch } from '../../src/reactivity/index.ts'
```

### 3.2 定义状态 (Reactive)

一切从数据开始。

```javascript
const state = reactive({
  count: 0,
  step: 1
})
```

### 3.3 定义计算属性 (Computed)

我们需要一些基于 `count` 的派生数据。

```javascript
const double = computed(() => state.count * 2)

const status = computed(() => {
  return state.count % 2 === 0 ? '偶数' : '奇数'
})
```

### 3.4 绑定视图 (Effect)

这是最关键的一步。我们需要把数据和 DOM 绑定起来。
在 Vue 中，模板编译器帮我们做了这件事。
在这里，我们需要手动写 `effect`。

```javascript
// 1. 绑定 count 显示
effect(() => {
  document.querySelector('#count').textContent = state.count
})

// 2. 绑定 double 显示
effect(() => {
  document.querySelector('#double').textContent = double.value
})

// 3. 绑定 status 显示
effect(() => {
  const el = document.querySelector('#status')
  el.textContent = status.value
  // 还可以动态修改样式
  el.style.color = status.value === '偶数' ? '#42b983' : '#ff6b6b'
})
```

### 3.5 交互逻辑

监听 DOM 事件，修改响应式数据。

```javascript
document.querySelector('#inc').addEventListener('click', () => {
  state.count += Number(state.step)
})

document.querySelector('#dec').addEventListener('click', () => {
  state.count -= Number(state.step)
})

document.querySelector('#reset').addEventListener('click', () => {
  state.count = 0
})

// 双向绑定步长输入框
const stepInput = document.querySelector('#step')
stepInput.addEventListener('input', (e) => {
  state.step = Number(e.target.value)
})
// 反向绑定：如果代码修改了 step，输入框也要更新
effect(() => {
  stepInput.value = state.step
})
```

### 3.6 历史记录 (Watch)

最后，我们用 `watch` 来记录操作日志。

```javascript
const logsEl = document.querySelector('#logs')

watch(
  () => state.count,
  (newVal, oldVal) => {
    const li = document.createElement('li')
    const date = new Date().toLocaleTimeString()
    li.textContent = `[${date}] ${oldVal} -> ${newVal}`
    
    // 插入到最前面
    logsEl.insertBefore(li, logsEl.firstChild)
    
    // 只保留最近 10 条
    if (logsEl.children.length > 10) {
      logsEl.removeChild(logsEl.lastChild)
    }
  }
)
```

## 4. 运行与体验

现在，打开 `index.html`。
试着点击按钮，修改步长。

你会发现：
1.  点击 `+`，`count` 变了，页面上的数字自动变了。
2.  `double` 和 `status` 也自动变了。
3.  日志区域自动增加了一条记录。
4.  修改步长输入框，下一次点击 `+` 会增加相应的数值。

这一切的背后，没有任何手动操作 DOM 的代码（除了初始化时的 `effect`）。
你只需要修改 `state.count`，剩下的事情，响应式系统全帮你搞定了。

这就是 **Data-Driven（数据驱动）** 的魅力。

## 5. 总结

今天我们完成了一个里程碑式的项目。
虽然代码量不大，但它串联起了我们之前学过的所有知识点。

-   `reactive` 负责存数据。
-   `computed` 负责算数据。
-   `effect` 负责渲染数据。
-   `watch` 负责监听数据。

这四个 API，构成了 Vue 3 开发的基石。

从明天开始，我们将进入一个新的篇章 —— **Runtime Core**。
我们将不再手动写 `document.querySelector`，而是去实现一个真正的组件系统，让 Vue 帮我们管理 DOM。

准备好迎接更高级的挑战了吗？
