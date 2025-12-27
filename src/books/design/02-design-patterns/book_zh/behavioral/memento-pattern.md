# 备忘录模式：状态快照与历史

## 问题的起源

假设你正在开发一个文本编辑器，需要实现撤销功能。最直接的想法是保存文本的历史版本：

```typescript
class Editor {
  private text: string = '';
  private history: string[] = [];

  type(text: string): void {
    this.history.push(this.text);
    this.text += text;
  }

  undo(): void {
    if (this.history.length > 0) {
      this.text = this.history.pop()!;
    }
  }

  getText(): string {
    return this.text;
  }
}
```

这个简单实现有什么问题？

**问题一：封装破坏**。如果编辑器有更多状态（光标位置、选中范围、格式设置等），历史记录需要保存所有这些状态，外部代码需要知道编辑器的内部结构。

**问题二：内存浪费**。每次都保存完整状态，对于大文档来说非常浪费。

**问题三：职责混乱**。编辑器类同时负责编辑和历史管理。

## 备忘录模式的核心思想

备忘录模式的核心思想是：**在不破坏封装的前提下，捕获对象的内部状态并保存，以便之后恢复**。

备忘录模式由三个角色组成：
- **原发器（Originator）**：需要保存状态的对象
- **备忘录（Memento）**：存储原发器状态的快照
- **管理者（Caretaker）**：负责保存和管理备忘录

## 基础实现

用 TypeScript 实现备忘录模式：

```typescript
// 备忘录：存储编辑器状态
class EditorMemento {
  private readonly text: string;
  private readonly cursorPosition: number;
  private readonly selectionStart: number;
  private readonly selectionEnd: number;

  constructor(
    text: string,
    cursorPosition: number,
    selectionStart: number,
    selectionEnd: number
  ) {
    this.text = text;
    this.cursorPosition = cursorPosition;
    this.selectionStart = selectionStart;
    this.selectionEnd = selectionEnd;
  }

  // 只有原发器可以访问状态
  getText(): string {
    return this.text;
  }

  getCursorPosition(): number {
    return this.cursorPosition;
  }

  getSelectionStart(): number {
    return this.selectionStart;
  }

  getSelectionEnd(): number {
    return this.selectionEnd;
  }
}
```

原发器：

```typescript
// 原发器：文本编辑器
class TextEditor {
  private text: string = '';
  private cursorPosition: number = 0;
  private selectionStart: number = 0;
  private selectionEnd: number = 0;

  type(input: string): void {
    this.text = 
      this.text.slice(0, this.cursorPosition) +
      input +
      this.text.slice(this.cursorPosition);
    this.cursorPosition += input.length;
  }

  delete(count: number): void {
    const start = Math.max(0, this.cursorPosition - count);
    this.text = this.text.slice(0, start) + this.text.slice(this.cursorPosition);
    this.cursorPosition = start;
  }

  moveCursor(position: number): void {
    this.cursorPosition = Math.min(position, this.text.length);
  }

  select(start: number, end: number): void {
    this.selectionStart = start;
    this.selectionEnd = end;
  }

  // 创建备忘录
  save(): EditorMemento {
    return new EditorMemento(
      this.text,
      this.cursorPosition,
      this.selectionStart,
      this.selectionEnd
    );
  }

  // 从备忘录恢复
  restore(memento: EditorMemento): void {
    this.text = memento.getText();
    this.cursorPosition = memento.getCursorPosition();
    this.selectionStart = memento.getSelectionStart();
    this.selectionEnd = memento.getSelectionEnd();
  }

  getState(): string {
    return `Text: "${this.text}", Cursor: ${this.cursorPosition}`;
  }
}
```

管理者：

```typescript
// 管理者：历史记录管理
class EditorHistory {
  private history: EditorMemento[] = [];
  private redoStack: EditorMemento[] = [];
  private editor: TextEditor;

  constructor(editor: TextEditor) {
    this.editor = editor;
  }

  save(): void {
    this.history.push(this.editor.save());
    this.redoStack = []; // 新操作清空重做栈
  }

  undo(): void {
    if (this.history.length === 0) return;

    // 保存当前状态到重做栈
    this.redoStack.push(this.editor.save());
    
    // 恢复上一个状态
    const memento = this.history.pop()!;
    this.editor.restore(memento);
  }

  redo(): void {
    if (this.redoStack.length === 0) return;

    // 保存当前状态到历史栈
    this.history.push(this.editor.save());
    
    // 恢复重做状态
    const memento = this.redoStack.pop()!;
    this.editor.restore(memento);
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
const editor = new TextEditor();
const history = new EditorHistory(editor);

// 保存初始状态
history.save();

editor.type('Hello');
console.log(editor.getState()); // Text: "Hello", Cursor: 5

history.save();
editor.type(' World');
console.log(editor.getState()); // Text: "Hello World", Cursor: 11

// 撤销
history.undo();
console.log(editor.getState()); // Text: "Hello", Cursor: 5

// 重做
history.redo();
console.log(editor.getState()); // Text: "Hello World", Cursor: 11
```

