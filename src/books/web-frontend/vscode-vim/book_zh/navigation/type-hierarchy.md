# 类型层级：接口与实现的追踪

在面向对象和类型化编程中，理解类型的继承层级对于阅读和重构代码至关重要。VSCode 提供了类型层级导航功能，配合 Vim 键位可以高效地追踪接口与实现。

## 什么是类型层级

类型层级展示一个类型的"家族关系"：

```typescript
interface Animal {
  speak(): void;
}

interface Dog extends Animal {
  bark(): void;
}

class Labrador implements Dog {
  speak() { console.log("Woof"); }
  bark() { console.log("Bark!"); }
}
```

层级关系：
```
Animal (interface)
└── Dog (interface)
    └── Labrador (class)
```

## 显示类型层级

将光标放在类型名称上，调用类型层级命令：

```json
{
  "before": ["<leader>", "t", "h"],
  "commands": ["editor.showTypeHierarchy"]
}
```

`\th` 打开类型层级视图。

## 两种方向

### 向下：查看实现和子类

"谁实现了这个接口？" "这个类有哪些子类？"

```typescript
interface Logger {
  log(msg: string): void;
}
// ↑ \th 查看层级
// 显示：ConsoleLogger, FileLogger, RemoteLogger...
```

### 向上：查看父类和接口

"这个类实现了哪些接口？" "它继承自哪个父类？"

```typescript
class ConsoleLogger implements Logger {
  // ↑ \th 查看层级
  // 显示：Logger, Disposable...
}
```

## 在层级视图中导航

层级视图打开后：
- `j/k`：上下移动
- `h`：折叠
- `l`：展开
- `Enter`：跳转到该类型
- `Escape`：关闭

## 与 gd/gi 的区别

| 命令 | 功能 | 适用 |
|------|------|------|
| `gd` | 跳转到定义 | 知道具体要看哪个 |
| `gi` | 跳转到实现 | 接口 → 实现类 |
| `\th` | 显示类型层级 | 浏览整个继承树 |

`gi` 直接跳转，适合只有一个或少数实现的情况。类型层级适合复杂继承关系的探索。

## 调用层级

除了类型层级，还有调用层级（Call Hierarchy）：

```json
{
  "before": ["<leader>", "c", "h"],
  "commands": ["editor.showCallHierarchy"]
}
```

`\ch` 显示函数的调用层级：
- **Incoming calls**：谁调用了这个函数
- **Outgoing calls**：这个函数调用了谁

### 使用场景

**理解函数影响范围**：

```typescript
function validateUser(user: User): boolean {
  // ↑ \ch 查看谁调用了 validateUser
  // 发现：login(), register(), updateProfile()...
  // 修改这个函数会影响这些调用者
}
```

**追踪数据流**：

```typescript
function processData(data: Data) {
  // ↑ \ch 查看 outgoing calls
  // 发现：transform() → validate() → save()
  // 理解数据处理流程
}
```

## 层级视图操作

在调用层级视图中：

- **切换方向**：点击视图工具栏的切换按钮，或使用命令
- **刷新**：代码变更后刷新层级
- **聚焦**：选中某个调用，以它为根重新展开

## 实战场景

### 场景 1：重构前的影响分析

要修改一个基础接口：

```
1. 在接口名上 \th
2. 展开类型层级
3. 看到所有实现类
4. 评估修改影响
5. 确定重构策略
```

### 场景 2：理解设计模式

遇到复杂的继承结构：

```
1. 在顶层抽象类上 \th
2. 层层展开子类
3. 理解整个类族设计
4. 识别设计模式（如：模板方法、策略等）
```

### 场景 3：调试调用链

函数行为异常，需要追踪调用：

```
1. 在函数名上 \ch
2. 查看 incoming calls
3. 找到可疑的调用者
4. 跳转过去检查
```

## 语言支持

类型层级需要语言服务器支持。支持良好的语言：

- TypeScript / JavaScript（最佳）
- Java
- C# 
- Go
- Python（有限）

对于 TypeScript/JavaScript 项目，这些功能开箱即用。

## 配置汇总

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "t", "h"],
      "commands": ["editor.showTypeHierarchy"]
    },
    {
      "before": ["<leader>", "c", "h"],
      "commands": ["editor.showCallHierarchy"]
    }
  ]
}
```

## 助记

- `\th`：**T**ype **H**ierarchy
- `\ch`：**C**all **H**ierarchy

---

**本章收获**：
- ✅ 理解类型层级的概念
- ✅ 掌握类型层级和调用层级命令
- ✅ 学会在层级视图中导航
- ✅ 应用于重构和调试场景

**效率提升**：复杂继承和调用关系不再是迷宫，层级视图让结构一目了然。
