# 从 WebGL 到 Three.js

> "掌握底层原理后，高级框架将成为你的加速器而非黑盒。"

## Three.js 简介

### 什么是 Three.js

Three.js 是一个基于 WebGL 的 3D 图形库，提供高级抽象和丰富的功能。

```
┌─────────────────────────────────────────────────────────┐
│                Three.js 架构                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   应用代码                                               │
│       ↓                                                 │
│   Three.js API                                          │
│   ├── Scene (场景)                                      │
│   ├── Camera (相机)                                     │
│   ├── Renderer (渲染器)                                 │
│   ├── Mesh (网格)                                       │
│   │   ├── Geometry (几何体)                             │
│   │   └── Material (材质)                               │
│   └── Light (光源)                                      │
│       ↓                                                 │
│   WebGLRenderer                                         │
│       ↓                                                 │
│   WebGL 调用                                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 概念对比

| WebGL 概念 | Three.js 对应 |
|-----------|---------------|
| WebGLRenderingContext | WebGLRenderer |
| 顶点缓冲 + 索引缓冲 | BufferGeometry |
| 着色器程序 | Material |
| uniform + texture | Material 属性 |
| 矩阵变换 | Object3D 变换 |
| 帧缓冲 | WebGLRenderTarget |
| 绘制调用 | 自动批处理 |

## 快速入门

### 基础设置

```javascript
import * as THREE from 'three';

// 创建场景
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// 创建相机
const camera = new THREE.PerspectiveCamera(
  75,                           // FOV
  window.innerWidth / window.innerHeight,  // 宽高比
  0.1,                          // 近平面
  1000                          // 远平面
);
camera.position.set(0, 2, 5);
camera.lookAt(0, 0, 0);

// 创建渲染器
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// 创建几何体和材质
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({
  color: 0x00ff88,
  roughness: 0.5,
  metalness: 0.3
});

// 创建网格
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// 添加光源
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// 渲染循环
function animate() {
  requestAnimationFrame(animate);
  
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  
  renderer.render(scene, camera);
}

animate();
```

### 窗口调整

```javascript
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
```

## 几何体

### BufferGeometry

```javascript
// 使用 BufferGeometry (类似原生 WebGL)
const geometry = new THREE.BufferGeometry();

// 顶点位置
const positions = new Float32Array([
  -1, -1,  1,   1, -1,  1,   1,  1,  1,
  -1, -1,  1,   1,  1,  1,  -1,  1,  1
]);

// 法线
const normals = new Float32Array([
  0, 0, 1,  0, 0, 1,  0, 0, 1,
  0, 0, 1,  0, 0, 1,  0, 0, 1
]);

// UV
const uvs = new Float32Array([
  0, 0,  1, 0,  1, 1,
  0, 0,  1, 1,  0, 1
]);

// 设置属性
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

// 使用索引
const indices = new Uint16Array([0, 1, 2, 3, 4, 5]);
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
```

### 内置几何体

```javascript
// Three.js 提供的便捷几何体
const box = new THREE.BoxGeometry(1, 1, 1);
const sphere = new THREE.SphereGeometry(1, 32, 32);
const plane = new THREE.PlaneGeometry(10, 10);
const cylinder = new THREE.CylinderGeometry(0.5, 0.5, 2, 32);
const torus = new THREE.TorusGeometry(1, 0.4, 16, 100);
const torusKnot = new THREE.TorusKnotGeometry(1, 0.4, 100, 16);
```

## 材质

### 内置材质

```javascript
// 基础材质（无光照）
const basic = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  wireframe: false
});

// 标准 PBR 材质
const standard = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.5,
  metalness: 0.5,
  map: diffuseTexture,
  normalMap: normalTexture,
  roughnessMap: roughnessTexture,
  metalnessMap: metalnessTexture,
  aoMap: aoTexture
});

// 物理材质（更真实的 PBR）
const physical = new THREE.MeshPhysicalMaterial({
  ...standard,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
  transmission: 0.9,  // 玻璃效果
  thickness: 0.5
});

