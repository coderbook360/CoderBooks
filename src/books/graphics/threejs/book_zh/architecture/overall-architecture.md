# Three.js 整体架构与模块划分

> "理解架构是掌握大型框架的第一步，让你在复杂的代码中不再迷失。"

## 整体架构概览

### 模块划分

```
┌─────────────────────────────────────────────────────────┐
│                 Three.js 架构                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │              应用层 (Application)                │  │
│   └─────────────────────────────────────────────────┘  │
│                         ↓                               │
│   ┌─────────────────────────────────────────────────┐  │
│   │              场景层 (Scene Graph)                │  │
│   │  Scene ─ Object3D ─ Mesh/Light/Camera           │  │
│   └─────────────────────────────────────────────────┘  │
│                         ↓                               │
│   ┌─────────────────────────────────────────────────┐  │
│   │              渲染层 (Renderer)                   │  │
│   │  WebGLRenderer ─ RenderLists ─ Programs         │  │
│   └─────────────────────────────────────────────────┘  │
│                         ↓                               │
│   ┌─────────────────────────────────────────────────┐  │
│   │              WebGL 层 (WebGL Abstractions)      │  │
│   │  State ─ Textures ─ Geometries ─ Attributes     │  │
│   └─────────────────────────────────────────────────┘  │
│                         ↓                               │
│   ┌─────────────────────────────────────────────────┐  │
│   │              数学库 (Math)                       │  │
│   │  Vector ─ Matrix ─ Quaternion ─ Color           │  │
│   └─────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 核心目录结构

### 源码组织

```
three/src/
├── core/           # 核心类
│   ├── Object3D.js
│   ├── BufferGeometry.js
│   ├── BufferAttribute.js
│   └── EventDispatcher.js
│
├── math/           # 数学库
│   ├── Vector2.js
│   ├── Vector3.js
│   ├── Vector4.js
│   ├── Matrix3.js
│   ├── Matrix4.js
│   ├── Quaternion.js
│   └── Color.js
│
├── renderers/      # 渲染器
│   ├── WebGLRenderer.js
│   └── webgl/
│       ├── WebGLState.js
│       ├── WebGLPrograms.js
│       ├── WebGLTextures.js
│       └── ...
│
├── scenes/         # 场景
│   ├── Scene.js
│   └── Fog.js
│
├── cameras/        # 相机
│   ├── Camera.js
│   ├── PerspectiveCamera.js
│   └── OrthographicCamera.js
│
├── lights/         # 光源
│   ├── Light.js
│   ├── AmbientLight.js
│   └── ...
│
├── materials/      # 材质
│   ├── Material.js
│   ├── MeshBasicMaterial.js
│   └── ...
│
├── objects/        # 可渲染对象
│   ├── Mesh.js
│   ├── Line.js
│   └── ...
│
├── geometries/     # 几何体
│   ├── BoxGeometry.js
│   ├── SphereGeometry.js
│   └── ...
│
├── textures/       # 纹理
│   ├── Texture.js
│   └── ...
│
├── loaders/        # 加载器
│   ├── Loader.js
│   ├── TextureLoader.js
│   └── ...
│
└── animation/      # 动画
    ├── AnimationMixer.js
    ├── AnimationClip.js
    └── ...
```

## 核心类关系

### 继承体系

```
EventDispatcher (基类)
    │
    ├── Object3D (3D 对象基类)
    │   ├── Scene
    │   ├── Group
    │   ├── Mesh
    │   ├── Line
    │   ├── Points
    │   ├── Sprite
    │   ├── Bone
    │   ├── SkinnedMesh
    │   ├── Camera
    │   │   ├── PerspectiveCamera
    │   │   └── OrthographicCamera
    │   └── Light
    │       ├── AmbientLight
    │       ├── DirectionalLight
    │       ├── PointLight
    │       └── SpotLight
    │
    ├── Material (材质基类)
    │   ├── MeshBasicMaterial
    │   ├── MeshLambertMaterial
    │   ├── MeshPhongMaterial
    │   ├── MeshStandardMaterial
    │   ├── MeshPhysicalMaterial
    │   └── ShaderMaterial
    │
    ├── BufferGeometry
    │
    └── Texture
```

### 组合关系

```javascript
// Mesh = Geometry + Material
class Mesh extends Object3D {
  constructor(geometry, material) {
    this.geometry = geometry;  // BufferGeometry
    this.material = material;  // Material
  }
}

// Scene 包含多个 Object3D
class Scene extends Object3D {
  // children 继承自 Object3D
}

