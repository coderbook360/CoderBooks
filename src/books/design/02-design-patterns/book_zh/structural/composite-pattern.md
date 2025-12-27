# 组合模式：树形结构的统一处理

> 组合模式让客户端可以统一地处理单个对象和对象集合——你不需要关心操作的是一个节点还是一棵子树。

## 从文件系统说起

想象一下操作系统的文件系统：

```
📁 project/
├── 📁 src/
│   ├── 📄 index.ts
│   └── 📄 utils.ts
├── 📁 test/
│   └── 📄 index.test.ts
└── 📄 package.json
```

当你执行 `rm -rf project/` 时，不管 `project/` 下面有多少层文件夹和文件，一条命令就能删除所有内容。

**问题来了**：如何实现这种"统一处理"？文件和文件夹明明是不同的东西：
- 文件有内容，没有子元素
- 文件夹没有内容，但有子元素

**组合模式的答案**：让文件和文件夹实现相同的接口，客户端无需区分两者。

## 组合模式的核心思想

组合模式定义了**部分-整体**的层次结构：
- **叶子节点（Leaf）**：树的末端，没有子节点（如文件）
- **容器节点（Composite）**：可以包含子节点（如文件夹）
- **组件接口（Component）**：叶子和容器的共同接口

客户端通过统一接口操作，不需要知道处理的是叶子还是容器。

## 基础实现：文件系统

```typescript
// 组件接口
interface FileSystemNode {
  name: string;
  getSize(): number;
  print(indent?: string): void;
  find(predicate: (node: FileSystemNode) => boolean): FileSystemNode[];
}

// 叶子节点：文件
class File implements FileSystemNode {
  constructor(
    public name: string,
    private size: number,
    private content: string = ''
  ) {}
  
  getSize(): number {
    return this.size;
  }
  
  print(indent: string = ''): void {
    console.log(`${indent}📄 ${this.name} (${this.size} bytes)`);
  }
  
  find(predicate: (node: FileSystemNode) => boolean): FileSystemNode[] {
    return predicate(this) ? [this] : [];
  }
}

// 容器节点：文件夹
class Directory implements FileSystemNode {
  private children: FileSystemNode[] = [];
  
  constructor(public name: string) {}
  
  add(child: FileSystemNode): this {
    this.children.push(child);
    return this;
  }
  
  remove(child: FileSystemNode): this {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
    }
    return this;
  }
  
  getChildren(): FileSystemNode[] {
    return [...this.children];
  }
  
  getSize(): number {
    // 递归计算所有子节点的大小
    return this.children.reduce((sum, child) => sum + child.getSize(), 0);
  }
  
  print(indent: string = ''): void {
    console.log(`${indent}📁 ${this.name}/`);
    this.children.forEach(child => child.print(indent + '  '));
  }
  
  find(predicate: (node: FileSystemNode) => boolean): FileSystemNode[] {
    const results: FileSystemNode[] = [];
    
    if (predicate(this)) {
      results.push(this);
    }
    
    // 递归查找
    this.children.forEach(child => {
      results.push(...child.find(predicate));
    });
    
    return results;
  }
}
```

### 使用示例

```typescript
// 构建文件系统
const project = new Directory('project')
  .add(new Directory('src')
    .add(new File('index.ts', 1024))
    .add(new File('utils.ts', 512))
    .add(new Directory('components')
      .add(new File('Button.tsx', 2048))
      .add(new File('Modal.tsx', 3072))
    )
  )
  .add(new Directory('test')
    .add(new File('index.test.ts', 768))
  )
  .add(new File('package.json', 256))
  .add(new File('README.md', 1024));

// 统一操作
project.print();
// 输出：
// 📁 project/
//   📁 src/
//     📄 index.ts (1024 bytes)
//     📄 utils.ts (512 bytes)
//     📁 components/
//       📄 Button.tsx (2048 bytes)
//       📄 Modal.tsx (3072 bytes)
//   📁 test/
//     📄 index.test.ts (768 bytes)
//   📄 package.json (256 bytes)
//   📄 README.md (1024 bytes)

console.log(`Total size: ${project.getSize()} bytes`);
// 输出：Total size: 8704 bytes

// 查找所有 TypeScript 文件
const tsFiles = project.find(node => node.name.endsWith('.ts'));
console.log('TypeScript files:', tsFiles.map(f => f.name));
// 输出：TypeScript files: ['index.ts', 'utils.ts', 'index.test.ts']
```

