# 16. 属性访问：`prop`、`path` 与 `pick`

在 JavaScript 中，我们最常做的操作之一就是访问对象的属性。无论是 `user.name` 还是 `data['id']`，这种语法简洁明了。然而，在函数式编程的范式中，这种直接访问的方式存在两个主要问题：

1.  **它不是函数**：你无法将 `.` 或 `[]` 作为参数传递给高阶函数，比如 `map`。这使得代码组合变得困难。
2.  **它不安全**：如果尝试访问一个 `null` 或 `undefined` 值的属性（例如 `user.address.city`，但 `user.address` 不存在），程序会立即抛出 `TypeError` 并崩溃。

Ramda 提供了一套优雅且安全的函数来解决这些问题，其中最基础、最常用的就是 `prop`、`path` 和 `pick`。

## `R.prop`：安全地获取单个属性

`R.prop` 是 `object[key]` 的函数式替代品。它接受一个属性名和一个对象，并返回该属性的值。

它的签名是 `prop(propertyName, object)`。

```javascript
import { prop } from 'ramda';

const user = { name: 'Alice', age: 30 };

prop('name', user); //=> 'Alice'
```

`prop` 的真正优势在于它的**安全**性和**可组合性**。

-   **安全性**：如果对象是 `null` 或 `undefined`，或者属性不存在，`prop` 会返回 `undefined`，而不是抛出错误。

    ```javascript
    prop('name', null); //=> undefined
    prop('email', user); //=> undefined
    ```

-   **可组合性**：因为 `prop` 是一个函数，它可以被轻松地用于函数组合中。一个最常见的例子就是与 `map` 结合，从一个对象数组中提取所有同名属性。

    ```javascript
    import { map, prop } from 'ramda';

    const users = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ];

    // "给我一个用户列表，我将映射它，并取出每个用户的'name'属性"
    const getUserNames = map(prop('name'));

    getUserNames(users); //=> ['Alice', 'Bob']
    ```
    这行代码 `map(prop('name'))` 完美地体现了函数式编程的声明式和可读性。

## `R.path`：安全地访问深层嵌套属性

当我们需要访问像 `response.data.user.profile.avatar` 这样的深层嵌套属性时，问题就变得更加复杂。在原生 JavaScript 中，我们需要写一长串的 `&&` 检查（或者使用可选链 `?.`）来避免 `TypeError`。

`R.path` 为此提供了一个完美的解决方案。它接受一个由属性名组成的路径数组和一个对象。

它的签名是 `path([prop1, prop2, ...], object)`。

```javascript
import { path } from 'ramda';

const apiResponse = {
  data: {
    user: {
      id: 123,
      profile: {
        name: 'Charlie',
        avatar: 'http://example.com/avatar.png'
      }
    }
  }
};

// 创建一个获取头像 URL 的函数
const getAvatarUrl = path(['data', 'user', 'profile', 'avatar']);

getAvatarUrl(apiResponse); //=> 'http://example.com/avatar.png'

// 如果路径中的任何一步失败，它都会安全地返回 undefined
path(['data', 'user', 'settings', 'theme'], apiResponse); //=> undefined
```

`path` 将繁琐的、命令式的空值检查，转换成了一个声明式的、可复用的取值函数。

## `R.pick`：挑选多个属性组成新对象

有时，我们需要的不是单个属性值，而是从一个大对象中挑选出几个属性，组成一个全新的、更小的对象。这在过滤 API 响应或创建数据传输对象（DTO）时非常有用。

`R.pick` 正是为此而生。它接受一个属性名数组和一个对象，并返回一个只包含这些指定属性的新对象。

它的签名是 `pick([prop1, prop2, ...], object)`。

```javascript
import { pick } from 'ramda';

const userProfile = {
  id: 1,
  name: 'David',
  email: 'david@example.com',
  lastLogin: '2024-10-27',
  isAdmin: false,
};

// 我们只想获取用户的基本信息用于展示
const getPublicProfile = pick(['name', 'email']);

getPublicProfile(userProfile); //=> { name: 'David', email: 'david@example.com' }
```

如果 `pick` 的属性列表中包含原对象没有的属性，它会被简单地忽略掉。

## 总结

`prop`、`path` 和 `pick` 是 Ramda 对象操作工具箱中的基石。它们为我们提供了一种安全、声明式且可组合的方式来从对象中提取信息。

-   使用 `prop` 获取单个顶层属性。
-   使用 `path` 安全地钻取到深层嵌套的属性。
-   使用 `pick` 从一个大对象中挑选部分属性，创建一个新对象。

掌握了这些函数，你就迈出了用函数式思维处理对象的第一步。
