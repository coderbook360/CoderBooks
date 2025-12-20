# 章节写作指导：迭代工具

## 1. 章节信息
- **章节标题**: 迭代工具：times、range
- **文件名**: util/times-range.md
- **所属部分**: 第九部分 - 工具方法
- **章节序号**: 52
- **预计阅读时间**: 15分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 理解 times 的迭代执行机制
- 掌握 range 的序列生成规则
- 了解 rangeRight 的逆序生成

### 技能目标
- 能够使用这些方法生成序列数据
- 理解参数处理和边界情况

## 3. 内容要点

### 核心函数

#### times
```javascript
// times - 执行 n 次迭代
function times(n, iteratee) {
  n = toInteger(n)
  if (n < 1 || n > MAX_SAFE_INTEGER) {
    return []
  }
  
  const result = new Array(Math.min(n, MAX_ARRAY_LENGTH))
  
  let index = -1
  while (++index < n) {
    result[index] = iteratee(index)
  }
  
  return result
}
```

#### range / rangeRight
```javascript
// range - 生成数字序列
function range(start, end, step) {
  // 参数处理
  if (step === undefined) {
    if (end === undefined) {
      end = start
      start = 0
    }
    step = start < end ? 1 : -1
  }
  
  return baseRange(start, end, step)
}

// baseRange - 核心实现
function baseRange(start, end, step, fromRight) {
  let index = -1
  let length = Math.max(Math.ceil((end - start) / (step || 1)), 0)
  const result = new Array(length)
  
  while (length--) {
    result[fromRight ? length : ++index] = start
    start += step
  }
  
  return result
}

// rangeRight - 逆序生成
function rangeRight(start, end, step) {
  // 参数处理（同 range）
  return baseRange(start, end, step, true)
}
```

### 使用示例
```javascript
// times - 基本用法
_.times(4, n => n)
// => [0, 1, 2, 3]

_.times(4, _.constant(0))
// => [0, 0, 0, 0]

_.times(3, () => Math.random())
// => [0.123, 0.456, 0.789] (随机数)

// 实际场景：创建占位元素
const placeholders = _.times(5, i => ({ id: i, loading: true }))

// range - 一个参数
_.range(4)
// => [0, 1, 2, 3]

// range - 两个参数
_.range(1, 5)
// => [1, 2, 3, 4]

// range - 带步长
_.range(0, 20, 5)
// => [0, 5, 10, 15]

// range - 负步长
_.range(4, 0, -1)
// => [4, 3, 2, 1]

// range - 自动推断步长
_.range(4, 0)
// => [4, 3, 2, 1] (自动使用 -1)

// rangeRight - 逆序
_.rangeRight(4)
// => [3, 2, 1, 0]

_.rangeRight(1, 5)
// => [4, 3, 2, 1]
```

### 参数规则
| 调用方式 | start | end | step |
|---------|-------|-----|------|
| range(4) | 0 | 4 | 1 |
| range(1, 5) | 1 | 5 | 1 |
| range(0, 20, 5) | 0 | 20 | 5 |
| range(4, 0) | 4 | 0 | -1 |

## 4. 写作要求

### 开篇方式
从"生成序列数据"的常见需求引入

### 结构组织
```
1. 迭代工具概述（300字）
   - times vs range
   - 应用场景
   
2. times 源码解析（400字）
   - 迭代执行
   - 边界处理
   
3. range 源码解析（500字）
   - 参数重载
   - 自动推断步长
   - baseRange 实现
   
4. rangeRight 源码解析（200字）
   - 逆序生成
   
5. 实际应用场景（300字）

6. 小结
```

### 代码示例
- 各方法基本用法
- 参数重载示例
- 实际应用场景

### 图表需求
- 参数规则对比表
- range 生成过程图

## 5. 技术细节

### 源码参考
- `times.js`
- `range.js`
- `rangeRight.js`
- `.internal/baseRange.js`

### 实现要点
- times 预分配数组长度
- range 使用 Math.ceil 计算长度
- 步长为 0 时会导致无限循环（需要检查）
- rangeRight 只是 baseRange 的 fromRight 参数为 true

### 常见问题
- Q: range 和 times 有什么区别？
- A: range 生成数字序列，times 执行函数并收集结果

- Q: range(4, 0) 会怎样？
- A: 自动推断步长为 -1，返回 [4, 3, 2, 1]

## 6. 风格指导

### 语气语调
实用导向，强调参数灵活性

### 类比方向
- 将 range 比作"刻度尺"
- 将 times 比作"重复执行"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
