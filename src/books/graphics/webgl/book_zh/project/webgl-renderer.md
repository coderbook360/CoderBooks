# 构建 WebGL 渲染器

> "从零构建渲染器是理解图形编程的最佳方式，把知识串联成完整的系统。"

## 架构设计

### 整体结构

```
┌─────────────────────────────────────────────────────────┐
│                渲染器架构                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Application                                           │
│       ↓                                                 │
│   Renderer (核心)                                       │
│   ├── ResourceManager (资源管理)                        │
│   │   ├── TextureManager                                │
│   │   ├── ShaderManager                                 │
│   │   └── GeometryManager                               │
│   ├── RenderPipeline (渲染管线)                         │
│   │   ├── GeometryPass                                  │
│   │   ├── LightingPass                                  │
│   │   └── PostProcessPass                               │
│   └── Scene (场景)                                      │
│       ├── Camera                                        │
│       ├── Lights                                        │
│       └── Objects                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 核心类图

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   Renderer                                              │
│   ├── gl: WebGL2RenderingContext                       │
│   ├── canvas: HTMLCanvasElement                        │
│   ├── state: GLStateCache                              │
│   ├── resources: ResourceManager                       │
│   └── render(scene, camera)                            │
│                                                         │
│   Scene                                                 │
│   ├── objects: Object3D[]                              │
│   ├── lights: Light[]                                  │
│   ├── add(object)                                      │
│   └── remove(object)                                   │
│                                                         │
│   Object3D                                              │
│   ├── position: vec3                                   │
│   ├── rotation: quat                                   │
│   ├── scale: vec3                                      │
│   ├── geometry: Geometry                               │
│   ├── material: Material                               │
│   └── updateMatrix()                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 核心模块

### 渲染器类

```javascript
class Renderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', {
      antialias: options.antialias ?? true,
      alpha: options.alpha ?? false,
      depth: true,
      stencil: options.stencil ?? false,
      powerPreference: options.powerPreference ?? 'high-performance'
    });
    
    if (!this.gl) {
      throw new Error('WebGL 2 not supported');
    }
    
    this.state = new GLStateCache(this.gl);
    this.resources = new ResourceManager(this.gl);
    this.pipeline = new RenderPipeline(this);
    
    this.clearColor = [0.1, 0.1, 0.1, 1.0];
    this.autoClear = true;
    
    this.init();
  }
  
  init() {
    const gl = this.gl;
    
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
    
    gl.clearColor(...this.clearColor);
    
    // 创建默认资源
    this.resources.createDefaultResources();
  }
  
  setSize(width, height, updateStyle = true) {
    this.canvas.width = width;
    this.canvas.height = height;
    
    if (updateStyle) {
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
    }
    
    this.gl.viewport(0, 0, width, height);
    this.pipeline.resize(width, height);
  }
  
  render(scene, camera) {
    const gl = this.gl;
    
    // 更新相机
    camera.updateMatrices();
    
    // 更新场景
    scene.updateWorldMatrices();
    
    // 收集可渲染对象
    const renderList = this.collectRenderables(scene, camera);
    
    // 执行渲染管线
    this.pipeline.execute(renderList, camera);
  }
  
  collectRenderables(scene, camera) {
    const frustum = new Frustum();
    frustum.setFromMatrix(camera.viewProjectionMatrix);
    
    const renderList = {
      opaque: [],
      transparent: [],
      lights: scene.lights
    };
    
    scene.traverse((object) => {
      if (!object.visible) return;
      if (!object.geometry || !object.material) return;
      
      // 视锥裁剪
      if (object.frustumCulled) {
        const bounds = object.geometry.boundingSphere;
        if (bounds && !frustum.containsSphere(
          vec3.transformMat4([], bounds.center, object.worldMatrix),
          bounds.radius * Math.max(...object.scale)
        )) {
          return;
        }
      }
      
      // 计算到相机距离
      object.distanceToCamera = vec3.distance(
        camera.position,
        [object.worldMatrix[12], object.worldMatrix[13], object.worldMatrix[14]]
      );
      
      // 分类
      if (object.material.transparent) {
        renderList.transparent.push(object);
      } else {
        renderList.opaque.push(object);
      }
    });
    
    // 排序
    renderList.opaque.sort((a, b) => {
      if (a.material.programId !== b.material.programId) {
        return a.material.programId - b.material.programId;
      }
      return a.distanceToCamera - b.distanceToCamera;
    });
    
    renderList.transparent.sort((a, b) => {
      return b.distanceToCamera - a.distanceToCamera;
    });
    
    return renderList;
  }
  
  clear(color = true, depth = true, stencil = false) {
    const gl = this.gl;
    let bits = 0;
    if (color) bits |= gl.COLOR_BUFFER_BIT;
    if (depth) bits |= gl.DEPTH_BUFFER_BIT;
    if (stencil) bits |= gl.STENCIL_BUFFER_BIT;
    gl.clear(bits);
  }
}
```

### 场景类

```javascript
class Scene {
  constructor() {
    this.children = [];
    this.lights = [];
    this.background = null;
    this.environment = null;
  }
  
