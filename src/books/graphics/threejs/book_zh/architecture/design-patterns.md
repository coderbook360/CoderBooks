# 核心设计模式与最佳实践

> "好的设计模式让代码更优雅，理解它们才能写出更好的 Three.js 应用。"

## 设计模式概览

### Three.js 使用的主要模式

| 模式 | 应用场景 |
|------|----------|
| 组合模式 | Scene Graph 场景图 |
| 观察者模式 | EventDispatcher 事件系统 |
| 工厂模式 | Loader 加载器 |
| 策略模式 | Material 材质系统 |
| 享元模式 | 几何体/纹理共享 |
| 对象池 | 临时数学对象复用 |

## 组合模式

### 场景图实现

```javascript
// Object3D 实现了组合模式
class Object3D extends EventDispatcher {
  constructor() {
    super();
    this.parent = null;
    this.children = [];
  }
  
  add(object) {
    if (object.parent !== null) {
      object.parent.remove(object);
    }
    object.parent = this;
    this.children.push(object);
    return this;
  }
  
  remove(object) {
    const index = this.children.indexOf(object);
    if (index !== -1) {
      object.parent = null;
      this.children.splice(index, 1);
    }
    return this;
  }
  
  traverse(callback) {
    callback(this);
    for (const child of this.children) {
      child.traverse(callback);
    }
  }
  
  traverseVisible(callback) {
    if (this.visible === false) return;
    callback(this);
    for (const child of this.children) {
      child.traverseVisible(callback);
    }
  }
}
```

### 场景图结构

```
Scene (root)
├── Group (环境)
│   ├── AmbientLight
│   └── DirectionalLight
├── Group (玩家)
│   ├── Mesh (身体)
│   ├── Mesh (头部)
│   └── Group (武器)
│       └── Mesh (剑)
└── Group (敌人)
    ├── Mesh (敌人1)
    └── Mesh (敌人2)
```

### 变换传递

```javascript
// 世界矩阵 = 父矩阵 × 本地矩阵
updateMatrixWorld(force = false) {
  if (this.matrixAutoUpdate) {
    this.updateMatrix();
  }
  
  if (this.matrixWorldNeedsUpdate || force) {
    if (this.parent === null) {
      this.matrixWorld.copy(this.matrix);
    } else {
      this.matrixWorld.multiplyMatrices(
        this.parent.matrixWorld,
        this.matrix
      );
    }
    this.matrixWorldNeedsUpdate = false;
    force = true;
  }
  
  // 递归更新子对象
  for (const child of this.children) {
    child.updateMatrixWorld(force);
  }
}
```

## 观察者模式

### EventDispatcher

```javascript
class EventDispatcher {
  addEventListener(type, listener) {
    if (this._listeners === undefined) {
      this._listeners = {};
    }
    
    const listeners = this._listeners;
    
    if (listeners[type] === undefined) {
      listeners[type] = [];
    }
    
    if (listeners[type].indexOf(listener) === -1) {
      listeners[type].push(listener);
    }
  }
  
  removeEventListener(type, listener) {
    if (this._listeners === undefined) return;
    
    const listeners = this._listeners;
    const listenerArray = listeners[type];
    
    if (listenerArray !== undefined) {
      const index = listenerArray.indexOf(listener);
      if (index !== -1) {
        listenerArray.splice(index, 1);
      }
    }
  }
  
  dispatchEvent(event) {
    if (this._listeners === undefined) return;
    
    const listeners = this._listeners;
    const listenerArray = listeners[event.type];
    
    if (listenerArray !== undefined) {
      event.target = this;
      
      const array = listenerArray.slice(0);
      
      for (let i = 0; i < array.length; i++) {
        array[i].call(this, event);
      }
    }
  }
  
  hasEventListener(type, listener) {
    if (this._listeners === undefined) return false;
    
    const listeners = this._listeners;
    return listeners[type] !== undefined && 
           listeners[type].indexOf(listener) !== -1;
  }
}
```

### 使用示例

