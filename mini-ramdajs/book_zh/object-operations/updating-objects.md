# 17. 对象更新与演进：`assoc`、`dissoc` 与 `evolve`

在函数式编程中，不可变性是核心原则之一。当我们想要“修改”一个对象时，我们实际上是创建一个包含新信息的新对象，而原始对象保持不变。这保证了数据流的可预测性，并避免了难以追踪的副作用。

Ramda 提供了 `assoc`、`dissoc` 和 `evolve` 三个关键函数，用于以纯函数的方式处理对象的更新。

## `R.assoc`：关联一个新属性

`R.assoc` (associate) 是 `obj.prop = value` 的纯函数版本。它接受一个属性名、一个值和一个对象，然后返回一个**新**的对象，该对象包含了指定属性的新值。

它的签名是 `assoc(prop, value, object)`。

```javascript
import { assoc } from 'ramda';

const user = { name: 'Alice' };

// 为用户添加年龄
const userWithAge = assoc('age', 30, user);
//=> { name: 'Alice', age: 30 }

// 如果属性已存在，则更新它
const updatedUser = assoc('name', 'Alicia', userWithAge);
//=> { name: 'Alicia', age: 30 }

console.log(user); // 原对象不受影响 => { name: 'Alice' }
```

`assoc` 是 Redux 等状态管理库中 reducer 的核心构建块。每次更新状态时，你实际上都是在使用类似 `assoc` 的操作来创建一个新的状态对象。

### `R.assocPath`：深层关联

与 `path` 对应，`assocPath` 用于“写入”深层嵌套的属性。它会安全地创建不存在的中间路径。

```javascript
import { assocPath } from 'ramda';

const user = { name: 'Bob' };

// 设置用户的地址和城市
const userWithCity = assocPath(['address', 'city'], 'New York', user);
/*
=> {
  name: 'Bob',
  address: {
    city: 'New York'
  }
}
*/
```

## `R.dissoc`：移除一个属性

`R.dissoc` (dissociate) 是 `delete obj.prop` 的纯函数版本。它接受一个属性名和一个对象，并返回一个不包含该属性的新对象。

它的签名是 `dissoc(prop, object)`。

```javascript
import { dissoc } from 'ramda';

const user = { id: 1, name: 'Charlie', password: '123456' };

// 在将用户信息发送到前端之前，移除敏感的密码字段
const publicUser = dissoc('password', user);
//=> { id: 1, name: 'Charlie' }
```

## `R.evolve`：声明式地“演进”一个对象

`evolve` 是 Ramda 中最强大、最独特的对象操作函数之一。它允许你提供一个“转换规范”对象，该对象定义了如何**演进**原始对象的某些属性。

“转换规范”对象的 `key` 必须是原始对象中存在的 `key`，而 `value` 则是一个函数，该函数将被应用于原始对象对应 `key` 的值上。

它的签名是 `evolve(transformations, object)`。

假设我们有一个游戏角色，在一次升级中，他的得分增加了 100，生命值恢复到了最大值 100，并且装备列表里增加了一把“神剑”。

```javascript
import { evolve, add, always, append } from 'ramda';

const character = {
  name: 'Hero',
  score: 1500,
  hp: 85,
  equipment: ['长剑', '盾牌'],
};

const transformations = {
  score: add(100),          // 分数加 100
  hp: always(100),            // 生命值变为 100
  equipment: append('神剑'), // 装备列表追加一项
};

const evolvedCharacter = evolve(transformations, character);

/*
evolvedCharacter => {
  name: 'Hero', // 未在规范中定义的属性保持不变
  score: 1600,
  hp: 100,
  equipment: ['长剑', '盾牌', '神剑'],
}
*/
```

`evolve` 的美妙之处在于它的声明性。`transformations` 对象清晰地描述了状态将如何“演进”，而没有一行命令式的赋值语句。它甚至可以处理嵌套对象的演进：

```javascript
const state = { counter: { count: 0 }, settings: { theme: 'light' } };

const nestedEvolve = {
  counter: { count: add(1) }
};

evolve(nestedEvolve, state);
//=> { counter: { count: 1 }, settings: { theme: 'light' } }
```

## 总结

`assoc`、`dissoc` 和 `evolve` 为我们提供了以不可变方式更新对象的完整工具集。

-   使用 `assoc` 来设置或更新单个属性。
-   使用 `dissoc` 来移除单个属性。
-   当你需要对一个或多个属性应用函数转换时，使用 `evolve`，这是最声明式、最强大的方式。

掌握了这些函数，你就能以一种安全、可预测且高度可读的方式来管理复杂的状态变更。
