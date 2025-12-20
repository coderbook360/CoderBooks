# 章节写作指导：字符串填充与修剪

## 1. 章节信息
- **章节标题**: 字符串填充与修剪：pad、trim
- **文件名**: string/pad-trim.md
- **所属部分**: 第七部分 - 字符串方法
- **章节序号**: 44
- **预计阅读时间**: 15分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 理解字符串填充和修剪的实现
- 掌握 pad 系列和 trim 系列的区别
- 了解自定义填充/修剪字符的机制

### 技能目标
- 能够使用填充方法格式化输出
- 能够使用修剪方法清理字符串

## 3. 内容要点

### 核心函数

#### pad / padStart / padEnd
```javascript
// pad - 两侧填充
function pad(string, length, chars) {
  string = toString(string)
  length = toInteger(length)
  
  if (!length || string.length >= length) {
    return string
  }
  
  const mid = (length - string.length) / 2
  return createPadding(Math.floor(mid), chars) + 
         string + 
         createPadding(Math.ceil(mid), chars)
}

// padStart - 左侧填充
function padStart(string, length, chars) {
  string = toString(string)
  length = toInteger(length)
  
  const strLength = string.length
  if (length <= strLength) {
    return string
  }
  
  return createPadding(length - strLength, chars) + string
}

// padEnd - 右侧填充
function padEnd(string, length, chars) {
  string = toString(string)
  length = toInteger(length)
  
  const strLength = string.length
  if (length <= strLength) {
    return string
  }
  
  return string + createPadding(length - strLength, chars)
}

// createPadding - 创建填充字符串
function createPadding(length, chars) {
  chars = chars === undefined ? ' ' : toString(chars)
  
  if (!chars || length < 1) {
    return ''
  }
  
  const charsLength = chars.length
  const padLength = Math.ceil(length / charsLength)
  
  return chars.repeat(padLength).slice(0, length)
}
```

#### trim / trimStart / trimEnd
```javascript
// trim - 两侧修剪
function trim(string, chars) {
  string = toString(string)
  if (!string) return string
  
  if (chars === undefined) {
    return string.trim()
  }
  
  chars = baseToString(chars)
  // 使用正则去除两侧的指定字符
  const pattern = `^[${escapeRegExp(chars)}]+|[${escapeRegExp(chars)}]+$`
  return string.replace(new RegExp(pattern, 'g'), '')
}

// trimStart - 左侧修剪
function trimStart(string, chars) {
  string = toString(string)
  if (!string) return string
  
  if (chars === undefined) {
    return string.trimStart()
  }
  
  chars = baseToString(chars)
  const pattern = `^[${escapeRegExp(chars)}]+`
  return string.replace(new RegExp(pattern), '')
}

// trimEnd - 右侧修剪
function trimEnd(string, chars) {
  string = toString(string)
  if (!string) return string
  
  if (chars === undefined) {
    return string.trimEnd()
  }
  
  chars = baseToString(chars)
  const pattern = `[${escapeRegExp(chars)}]+$`
  return string.replace(new RegExp(pattern), '')
}
```

### 使用示例
```javascript
// pad - 居中填充
_.pad('abc', 8)       // => '  abc   '
_.pad('abc', 8, '_-') // => '_-abc_-_'
_.pad('abc', 2)       // => 'abc' (不截断)

// padStart - 左填充
_.padStart('1', 3, '0')    // => '001'
_.padStart('abc', 6)       // => '   abc'

// padEnd - 右填充
_.padEnd('abc', 6)         // => 'abc   '
_.padEnd('abc', 6, '_')    // => 'abc___'

// trim - 去除两侧空白
_.trim('  abc  ')          // => 'abc'
_.trim('_-abc-_', '_-')    // => 'abc'

// trimStart - 去除左侧
_.trimStart('  abc  ')     // => 'abc  '
_.trimStart('_-abc', '_-') // => 'abc'

// trimEnd - 去除右侧
_.trimEnd('  abc  ')       // => '  abc'
_.trimEnd('abc_-', '_-')   // => 'abc'
```

## 4. 写作要求

### 开篇方式
从"格式化输出、清理用户输入"的常见需求引入

### 结构组织
```
1. 填充与修剪概述（300字）
   - 应用场景
   - 与原生方法的关系
   
2. pad 系列源码解析（500字）
   - createPadding 实现
   - pad/padStart/padEnd 的差异
   
3. trim 系列源码解析（500字）
   - 默认行为（使用原生）
   - 自定义字符修剪
   
4. 实际应用场景（300字）
   - 数字格式化
   - 输入清理
   
5. 小结
```

### 代码示例
- 各方法基本用法
- 自定义填充/修剪字符
- 实际场景应用

### 图表需求
- pad 系列效果对比图
- trim 系列效果对比图

## 5. 技术细节

### 源码参考
- `pad.js`, `padStart.js`, `padEnd.js`
- `trim.js`, `trimStart.js`, `trimEnd.js`
- `.internal/createPadding.js`

### 实现要点
- 无自定义字符时使用原生方法
- createPadding 使用 repeat + slice 创建填充
- trim 使用正则匹配自定义字符
- pad 不截断超长字符串

### 常见问题
- Q: pad 长度小于字符串长度怎么办？
- A: 返回原字符串，不截断

- Q: trim 如何处理多种字符？
- A: 传入包含所有字符的字符串，如 '_-'

## 6. 风格指导

### 语气语调
实用导向，简洁明了

### 类比方向
- 将 pad 比作"填空"
- 将 trim 比作"剪边"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