```javascript
// 自定义事件
const mesh = new THREE.Mesh(geometry, material);

mesh.addEventListener('click', (event) => {
  console.log('Mesh clicked!', event);
});

// 触发事件
mesh.dispatchEvent({ type: 'click', data: { ... } });

// Object3D 内部使用
// 当添加到场景时触发
this.dispatchEvent({ type: 'added' });
// 当从场景移除时触发
this.dispatchEvent({ type: 'removed' });
```

## 工厂模式

### Loader 系统

```javascript
// 基类 Loader
class Loader {
  constructor(manager) {
    this.manager = manager || DefaultLoadingManager;
    this.crossOrigin = 'anonymous';
    this.path = '';
    this.resourcePath = '';
    this.requestHeader = {};
  }
  
  load(url, onLoad, onProgress, onError) {
    // 子类实现
  }
  
  loadAsync(url, onProgress) {
    return new Promise((resolve, reject) => {
      this.load(url, resolve, onProgress, reject);
    });
  }
}

// 具体 Loader
class TextureLoader extends Loader {
  load(url, onLoad, onProgress, onError) {
    const texture = new Texture();
    
    const loader = new ImageLoader(this.manager);
    loader.load(url, (image) => {
      texture.image = image;
      texture.needsUpdate = true;
      if (onLoad) onLoad(texture);
    }, onProgress, onError);
    
    return texture;
  }
}
```

### LoadingManager

```javascript
// 统一管理加载进度
const manager = new THREE.LoadingManager();

manager.onStart = (url, loaded, total) => {
  console.log(`开始加载: ${url}`);
};

manager.onProgress = (url, loaded, total) => {
  console.log(`进度: ${loaded}/${total}`);
};

manager.onLoad = () => {
  console.log('全部加载完成');
};

manager.onError = (url) => {
  console.log(`加载失败: ${url}`);
};

// 使用同一个 manager
const textureLoader = new THREE.TextureLoader(manager);
const gltfLoader = new GLTFLoader(manager);
```

## 策略模式

### Material 系统

```javascript
// Material 定义渲染策略
class Material extends EventDispatcher {
  constructor() {
    super();
    this.type = 'Material';
    
    // 渲染状态
    this.transparent = false;
    this.opacity = 1;
    this.depthTest = true;
    this.depthWrite = true;
    this.blending = NormalBlending;
    this.side = FrontSide;
  }
  
  // 子类提供不同的着色策略
  onBeforeCompile(shader, renderer) {}
  
  customProgramCacheKey() {
    return '';
  }
}

// 不同的材质 = 不同的渲染策略
class MeshBasicMaterial extends Material {
  // 无光照，使用颜色/纹理
}

class MeshLambertMaterial extends Material {
  // Lambert 漫反射
}

class MeshPhongMaterial extends Material {
  // Phong 高光反射
}

class MeshStandardMaterial extends Material {
  // PBR 物理材质
}
```

### 在渲染器中使用

```javascript
// 渲染器根据材质类型选择着色器
function getProgram(material) {
  if (material instanceof MeshBasicMaterial) {
    return ShaderLib.basic;
  } else if (material instanceof MeshLambertMaterial) {
    return ShaderLib.lambert;
  } else if (material instanceof MeshPhongMaterial) {
    return ShaderLib.phong;
  } else if (material instanceof MeshStandardMaterial) {
    return ShaderLib.standard;
  }
  // ...
}
```

## 享元模式

### 几何体共享

```javascript
// 共享几何体减少内存
const sharedGeometry = new THREE.BoxGeometry(1, 1, 1);

// 多个 Mesh 使用同一个几何体
for (let i = 0; i < 1000; i++) {
  const material = new THREE.MeshBasicMaterial({
    color: Math.random() * 0xffffff
  });
  
  const mesh = new THREE.Mesh(sharedGeometry, material);
  mesh.position.random().multiplyScalar(100);
  scene.add(mesh);
}

// GPU 只有一份几何体数据
```

### 材质共享