  add(object) {
    if (object.parent) {
      object.parent.remove(object);
    }
    
    object.parent = this;
    this.children.push(object);
    
    if (object instanceof Light) {
      this.lights.push(object);
    }
  }
  
  remove(object) {
    const index = this.children.indexOf(object);
    if (index !== -1) {
      object.parent = null;
      this.children.splice(index, 1);
      
      if (object instanceof Light) {
        const lightIndex = this.lights.indexOf(object);
        if (lightIndex !== -1) {
          this.lights.splice(lightIndex, 1);
        }
      }
    }
  }
  
  traverse(callback) {
    for (const child of this.children) {
      callback(child);
      if (child.traverse) {
        child.traverse(callback);
      }
    }
  }
  
  updateWorldMatrices() {
    for (const child of this.children) {
      child.updateWorldMatrix(true);
    }
  }
}
```

### 3D 对象类

```javascript
class Object3D {
  constructor() {
    this.parent = null;
    this.children = [];
    
    this.position = vec3.create();
    this.rotation = quat.create();
    this.scale = vec3.fromValues(1, 1, 1);
    
    this.matrix = mat4.create();
    this.worldMatrix = mat4.create();
    this.normalMatrix = mat3.create();
    
    this.visible = true;
    this.frustumCulled = true;
    
    this.geometry = null;
    this.material = null;
  }
  
  add(child) {
    if (child.parent) {
      child.parent.remove(child);
    }
    child.parent = this;
    this.children.push(child);
  }
  
  remove(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      child.parent = null;
      this.children.splice(index, 1);
    }
  }
  
  updateMatrix() {
    mat4.fromRotationTranslationScale(
      this.matrix,
      this.rotation,
      this.position,
      this.scale
    );
  }
  
  updateWorldMatrix(updateChildren = true) {
    this.updateMatrix();
    
    if (this.parent && this.parent.worldMatrix) {
      mat4.multiply(this.worldMatrix, this.parent.worldMatrix, this.matrix);
    } else {
      mat4.copy(this.worldMatrix, this.matrix);
    }
    
    // 计算法线矩阵
    mat3.normalFromMat4(this.normalMatrix, this.worldMatrix);
    
    if (updateChildren) {
      for (const child of this.children) {
        child.updateWorldMatrix(true);
      }
    }
  }
  
  traverse(callback) {
    callback(this);
    for (const child of this.children) {
      child.traverse(callback);
    }
  }
  
  lookAt(target) {
    const m = mat4.create();
    mat4.targetTo(m, this.position, target, [0, 1, 0]);
    mat4.getRotation(this.rotation, m);
  }
}
```

## 几何与材质

### 几何类

```javascript
class Geometry {
  constructor() {
    this.attributes = {};
    this.indices = null;
    this.boundingSphere = null;
    this.boundingBox = null;
    
    this.vao = null;
    this.needsUpdate = true;
  }
  
  setAttribute(name, data, size, options = {}) {
    this.attributes[name] = {
      data: data instanceof Float32Array ? data : new Float32Array(data),
      size,
      normalized: options.normalized ?? false,
      stride: options.stride ?? 0,
      offset: options.offset ?? 0,
      buffer: null
    };
    this.needsUpdate = true;
  }
  
  setIndices(data) {
    this.indices = {
      data: data instanceof Uint16Array ? data : 
            data instanceof Uint32Array ? data : new Uint16Array(data),
      buffer: null
    };
    this.needsUpdate = true;
  }
  
