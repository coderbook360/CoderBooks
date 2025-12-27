# 命令模式：操作的封装与队列

## 问题的起源

假设你正在开发一个文本编辑器，需要实现撤销/重做功能。用户执行各种操作后，应该能够撤销之前的操作。

最直观的实现可能是保存文本的历史版本：

```typescript
class Editor {
  private text: string = '';
  private history: string[] = [];
  private historyIndex: number = -1;

  type(text: string): void {
    this.saveHistory();
    this.text += text;
  }

  delete(count: number): void {
    this.saveHistory();
    this.text = this.text.slice(0, -count);
  }

  private saveHistory(): void {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(this.text);
    this.historyIndex++;
  }

  undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.text = this.history[this.historyIndex];
    }
  }
}
```

这种方式有什么问题？

**问题一：内存浪费**。每次操作都保存完整的文本副本，对于大文档来说非常浪费内存。

**问题二：无法支持复杂操作**。如果操作涉及多个对象（比如复制粘贴），保存状态快照会变得复杂。

**问题三：操作无法组合**。无法将多个操作组合成一个"宏操作"。

## 命令模式的核心思想

命令模式的核心思想是：**将操作封装成对象**。每个命令对象包含执行操作所需的所有信息，包括接收者、方法和参数。

命令对象可以被存储、排队、传递，甚至可以支持撤销操作。这使得操作变得可追踪、可组合、可撤销。

## 基础实现

用 TypeScript 实现命令模式：

```typescript
// 命令接口
interface Command {
  execute(): void;
  undo(): void;
}

// 接收者：文档对象
class Document {
  private content: string = '';

  getContent(): string {
    return this.content;
  }

  insert(position: number, text: string): void {
    this.content = 
      this.content.slice(0, position) + 
      text + 
      this.content.slice(position);
  }

  delete(position: number, length: number): string {
    const deleted = this.content.slice(position, position + length);
    this.content = 
      this.content.slice(0, position) + 
      this.content.slice(position + length);
    return deleted;
  }
}
```

定义具体命令：

```typescript
// 插入命令
class InsertCommand implements Command {
  private document: Document;
  private position: number;
  private text: string;

  constructor(document: Document, position: number, text: string) {
    this.document = document;
    this.position = position;
    this.text = text;
  }

  execute(): void {
    this.document.insert(this.position, this.text);
  }

  undo(): void {
    this.document.delete(this.position, this.text.length);
  }
}

// 删除命令
class DeleteCommand implements Command {
  private document: Document;
  private position: number;
  private length: number;
  private deletedText: string = '';

  constructor(document: Document, position: number, length: number) {
    this.document = document;
    this.position = position;
    this.length = length;
  }

  execute(): void {
    // 保存被删除的文本，用于撤销
    this.deletedText = this.document.delete(this.position, this.length);
  }

  undo(): void {
    this.document.insert(this.position, this.deletedText);
  }
}
```

命令管理器：

```typescript
class CommandManager {
  private history: Command[] = [];
  private redoStack: Command[] = [];

  execute(command: Command): void {
    command.execute();
    this.history.push(command);
    // 执行新命令后清空重做栈
    this.redoStack = [];
  }

  undo(): void {
    const command = this.history.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
    }
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.history.push(command);
    }
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
```

使用方式：

```typescript
const doc = new Document();
const manager = new CommandManager();

// 执行插入命令
manager.execute(new InsertCommand(doc, 0, 'Hello'));
console.log(doc.getContent()); // "Hello"

manager.execute(new InsertCommand(doc, 5, ' World'));
console.log(doc.getContent()); // "Hello World"

// 撤销
manager.undo();
console.log(doc.getContent()); // "Hello"

// 重做
manager.redo();
console.log(doc.getContent()); // "Hello World"
```

## 宏命令：命令的组合

多个命令可以组合成一个宏命令：