## 前端实战：UI 组件树

React/Vue 的组件树就是组合模式的典型应用。让我们实现一个简化版的组件系统：

```typescript
// 组件基类
abstract class UIComponent {
  abstract render(): HTMLElement;
  abstract getWidth(): number;
  abstract getHeight(): number;
}

// 叶子组件：按钮
class Button extends UIComponent {
  constructor(
    private text: string,
    private onClick?: () => void
  ) {
    super();
  }
  
  render(): HTMLElement {
    const button = document.createElement('button');
    button.textContent = this.text;
    button.className = 'btn';
    if (this.onClick) {
      button.addEventListener('click', this.onClick);
    }
    return button;
  }
  
  getWidth(): number {
    return 100; // 简化：固定宽度
  }
  
  getHeight(): number {
    return 40;
  }
}

// 叶子组件：文本
class Text extends UIComponent {
  constructor(
    private content: string,
    private fontSize: number = 14
  ) {
    super();
  }
  
  render(): HTMLElement {
    const span = document.createElement('span');
    span.textContent = this.content;
    span.style.fontSize = `${this.fontSize}px`;
    return span;
  }
  
  getWidth(): number {
    return this.content.length * this.fontSize * 0.6;
  }
  
  getHeight(): number {
    return this.fontSize * 1.5;
  }
}

// 容器组件：面板
class Panel extends UIComponent {
  private children: UIComponent[] = [];
  private direction: 'row' | 'column';
  
  constructor(direction: 'row' | 'column' = 'column') {
    super();
    this.direction = direction;
  }
  
  add(child: UIComponent): this {
    this.children.push(child);
    return this;
  }
  
  render(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'panel';
    div.style.display = 'flex';
    div.style.flexDirection = this.direction;
    div.style.gap = '8px';
    div.style.padding = '16px';
    div.style.border = '1px solid #ccc';
    
    this.children.forEach(child => {
      div.appendChild(child.render());
    });
    
    return div;
  }
  
  getWidth(): number {
    if (this.direction === 'row') {
      return this.children.reduce((sum, child) => sum + child.getWidth(), 0) + 32;
    }
    return Math.max(...this.children.map(c => c.getWidth())) + 32;
  }
  
  getHeight(): number {
    if (this.direction === 'column') {
      return this.children.reduce((sum, child) => sum + child.getHeight(), 0) + 32;
    }
    return Math.max(...this.children.map(c => c.getHeight())) + 32;
  }
}
```

### 使用示例

```typescript
// 构建组件树
const dialog = new Panel('column')
  .add(new Text('确认删除？', 18))
  .add(new Text('此操作不可恢复'))
  .add(new Panel('row')
    .add(new Button('取消', () => console.log('Cancelled')))
    .add(new Button('确认', () => console.log('Confirmed')))
  );

// 渲染到页面
document.body.appendChild(dialog.render());

// 计算尺寸（统一处理）
console.log(`Dialog size: ${dialog.getWidth()} x ${dialog.getHeight()}`);
```

## 实战：权限系统

组合模式非常适合实现树形权限结构：

