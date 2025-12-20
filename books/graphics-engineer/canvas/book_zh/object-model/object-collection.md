# 对象集合与容器

画布上有 100 个图形对象，如何高效管理它们？用简单数组？

```javascript
const objects = [];
objects.push(rect1);
objects.push(rect2);
```

但这样会遇到问题：
- 查找对象慢（需要遍历）
- 无法方便地调整顺序（前后关系）
- 缺少批量操作能力

我们需要一个强大的 **对象集合（Object Collection）**。

---

## 1. 需求分析

对象集合应支持：
- **添加/删除**：`add()`、`remove()`、`clear()`
- **查找**：通过 ID、类型、属性查找
- **遍历**：`forEach()`、`filter()`、`map()`
- **排序**：调整对象的渲染顺序（z-index）
- **事件**：集合变化时触发事件

---

## 2. ObjectCollection 类设计

```javascript
class ObjectCollection {
  constructor(canvas) {
    this.canvas = canvas;
    this._objects = [];               // 对象数组
    this._objectsById = new Map();    // ID 索引（加速查找）
  }
  
  // 添加对象
  add(object) {
    if (this._objectsById.has(object.id)) {
      console.warn('Object already exists:', object.id);
      return;
    }
    
    this._objects.push(object);
    this._objectsById.set(object.id, object);
    object.canvas = this.canvas;  // 关联画布
    
    this.canvas.requestRender();
  }
  
  // 删除对象
  remove(object) {
    const index = this._objects.indexOf(object);
    if (index === -1) return;
    
    this._objects.splice(index, 1);
    this._objectsById.delete(object.id);
    object.canvas = null;
    
    this.canvas.requestRender();
  }
  
  // 清空所有对象
  clear() {
    this._objects = [];
    this._objectsById.clear();
    this.canvas.requestRender();
  }
  
  // 获取对象数量
  get size() {
    return this._objects.length;
  }
  
  // 获取所有对象
  getObjects() {
    return this._objects.slice();  // 返回副本，避免外部修改
  }
}
```

---

## 3. 查询功能

### 通过 ID 查找

```javascript
class ObjectCollection {
  // ...
  
  findById(id) {
    return this._objectsById.get(id);  // O(1) 查找，非常快
  }
}

// 使用
const rect = collection.findById('rect_1');
```

### 通过类型查找

```javascript
findByType(type) {
  return this._objects.filter(obj => obj.type === type);
}

// 使用
const allRects = collection.findByType('Rectangle');
```

### 通过条件查找

```javascript
find(predicate) {
  return this._objects.find(predicate);
}

findAll(predicate) {
  return this._objects.filter(predicate);
}

// 使用
const redObjects = collection.findAll(obj => obj.fill === 'red');
const firstLargeRect = collection.find(obj => obj.width > 200);
```

---

## 4. 层级管理（Z-Index）

对象在数组中的位置决定渲染顺序：**数组后面的对象在上层**。

```javascript
class ObjectCollection {
  // ...
  
  // 移到最前面（最下层）
  sendToBack(object) {
    this.remove(object);
    this._objects.unshift(object);  // 插入到数组开头
    this._objectsById.set(object.id, object);
    this.canvas.requestRender();
  }
  
  // 移到最后面（最上层）
  bringToFront(object) {
    this.remove(object);
    this._objects.push(object);
    this._objectsById.set(object.id, object);
    this.canvas.requestRender();
  }
  
  // 向前移动一层
  bringForward(object) {
    const index = this._objects.indexOf(object);
    if (index === this._objects.length - 1) return;  // 已在最上层
    
    [this._objects[index], this._objects[index + 1]] = 
      [this._objects[index + 1], this._objects[index]];  // 交换
    
    this.canvas.requestRender();
  }
  
  // 向后移动一层
  sendBackward(object) {
    const index = this._objects.indexOf(object);
    if (index === 0) return;  // 已在最下层
    
    [this._objects[index], this._objects[index - 1]] = 
      [this._objects[index - 1], this._objects[index]];
    
    this.canvas.requestRender();
  }
}
```

---

## 5. 遍历与过滤

```javascript
class ObjectCollection {
  // ...
  
  forEach(callback) {
    this._objects.forEach(callback);
  }
  
  filter(predicate) {
    return this._objects.filter(predicate);
  }
  
  map(callback) {
    return this._objects.map(callback);
  }
}

// 使用
collection.forEach(obj => {
  obj.opacity = 0.5;  // 所有对象半透明
});

const visibleObjects = collection.filter(obj => obj.visible);
```

