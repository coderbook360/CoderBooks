# 模板方法模式：算法骨架与钩子

## 问题的起源

假设你正在开发一个数据导出功能，需要支持导出为 CSV、JSON、XML 等多种格式。每种导出流程都包含相同的步骤：

1. 连接数据源
2. 查询数据
3. 格式化数据
4. 写入文件
5. 关闭连接

最直观的实现可能是为每种格式写一个完整的导出类：

```typescript
class CsvExporter {
  export(): void {
    this.connect();
    const data = this.query();
    const formatted = this.formatAsCsv(data);
    this.writeToFile(formatted, 'data.csv');
    this.disconnect();
  }
  // ... 各种方法实现
}

class JsonExporter {
  export(): void {
    this.connect();
    const data = this.query();
    const formatted = this.formatAsJson(data);
    this.writeToFile(formatted, 'data.json');
    this.disconnect();
  }
  // ... 各种方法实现
}
```

**问题**：两个类的导出流程几乎一样，只有格式化步骤不同。大量重复代码！

## 模板方法模式的核心思想

模板方法模式的核心思想是：**在父类中定义算法的骨架，将某些步骤延迟到子类实现**。

模板方法让子类在不改变算法结构的情况下，重新定义算法的某些步骤。

## 基础实现

用 TypeScript 实现模板方法模式：

```typescript
abstract class DataExporter {
  // 模板方法：定义算法骨架
  export(): void {
    this.connect();
    const data = this.query();
    const formatted = this.format(data);
    this.write(formatted);
    this.disconnect();
    this.afterExport(); // 钩子方法
  }

  // 具体方法：所有子类共享
  protected connect(): void {
    console.log('连接数据库...');
  }

  protected disconnect(): void {
    console.log('断开连接');
  }

  protected query(): unknown[] {
    console.log('查询数据...');
    return [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
  }

  // 抽象方法：子类必须实现
  protected abstract format(data: unknown[]): string;
  protected abstract write(content: string): void;

  // 钩子方法：子类可选覆盖
  protected afterExport(): void {
    // 默认什么都不做
  }
}
```

子类实现：

```typescript
class CsvExporter extends DataExporter {
  protected format(data: unknown[]): string {
    const header = Object.keys(data[0] as object).join(',');
    const rows = data.map(item => 
      Object.values(item as object).join(',')
    );
    return [header, ...rows].join('\n');
  }

  protected write(content: string): void {
    console.log('写入 CSV 文件:');
    console.log(content);
  }
}

class JsonExporter extends DataExporter {
  protected format(data: unknown[]): string {
    return JSON.stringify(data, null, 2);
  }

  protected write(content: string): void {
    console.log('写入 JSON 文件:');
    console.log(content);
  }

  // 覆盖钩子方法
  protected afterExport(): void {
    console.log('发送导出完成通知');
  }
}
```

使用方式：

```typescript
const csvExporter = new CsvExporter();
csvExporter.export();
// 连接数据库...
// 查询数据...
// 写入 CSV 文件:
// id,name
// 1,Alice
// 2,Bob
// 断开连接

const jsonExporter = new JsonExporter();
jsonExporter.export();
// 连接数据库...
// 查询数据...
// 写入 JSON 文件:
// [{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]
// 断开连接
// 发送导出完成通知
```

## 钩子方法的妙用

钩子方法让子类可以在特定点"钩入"算法：

```typescript
abstract class OrderProcessor {
  process(order: Order): void {
    this.validate(order);
    
    // 钩子：是否需要审批？
    if (this.needsApproval(order)) {
      this.requestApproval(order);
    }
    
    this.calculateTotal(order);
    
    // 钩子：折扣计算
    const discount = this.calculateDiscount(order);
    order.total -= discount;
    
    this.save(order);
    
    // 钩子：后处理
    this.afterProcess(order);
  }

  protected abstract validate(order: Order): void;
  protected abstract calculateTotal(order: Order): void;
  protected abstract save(order: Order): void;

  // 钩子方法：默认不需要审批
  protected needsApproval(order: Order): boolean {
    return false;
  }

  protected requestApproval(order: Order): void {
    console.log('请求审批...');
  }

  // 钩子方法：默认无折扣
  protected calculateDiscount(order: Order): number {
    return 0;
  }

  // 钩子方法：默认无后处理
  protected afterProcess(order: Order): void {}
}

// 大额订单处理器
class LargeOrderProcessor extends OrderProcessor {
  protected validate(order: Order): void {
    if (order.items.length === 0) {
      throw new Error('订单不能为空');
    }
  }

  protected calculateTotal(order: Order): void {
    order.total = order.items.reduce((sum, item) => 
      sum + item.price * item.quantity, 0
    );
  }

  protected save(order: Order): void {
    console.log('保存订单:', order.id);
  }

  // 覆盖钩子：大额订单需要审批
  protected needsApproval(order: Order): boolean {
    return order.total > 10000;
  }

  // 覆盖钩子：大额订单享受折扣
  protected calculateDiscount(order: Order): number {
    return order.total > 5000 ? order.total * 0.1 : 0;
  }
}
```