```typescript
class MacroCommand implements Command {
  private commands: Command[] = [];

  add(command: Command): this {
    this.commands.push(command);
    return this;
  }

  execute(): void {
    for (const command of this.commands) {
      command.execute();
    }
  }

  undo(): void {
    // 反向撤销
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}

// 使用：一次性执行多个操作
const macro = new MacroCommand()
  .add(new InsertCommand(doc, 0, 'Title\n'))
  .add(new InsertCommand(doc, 6, '---\n'))
  .add(new InsertCommand(doc, 10, 'Content'));

manager.execute(macro);
// 撤销时，三个操作一起撤销
manager.undo();
```

## 函数式命令模式

在 JavaScript 中，命令可以用函数来表示：

```typescript
interface FunctionalCommand {
  execute: () => void;
  undo: () => void;
}

function createInsertCommand(
  doc: Document,
  position: number,
  text: string
): FunctionalCommand {
  return {
    execute: () => doc.insert(position, text),
    undo: () => doc.delete(position, text.length),
  };
}

function createDeleteCommand(
  doc: Document,
  position: number,
  length: number
): FunctionalCommand {
  let deletedText = '';
  return {
    execute: () => {
      deletedText = doc.delete(position, length);
    },
    undo: () => {
      doc.insert(position, deletedText);
    },
  };
}
```

## 命令队列

命令可以被放入队列中延迟执行：

```typescript
class CommandQueue {
  private queue: Command[] = [];
  private isProcessing = false;

  add(command: Command): void {
    this.queue.push(command);
    this.process();
  }

  private async process(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const command = this.queue.shift()!;
      try {
        await this.executeCommand(command);
      } catch (error) {
        console.error('Command failed:', error);
        // 可以选择重试或跳过
      }
    }

    this.isProcessing = false;
  }

  private async executeCommand(command: Command): Promise<void> {
    command.execute();
  }
}
```

## 实际应用：表单操作

```typescript
interface FormData {
  [key: string]: string;
}

class Form {
  private data: FormData = {};

  setValue(key: string, value: string): void {
    this.data[key] = value;
  }

  getValue(key: string): string {
    return this.data[key] ?? '';
  }

  getData(): FormData {
    return { ...this.data };
  }
}

class SetFieldCommand implements Command {
  private form: Form;
  private key: string;
  private newValue: string;
  private oldValue: string = '';

  constructor(form: Form, key: string, value: string) {
    this.form = form;
    this.key = key;
    this.newValue = value;
  }

  execute(): void {
    this.oldValue = this.form.getValue(this.key);
    this.form.setValue(this.key, this.newValue);
  }

  undo(): void {
    this.form.setValue(this.key, this.oldValue);
  }
}

// 使用
const form = new Form();
const formManager = new CommandManager();

formManager.execute(new SetFieldCommand(form, 'name', 'John'));
formManager.execute(new SetFieldCommand(form, 'email', 'john@example.com'));

console.log(form.getData());
// { name: 'John', email: 'john@example.com' }

formManager.undo();
console.log(form.getData());
// { name: 'John' }
```

## 命令模式的优缺点

**优点**：
- **解耦**：调用者和执行者解耦
- **可撤销**：容易实现撤销/重做功能
- **可组合**：命令可以组合成宏命令
- **可排队**：命令可以延迟执行
- **可日志**：可以记录命令历史

**缺点**：
- **类膨胀**：每个操作都需要一个命令类
- **复杂性**：简单操作可能不需要这么复杂的结构

## 应用场景

1. **撤销/重做**：文本编辑器、绘图软件
2. **事务**：数据库操作的封装
3. **任务队列**：异步任务的管理
4. **宏录制**：将操作序列录制成脚本
5. **快捷键绑定**：将快捷键映射到命令

## 总结

命令模式通过将操作封装成对象，实现了操作的解耦、撤销、组合和排队。它是实现撤销/重做功能的核心模式。

关键要点：
1. 命令对象封装了执行操作所需的所有信息
2. `execute` 和 `undo` 是命令的核心方法
3. 命令管理器负责执行和撤销命令
4. 宏命令可以组合多个命令
5. 在 JavaScript 中可以用函数实现轻量级命令
