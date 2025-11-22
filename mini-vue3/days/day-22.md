# Day 22: 第一个里程碑项目 - 响应式计数器

> 学习日期: 2025年12月13日  
> 预计用时: 4小时  
> 难度等级: ⭐⭐

## 📋 今日目标

- [ ] 使用自己实现的 mini-vue3 构建真实项目
- [ ] 理解响应式系统在实际应用中的运作
- [ ] 实现完整的计数器应用（增删改查）
- [ ] 学习项目结构和代码组织
- [ ] 性能测试和优化

## ⏰ 时间规划

- 项目搭建: 30分钟
- 功能开发: 2小时
- 测试优化: 1小时
- 总结复盘: 30分钟

---

## 📚 项目概述

### 1. 项目功能

一个功能完整的响应式计数器应用：

```
┌─────────────────────────────────────┐
│        Mini Vue3 计数器             │
├─────────────────────────────────────┤
│                                     │
│         当前计数: 42                │
│                                     │
│     [  -  ]  [重置]  [  +  ]        │
│                                     │
│     步长: [  1  ] [  5  ] [ 10 ]    │
│                                     │
├─────────────────────────────────────┤
│  历史记录:                          │
│  ✓ 增加 1 → 当前: 1                │
│  ✓ 增加 5 → 当前: 6                │
│  ✓ 减少 10 → 当前: -4              │
│  [清空历史]                         │
└─────────────────────────────────────┘
```

### 2. 技术要点

- ✅ reactive 管理状态
- ✅ computed 计算派生数据
- ✅ effect 响应式更新 DOM
- ✅ watch 监听状态变化
- ✅ 性能优化（批量更新）

---

## 💻 实践任务

### 步骤1：项目结构搭建（30分钟）

```bash
# 创建项目目录
mkdir examples/counter
cd examples/counter
```

#### 1.1 创建 HTML 模板

```html
<!-- examples/counter/index.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mini Vue3 计数器</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">
    <div class="container">
      <h1>Mini Vue3 响应式计数器</h1>
      
      <!-- 计数显示 -->
      <div class="counter-display">
        <span class="label">当前计数:</span>
        <span class="count" id="count">0</span>
      </div>
      
      <!-- 操作按钮 -->
      <div class="controls">
        <button id="decrease" class="btn btn-danger">-</button>
        <button id="reset" class="btn btn-secondary">重置</button>
        <button id="increase" class="btn btn-success">+</button>
      </div>
      
      <!-- 步长选择 -->
      <div class="step-selector">
        <span class="label">步长:</span>
        <button class="btn-step" data-step="1">1</button>
        <button class="btn-step active" data-step="5">5</button>
        <button class="btn-step" data-step="10">10</button>
      </div>
      
      <!-- 统计信息 -->
      <div class="stats">
        <div class="stat-item">
          <span class="stat-label">操作次数:</span>
          <span id="operations">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">是否为偶数:</span>
          <span id="is-even">是</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">绝对值:</span>
          <span id="abs-value">0</span>
        </div>
      </div>
      
      <!-- 历史记录 -->
      <div class="history">
        <div class="history-header">
          <h3>历史记录</h3>
          <button id="clear-history" class="btn btn-sm">清空</button>
        </div>
        <ul id="history-list" class="history-list"></ul>
      </div>
    </div>
  </div>
  
  <script type="module" src="./main.js"></script>
</body>
</html>
```

#### 1.2 创建样式文件

