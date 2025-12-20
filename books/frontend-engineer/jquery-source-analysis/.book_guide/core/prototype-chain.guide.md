# 章节指导：原型链与链式调用

## 章节定位
讲解jQuery原型链的设计和链式调用的实现原理，这是jQuery API优雅性的核心。

## 写作方向
- 深入JavaScript原型机制
- 分析链式调用的设计优势
- 聚焦现代JavaScript，忽略兼容性问题

## 学习目标
1. 理解jQuery.fn与jQuery.prototype的关系
2. 掌握jQuery原型链的结构
3. 理解链式调用的实现原理
4. 学会设计支持链式调用的API

## 核心内容要求

### 1. jQuery.fn的本质
- jQuery.fn = jQuery.prototype
- 为什么使用fn别名
- 原型上的核心方法

### 2. 原型链结构
- jQuery对象的原型链
- init.prototype = jQuery.fn的作用
- 实例与原型的关系

### 3. 链式调用实现
- return this的魔法
- 隐式迭代
- 链式调用的优缺点

### 4. 静态方法vs实例方法
- $.each vs $().each
- 静态方法放在jQuery对象上
- 实例方法放在jQuery.prototype上

### 5. 设计启示
- 流畅接口（Fluent Interface）
- 何时使用链式调用
- 现代API的链式设计

## 禁止事项
- 禁止讨论浏览器兼容性
- 避免过度理论化原型链