```typescript
// 权限节点接口
interface Permission {
  code: string;
  name: string;
  check(userPermissions: Set<string>): boolean;
  getAll(): string[];
}

// 叶子权限：单个权限点
class LeafPermission implements Permission {
  constructor(
    public code: string,
    public name: string
  ) {}
  
  check(userPermissions: Set<string>): boolean {
    return userPermissions.has(this.code);
  }
  
  getAll(): string[] {
    return [this.code];
  }
}

// 权限组：包含多个权限
class PermissionGroup implements Permission {
  private children: Permission[] = [];
  
  constructor(
    public code: string,
    public name: string,
    private requireAll: boolean = false  // true: 需要全部权限; false: 只需任意一个
  ) {}
  
  add(permission: Permission): this {
    this.children.push(permission);
    return this;
  }
  
  check(userPermissions: Set<string>): boolean {
    if (this.children.length === 0) return false;
    
    if (this.requireAll) {
      // 需要所有子权限都满足
      return this.children.every(child => child.check(userPermissions));
    } else {
      // 只需任意一个子权限满足
      return this.children.some(child => child.check(userPermissions));
    }
  }
  
  getAll(): string[] {
    return this.children.flatMap(child => child.getAll());
  }
}

// 定义权限树
const permissions = new PermissionGroup('system', '系统权限')
  .add(new PermissionGroup('user', '用户管理')
    .add(new LeafPermission('user:read', '查看用户'))
    .add(new LeafPermission('user:create', '创建用户'))
    .add(new LeafPermission('user:update', '编辑用户'))
    .add(new LeafPermission('user:delete', '删除用户'))
  )
  .add(new PermissionGroup('order', '订单管理')
    .add(new LeafPermission('order:read', '查看订单'))
    .add(new LeafPermission('order:update', '更新订单'))
    .add(new LeafPermission('order:cancel', '取消订单'))
    .add(new PermissionGroup('order:export', '导出权限', true) // 需要同时满足
      .add(new LeafPermission('order:read', '查看订单'))
      .add(new LeafPermission('export:excel', '导出Excel'))
    )
  );

// 检查权限
const userPerms = new Set(['user:read', 'user:create', 'order:read']);

console.log(permissions.check(userPerms)); // true（任意一个权限组满足即可）

const userManagement = permissions.getAll().filter(p => p.startsWith('user:'));
console.log(userManagement); // ['user:read', 'user:create', 'user:update', 'user:delete']
```

## 实战：菜单系统

```typescript
interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  visible: boolean;
  render(): JSX.Element;
  findById(id: string): MenuItem | null;
}

// 叶子菜单项
class MenuLink implements MenuItem {
  constructor(
    public id: string,
    public label: string,
    private path: string,
    public icon?: string,
    public visible: boolean = true
  ) {}
  
  render(): JSX.Element {
    if (!this.visible) return null;
    
    return (
      <a href={this.path} className="menu-item">
        {this.icon && <Icon name={this.icon} />}
        <span>{this.label}</span>
      </a>
    );
  }
  
  findById(id: string): MenuItem | null {
    return this.id === id ? this : null;
  }
}

// 菜单组
class MenuGroup implements MenuItem {
  private children: MenuItem[] = [];
  
  constructor(
    public id: string,
    public label: string,
    public icon?: string,
    public visible: boolean = true
  ) {}
  
  add(item: MenuItem): this {
    this.children.push(item);
    return this;
  }
  
  render(): JSX.Element {
    if (!this.visible) return null;
    
    const visibleChildren = this.children.filter(c => c.visible);
    if (visibleChildren.length === 0) return null;
    
    return (
      <div className="menu-group">
        <div className="menu-group-title">
          {this.icon && <Icon name={this.icon} />}
          <span>{this.label}</span>
        </div>
        <div className="menu-group-children">
          {visibleChildren.map(child => child.render())}
        </div>
      </div>
    );
  }
  
  findById(id: string): MenuItem | null {
    if (this.id === id) return this;
    
    for (const child of this.children) {
      const found = child.findById(id);
      if (found) return found;
    }
    
    return null;
  }
}
```

## 组合模式的优缺点

### 优点

1. **统一处理**：客户端代码简单，不需要区分叶子和容器
2. **易于扩展**：添加新类型的组件不影响现有代码
3. **递归结构**：天然适合处理树形数据

### 缺点

1. **类型限制**：很难限制容器可以包含的组件类型
2. **过度设计**：简单场景下使用组合模式可能过于复杂
3. **性能考虑**：深层递归可能影响性能

## 何时使用组合模式

适合使用：
- 需要表示对象的**部分-整体**层次结构
- 希望用户**忽略**组合对象与单个对象的不同
- 数据结构本身就是**树形**的

不适合使用：
- 叶子和容器有**很多不同**的操作
- 结构层次**很浅**或**固定**
- 性能是**关键考虑**因素

## 总结

组合模式是处理树形结构的利器：

1. **核心思想**：统一处理叶子节点和容器节点
2. **典型场景**：文件系统、UI 组件树、菜单、权限、组织架构
3. **实现要点**：定义统一接口，容器持有子节点列表，递归处理
4. **注意事项**：考虑性能影响，避免过度设计

组合模式让我们能够**优雅地处理复杂的树形结构**，是前端开发中非常实用的设计模式。
