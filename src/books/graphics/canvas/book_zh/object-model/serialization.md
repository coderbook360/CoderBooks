# 对象序列化与反序列化

用户绘制了一个复杂的图形作品，关闭浏览器前如何保存？下次打开时如何恢复？

答案是：**序列化与反序列化**。

---

## 1. 应用场景

序列化（将对象转换为JSON）的典型应用：
- **保存与加载**：将画布保存到本地存储或服务器
- **撤销重做**：保存历史状态
- **导出功能**：导出为JSON文件
- **协同编辑**：在网络间传输对象数据

---

## 2. 序列化设计

### 哪些属性需要序列化？

**需要**：
- 几何属性（位置、尺寸、旋转、缩放）
- 样式属性（颜色、边框、透明度）

**不需要**：
- 临时状态（`_dirty`、`selected`）
- 对象引用（`canvas`）
- 事件监听器（`events`）
- 方法函数

### JSON 格式设计

```json
{
  "type": "Rectangle",
  "id": "object_1",
  "left": 100,
  "top": 100,
  "width": 200,
  "height": 150,
  "fill": "#ff0000",
  "stroke": "#000000",
  "strokeWidth": 2,
  "rotation": 0,
  "scaleX": 1,
  "scaleY": 1,
  "opacity": 1
}
```

**关键**：必须包含 `type` 字段，用于反序列化时创建正确的类实例。

---

## 3. 实现 toJSON 方法

```javascript
class BaseObject {
  // ... 其他代码 ...
  
  toJSON() {
    return {
      type: this.type,
      id: this.id,
      left: this.left,
      top: this.top,
      width: this.width,
      height: this.height,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      fill: this.fill,
      stroke: this.stroke,
      strokeWidth: this.strokeWidth,
      opacity: this.opacity,
      visible: this.visible
    };
  }
}

// 使用
const rect = new Rectangle({
  left: 50,
  top: 50,
  width: 100,
  height: 80,
  fill: 'red'
});

const json = rect.toJSON();
console.log(JSON.stringify(json, null, 2));
```

---

## 4. 反序列化：从 JSON 恢复对象

### 工厂模式

根据 `type` 字段创建对应的类实例：

```javascript
class ObjectFactory {
  static create(json) {
    const constructors = {
      'Rectangle': Rectangle,
      'Circle': Circle,
      'Text': Text
      // 可扩展
    };
    
    const Constructor = constructors[json.type];
    if (!Constructor) {
      throw new Error(`Unknown object type: ${json.type}`);
    }
    
    return new Constructor(json);
  }
}

// 使用
const json = { type: 'Rectangle', left: 50, top: 50, fill: 'red' };
const rect = ObjectFactory.create(json);
rect.draw(ctx);
```

---

## 5. 序列化整个画布

```javascript
class Canvas {
  // ... 其他代码 ...
  
  toJSON() {
    return {
      version: '1.0',
      width: this.canvas.width,
      height: this.canvas.height,
      objects: this.objects.map(obj => obj.toJSON())
    };
  }
  
  fromJSON(json) {
    this.objects = [];
    json.objects.forEach(objData => {
      const obj = ObjectFactory.create(objData);
      this.add(obj);
    });
    this.render();
  }
  
  saveToLocalStorage(key) {
    const json = this.toJSON();
    localStorage.setItem(key, JSON.stringify(json));
  }
  
  loadFromLocalStorage(key) {
    const jsonStr = localStorage.getItem(key);
    if (jsonStr) {
      const json = JSON.parse(jsonStr);
      this.fromJSON(json);
    }
  }
}

// 使用
canvas.add(new Rectangle({ left: 50, top: 50, fill: 'red' }));
canvas.add(new Circle({ left: 200, top: 50, radius: 40, fill: 'blue' }));

// 保存
canvas.saveToLocalStorage('my-canvas');

// 加载
canvas.loadFromLocalStorage('my-canvas');
```

---

## 6. 处理嵌套对象

如果有分组（Group），它包含子对象：

```javascript
class Group extends BaseObject {
  constructor(options = {}) {
    super(options);
    this.type = 'Group';
    this.objects = options.objects || [];
  }
  
  toJSON() {
    return {
      ...super.toJSON(),
      objects: this.objects.map(obj => obj.toJSON())
    };
  }
  
  static fromJSON(json) {
    const group = new Group(json);
    group.objects = json.objects.map(objData => ObjectFactory.create(objData));
    return group;
  }
}

// 注册到工厂
ObjectFactory.constructors['Group'] = Group;
```

---

## 7. 版本兼容

在格式中包含版本号，支持向后兼容：

```javascript
toJSON() {
  return {
    version: '1.0',
    type: this.type,
    // ... 属性
  };
}

static fromJSON(json) {
  if (json.version === '1.0') {
    // 按 1.0 格式解析
  } else if (json.version === '2.0') {
    // 按 2.0 格式解析
  }
}
```

---

## 8. 处理特殊情况

### 循环引用

如果对象间有循环引用，`JSON.stringify` 会报错。使用第三方库如 `flatted`：

```javascript
import { stringify, parse } from 'flatted';

const json = stringify(canvas.toJSON());
const data = parse(json);
```

### 函数属性

函数无法序列化。可以序列化函数名，反序列化时重新绑定：

```javascript
toJSON() {
  return {
    // ...
    animationType: this.animationFn?.name  // 保存函数名
  };
}
```

---

## 9. 导出与导入文件

```javascript
class Canvas {
  exportToFile(filename) {
    const json = JSON.stringify(this.toJSON(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
  }
  
  importFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const json = JSON.parse(e.target.result);
      this.fromJSON(json);
    };
    reader.readAsText(file);
  }
}

// 使用
document.getElementById('export').addEventListener('click', () => {
  canvas.exportToFile('my-design.json');
});

document.getElementById('import').addEventListener('change', (e) => {
  const file = e.target.files[0];
  canvas.importFromFile(file);
});
```

---

## 10. 性能优化

大量对象时，序列化可能耗时。优化策略：
- **增量序列化**：只序列化变化的对象
- **压缩**：使用 gzip 压缩 JSON 数据
- **Web Worker**：在后台线程进行序列化

```javascript
// 在 Worker 中序列化
const worker = new Worker('serialize-worker.js');
worker.postMessage(canvas.toJSON());
worker.onmessage = (e) => {
  const jsonStr = e.data;
  localStorage.setItem('canvas', jsonStr);
};
```

---

## 本章小结

序列化让图形数据可以持久化和传输：
- **toJSON**：将对象转换为 JSON
- **fromJSON**：从 JSON 恢复对象
- **工厂模式**：根据 type 创建实例
- **版本控制**：支持格式演进

下一章，我们将实现对象集合与容器，管理多个图形对象。