// Camera 用于渲染
class PerspectiveCamera extends Camera {
  // 投影矩阵
}
```

## 渲染流程

### 主渲染循环

```javascript
// 用户代码
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
```

### 内部流程

```
render(scene, camera)
    │
    ├── 1. projectObject(scene)
    │      遍历场景图，收集可渲染对象
    │
    ├── 2. renderLists.init()
    │      初始化渲染列表
    │
    ├── 3. sortObjects()
    │      按材质/距离排序
    │
    ├── 4. setupLights()
    │      收集和处理光源
    │
    ├── 5. renderScene()
    │      │
    │      ├── renderObjects(opaqueObjects)
    │      │      渲染不透明物体
    │      │
    │      └── renderObjects(transparentObjects)
    │             渲染透明物体
    │
    └── 6. renderObject(object)
           │
           ├── getProgram(material)
           │      获取/编译着色器
           │
           ├── setProgram(program)
           │      设置 uniform
           │
           └── draw()
                  执行绘制调用
```

## 资源管理

### 缓存机制

```javascript
// WebGLRenderer 内部的资源管理器
class WebGLRenderer {
  constructor() {
    // 各种资源管理器
    this._programs = new WebGLPrograms();     // 着色器程序
    this._textures = new WebGLTextures();     // 纹理
    this._geometries = new WebGLGeometries(); // 几何体
    this._attributes = new WebGLAttributes(); // 属性
    this._objects = new WebGLObjects();       // 对象缓存
  }
}
```

### 资源生命周期

```
┌─────────────────────────────────────────────────────────┐
│                资源生命周期                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   创建 (new)                                            │
│       ↓                                                 │
│   首次渲染时上传到 GPU                                  │
│       ↓                                                 │
│   缓存 (避免重复上传)                                   │
│       ↓                                                 │
│   needsUpdate = true 时更新                             │
│       ↓                                                 │
│   dispose() 释放 GPU 资源                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 着色器系统

### ShaderLib

```javascript
// 预定义的着色器库
const ShaderLib = {
  basic: {
    uniforms: { ... },
    vertexShader: `...`,
    fragmentShader: `...`
  },
  lambert: { ... },
  phong: { ... },
  standard: { ... },
  physical: { ... }
};
```

### ShaderChunk

```javascript
// 可复用的着色器片段
const ShaderChunk = {
  common: `
    #define PI 3.141592653589793
    ...
  `,
  lights_pars_begin: `
    uniform vec3 ambientLightColor;
    ...
  `,
  normal_vertex: `
    #ifdef USE_NORMALMAP
      ...
    #endif
  `
};
```

### 着色器组装

```javascript
// 根据材质特性动态组装着色器
function getProgram(material, lights) {
  // 计算材质 hash
  const hash = getProgramHash(material, lights);
  
  // 检查缓存
  if (programs.has(hash)) {
    return programs.get(hash);
  }
  
  // 组装着色器
  const vertexShader = assembleVertexShader(material);
  const fragmentShader = assembleFragmentShader(material);
  
  // 编译程序
  const program = compileProgram(vertexShader, fragmentShader);
  
  // 缓存
  programs.set(hash, program);
  
  return program;
}
```

## 数学库设计

### 链式调用

```javascript
// Three.js 数学库支持链式调用
const v = new THREE.Vector3(1, 2, 3)
  .add(new THREE.Vector3(4, 5, 6))
  .normalize()
  .multiplyScalar(10);
```

### 复用原则

```javascript
// 避免创建临时对象
const _tempVector = new THREE.Vector3();

function update() {
  // 复用临时对象
  _tempVector.copy(position).add(velocity);
}
```

## 扩展机制

### 添加自定义几何体

```javascript
class CustomGeometry extends THREE.BufferGeometry {
  constructor(params) {
    super();
    this.type = 'CustomGeometry';
    this.parameters = params;
    
    // 生成顶点数据
    const vertices = [];
    const normals = [];
    const uvs = [];
    
    // ... 生成逻辑
    
    this.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    this.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  }
}
```

### 添加自定义材质

```javascript
class CustomMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        u_time: { value: 0 },
        u_color: { value: new THREE.Color(0xff0000) }
      },
      vertexShader: `...`,
      fragmentShader: `...`
    });
    
    this.type = 'CustomMaterial';
  }
  
  update(time) {
    this.uniforms.u_time.value = time;
  }
}
```

## 本章小结

- Three.js 采用分层架构：数学库 → WebGL 抽象 → 渲染器 → 场景层 → 应用层
- 核心类通过继承 EventDispatcher 获得事件能力
- Object3D 是所有 3D 对象的基类
- 渲染流程：场景遍历 → 排序 → 着色器选择 → 绘制
- 资源管理器负责 GPU 资源的缓存和生命周期
- 着色器通过 ShaderChunk 模块化组装

下一章，我们将学习 Three.js 的核心设计模式。