## 增量备忘录

对于大对象，可以只保存变化的部分：

```typescript
interface Change {
  type: 'insert' | 'delete';
  position: number;
  text: string;
}

class IncrementalMemento {
  constructor(
    public readonly changes: Change[],
    public readonly timestamp: number
  ) {}
}

class IncrementalEditor {
  private text: string = '';
  private changes: Change[] = [];

  type(position: number, input: string): void {
    this.text = this.text.slice(0, position) + input + this.text.slice(position);
    this.changes.push({ type: 'insert', position, text: input });
  }

  delete(position: number, length: number): void {
    const deleted = this.text.slice(position, position + length);
    this.text = this.text.slice(0, position) + this.text.slice(position + length);
    this.changes.push({ type: 'delete', position, text: deleted });
  }

  save(): IncrementalMemento {
    const memento = new IncrementalMemento([...this.changes], Date.now());
    this.changes = [];
    return memento;
  }

  // 撤销增量变化
  undoChanges(memento: IncrementalMemento): void {
    // 反向应用变化
    for (let i = memento.changes.length - 1; i >= 0; i--) {
      const change = memento.changes[i];
      if (change.type === 'insert') {
        // 撤销插入 = 删除
        this.text = 
          this.text.slice(0, change.position) +
          this.text.slice(change.position + change.text.length);
      } else {
        // 撤销删除 = 插入
        this.text = 
          this.text.slice(0, change.position) +
          change.text +
          this.text.slice(change.position);
      }
    }
  }
}
```

## 序列化备忘录

备忘录可以序列化以支持持久化：

```typescript
interface SerializedMemento {
  version: number;
  data: unknown;
  timestamp: number;
}

class SerializableEditor {
  private state: Record<string, unknown> = {};

  // 导出为 JSON
  toJSON(): SerializedMemento {
    return {
      version: 1,
      data: structuredClone(this.state),
      timestamp: Date.now(),
    };
  }

  // 从 JSON 恢复
  fromJSON(memento: SerializedMemento): void {
    if (memento.version !== 1) {
      throw new Error('Incompatible memento version');
    }
    this.state = structuredClone(memento.data) as Record<string, unknown>;
  }

  // 保存到 localStorage
  saveToStorage(key: string): void {
    localStorage.setItem(key, JSON.stringify(this.toJSON()));
  }

  // 从 localStorage 恢复
  loadFromStorage(key: string): boolean {
    const data = localStorage.getItem(key);
    if (data) {
      this.fromJSON(JSON.parse(data));
      return true;
    }
    return false;
  }
}
```

## 备忘录与命令模式的对比

| 特性 | 备忘录模式 | 命令模式 |
|------|-----------|---------|
| 保存内容 | 对象状态快照 | 操作及其参数 |
| 内存使用 | 可能较大 | 通常较小 |
| 恢复方式 | 直接替换状态 | 执行逆操作 |
| 适用场景 | 复杂状态、难以逆操作 | 可逆操作 |

## 备忘录模式的优缺点

**优点**：
- **封装保护**：不破坏对象的封装
- **简化原发器**：状态保存逻辑分离
- **支持多级撤销**：可以保存多个快照

**缺点**：
- **内存消耗**：保存大对象状态消耗内存
- **维护成本**：状态变化时需要同步更新备忘录

## 应用场景

1. **撤销/重做**：编辑器、绘图软件
2. **游戏存档**：保存游戏进度
3. **事务回滚**：数据库事务
4. **状态恢复**：异常恢复、调试

## 总结

备忘录模式提供了一种在不破坏封装的情况下保存和恢复对象状态的方法。它将状态快照封装在备忘录对象中，由管理者负责保存和管理这些快照。

关键要点：
1. 备忘录封装了对象的内部状态
2. 只有原发器可以访问备忘录的内容
3. 管理者负责保存备忘录，但不能修改其内容
4. 增量备忘录可以减少内存消耗
5. 备忘录可以序列化以支持持久化