```css
/* examples/counter/style.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.container {
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 40px;
  max-width: 600px;
  width: 100%;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
  font-size: 24px;
}

.counter-display {
  text-align: center;
  margin: 30px 0;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
}

.counter-display .label {
  display: block;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  margin-bottom: 10px;
}

.count {
  display: block;
  font-size: 72px;
  font-weight: bold;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}

.count.changed {
  animation: pulse 0.3s;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.controls {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin: 30px 0;
}

.btn {
  padding: 15px 30px;
  font-size: 20px;
  font-weight: bold;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 80px;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.btn:active {
  transform: translateY(0);
}

.btn-danger {
  background: #ff6b6b;
  color: white;
}

.btn-success {
  background: #51cf66;
  color: white;
}

.btn-secondary {
  background: #868e96;
  color: white;
}

.step-selector {
  text-align: center;
  margin: 30px 0;
}

.step-selector .label {
  display: block;
  color: #666;
  margin-bottom: 10px;
  font-size: 14px;
}

.btn-step {
  padding: 10px 20px;
  margin: 0 5px;
  border: 2px solid #ddd;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 16px;
}

.btn-step:hover {
  border-color: #667eea;
  color: #667eea;
}

.btn-step.active {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin: 30px 0;
}

.stat-item {
  text-align: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 10px;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.stat-item span:last-child {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #667eea;
}

.history {
  margin-top: 30px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.history-header h3 {
  font-size: 18px;
  color: #333;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 12px;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-sm:hover {
  background: #fa5252;
}

.history-list {
  list-style: none;
  max-height: 300px;
  overflow-y: auto;
}

.history-item {
  padding: 12px;
  margin-bottom: 8px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #667eea;
  animation: slideIn 0.3s;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.history-item .action {
  font-weight: bold;
  color: #667eea;
}

.history-item .result {
  color: #666;
  font-size: 14px;
}
```

---

### 步骤2：实现核心逻辑（2小时）

#### 2.1 创建状态管理

```typescript
// examples/counter/main.js
import { reactive, computed, effect, watch } from '../../src/reactivity'

// 1. 创建响应式状态
const state = reactive({
  count: 0,
  step: 5,
  history: []
})

// 2. 计算属性
const stats = {
  // 操作次数
  operations: computed(() => state.history.length),
  
  // 是否为偶数
  isEven: computed(() => state.count % 2 === 0),
  
  // 绝对值
  absValue: computed(() => Math.abs(state.count))
}

// 3. 操作方法
const actions = {
  increase() {
    const oldValue = state.count
    state.count += state.step
    this.addHistory('增加', state.step, oldValue, state.count)
  },
  
  decrease() {
    const oldValue = state.count
    state.count -= state.step
    this.addHistory('减少', state.step, oldValue, state.count)
  },
  
  reset() {
    const oldValue = state.count
    state.count = 0
    this.addHistory('重置', 0, oldValue, 0)
  },
  
  setStep(step) {
    state.step = step
  },
  
  addHistory(action, step, from, to) {
    state.history.unshift({
      action,
      step,
      from,
      to,
      timestamp: new Date().toLocaleTimeString()
    })
    
    // 只保留最近20条记录
    if (state.history.length > 20) {
      state.history.pop()
    }
  },
  
  clearHistory() {
    state.history = []
  }
}
```

#### 2.2 实现视图更新

```typescript
// examples/counter/main.js (续)

// DOM 元素
const elements = {
  count: document.getElementById('count'),
  operations: document.getElementById('operations'),
  isEven: document.getElementById('is-even'),
  absValue: document.getElementById('abs-value'),
  historyList: document.getElementById('history-list'),
  increaseBtn: document.getElementById('increase'),
  decreaseBtn: document.getElementById('decrease'),
  resetBtn: document.getElementById('reset'),
  clearHistoryBtn: document.getElementById('clear-history'),
  stepButtons: document.querySelectorAll('.btn-step')
}

// 4. 响应式更新视图
// 更新计数显示
effect(() => {
  elements.count.textContent = state.count
  // 添加动画效果
  elements.count.classList.add('changed')
  setTimeout(() => {
    elements.count.classList.remove('changed')
  }, 300)
})

// 更新统计信息
effect(() => {
  elements.operations.textContent = stats.operations.value
})

effect(() => {
  elements.isEven.textContent = stats.isEven.value ? '是' : '否'
  elements.isEven.style.color = stats.isEven.value ? '#51cf66' : '#ff6b6b'
})

effect(() => {
  elements.absValue.textContent = stats.absValue.value
})

// 更新历史记录
effect(() => {
  elements.historyList.innerHTML = state.history
    .map(item => `
      <li class="history-item">
        <span class="action">${item.action} ${item.step > 0 ? item.step : ''}</span>
        <span class="result">→ 当前: ${item.to}</span>
        <small>${item.timestamp}</small>
      </li>
    `)
    .join('')
})

// 5. 监听计数变化
watch(() => state.count, (newValue, oldValue) => {
  console.log(`计数变化: ${oldValue} → ${newValue}`)
  
  // 可以在这里添加更多副作用
  // 例如：保存到 localStorage
  localStorage.setItem('counter', newValue.toString())
})

// 6. 事件绑定
elements.increaseBtn.addEventListener('click', () => actions.increase())
elements.decreaseBtn.addEventListener('click', () => actions.decrease())
elements.resetBtn.addEventListener('click', () => actions.reset())
elements.clearHistoryBtn.addEventListener('click', () => actions.clearHistory())

// 步长选择
elements.stepButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const step = parseInt(btn.dataset.step)
    actions.setStep(step)
    
    // 更新激活状态
    elements.stepButtons.forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
  })
})

// 7. 初始化：从 localStorage 恢复状态
const savedCount = localStorage.getItem('counter')
if (savedCount !== null) {
  state.count = parseInt(savedCount)
}

// 8. 键盘快捷键
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') {
    actions.increase()
  } else if (e.key === 'ArrowDown') {
    actions.decrease()
  } else if (e.key === 'r' || e.key === 'R') {
    actions.reset()
  }
})

console.log('🎉 Mini Vue3 计数器已启动！')
console.log('快捷键：↑ 增加 | ↓ 减少 | R 重置')
```

