# console 家族完整用法

console 不只有 log，还有很多实用方法。

## 基本输出

```javascript
console.log('普通日志');
console.info('信息');      // 等同于 log
console.warn('警告');      // 黄色，stderr
console.error('错误');     // 红色，stderr
```

## 格式化输出

```javascript
console.log('姓名: %s, 年龄: %d', 'John', 30);
// 姓名: John, 年龄: 30

console.log('对象: %o', { name: 'John' });
// 对象: { name: 'John' }

console.log('JSON: %j', { name: 'John' });
// JSON: {"name":"John"}
```

占位符：
- `%s`：字符串
- `%d` / `%i`：整数
- `%f`：浮点数
- `%o`：对象
- `%j`：JSON

## console.table

表格形式展示数据：

```javascript
const users = [
  { name: 'John', age: 30, city: 'New York' },
  { name: 'Jane', age: 25, city: 'London' },
  { name: 'Bob', age: 35, city: 'Paris' }
];

console.table(users);
```

输出：
```
┌─────────┬────────┬─────┬───────────┐
│ (index) │  name  │ age │   city    │
├─────────┼────────┼─────┼───────────┤
│    0    │ 'John' │ 30  │ 'New York'│
│    1    │ 'Jane' │ 25  │ 'London'  │
│    2    │ 'Bob'  │ 35  │ 'Paris'   │
└─────────┴────────┴─────┴───────────┘
```

指定列：

```javascript
console.table(users, ['name', 'age']);
```

## console.dir

深度展开对象：

```javascript
const obj = {
  level1: {
    level2: {
      level3: {
        value: 'deep'
      }
    }
  }
};

console.log(obj);       // 可能显示不完整
console.dir(obj, { depth: null });  // 完整展开
```

配置选项：

```javascript
console.dir(obj, {
  depth: 3,      // 展开深度
  colors: true,  // 彩色输出
  showHidden: false  // 显示不可枚举属性
});
```

## console.time / console.timeEnd

测量代码执行时间：

```javascript
console.time('操作耗时');

// 执行一些操作
for (let i = 0; i < 1000000; i++) {}

console.timeEnd('操作耗时');
// 操作耗时: 3.456ms
```

多个计时器：

```javascript
console.time('总耗时');

console.time('步骤1');
// 步骤1操作
console.timeEnd('步骤1');

console.time('步骤2');
// 步骤2操作
console.timeEnd('步骤2');

console.timeEnd('总耗时');
```

## console.timeLog

中间计时：

```javascript
console.time('process');

// 第一步
console.timeLog('process', '第一步完成');

// 第二步
console.timeLog('process', '第二步完成');

console.timeEnd('process');
```

## console.count / console.countReset

计数器：

```javascript
function process(type) {
  console.count(type);
}

process('typeA');  // typeA: 1
process('typeB');  // typeB: 1
process('typeA');  // typeA: 2
process('typeA');  // typeA: 3

console.countReset('typeA');
process('typeA');  // typeA: 1
```

## console.group / console.groupEnd

分组输出：

```javascript
console.group('用户信息');
console.log('姓名: John');
console.log('年龄: 30');

console.group('地址');
console.log('城市: New York');
console.log('邮编: 10001');
console.groupEnd();

console.groupEnd();
```

输出：
```
用户信息
  姓名: John
  年龄: 30
  地址
    城市: New York
    邮编: 10001
```

折叠分组：

```javascript
console.groupCollapsed('详细信息');
console.log('更多内容...');
console.groupEnd();
```

## console.trace

打印调用栈：

```javascript
function a() {
  b();
}

function b() {
  c();
}

function c() {
  console.trace('调用栈');
}

a();
```

输出：
```
Trace: 调用栈
    at c (file.js:10:11)
    at b (file.js:6:3)
    at a (file.js:2:3)
    at file.js:13:1
```

## console.assert

断言失败时输出：

```javascript
const value = 10;

console.assert(value > 0, 'value 应该大于 0');       // 无输出
console.assert(value > 100, 'value 应该大于 100');   // Assertion failed: value 应该大于 100
```

## console.clear

清空控制台：

```javascript
console.clear();
```

## 实用封装

```javascript
const debug = {
  log: (...args) => {
    if (process.env.DEBUG) {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
  },
  
  time: (label, fn) => {
    console.time(label);
    const result = fn();
    console.timeEnd(label);
    return result;
  },
  
  async timeAsync(label, fn) {
    console.time(label);
    const result = await fn();
    console.timeEnd(label);
    return result;
  }
};

// 使用
debug.log('调试信息');

const result = debug.time('计算', () => {
  // 一些计算
  return 42;
});
```

## 本章小结

- `console.table` 表格展示数组/对象
- `console.time/timeEnd` 测量耗时
- `console.count` 计数统计
- `console.group` 分组输出
- `console.trace` 打印调用栈
- `console.assert` 条件断言

下一章我们将学习 Node.js 内置调试器。