```javascript
// 材质也可以共享
const sharedMaterial = new THREE.MeshStandardMaterial({
  color: 0xff0000,
  roughness: 0.5,
  metalness: 0.5
});

// 多个 Mesh 使用同一个材质
meshes.forEach(mesh => {
  mesh.material = sharedMaterial;
});

// 修改材质会影响所有使用它的 Mesh
sharedMaterial.color.setHex(0x00ff00);
```

## 对象池模式

### Three.js 内部实现

```javascript
// 临时对象复用，避免 GC
const _vector = new Vector3();
const _matrix = new Matrix4();
const _quaternion = new Quaternion();

class Object3D {
  getWorldPosition(target = new Vector3()) {
    this.updateWorldMatrix(true, false);
    return target.setFromMatrixPosition(this.matrixWorld);
  }
  
  getWorldQuaternion(target = new Quaternion()) {
    this.updateWorldMatrix(true, false);
    this.matrixWorld.decompose(_vector, target, _vector);
    return target;
  }
}
```

### 用户层对象池

```javascript
class ObjectPool {
  constructor(factory, initialSize = 10) {
    this.factory = factory;
    this.pool = [];
    
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }
  
  acquire() {
    return this.pool.pop() || this.factory();
  }
  
  release(object) {
    this.pool.push(object);
  }
}

// 使用
const vectorPool = new ObjectPool(() => new THREE.Vector3(), 100);

function update() {
  const temp = vectorPool.acquire();
  // 使用 temp...
  temp.set(0, 0, 0);  // 重置
  vectorPool.release(temp);
}
```

## 最佳实践

### 资源管理

```javascript
// 正确释放资源
function dispose(object) {
  object.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }
    
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(m => disposeMaterial(m));
      } else {
        disposeMaterial(child.material);
      }
    }
  });
}

function disposeMaterial(material) {
  for (const key in material) {
    const value = material[key];
    if (value && typeof value.dispose === 'function') {
      value.dispose();  // 纹理
    }
  }
  material.dispose();
}
```

### 避免内存泄漏

```javascript
// ❌ 错误：每帧创建新对象
function update() {
  const direction = new THREE.Vector3(0, 0, 1);  // 每帧创建
  camera.getWorldDirection(direction);
}

// ✅ 正确：复用对象
const _direction = new THREE.Vector3();
function update() {
  camera.getWorldDirection(_direction);
}
```

### 合理使用 needsUpdate

```javascript
// 几何体更新
geometry.attributes.position.array[0] = newValue;
geometry.attributes.position.needsUpdate = true;

// 纹理更新
texture.image = newImage;
texture.needsUpdate = true;

// 材质更新
material.color.setHex(0xff0000);
// 颜色不需要 needsUpdate

material.map = newTexture;
material.needsUpdate = true;  // 更换纹理需要
```

### 批量更新

```javascript
// ❌ 错误：逐个添加
for (const mesh of meshes) {
  scene.add(mesh);  // 每次触发事件
}

// ✅ 正确：使用 Group
const group = new THREE.Group();
for (const mesh of meshes) {
  group.add(mesh);
}
scene.add(group);  // 一次性添加
```

## 代码组织

### 模块化结构

```javascript
// 分离关注点
class GameScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = this.createCamera();
    this.lights = this.createLights();
    this.player = new Player();
    this.enemies = new EnemyManager();
  }
  
  createCamera() {
    return new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  }
  
  createLights() {
    const ambient = new THREE.AmbientLight(0x404040);
    const directional = new THREE.DirectionalLight(0xffffff);
    
    this.scene.add(ambient, directional);
    return { ambient, directional };
  }
  
  update(deltaTime) {
    this.player.update(deltaTime);
    this.enemies.update(deltaTime);
  }
  
  dispose() {
    this.player.dispose();
    this.enemies.dispose();
    // ...
  }
}
```

## 本章小结

- 组合模式构建场景图层次结构
- 观察者模式实现松耦合事件系统
- 工厂模式封装资源加载逻辑
- 策略模式让材质系统可扩展
- 享元模式共享几何体和材质
- 对象池减少 GC 压力
- 遵循最佳实践避免常见问题

下一章，我们将学习 Three.js 数学库的设计哲学。
