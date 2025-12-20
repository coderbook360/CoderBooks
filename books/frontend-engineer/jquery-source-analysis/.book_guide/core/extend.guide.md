# 章节指导：jQuery.extend深度解析

## 章节定位
深入分析jQuery中使用最广泛的extend函数，理解其多重用途和实现原理。

## 学习目标
1. 理解extend的多种使用方式
2. 掌握浅拷贝与深拷贝的区别
3. 分析extend的源码实现
4. 学会设计多功能工具函数

## 核心内容要求

### 1. extend的多种用法
- 扩展jQuery静态方法：$.extend({ ... })
- 扩展jQuery实例方法：$.fn.extend({ ... })
- 合并对象：$.extend(target, source1, source2)
- 深拷贝：$.extend(true, target, source)
- 默认参数模式：$.extend({}, defaults, options)

### 2. 源码分析
- 参数归一化
- 遍历源对象
- 浅拷贝逻辑
- 深拷贝逻辑
- 循环引用处理

### 3. 浅拷贝vs深拷贝
- 引用复制vs值复制
- 性能差异
- 适用场景

### 4. 设计思想
- 一个函数多种用途
- 参数重载
- 默认参数模式

### 5. 现代替代方案
- Object.assign
- 展开运算符
- structuredClone

## 写作风格
- 从使用场景入手
- 逐步深入源码
- 对比现代方案