  computeBoundingSphere() {
    const positions = this.attributes.position?.data;
    if (!positions) return;
    
    // 计算中心
    const center = vec3.create();
    const count = positions.length / 3;
    
    for (let i = 0; i < count; i++) {
      center[0] += positions[i * 3];
      center[1] += positions[i * 3 + 1];
      center[2] += positions[i * 3 + 2];
    }
    vec3.scale(center, center, 1 / count);
    
    // 计算半径
    let maxRadiusSq = 0;
    for (let i = 0; i < count; i++) {
      const dx = positions[i * 3] - center[0];
      const dy = positions[i * 3 + 1] - center[1];
      const dz = positions[i * 3 + 2] - center[2];
      maxRadiusSq = Math.max(maxRadiusSq, dx * dx + dy * dy + dz * dz);
    }
    
    this.boundingSphere = {
      center,
      radius: Math.sqrt(maxRadiusSq)
    };
  }
  
  upload(gl) {
    if (!this.needsUpdate) return;
    
    // 创建 VAO
    if (!this.vao) {
      this.vao = gl.createVertexArray();
    }
    
    gl.bindVertexArray(this.vao);
    
    // 上传属性
    let location = 0;
    for (const [name, attr] of Object.entries(this.attributes)) {
      if (!attr.buffer) {
        attr.buffer = gl.createBuffer();
      }
      
      gl.bindBuffer(gl.ARRAY_BUFFER, attr.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, attr.data, gl.STATIC_DRAW);
      
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(
        location,
        attr.size,
        gl.FLOAT,
        attr.normalized,
        attr.stride,
        attr.offset
      );
      
      location++;
    }
    
    // 上传索引
    if (this.indices) {
      if (!this.indices.buffer) {
        this.indices.buffer = gl.createBuffer();
      }
      
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indices.buffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices.data, gl.STATIC_DRAW);
    }
    
    gl.bindVertexArray(null);
    this.needsUpdate = false;
  }
  
  dispose(gl) {
    if (this.vao) {
      gl.deleteVertexArray(this.vao);
    }
    
    for (const attr of Object.values(this.attributes)) {
      if (attr.buffer) {
        gl.deleteBuffer(attr.buffer);
      }
    }
    
    if (this.indices?.buffer) {
      gl.deleteBuffer(this.indices.buffer);
    }
  }
}
```

### 材质类

```javascript
class Material {
  constructor(options = {}) {
    this.color = options.color ?? [1, 1, 1];
    this.metallic = options.metallic ?? 0.0;
    this.roughness = options.roughness ?? 0.5;
    
    this.albedoMap = options.albedoMap ?? null;
    this.normalMap = options.normalMap ?? null;
    this.metallicRoughnessMap = options.metallicRoughnessMap ?? null;
    
    this.transparent = options.transparent ?? false;
    this.opacity = options.opacity ?? 1.0;
    
    this.doubleSided = options.doubleSided ?? false;
    this.depthTest = options.depthTest ?? true;
    this.depthWrite = options.depthWrite ?? true;
    
    this.program = null;
    this.programId = 0;
    this.needsUpdate = true;
  }
  
  getProgram(renderer) {
    if (!this.program || this.needsUpdate) {
      this.program = renderer.resources.getProgram(this.getShaderKey());
      this.programId = this.program?.id ?? 0;
      this.needsUpdate = false;
    }
    return this.program;
  }
  
  getShaderKey() {
    let key = 'standard';
    if (this.albedoMap) key += '_albedo';
    if (this.normalMap) key += '_normal';
    if (this.metallicRoughnessMap) key += '_mr';
    return key;
  }
  
  bind(gl, program) {
    const uniforms = program.uniforms;
    
    gl.uniform3fv(uniforms.u_color, this.color);
    gl.uniform1f(uniforms.u_metallic, this.metallic);
    gl.uniform1f(uniforms.u_roughness, this.roughness);
    gl.uniform1f(uniforms.u_opacity, this.opacity);
    
    let textureUnit = 0;
    
    if (this.albedoMap) {
      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.albedoMap);
      gl.uniform1i(uniforms.u_albedoMap, textureUnit);
      textureUnit++;
    }
    
