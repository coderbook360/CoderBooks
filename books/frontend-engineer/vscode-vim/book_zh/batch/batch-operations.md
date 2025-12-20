# 批量操作实战：综合运用

把前面学的技巧组合起来，解决真实的批量编辑问题。

## 场景 1：重构导入语句

### 问题

把多个单独导入合并：

```javascript
import { useState } from 'react';
import { useEffect } from 'react';
import { useCallback } from 'react';
import { useMemo } from 'react';
```

目标：

```javascript
import { useState, useEffect, useCallback, useMemo } from 'react';
```

### 方案 A：多光标

```
1. 选中第一个 import {，gb 选中其他
2. 统一删除
3. 手动整理
```

不太适合这个场景。

### 方案 B：宏 + 手动

```
1. 第一行保留
2. 第二行：0f{lywkf}i, <Esc>pdd
3. 录制成宏，对后续行执行
```

### 方案 C：直接编辑

```
1. 第一行，f} 跳到 }
2. 后面行，yiw 复制 hook 名
3. 回到第一行，粘贴
4. 删除多余行
```

这种结构变化大的情况，手动编辑更清晰。

## 场景 2：批量添加类型

### 问题

给函数参数加类型：

```javascript
function process(name, age, city, country) {
  // ...
}
```

目标：

```typescript
function process(name: string, age: number, city: string, country: string) {
  // ...
}
```

### 方案：多光标 + 手动

不同参数类型不同，用多光标定位，手动输入类型。

```
1. /name 搜索
2. ea: string 在词尾加类型
3. /age 搜索
4. ea: number 加类型
5. ...
```

或者：

```
1. f( 跳到括号
2. ci( 改变括号内全部
3. 重新输入带类型的参数
```

## 场景 3：JSON 转换

### 问题

把多行转成 JSON 数组：

```
apple
banana
cherry
date
```

目标：

```json
["apple", "banana", "cherry", "date"]
```

### 方案：宏

```
1. qa 开始录制
2. I" 行首加引号
3. A", 行尾加引号和逗号
4. j0 下一行
5. q 停止
6. 3@a 执行 3 次
7. 第一行加 [，最后一行删除逗号加 ]
```

### 方案：搜索替换

```
1. :%s/.*/"\0",/ 每行加引号
2. 手动调整首尾
```

## 场景 4：批量修改对象属性

### 问题

```javascript
const config = {
  name: "old",
  title: "old",
  label: "old",
  text: "old"
};
```

把所有 "old" 改成 "new"：

### 方案 A：搜索替换

```
/"old" 搜索
cgn"new"<Esc> 替换
.... 重复
```

### 方案 B：全局替换

```
:%s/"old"/"new"/g
```

## 场景 5：提取数据

### 问题

从代码中提取所有字符串常量：

```javascript
const A = "string1";
const B = "string2";
const C = "string3";
```

提取成列表：

```
string1
string2
string3
```

### 方案：宏 + 寄存器追加

```
1. 清空寄存器 qaq（录制空宏）
2. qa 开始录制
3. f" 跳到引号
4. yi" 复制引号内容
5. :let @A=@" . "\n" 追加到寄存器 A
6. j0 下一行
7. q 停止
8. 2@a 执行
9. "ap 粘贴收集的内容
```

这比较复杂，实际中可以用简单方法：

```
1. 多次 yi" 复制，手动粘贴
2. 或用正则搜索提取
```

## 场景 6：CSS 属性批量修改

### 问题

```css
.box {
  margin-top: 10px;
  margin-right: 10px;
  margin-bottom: 10px;
  margin-left: 10px;
}
```

改成：

```css
.box {
  margin-top: 20px;
  margin-right: 20px;
  margin-bottom: 20px;
  margin-left: 20px;
}
```

### 方案 A：cgn

```
1. /10px 搜索
2. cgn20px<Esc> 替换
3. ... 重复
```

### 方案 B：全局替换

在可视选中范围内替换：

```
1. V 选中这几行
2. :s/10px/20px/g
```

## 场景 7：React 组件属性

### 问题

```jsx
<Button onClick={handleClick} disabled={false} size="large" variant="primary">
```

每个属性换行：

```jsx
<Button
  onClick={handleClick}
  disabled={false}
  size="large"
  variant="primary"
>
```

### 方案：搜索替换

```
1. f< 跳到标签开始
2. f 空格 跳到第一个空格
3. r回车 换成回车
4. . 重复（但这里需要先搜索到下一个空格）
```

更好的方案：

```
1. f空格; 重复跳到空格
2. 每次 s回车<Tab><Tab> 替换成换行和缩进
```

或者用 Prettier 自动格式化。

## 场景 8：清理调试代码

### 问题

删除所有 console.log 行：

```javascript
console.log('debug');
const a = 1;
console.log(a);
const b = 2;
console.log(b);
```

### 方案 A：搜索删除

```
1. /console.log 搜索
2. dd 删除行
3. n. 下一个，删除
4. n. 继续
```

### 方案 B：全局命令

```
:g/console.log/d
```

一行命令删除所有匹配行。

### :g 命令详解

```vim
:g/pattern/command
```

对所有匹配 pattern 的行执行 command。

```vim
:g/console.log/d      删除所有 console.log 行
:g/^$/d               删除所有空行
:g/TODO/p             打印所有 TODO 行
:v/pattern/d          删除所有不匹配的行（:v 是 :g! 的简写）
```

## 批量操作决策树

```
需要批量修改
    │
    ├─ 修改相同吗？
    │   ├─ 是 → 位置规则吗？
    │   │       ├─ 是 → 多光标
    │   │       └─ 否 → cgn + .
    │   └─ 否 → 手动或宏
    │
    ├─ 结构化转换？
    │   └─ 是 → 搜索替换或脚本
    │
    └─ 删除操作？
        └─ 是 → :g/pattern/d
```

## 效率工具对比

| 工具 | 适用场景 | 优势 |
|------|----------|------|
| 多光标 | 相同位置批量编辑 | 实时可视 |
| 宏 | 复杂重复操作 | 灵活强大 |
| cgn + . | 搜索并替换 | 可选择性替换 |
| :%s | 全局替换 | 一次完成 |
| :g | 批量行操作 | 删除/移动行 |

## 实战心得

### 先想后做

遇到批量编辑，先停下来想：

1. 有多少处需要修改？
2. 修改内容是否相同？
3. 位置是否有规律？
4. 用什么工具最合适？

### 小批量手动，大批量工具

- 3-5 处修改：手动可能更快
- 10+ 处修改：值得花时间设置工具

### 保持简单

不要为了炫技而使用复杂方法。能解决问题的最简单方法就是最好的方法。

---

**本章收获**：
- ✅ 掌握批量操作的决策思路
- ✅ 学会组合使用各种工具
- ✅ 理解不同场景的最佳方案
- ✅ 培养批量编辑的实战思维

**效率提升**：选对工具，批量操作从痛苦变成享受。