## 函数式模板方法

在 JavaScript 中，可以用高阶函数实现模板方法：

```typescript
interface ExportOptions<T> {
  query: () => T[];
  format: (data: T[]) => string;
  write: (content: string, filename: string) => void;
  filename: string;
  beforeExport?: () => void;
  afterExport?: () => void;
}

function createExporter<T>(options: ExportOptions<T>) {
  return function export_(): void {
    options.beforeExport?.();
    
    console.log('连接数据源...');
    const data = options.query();
    const formatted = options.format(data);
    options.write(formatted, options.filename);
    console.log('断开连接');
    
    options.afterExport?.();
  };
}

// 使用
const exportToCsv = createExporter({
  query: () => [{ id: 1, name: 'Alice' }],
  format: (data) => data.map(d => `${d.id},${d.name}`).join('\n'),
  write: (content, filename) => console.log(`写入 ${filename}:`, content),
  filename: 'data.csv',
});

exportToCsv();
```

## 模板方法 vs 策略模式

两者都用于算法的变化，但方式不同：

| 特性 | 模板方法模式 | 策略模式 |
|------|-------------|---------|
| 变化方式 | 继承 | 组合 |
| 变化粒度 | 算法的某些步骤 | 整个算法 |
| 算法骨架 | 父类定义 | 无固定骨架 |
| 运行时切换 | 不支持 | 支持 |

## 实际应用：React 组件生命周期

React 类组件的生命周期就是模板方法模式的典型应用：

```typescript
abstract class Component<P, S> {
  props: P;
  state: S;

  // 模板方法
  private mount(): void {
    this.componentWillMount?.();
    this.render();
    this.componentDidMount?.();
  }

  private update(prevProps: P, prevState: S): void {
    if (this.shouldComponentUpdate?.(prevProps, prevState) ?? true) {
      this.componentWillUpdate?.();
      this.render();
      this.componentDidUpdate?.(prevProps, prevState);
    }
  }

  private unmount(): void {
    this.componentWillUnmount?.();
  }

  // 抽象方法：必须实现
  abstract render(): void;

  // 钩子方法：可选实现
  componentWillMount?(): void;
  componentDidMount?(): void;
  shouldComponentUpdate?(prevProps: P, prevState: S): boolean;
  componentWillUpdate?(): void;
  componentDidUpdate?(prevProps: P, prevState: S): void;
  componentWillUnmount?(): void;
}
```

## 模板方法模式的优缺点

**优点**：
- **代码复用**：公共代码放在父类
- **扩展性**：子类可以扩展特定步骤
- **控制反转**：父类控制流程，子类提供实现

**缺点**：
- **继承的缺点**：子类与父类紧耦合
- **难以理解**：需要理解父类才能正确实现子类
- **违反里氏替换**：如果子类大幅修改行为

## 应用场景

1. **数据导出/导入**：不同格式的处理流程
2. **构建流程**：编译、打包、部署的标准流程
3. **测试框架**：setup、test、teardown 流程
4. **组件生命周期**：React/Vue 组件的生命周期

## 总结

模板方法模式通过在父类中定义算法骨架，让子类在不改变整体结构的情况下重新定义某些步骤。钩子方法提供了额外的扩展点，让子类可以选择性地参与算法的执行。

关键要点：
1. 模板方法定义算法的骨架
2. 抽象方法是子类必须实现的步骤
3. 钩子方法是子类可选覆盖的扩展点
4. 优先使用组合而非继承时，考虑策略模式