    if (this.normalMap) {
      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.normalMap);
      gl.uniform1i(uniforms.u_normalMap, textureUnit);
      textureUnit++;
    }
    
    // 处理双面和深度
    if (this.doubleSided) {
      gl.disable(gl.CULL_FACE);
    } else {
      gl.enable(gl.CULL_FACE);
    }
    
    gl.depthMask(this.depthWrite);
    
    if (this.transparent) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    } else {
      gl.disable(gl.BLEND);
    }
  }
}
```

## 相机系统

### 透视相机

```javascript
class PerspectiveCamera {
  constructor(fov = 60, aspect = 1, near = 0.1, far = 1000) {
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    
    this.position = vec3.fromValues(0, 0, 5);
    this.target = vec3.create();
    this.up = vec3.fromValues(0, 1, 0);
    
    this.projectionMatrix = mat4.create();
    this.viewMatrix = mat4.create();
    this.viewProjectionMatrix = mat4.create();
    
    this.updateProjection();
  }
  
  updateProjection() {
    mat4.perspective(
      this.projectionMatrix,
      this.fov * Math.PI / 180,
      this.aspect,
      this.near,
      this.far
    );
  }
  
  updateMatrices() {
    mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);
    mat4.multiply(this.viewProjectionMatrix, this.projectionMatrix, this.viewMatrix);
  }
  
  setAspect(aspect) {
    this.aspect = aspect;
    this.updateProjection();
  }
}
```

### 轨道控制器

```javascript
class OrbitControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    
    this.target = vec3.clone(camera.target);
    this.distance = vec3.distance(camera.position, this.target);
    this.phi = Math.PI / 4;      // 垂直角度
    this.theta = Math.PI / 4;    // 水平角度
    
    this.minDistance = 1;
    this.maxDistance = 100;
    this.minPhi = 0.1;
    this.maxPhi = Math.PI - 0.1;
    
    this.rotateSpeed = 0.01;
    this.zoomSpeed = 0.1;
    this.panSpeed = 0.01;
    
    this.isMouseDown = false;
    this.lastMouse = { x: 0, y: 0 };
    
    this.bindEvents();
    this.update();
  }
  
  bindEvents() {
    this.domElement.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });
    
    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });
    
    window.addEventListener('mousemove', (e) => {
      if (!this.isMouseDown) return;
      
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      
      if (e.buttons === 1) {
        // 左键旋转
        this.theta -= dx * this.rotateSpeed;
        this.phi = Math.max(this.minPhi, Math.min(this.maxPhi, 
          this.phi - dy * this.rotateSpeed));
      } else if (e.buttons === 2) {
        // 右键平移
        this.pan(dx, dy);
      }
      
      this.lastMouse = { x: e.clientX, y: e.clientY };
      this.update();
    });
    
    this.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.distance *= 1 + e.deltaY * this.zoomSpeed * 0.01;
      this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
      this.update();
    });
    
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  pan(dx, dy) {
    const forward = vec3.sub([], this.target, this.camera.position);
    vec3.normalize(forward, forward);
    
    const right = vec3.cross([], forward, this.camera.up);
    vec3.normalize(right, right);
    
    const up = vec3.cross([], right, forward);
    
    const panOffset = vec3.create();
    vec3.scaleAndAdd(panOffset, panOffset, right, -dx * this.panSpeed);
    vec3.scaleAndAdd(panOffset, panOffset, up, dy * this.panSpeed);
    
    vec3.add(this.target, this.target, panOffset);
  }
  
  update() {
    // 球坐标转笛卡尔坐标
    const x = this.distance * Math.sin(this.phi) * Math.cos(this.theta);
    const y = this.distance * Math.cos(this.phi);
    const z = this.distance * Math.sin(this.phi) * Math.sin(this.theta);
    
    vec3.add(this.camera.position, this.target, [x, y, z]);
    vec3.copy(this.camera.target, this.target);
  }
}
```

## 渲染管线

### 管线类

```javascript
class RenderPipeline {
  constructor(renderer) {
    this.renderer = renderer;
    this.gl = renderer.gl;
    
    this.passes = [];
    this.setupPasses();
  }
  
  setupPasses() {
    this.forwardPass = new ForwardPass(this);
    this.passes.push(this.forwardPass);
  }
  
  execute(renderList, camera) {
    for (const pass of this.passes) {
      pass.execute(renderList, camera);
    }
  }
  
  resize(width, height) {
    for (const pass of this.passes) {
      if (pass.resize) {
        pass.resize(width, height);
      }
    }
  }
}

