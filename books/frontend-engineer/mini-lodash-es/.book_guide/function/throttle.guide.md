# 章节写作指导：节流函数

## 1. 章节信息
- **章节标题**: 节流函数：throttle 实现原理
- **文件名**: function/throttle.md
- **所属部分**: 第六部分 - 函数方法
- **章节序号**: 36
- **预计阅读时间**: 20分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解节流的概念和应用场景
- 掌握 throttle 与 debounce 的关系
- 了解 throttle 的选项配置

### 技能目标
- 能够正确使用 throttle 优化性能
- 理解 throttle 如何基于 debounce 实现

## 3. 内容要点

### 核心函数

#### throttle 实现
```javascript
function throttle(func, wait, options) {
  let leading = true
  let trailing = true

  if (typeof func !== 'function') {
    throw new TypeError('Expected a function')
  }
  
  if (isObject(options)) {
    leading = 'leading' in options ? !!options.leading : leading
    trailing = 'trailing' in options ? !!options.trailing : trailing
  }
  
  return debounce(func, wait, {
    leading,
    trailing,
    maxWait: wait  // 关键：设置 maxWait = wait
  })
}
```

### throttle 与 debounce 的关系
```javascript
// throttle 本质上是特殊配置的 debounce
throttle(func, wait)
// 等价于
debounce(func, wait, { leading: true, trailing: true, maxWait: wait })
```

### 使用示例
```javascript
// 基本用法 - 滚动事件
const throttledScroll = _.throttle(onScroll, 100)
window.addEventListener('scroll', throttledScroll)

// 只在开始时执行
const throttledLeading = _.throttle(onClick, 1000, { trailing: false })

// 只在结束时执行
const throttledTrailing = _.throttle(onClick, 1000, { leading: false })

// 取消
throttledScroll.cancel()
```

### debounce vs throttle
| 特性 | debounce | throttle |
|------|----------|----------|
| 执行时机 | 停止触发后 | 固定间隔内 |
| 执行频率 | 可能只执行一次 | 固定频率 |
| 典型场景 | 搜索输入 | 滚动事件 |
| 底层实现 | 自身完整实现 | 基于 debounce |

### 应用场景对比
```javascript
// debounce 适用：输入搜索
// 用户停止输入后再搜索
input.addEventListener('input', _.debounce(search, 300))

// throttle 适用：滚动加载
// 滚动过程中定期检查
window.addEventListener('scroll', _.throttle(checkScroll, 100))

// throttle 适用：按钮防重复点击
// 固定时间内只响应一次
button.addEventListener('click', _.throttle(onClick, 1000, { trailing: false }))
```

## 4. 写作要求

### 开篇方式
从 "滚动事件优化" 场景引入

### 结构组织
```
1. 节流概念（400字）
   - 什么是节流
   - 与防抖的区别
   
2. throttle 源码解析（400字）
   - 调用 debounce
   - maxWait 的关键作用
   
3. 选项配置（300字）
   - leading
   - trailing
   
4. 应用场景（500字）
   - 滚动事件
   - resize 事件
   - 按钮点击
   
5. throttle vs debounce 选型（400字）
   - 何时用 throttle
   - 何时用 debounce
   
6. 小结
```

### 代码示例
- throttle 实现
- 各种选项效果
- 场景对比

### 图表需求
- throttle vs debounce 时序图
- 选型决策树

## 5. 技术细节

### 源码参考
- `throttle.js`
- `debounce.js` (作为基础)

### 实现要点
- throttle 完全基于 debounce 实现
- 关键是 maxWait: wait，保证固定间隔执行
- 默认 leading: true, trailing: true
- 共享 debounce 的 cancel、flush 方法

### 常见问题
- Q: throttle 的 cancel 怎么用？
- A: 继承自 debounce，调用 throttled.cancel()

- Q: 如何选择 throttle 还是 debounce？
- A: 需要固定频率用 throttle，需要等待停止用 debounce

## 6. 风格指导

### 语气语调
对比讲解，强调选型

### 类比方向
- 将 throttle 比作"地铁发车间隔"
- 将 debounce 比作"电梯等人"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
