# 章节写作指导：数值限制

## 1. 章节信息
- **章节标题**: 数值限制：clamp、inRange、random
- **文件名**: math/clamp-range.md
- **所属部分**: 第八部分 - 数学与数值方法
- **章节序号**: 48
- **预计阅读时间**: 15分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 理解 clamp 的数值限制原理
- 掌握 inRange 的范围检查
- 了解 random 的随机数生成

### 技能目标
- 能够使用这些方法进行数值处理
- 理解边界条件的处理

## 3. 内容要点

### 核心函数

#### clamp
```javascript
// clamp - 将数值限制在范围内
function clamp(number, lower, upper) {
  number = +number
  lower = +lower
  upper = +upper
  
  // 处理 NaN
  lower = lower === lower ? lower : 0
  upper = upper === upper ? upper : 0
  
  if (number === number) {
    // 限制在范围内
    number = number <= upper ? number : upper
    number = number >= lower ? number : lower
  }
  return number
}
```

#### inRange
```javascript
// inRange - 检查数值是否在范围内
function inRange(number, start, end) {
  number = +number
  
  // 只有两个参数时，start 为 0
  if (end === undefined) {
    end = start
    start = 0
  } else {
    start = +start
    end = +end
  }
  
  // 交换顺序（如果 start > end）
  if (start > end) {
    [start, end] = [end, start]
  }
  
  return number >= start && number < end
}
```

#### random
```javascript
// random - 生成随机数
function random(lower, upper, floating) {
  // 参数处理
  if (floating === undefined) {
    if (typeof upper === 'boolean') {
      floating = upper
      upper = undefined
    } else if (typeof lower === 'boolean') {
      floating = lower
      lower = undefined
    }
  }
  
  // 默认值
  if (lower === undefined && upper === undefined) {
    lower = 0
    upper = 1
  } else if (upper === undefined) {
    upper = lower
    lower = 0
  }
  
  lower = +lower
  upper = +upper
  
  // 交换（如果需要）
  if (lower > upper) {
    [lower, upper] = [upper, lower]
  }
  
  // 判断是否返回浮点数
  if (floating || lower % 1 || upper % 1) {
    const rand = Math.random()
    const precision = `${rand}`.length - 1
    return Math.min(lower + rand * (upper - lower + parseFloat(`1e-${precision}`)), upper)
  }
  
  return lower + Math.floor(Math.random() * (upper - lower + 1))
}
```

### 使用示例
```javascript
// clamp - 限制范围
_.clamp(-10, -5, 5)   // => -5
_.clamp(10, -5, 5)    // => 5
_.clamp(3, -5, 5)     // => 3

// 实际场景：限制滑块值
const sliderValue = _.clamp(userInput, 0, 100)

// inRange - 范围检查
_.inRange(3, 2, 4)    // => true
_.inRange(4, 8)       // => true (0 <= 4 < 8)
_.inRange(4, 2)       // => false (0 <= 4 < 2 不成立)
_.inRange(2, 2)       // => false (不包含上界)
_.inRange(-3, -4, -2) // => true

// random - 随机数
_.random(0, 5)        // => 0-5 的整数
_.random(5)           // => 0-5 的整数
_.random(5, true)     // => 0-5 的浮点数
_.random(1.2, 5.2)    // => 1.2-5.2 的浮点数
```

### 边界行为
| 方法 | 边界规则 |
|------|---------|
| clamp | 包含上下界 |
| inRange | 包含下界，不包含上界 [lower, upper) |
| random (整数) | 包含上下界 |
| random (浮点) | 理论上不包含上界 |

## 4. 写作要求

### 开篇方式
从"表单验证、游戏开发"等场景引入

### 结构组织
```
1. 数值限制方法概述（300字）
   - 应用场景
   
2. clamp 源码解析（400字）
   - 限制逻辑
   - NaN 处理
   
3. inRange 源码解析（400字）
   - 参数处理
   - 半开区间
   
4. random 源码解析（500字）
   - 参数重载
   - 整数 vs 浮点数
   - 精度处理
   
5. 小结
```

### 代码示例
- 各方法基本用法
- 实际应用场景
- 边界情况

### 图表需求
- 边界行为对比表
- clamp 效果示意图

## 5. 技术细节

### 源码参考
- `clamp.js`
- `inRange.js`
- `random.js`

### 实现要点
- clamp 使用 NaN 自比较检测
- inRange 是半开区间 [lower, upper)
- random 自动处理参数顺序
- random 根据输入类型决定返回整数还是浮点数

### 常见问题
- Q: inRange(2, 2) 为什么返回 false？
- A: 使用半开区间，不包含上界

- Q: random(1.5, 2.5) 返回整数还是浮点数？
- A: 浮点数，因为参数是浮点数

## 6. 风格指导

### 语气语调
实用导向，强调边界行为

### 类比方向
- 将 clamp 比作"限速"
- 将 inRange 比作"区间判断"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