class ForwardPass {
  constructor(pipeline) {
    this.pipeline = pipeline;
    this.gl = pipeline.gl;
  }
  
  execute(renderList, camera) {
    const gl = this.gl;
    const renderer = this.pipeline.renderer;
    
    // 清除
    if (renderer.autoClear) {
      renderer.clear(true, true, false);
    }
    
    // 渲染不透明物体
    for (const object of renderList.opaque) {
      this.renderObject(object, camera, renderList.lights);
    }
    
    // 渲染透明物体
    for (const object of renderList.transparent) {
      this.renderObject(object, camera, renderList.lights);
    }
  }
  
  renderObject(object, camera, lights) {
    const gl = this.gl;
    const renderer = this.pipeline.renderer;
    
    // 获取着色器程序
    const program = object.material.getProgram(renderer);
    if (!program) return;
    
    renderer.state.useProgram(program.handle);
    
    // 设置相机 uniform
    gl.uniformMatrix4fv(program.uniforms.u_viewMatrix, false, camera.viewMatrix);
    gl.uniformMatrix4fv(program.uniforms.u_projectionMatrix, false, camera.projectionMatrix);
    gl.uniform3fv(program.uniforms.u_viewPos, camera.position);
    
    // 设置模型 uniform
    gl.uniformMatrix4fv(program.uniforms.u_modelMatrix, false, object.worldMatrix);
    gl.uniformMatrix3fv(program.uniforms.u_normalMatrix, false, object.normalMatrix);
    
    // 设置光照
    this.setLightUniforms(program, lights);
    
    // 绑定材质
    object.material.bind(gl, program);
    
    // 上传并绑定几何体
    object.geometry.upload(gl);
    renderer.state.bindVertexArray(object.geometry.vao);
    
    // 绘制
    if (object.geometry.indices) {
      gl.drawElements(
        gl.TRIANGLES,
        object.geometry.indices.data.length,
        object.geometry.indices.data instanceof Uint32Array ? 
          gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
        0
      );
    } else {
      const count = object.geometry.attributes.position.data.length / 3;
      gl.drawArrays(gl.TRIANGLES, 0, count);
    }
  }
  
  setLightUniforms(program, lights) {
    const gl = this.gl;
    
    gl.uniform1i(program.uniforms.u_numLights, lights.length);
    
    for (let i = 0; i < lights.length && i < 8; i++) {
      const light = lights[i];
      gl.uniform3fv(program.uniforms[`u_lights[${i}].position`], light.position);
      gl.uniform3fv(program.uniforms[`u_lights[${i}].color`], light.color);
      gl.uniform1f(program.uniforms[`u_lights[${i}].intensity`], light.intensity);
    }
  }
}
```

## 使用示例

```javascript
// 初始化
const canvas = document.getElementById('canvas');
const renderer = new Renderer(canvas);
renderer.setSize(window.innerWidth, window.innerHeight);

// 创建场景
const scene = new Scene();

// 创建相机
const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight);
camera.position = [0, 2, 5];

// 创建控制器
const controls = new OrbitControls(camera, canvas);

// 创建几何体
const geometry = new BoxGeometry(1, 1, 1);

// 创建材质
const material = new Material({
  color: [1, 0.5, 0.2],
  metallic: 0.3,
  roughness: 0.7
});

// 创建网格
const mesh = new Object3D();
mesh.geometry = geometry;
mesh.material = material;
scene.add(mesh);

// 添加光源
const light = new PointLight({
  position: [5, 5, 5],
  color: [1, 1, 1],
  intensity: 100
});
scene.add(light);

// 渲染循环
function animate() {
  requestAnimationFrame(animate);
  
  mesh.rotation = quat.rotateY(mesh.rotation, mesh.rotation, 0.01);
  
  controls.update();
  renderer.render(scene, camera);
}

animate();

// 窗口大小变化
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspect(window.innerWidth / window.innerHeight);
});
```

## 本章小结

- 渲染器架构分为核心、资源、管线三层
- 场景管理对象和光源的层级关系
- 几何体封装顶点属性和索引
- 材质定义表面属性和着色器配置
- 相机处理视图和投影变换
- 渲染管线组织多通道渲染
- 视锥裁剪优化渲染性能

下一章，我们将学习常见错误排查。
