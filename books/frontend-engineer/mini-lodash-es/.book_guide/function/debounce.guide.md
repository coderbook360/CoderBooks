# 章节写作指导：防抖函数

## 1. 章节信息
- **章节标题**: 防抖函数：debounce 深度解析
- **文件名**: function/debounce.md
- **所属部分**: 第六部分 - 函数方法
- **章节序号**: 35
- **预计阅读时间**: 30分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解防抖的概念和应用场景
- 掌握 debounce 的完整实现原理
- 了解 leading/trailing 选项的作用

### 技能目标
- 能够实现一个功能完备的 debounce
- 理解时间边界处理的细节

## 3. 内容要点

### 核心函数

#### debounce 完整实现
```javascript
function debounce(func, wait, options) {
  let lastArgs,
      lastThis,
      maxWait,
      result,
      timerId,
      lastCallTime,
      lastInvokeTime = 0,
      leading = false,
      maxing = false,
      trailing = true

  // 参数处理
  if (typeof func !== 'function') {
    throw new TypeError('Expected a function')
  }
  wait = +wait || 0
  if (isObject(options)) {
    leading = !!options.leading
    maxing = 'maxWait' in options
    maxWait = maxing ? Math.max(+options.maxWait || 0, wait) : maxWait
    trailing = 'trailing' in options ? !!options.trailing : trailing
  }

  // 执行函数
  function invokeFunc(time) {
    const args = lastArgs
    const thisArg = lastThis
    lastArgs = lastThis = undefined
    lastInvokeTime = time
    result = func.apply(thisArg, args)
    return result
  }

  // 启动定时器
  function startTimer(pendingFunc, wait) {
    return setTimeout(pendingFunc, wait)
  }

  // 取消定时器
  function cancelTimer(id) {
    clearTimeout(id)
  }

  // 前沿调用
  function leadingEdge(time) {
    lastInvokeTime = time
    timerId = startTimer(timerExpired, wait)
    return leading ? invokeFunc(time) : result
  }

  // 计算剩余等待时间
  function remainingWait(time) {
    const timeSinceLastCall = time - lastCallTime
    const timeSinceLastInvoke = time - lastInvokeTime
    const timeWaiting = wait - timeSinceLastCall

    return maxing
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting
  }

  // 是否应该调用
  function shouldInvoke(time) {
    const timeSinceLastCall = time - lastCallTime
    const timeSinceLastInvoke = time - lastInvokeTime

    return (lastCallTime === undefined || 
            timeSinceLastCall >= wait ||
            timeSinceLastCall < 0 || 
            (maxing && timeSinceLastInvoke >= maxWait))
  }

  // 定时器到期
  function timerExpired() {
    const time = Date.now()
    if (shouldInvoke(time)) {
      return trailingEdge(time)
    }
    timerId = startTimer(timerExpired, remainingWait(time))
  }

  // 后沿调用
  function trailingEdge(time) {
    timerId = undefined
    if (trailing && lastArgs) {
      return invokeFunc(time)
    }
    lastArgs = lastThis = undefined
    return result
  }

  // 取消
  function cancel() {
    if (timerId !== undefined) {
      cancelTimer(timerId)
    }
    lastInvokeTime = 0
    lastArgs = lastCallTime = lastThis = timerId = undefined
  }

  // 立即执行
  function flush() {
    return timerId === undefined ? result : trailingEdge(Date.now())
  }

  // 检查是否有待执行
  function pending() {
    return timerId !== undefined
  }

  // 主函数
  function debounced(...args) {
    const time = Date.now()
    const isInvoking = shouldInvoke(time)

    lastArgs = args
    lastThis = this
    lastCallTime = time

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime)
      }
      if (maxing) {
        timerId = startTimer(timerExpired, wait)
        return invokeFunc(lastCallTime)
      }
    }
    if (timerId === undefined) {
      timerId = startTimer(timerExpired, wait)
    }
    return result
  }
  
  debounced.cancel = cancel
  debounced.flush = flush
  debounced.pending = pending
  return debounced
}
```

### 使用示例
```javascript
// 基本用法 - 搜索输入
const debouncedSearch = _.debounce(search, 300)
input.addEventListener('input', debouncedSearch)

// leading: true - 先执行再等待
const debouncedClick = _.debounce(onClick, 1000, { leading: true, trailing: false })

// maxWait - 最大等待时间
const debouncedScroll = _.debounce(onScroll, 100, { maxWait: 1000 })

// 取消和立即执行
debouncedSearch.cancel()
debouncedSearch.flush()
```

### 选项说明
| 选项 | 默认值 | 说明 |
|------|--------|------|
| leading | false | 在等待开始时立即执行 |
| trailing | true | 在等待结束时执行 |
| maxWait | - | 最大等待时间（用于类 throttle 效果） |

## 4. 写作要求

### 开篇方式
从"搜索框输入优化"这个经典场景引入

### 结构组织
```
1. 防抖概念（400字）
   - 什么是防抖
   - 应用场景
   
2. 简化版实现（500字）
   - 最基础的防抖
   - 逐步理解核心原理
   
3. 完整版源码解析（800字）
   - 闭包状态变量
   - shouldInvoke 判断逻辑
   - leading/trailing 处理
   
4. maxWait 选项解析（400字）
   - 最大等待时间
   - 与 throttle 的关系
   
5. 辅助方法（300字）
   - cancel
   - flush
   - pending
   
6. 时序图解析（300字）

7. 小结
```

### 代码示例
- 简化版实现
- 完整版关键逻辑
- 各种选项的效果演示

### 图表需求
- 防抖时序图
- leading vs trailing 对比图
- maxWait 作用图

## 5. 技术细节

### 源码参考
- `debounce.js` - 完整实现

### 实现要点
- 使用闭包保存定时器和调用信息
- shouldInvoke 综合判断多种条件
- leadingEdge/trailingEdge 处理前后沿
- maxWait 可以实现类似 throttle 的效果

### 常见问题
- Q: debounce 和 throttle 有什么区别？
- A: debounce 在停止触发后执行，throttle 在间隔时间内至少执行一次

- Q: maxWait 有什么用？
- A: 保证即使持续触发也会在 maxWait 时间后执行

## 6. 风格指导

### 语气语调
深度解析，逐层递进

### 类比方向
- 将防抖比作"电梯关门"
- 将 maxWait 比作"超时强制执行"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