---

### 步骤3：测试和优化（1小时）

#### 3.1 性能测试

```typescript
// examples/counter/performance-test.js

import { reactive, computed, effect } from '../../src/reactivity'

console.log('===== 性能测试 =====')

// 测试1：大量数据的响应式性能
console.log('\n测试1：创建1000个响应式对象')
console.time('reactive-1000')
const objects = []
for (let i = 0; i < 1000; i++) {
  objects.push(reactive({ count: i }))
}
console.timeEnd('reactive-1000')

// 测试2：批量更新性能
console.log('\n测试2：批量更新1000次')
const state = reactive({ count: 0 })
let updateCount = 0
effect(() => {
  updateCount++
  state.count
})

console.time('batch-update-1000')
for (let i = 0; i < 1000; i++) {
  state.count = i
}
console.timeEnd('batch-update-1000')
console.log(`effect 执行次数: ${updateCount}`)

// 测试3：computed 缓存性能
console.log('\n测试3：computed 缓存效果')
let computeCount = 0
const doubled = computed(() => {
  computeCount++
  return state.count * 2
})

console.time('computed-access-1000')
for (let i = 0; i < 1000; i++) {
  doubled.value // 访问1000次
}
console.timeEnd('computed-access-1000')
console.log(`computed 实际计算次数: ${computeCount}`)
```

#### 3.2 优化建议

```typescript
// examples/counter/optimizations.js

/**
 * 优化1：批量更新
 */
function batchUpdate(fn) {
  // 暂停依赖收集
  pauseTracking()
  fn()
  // 恢复依赖收集
  resetTracking()
}

// 使用
batchUpdate(() => {
  state.count = 10
  state.step = 5
  // 只触发一次更新
})

/**
 * 优化2：防抖更新
 */
function debounce(fn, delay) {
  let timer
  return function(...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

const debouncedUpdate = debounce(() => {
  actions.increase()
}, 300)

/**
 * 优化3：节流更新
 */
function throttle(fn, limit) {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

const throttledUpdate = throttle(() => {
  actions.increase()
}, 300)
```

---

## 🤔 思考题

### 问题1: 为什么要将历史记录限制为20条？

**提示**: 考虑性能和内存

### 问题2: 如何优化频繁的 DOM 更新？

**提示**: 虚拟 DOM、批量更新、节流防抖

### 问题3: 如果要支持撤销/重做功能，如何实现？

**提示**: 状态快照、命令模式

---

## 📝 项目总结

完成项目后，请回答：

1. **响应式系统在实际项目中的运作流程？**

2. **遇到了哪些问题？如何解决的？**

3. **还可以添加哪些功能？**

4. **性能瓶颈在哪里？如何优化？**

---

## 📖 扩展挑战

### 挑战1：添加更多功能
- 支持乘法和除法操作
- 添加计数上限和下限
- 支持自定义步长输入

### 挑战2：持久化
- 将完整状态保存到 localStorage
- 支持导出/导入历史记录

### 挑战3：动画效果
- 数字滚动动画
- 粒子效果
- 过渡动画

---

## ⏭️ 明日预告

### Day 23: 实现 ref 引用

明天我们将学习：
- ref 的实现原理
- ref vs reactive
- toRef 和 toRefs

**准备开始新的征程！** 🚀