---

## 6. 集成到 Canvas

```javascript
class Canvas {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.collection = new ObjectCollection(this);
    this.renderRequested = false;
  }
  
  add(object) {
    this.collection.add(object);
  }
  
  remove(object) {
    this.collection.remove(object);
  }
  
  getObjects() {
    return this.collection.getObjects();
  }
  
  findById(id) {
    return this.collection.findById(id);
  }
  
  requestRender() {
    if (this.renderRequested) return;
    this.renderRequested = true;
    
    requestAnimationFrame(() => {
      this.render();
      this.renderRequested = false;
    });
  }
  
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.collection.forEach(obj => {
      if (obj.visible) {
        obj.draw(this.ctx);
      }
    });
  }
}
```

---

## 7. 分组对象（Group）

分组是一种特殊的对象，它**包含子对象**。

```javascript
class Group extends BaseObject {
  constructor(options = {}) {
    super(options);
    this.type = 'Group';
    this.objects = [];
  }
  
  add(object) {
    this.objects.push(object);
    object.parent = this;  // 设置父级引用
  }
  
  remove(object) {
    const index = this.objects.indexOf(object);
    if (index !== -1) {
      this.objects.splice(index, 1);
      object.parent = null;
    }
  }
  
  render(ctx) {
    this.objects.forEach(obj => {
      obj.draw(ctx);
    });
  }
  
  // 点击检测：递归检测子对象
  containsPoint(x, y) {
    for (const obj of this.objects) {
      if (obj.containsPoint(x, y)) {
        return true;
      }
    }
    return false;
  }
}
```

### 使用示例

```javascript
const rect1 = new Rectangle({ left: 0, top: 0, width: 50, height: 50, fill: 'red' });
const rect2 = new Rectangle({ left: 60, top: 0, width: 50, height: 50, fill: 'blue' });

const group = new Group();
group.add(rect1);
group.add(rect2);

canvas.add(group);

// 移动分组，所有子对象一起移动
group.left = 100;
group.top = 100;
```

---

## 8. 集合事件

监听集合的变化：

```javascript
class ObjectCollection extends EventEmitter {
  add(object) {
    // ... 添加逻辑 ...
    this.emit('object:added', { target: object });
  }
  
  remove(object) {
    // ... 删除逻辑 ...
    this.emit('object:removed', { target: object });
  }
}

// 使用
canvas.collection.on('object:added', (e) => {
  console.log('对象已添加:', e.target.id);
});
```

---

## 9. 性能优化

### 使用 Map 加速查找

```javascript
// 数组查找：O(n)
const obj = objects.find(o => o.id === 'rect_1');

// Map 查找：O(1)
const obj = objectsById.get('rect_1');
```

### 批量操作

```javascript
addMultiple(objects) {
  objects.forEach(obj => {
    this._objects.push(obj);
    this._objectsById.set(obj.id, obj);
    obj.canvas = this.canvas;
  });
  this.canvas.requestRender();  // 只重绘一次
}
```

---

## 10. 完整使用示例

```javascript
const canvas = new Canvas(document.getElementById('canvas'));

// 添加对象
const rect1 = new Rectangle({ left: 50, top: 50, width: 100, height: 80, fill: 'red' });
const rect2 = new Rectangle({ left: 200, top: 50, width: 100, height: 80, fill: 'blue' });
const circle = new Circle({ left: 350, top: 50, radius: 40, fill: 'green' });

canvas.add(rect1);
canvas.add(rect2);
canvas.add(circle);

// 查找对象
const obj = canvas.findById(rect1.id);
console.log(obj);

// 查找所有矩形
const rects = canvas.collection.findByType('Rectangle');
console.log('矩形数量:', rects.length);

// 层级调整
canvas.collection.bringToFront(rect1);  // rect1 移到最上层

// 删除对象
canvas.remove(rect2);

// 清空画布
canvas.collection.clear();
```

---

## 本章小结

对象集合是管理图形对象的核心容器：
- **高效查询**：使用 Map 实现 O(1) 查找
- **层级管理**：控制对象的前后关系
- **遍历过滤**：提供丰富的集合操作
- **分组支持**：嵌套管理子对象

Part 7（对象模型设计）全部完成！下一部分，我们将进入图形编辑器的核心功能实现。
