# 章节写作指导：常用字符串操作

## 1. 章节信息
- **章节标题**: 常用字符串操作：truncate、repeat、split
- **文件名**: string/common-operations.md
- **所属部分**: 第七部分 - 字符串方法
- **章节序号**: 46
- **预计阅读时间**: 15分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 理解 truncate 的截断策略
- 掌握 repeat 的实现
- 了解 Lodash split 的增强功能

### 技能目标
- 能够使用这些方法处理常见字符串操作
- 理解与原生方法的区别

## 3. 内容要点

### 核心函数

#### truncate
```javascript
// truncate - 截断字符串
function truncate(string, options = {}) {
  let { length = 30, omission = '...', separator } = options
  
  string = toString(string)
  
  // 计算最大长度
  let strLength = string.length
  if (strLength <= length) {
    return string
  }
  
  // 预留省略号长度
  let end = length - omission.length
  if (end < 1) {
    return omission
  }
  
  let result = string.slice(0, end)
  
  // 处理分隔符（在单词边界截断）
  if (separator !== undefined) {
    if (typeof separator === 'string') {
      const index = result.lastIndexOf(separator)
      if (index > -1) {
        result = result.slice(0, index)
      }
    } else if (separator instanceof RegExp) {
      const match = string.slice(0, end + 1).match(separator)
      if (match) {
        result = result.slice(0, match.index)
      }
    }
  }
  
  return result + omission
}
```

#### repeat
```javascript
// repeat - 重复字符串
function repeat(string, n = 1) {
  string = toString(string)
  n = toInteger(n)
  
  if (n < 1 || !string) {
    return ''
  }
  
  // 使用原生方法
  return string.repeat(n)
}
```

#### split
```javascript
// split - 拆分字符串（增强版）
function split(string, separator, limit) {
  if (limit !== undefined && typeof limit !== 'number') {
    limit = undefined
  }
  return toString(string).split(separator, limit)
}
```

#### 其他常用方法
```javascript
// startsWith
function startsWith(string, target, position = 0) {
  string = toString(string)
  return string.startsWith(target, position)
}

// endsWith
function endsWith(string, target, position) {
  string = toString(string)
  return position === undefined
    ? string.endsWith(target)
    : string.endsWith(target, position)
}

// replace
function replace(string, pattern, replacement) {
  return toString(string).replace(pattern, replacement)
}
```

### 使用示例
```javascript
// truncate - 基本用法
_.truncate('hi-diddly-ho there, neighborino')
// => 'hi-diddly-ho there, neighbo...'

// truncate - 自定义长度和省略号
_.truncate('hi-diddly-ho there, neighborino', {
  length: 24,
  omission: ' [...]'
})
// => 'hi-diddly-ho there [...]'

// truncate - 在分隔符处截断
_.truncate('hi-diddly-ho there, neighborino', {
  length: 24,
  separator: ' '
})
// => 'hi-diddly-ho there,...'

// truncate - 使用正则作为分隔符
_.truncate('hi-diddly-ho there, neighborino', {
  length: 24,
  separator: /,? +/
})
// => 'hi-diddly-ho there...'

// repeat
_.repeat('*', 3)    // => '***'
_.repeat('abc', 2)  // => 'abcabc'

// split
_.split('a-b-c', '-')     // => ['a', 'b', 'c']
_.split('a-b-c', '-', 2)  // => ['a', 'b']

// startsWith / endsWith
_.startsWith('abc', 'a')   // => true
_.endsWith('abc', 'c')     // => true
```

## 4. 写作要求

### 开篇方式
从"显示长文本的摘要"这个常见需求引入

### 结构组织
```
1. 常用字符串操作概述（300字）
   - 各方法用途
   - 与原生方法的关系
   
2. truncate 源码解析（500字）
   - 长度计算
   - 省略号处理
   - 分隔符截断
   
3. repeat 源码解析（200字）
   - 使用原生 repeat
   
4. split 与其他方法（300字）
   - 增强的 split
   - startsWith/endsWith
   
5. 实际应用场景（300字）

6. 小结
```

### 代码示例
- truncate 各种配置
- repeat 基本用法
- split 与原生对比

### 图表需求
- truncate 选项配置表

## 5. 技术细节

### 源码参考
- `truncate.js`
- `repeat.js`
- `split.js`
- `startsWith.js`, `endsWith.js`
- `replace.js`

### 实现要点
- truncate 需要预留 omission 的长度
- separator 支持字符串和正则
- 大部分方法是原生方法的包装
- 都会先调用 toString 处理输入

### 常见问题
- Q: truncate 会截断 emoji 吗？
- A: 可能会，因为按字符长度计算

- Q: 为什么需要包装原生方法？
- A: 提供 null 安全和一致的 API

## 6. 风格指导

### 语气语调
实用导向，简洁明了

### 类比方向
- 将 truncate 比作"文章摘要"
- 将 repeat 比作"复印"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