// Phong 材质
const phong = new THREE.MeshPhongMaterial({
  color: 0xffffff,
  shininess: 100,
  specular: 0x444444
});
```

### ShaderMaterial

```javascript
// 自定义着色器 (熟悉的 WebGL 代码)
const customMaterial = new THREE.ShaderMaterial({
  uniforms: {
    u_time: { value: 0 },
    u_color: { value: new THREE.Color(0x00ff00) },
    u_texture: { value: texture }
  },
  
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    
    void main() {
      vUv = uv;
      vNormal = normalMatrix * normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  
  fragmentShader: `
    uniform float u_time;
    uniform vec3 u_color;
    uniform sampler2D u_texture;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    
    void main() {
      vec3 light = normalize(vec3(1.0, 1.0, 1.0));
      float diffuse = max(dot(vNormal, light), 0.0);
      
      vec3 texColor = texture2D(u_texture, vUv).rgb;
      vec3 finalColor = texColor * u_color * diffuse;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
  
  side: THREE.DoubleSide
});

// 更新 uniform
function animate() {
  customMaterial.uniforms.u_time.value = performance.now() / 1000;
  // ...
}
```

### RawShaderMaterial

```javascript
// 完全控制着色器（不自动注入变量）
const rawMaterial = new THREE.RawShaderMaterial({
  uniforms: {
    u_modelMatrix: { value: new THREE.Matrix4() },
    u_viewMatrix: { value: new THREE.Matrix4() },
    u_projectionMatrix: { value: new THREE.Matrix4() }
  },
  
  vertexShader: `#version 300 es
    in vec3 position;
    in vec2 uv;
    
    uniform mat4 u_modelMatrix;
    uniform mat4 u_viewMatrix;
    uniform mat4 u_projectionMatrix;
    
    out vec2 v_uv;
    
    void main() {
      v_uv = uv;
      gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(position, 1.0);
    }
  `,
  
  fragmentShader: `#version 300 es
    precision highp float;
    
    in vec2 v_uv;
    out vec4 fragColor;
    
    void main() {
      fragColor = vec4(v_uv, 0.0, 1.0);
    }
  `,
  
  glslVersion: THREE.GLSL3
});
```

## 纹理

### 加载纹理

```javascript
// 纹理加载器
const textureLoader = new THREE.TextureLoader();

// 同步风格（实际是异步）
const texture = textureLoader.load(
  'texture.jpg',
  (texture) => console.log('Loaded'),
  (progress) => console.log('Progress'),
  (error) => console.error('Error', error)
);

// Promise 风格
async function loadTexture(url) {
  return new Promise((resolve, reject) => {
    textureLoader.load(url, resolve, undefined, reject);
  });
}

// 使用
const diffuse = await loadTexture('diffuse.jpg');
const normal = await loadTexture('normal.jpg');
```

### 纹理设置

```javascript
const texture = textureLoader.load('texture.jpg');

// 对应 WebGL 的纹理参数
texture.wrapS = THREE.RepeatWrapping;  // gl.TEXTURE_WRAP_S
texture.wrapT = THREE.RepeatWrapping;  // gl.TEXTURE_WRAP_T
texture.repeat.set(2, 2);

texture.minFilter = THREE.LinearMipmapLinearFilter;
texture.magFilter = THREE.LinearFilter;

texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

// 翻转 Y（默认开启）
texture.flipY = true;

// sRGB 编码
texture.colorSpace = THREE.SRGBColorSpace;
```

## 光源

### 光源类型

```javascript
// 环境光
const ambient = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambient);

// 方向光（类似太阳）
const directional = new THREE.DirectionalLight(0xffffff, 1);
directional.position.set(5, 10, 7);
directional.castShadow = true;
scene.add(directional);

// 点光源
const point = new THREE.PointLight(0xff0000, 1, 100);
point.position.set(0, 5, 0);
scene.add(point);

// 聚光灯
const spot = new THREE.SpotLight(0xffffff, 1);
spot.position.set(0, 10, 0);
spot.angle = Math.PI / 6;
spot.penumbra = 0.5;
spot.castShadow = true;
scene.add(spot);

// 半球光
const hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x3d2817, 1);
scene.add(hemisphere);
```

### 阴影

```javascript
// 启用阴影
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 光源投射阴影
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;

// 物体投射和接收阴影
cube.castShadow = true;
cube.receiveShadow = true;

floor.receiveShadow = true;
```

## 后处理

### EffectComposer

```javascript
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// 创建 composer
const composer = new EffectComposer(renderer);

// 渲染通道
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// 泛光通道
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,  // 强度
  0.4,  // 半径
  0.85  // 阈值
);
composer.addPass(bloomPass);

// 自定义着色器通道
const customShader = {
  uniforms: {
    tDiffuse: { value: null },
    u_time: { value: 0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float u_time;
    varying vec2 vUv;
    
    void main() {
      vec2 uv = vUv;
      // 添加效果...
      gl_FragColor = texture2D(tDiffuse, uv);
    }
  `
};

const customPass = new ShaderPass(customShader);
composer.addPass(customPass);

// 渲染
function animate() {
  requestAnimationFrame(animate);
  
  customPass.uniforms.u_time.value = performance.now() / 1000;
  
  composer.render();  // 代替 renderer.render(scene, camera)
}
```

## 访问底层 WebGL

### 获取 WebGL 上下文

```javascript
// Three.js 封装的 WebGL 上下文
const gl = renderer.getContext();

// 现在可以直接使用 WebGL API
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

// 获取渲染信息
console.log(renderer.info);
// {
//   memory: { geometries, textures },
//   render: { calls, triangles, points, lines },
//   programs: [...]
// }
```

### 扩展 Three.js

```javascript
// 自定义渲染逻辑
class CustomRenderer extends THREE.WebGLRenderer {
  constructor(parameters) {
    super(parameters);
    this.gl = this.getContext();
  }
  
  renderCustom(scene, camera) {
    // 标准渲染
    super.render(scene, camera);
    
    // 自定义 WebGL 调用
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    // ...
  }
}
```

### 使用 RenderTarget

```javascript
// 类似 WebGL 的帧缓冲
const renderTarget = new THREE.WebGLRenderTarget(512, 512, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBAFormat,
  type: THREE.FloatType  // HDR
});

// 渲染到纹理
renderer.setRenderTarget(renderTarget);
renderer.render(scene, camera);
renderer.setRenderTarget(null);

// 使用结果
material.map = renderTarget.texture;

// 多渲染目标
const mrtTarget = new THREE.WebGLMultipleRenderTargets(512, 512, 3);
// 类似 WebGL 的 MRT
```

## 性能优化

### Three.js 特有优化

```javascript
// 1. 合并几何体
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const geometries = meshes.map(m => m.geometry);
const mergedGeometry = mergeBufferGeometries(geometries);
const mergedMesh = new THREE.Mesh(mergedGeometry, material);

// 2. 实例化网格
const instancedMesh = new THREE.InstancedMesh(geometry, material, count);

for (let i = 0; i < count; i++) {
  const matrix = new THREE.Matrix4();
  matrix.setPosition(Math.random() * 100, 0, Math.random() * 100);
  instancedMesh.setMatrixAt(i, matrix);
}

instancedMesh.instanceMatrix.needsUpdate = true;

// 3. LOD
const lod = new THREE.LOD();
lod.addLevel(highDetailMesh, 0);
lod.addLevel(mediumDetailMesh, 50);
lod.addLevel(lowDetailMesh, 100);
scene.add(lod);

// 4. 视锥裁剪（默认开启）
mesh.frustumCulled = true;

// 5. 对象池
const objectPool = [];
function getFromPool() {
  return objectPool.pop() || createNewObject();
}
function returnToPool(obj) {
  objectPool.push(obj);
}
```

## 迁移指南

### 从 WebGL 迁移

```
┌─────────────────────────────────────────────────────────┐
│                迁移对照表                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   WebGL 代码                    Three.js 等价           │
│   ─────────────────────────────────────────────────────│
│   gl.bindBuffer + bufferData    BufferGeometry         │
│   gl.bindTexture + texImage2D   TextureLoader.load()   │
│   gl.createProgram + shaders    Material               │
│   gl.uniformMatrix4fv           自动处理               │
│   gl.drawElements               自动处理               │
│   mat4.perspective              PerspectiveCamera      │
│   mat4.lookAt                   camera.lookAt()        │
│   自定义着色器                  ShaderMaterial         │
│   帧缓冲                        WebGLRenderTarget      │
│   实例化                        InstancedMesh          │
│   变换反馈                      GPUComputationRenderer │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 何时使用原生 WebGL

```
优先使用 Three.js:
- 快速原型开发
- 标准 3D 场景
- 需要大量内置功能
- 团队成员不熟悉底层

考虑原生 WebGL:
- 极致性能优化
- 特殊渲染技术
- 2D 图形或简单场景
- 学习图形编程原理
- 对渲染管线有特殊要求
```

## 本章小结

- Three.js 抽象了繁琐的 WebGL 细节
- 核心概念与 WebGL 一一对应
- ShaderMaterial 允许使用自定义着色器
- 后处理使用 EffectComposer
- 可随时访问底层 WebGL 上下文
- 掌握 WebGL 让你更好地使用 Three.js

---

恭喜你完成了 WebGL 教程！你已经掌握了：

- WebGL 基础和渲染管线
- GLSL 着色器编程
- 纹理、光照和材质
- 帧缓冲和后处理
- 性能优化和调试
- 与高级框架的衔接

继续实践，构建你自己的 3D 世界吧！
