# WebGLRenderer 完整实现

> "WebGLRenderer 是 Three.js 的核心，协调所有渲染子系统。"

## WebGLRenderer 结构

```
WebGLRenderer
├── DOM (domElement, canvas)
├── Context (gl, extensions, capabilities)
├── 子系统
│   ├── WebGLState
│   ├── WebGLPrograms
│   ├── WebGLGeometries
│   ├── WebGLTextures
│   ├── WebGLBindingStates
│   ├── WebGLRenderLists
│   ├── WebGLRenderStates
│   ├── WebGLShadowMap
│   └── WebGLBackground
├── 渲染状态
│   ├── viewport
│   ├── scissor
│   ├── clear color
│   └── tone mapping
└── 统计 (info)
```

## 基础实现

### 构造函数

```typescript
// src/renderers/WebGLRenderer.ts
import { WebGLState } from './webgl/WebGLState';
import { WebGLExtensions } from './webgl/WebGLExtensions';
import { WebGLCapabilities } from './webgl/WebGLCapabilities';
import { WebGLGeometries } from './webgl/WebGLGeometries';
import { WebGLTextures } from './webgl/WebGLTextures';
import { WebGLPrograms } from './webgl/WebGLPrograms';
import { WebGLBindingStates } from './webgl/WebGLBindingStates';
import { WebGLRenderLists } from './webgl/WebGLRenderLists';
import { WebGLRenderStates } from './webgl/WebGLRenderStates';
import { WebGLShadowMap } from './webgl/WebGLShadowMap';
import { WebGLBackground } from './webgl/WebGLBackground';

export interface WebGLRendererParameters {
  canvas?: HTMLCanvasElement;
  context?: WebGL2RenderingContext;
  precision?: 'highp' | 'mediump' | 'lowp';
  alpha?: boolean;
  depth?: boolean;
  stencil?: boolean;
  antialias?: boolean;
  premultipliedAlpha?: boolean;
  preserveDrawingBuffer?: boolean;
  powerPreference?: 'default' | 'high-performance' | 'low-power';
  failIfMajorPerformanceCaveat?: boolean;
}

export class WebGLRenderer {
  readonly isWebGLRenderer = true;
  
  domElement: HTMLCanvasElement;
  
  // 上下文
  private _gl: WebGL2RenderingContext;
  private _extensions: WebGLExtensions;
  private _capabilities: WebGLCapabilities;
  
  // 子系统
  private _state: WebGLState;
  private _geometries: WebGLGeometries;
  private _textures: WebGLTextures;
  private _programs: WebGLPrograms;
  private _bindingStates: WebGLBindingStates;
  private _renderLists: WebGLRenderLists;
  private _renderStates: WebGLRenderStates;
  private _shadowMap: WebGLShadowMap;
  private _background: WebGLBackground;
  
  // 渲染参数
  autoClear = true;
  autoClearColor = true;
  autoClearDepth = true;
  autoClearStencil = true;
  
  sortObjects = true;
  
  outputColorSpace = SRGBColorSpace;
  toneMapping = NoToneMapping;
  toneMappingExposure = 1.0;
  
  // 内部状态
  private _width: number;
  private _height: number;
  private _pixelRatio = 1;
  private _viewport: Vector4;
  private _scissor: Vector4;
  private _scissorTest = false;
  
  private _clearColor = new Color(0x000000);
  private _clearAlpha = 0;
  
  // 统计
  info: WebGLInfo;
  
  constructor(parameters: WebGLRendererParameters = {}) {
    const {
      canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas'),
      context,
      alpha = false,
      depth = true,
      stencil = false,
      antialias = false,
      premultipliedAlpha = true,
      preserveDrawingBuffer = false,
      powerPreference = 'default',
      failIfMajorPerformanceCaveat = false,
    } = parameters;
    
    this.domElement = canvas as HTMLCanvasElement;
    
    // 获取 WebGL 上下文
    if (context) {
      this._gl = context;
    } else {
      const contextAttributes: WebGLContextAttributes = {
        alpha,
        depth,
        stencil,
        antialias,
        premultipliedAlpha,
        preserveDrawingBuffer,
        powerPreference,
        failIfMajorPerformanceCaveat,
      };
      
      this._gl = this.domElement.getContext('webgl2', contextAttributes)!;
      
      if (!this._gl) {
        throw new Error('WebGL 2 not available');
      }
    }
    
    const gl = this._gl;
    
    // 初始化尺寸
    this._width = this.domElement.width;
    this._height = this.domElement.height;
    this._viewport = new Vector4(0, 0, this._width, this._height);
    this._scissor = new Vector4(0, 0, this._width, this._height);
    
    // 初始化子系统
    this._extensions = new WebGLExtensions(gl);
    this._capabilities = new WebGLCapabilities(gl, this._extensions, parameters);
    this._state = new WebGLState(gl);
    this._geometries = new WebGLGeometries(gl, this._info);
    this._textures = new WebGLTextures(gl, this._extensions, this._state, this._capabilities);
    this._programs = new WebGLPrograms(this, this._capabilities);
    this._bindingStates = new WebGLBindingStates(gl);
    this._renderLists = new WebGLRenderLists();
    this._renderStates = new WebGLRenderStates(this._extensions);
    this._shadowMap = new WebGLShadowMap(this, this._state, this._capabilities);
    this._background = new WebGLBackground(this, this._state, this._geometries, premultipliedAlpha);
    
    // 统计
    this.info = new WebGLInfo(gl);
    
    // 上下文丢失处理
    this.domElement.addEventListener('webglcontextlost', this._onContextLost, false);
    this.domElement.addEventListener('webglcontextrestored', this._onContextRestore, false);
  }
  
  // 上下文丢失/恢复
  private _onContextLost = (event: Event): void => {
    event.preventDefault();
    console.warn('WebGL context lost');
    this.dispatchEvent({ type: 'contextlost' });
  };
  
  private _onContextRestore = (): void => {
    console.info('WebGL context restored');
    this._initGLContext();
    this.dispatchEvent({ type: 'contextrestored' });
  };
}
```

### 尺寸管理

```typescript
getSize(target: Vector2): Vector2 {
  return target.set(this._width, this._height);
}

setSize(width: number, height: number, updateStyle = true): void {
  this._width = width;
  this._height = height;
  
  this.domElement.width = Math.floor(width * this._pixelRatio);
  this.domElement.height = Math.floor(height * this._pixelRatio);
  
  if (updateStyle) {
    this.domElement.style.width = width + 'px';
    this.domElement.style.height = height + 'px';
  }
  
  this.setViewport(0, 0, width, height);
}

getPixelRatio(): number {
  return this._pixelRatio;
}

setPixelRatio(value: number): void {
  if (value === undefined) return;
  
  this._pixelRatio = value;
  this.setSize(this._width, this._height, false);
}

getDrawingBufferSize(target: Vector2): Vector2 {
  return target.set(
    this._width * this._pixelRatio,
    this._height * this._pixelRatio
  ).floor();
}

getCurrentViewport(target: Vector4): Vector4 {
  return target.copy(this._viewport);
}

setViewport(x: number | Vector4, y?: number, width?: number, height?: number): void {
  if (x instanceof Vector4) {
    this._viewport.set(x.x, x.y, x.z, x.w);
  } else {
    this._viewport.set(x, y!, width!, height!);
  }
  
  this._state.setViewport(
    this._viewport.x * this._pixelRatio,
    this._viewport.y * this._pixelRatio,
    this._viewport.z * this._pixelRatio,
    this._viewport.w * this._pixelRatio
  );
}

setScissor(x: number | Vector4, y?: number, width?: number, height?: number): void {
  if (x instanceof Vector4) {
    this._scissor.set(x.x, x.y, x.z, x.w);
  } else {
    this._scissor.set(x, y!, width!, height!);
  }
  
  this._state.setScissor(
    this._scissor.x * this._pixelRatio,
    this._scissor.y * this._pixelRatio,
    this._scissor.z * this._pixelRatio,
    this._scissor.w * this._pixelRatio
  );
}

setScissorTest(enabled: boolean): void {
  this._scissorTest = enabled;
  this._state.setScissorTest(enabled);
}
```

### 清除操作

```typescript
getClearColor(target: Color): Color {
  return target.copy(this._clearColor);
}

setClearColor(color: ColorRepresentation, alpha = 1): void {
  this._clearColor.set(color);
  this._clearAlpha = alpha;
  this._setClearColor(this._clearColor, this._clearAlpha);
}

getClearAlpha(): number {
  return this._clearAlpha;
}

setClearAlpha(alpha: number): void {
  this._clearAlpha = alpha;
  this._setClearColor(this._clearColor, this._clearAlpha);
}

private _setClearColor(color: Color, alpha: number): void {
  this._state.setClearColor(
    color.r,
    color.g,
    color.b,
    alpha
  );
}

clear(color = true, depth = true, stencil = true): void {
  const gl = this._gl;
  let bits = 0;
  
  if (color) {
    bits |= gl.COLOR_BUFFER_BIT;
  }
  
  if (depth) {
    // 确保深度写入开启
    this._state.setDepthWrite(true);
    bits |= gl.DEPTH_BUFFER_BIT;
  }
  
  if (stencil) {
    bits |= gl.STENCIL_BUFFER_BIT;
  }
  
  gl.clear(bits);
}

clearColor(): void {
  this.clear(true, false, false);
}

clearDepth(): void {
  this.clear(false, true, false);
}

clearStencil(): void {
  this.clear(false, false, true);
}
```

### 渲染主函数

```typescript
render(scene: Scene, camera: Camera): void {
  // 验证参数
  if (camera !== undefined && camera.isCamera !== true) {
    console.error('Camera is not an instance of Camera');
    return;
  }
  
  // 重置统计
  this.info.reset();
  
  // 更新场景矩阵
  if (scene.matrixWorldAutoUpdate === true) {
    scene.updateMatrixWorld();
  }
  
  // 更新相机矩阵
  if (camera.parent === null && camera.matrixWorldAutoUpdate === true) {
    camera.updateMatrixWorld();
  }
  
  // 获取渲染状态
  const currentRenderState = this._renderStates.get(scene, camera);
  currentRenderState.init();
  
  // 设置投影矩阵
  _projScreenMatrix.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  );
  _frustum.setFromProjectionMatrix(_projScreenMatrix);
  
  // 收集渲染列表
  const currentRenderList = this._renderLists.get(scene, camera);
  currentRenderList.init();
  
  // 遍历场景
  this._projectObject(scene, camera, 0, this.sortObjects);
  
  // 排序
  currentRenderList.sort(
    _painterSortStable,
    _reversePainterSortStable
  );
  
  // 渲染阴影
  if (this._shadowMap.enabled) {
    this._shadowMap.render(currentRenderState.lights.shadows, scene, camera);
  }
  
  // 设置渲染状态光照
  currentRenderState.setupLights();
  
  // 设置视口
  if (this._viewport) {
    this._state.setViewport(
      this._viewport.x * this._pixelRatio,
      this._viewport.y * this._pixelRatio,
      this._viewport.z * this._pixelRatio,
      this._viewport.w * this._pixelRatio
    );
  }
  
  // 自动清除
  if (this.autoClear) {
    this.clear(
      this.autoClearColor,
      this.autoClearDepth,
      this.autoClearStencil
    );
  }
  
  // 渲染背景
  this._background.render(currentRenderList, scene);
  
  // 渲染不透明
  this._renderObjects(
    currentRenderList.opaque,
    scene,
    camera
  );
  
  // 渲染半透明
  this._renderObjects(
    currentRenderList.transmissive,
    scene,
    camera
  );
  
  // 渲染透明
  this._renderObjects(
    currentRenderList.transparent,
    scene,
    camera
  );
  
  // 重置状态
  this._state.reset();
  
  this.info.render.frame++;
}
```

### 对象投影

```typescript
private _projectObject(
  object: Object3D,
  camera: Camera,
  groupOrder: number,
  sortObjects: boolean
): void {
  if (object.visible === false) return;
  
  const visible = object.layers.test(camera.layers);
  
  if (visible) {
    if (object.isGroup) {
      groupOrder = object.renderOrder;
    } else if (object.isLOD) {
      if (object.autoUpdate === true) {
        object.update(camera);
      }
    } else if (object.isLight) {
      currentRenderState.pushLight(object);
      
      if (object.castShadow) {
        currentRenderState.pushShadow(object);
      }
    } else if (object.isSprite) {
      if (!object.frustumCulled || _frustum.intersectsSprite(object)) {
        if (sortObjects) {
          _vector3
            .setFromMatrixPosition(object.matrixWorld)
            .applyMatrix4(_projScreenMatrix);
        }
        
        const geometry = this._objects.update(object);
        const material = object.material;
        
        if (material.visible) {
          currentRenderList.push(
            object, geometry, material, groupOrder, _vector3.z, null
          );
        }
      }
    } else if (object.isMesh || object.isLine || object.isPoints) {
      if (!object.frustumCulled || _frustum.intersectsObject(object)) {
        const geometry = this._objects.update(object);
        const material = object.material;
        
        if (sortObjects) {
          if (geometry.boundingSphere === null) {
            geometry.computeBoundingSphere();
          }
          
          _vector3
            .copy(geometry.boundingSphere.center)
            .applyMatrix4(object.matrixWorld)
            .applyMatrix4(_projScreenMatrix);
        }
        
        if (Array.isArray(material)) {
          const groups = geometry.groups;
          
          for (let i = 0, l = groups.length; i < l; i++) {
            const group = groups[i];
            const groupMaterial = material[group.materialIndex];
            
            if (groupMaterial && groupMaterial.visible) {
              currentRenderList.push(
                object, geometry, groupMaterial,
                groupOrder, _vector3.z, group
              );
            }
          }
        } else if (material.visible) {
          currentRenderList.push(
            object, geometry, material,
            groupOrder, _vector3.z, null
          );
        }
      }
    }
  }
  
  // 递归子对象
  const children = object.children;
  
  for (let i = 0, l = children.length; i < l; i++) {
    this._projectObject(children[i], camera, groupOrder, sortObjects);
  }
}
```

### 对象渲染

```typescript
private _renderObjects(
  renderList: RenderItem[],
  scene: Scene,
  camera: Camera
): void {
  const overrideMaterial = scene.overrideMaterial;
  
  for (let i = 0, l = renderList.length; i < l; i++) {
    const renderItem = renderList[i];
    
    const object = renderItem.object;
    const geometry = renderItem.geometry;
    const material = overrideMaterial || renderItem.material;
    const group = renderItem.group;
    
    this._renderObject(object, scene, camera, geometry, material, group);
  }
}

private _renderObject(
  object: Object3D,
  scene: Scene,
  camera: Camera,
  geometry: BufferGeometry,
  material: Material,
  group: any
): void {
  object.onBeforeRender(this, scene, camera, geometry, material, group);
  
  // 计算矩阵
  object.modelViewMatrix.multiplyMatrices(
    camera.matrixWorldInverse,
    object.matrixWorld
  );
  object.normalMatrix.getNormalMatrix(object.modelViewMatrix);
  
  // 设置程序和 uniforms
  const program = this._setProgram(camera, scene, geometry, material, object);
  
  // 设置材质状态
  this._state.setMaterial(material, object.isMesh && object.material.side === BackSide);
  
  // 绑定几何体
  this._bindingStates.setup(object, material, program, geometry, this._geometries);
  
  // 绘制
  this._renderBufferDirect(camera, scene, geometry, material, object, group);
  
  object.onAfterRender(this, scene, camera, geometry, material, group);
}
```

### 绘制调用

```typescript
_renderBufferDirect(
  camera: Camera,
  scene: Scene,
  geometry: BufferGeometry,
  material: Material,
  object: Object3D,
  group: any
): void {
  const gl = this._gl;
  
  // 获取索引
  let index = geometry.index;
  const position = geometry.attributes.position;
  
  // 线框模式
  if (material.wireframe === true) {
    index = this._geometries.getWireframeAttribute(geometry);
  }
  
  // 计算绘制范围
  let drawStart = 0;
  let drawCount = Infinity;
  
  if (index !== null) {
    drawCount = index.count;
  } else if (position !== undefined) {
    drawCount = position.count;
  }
  
  const drawRange = geometry.drawRange;
  drawStart = Math.max(drawStart, drawRange.start);
  drawCount = Math.min(drawCount, drawRange.count);
  
  if (group !== null) {
    drawStart = Math.max(drawStart, group.start);
    drawCount = Math.min(drawCount, group.count);
  }
  
  if (drawCount <= 0) return;
  
  // 执行绘制
  if (object.isInstancedMesh) {
    this._renderInstanced(gl, index, drawStart, drawCount, object.count);
  } else if (geometry.isInstancedBufferGeometry) {
    const instanceCount = geometry.instanceCount;
    this._renderInstanced(gl, index, drawStart, drawCount, instanceCount);
  } else {
    this._renderNormal(gl, index, drawStart, drawCount);
  }
  
  // 更新统计
  this.info.update(object, geometry, material, group);
}

private _renderNormal(
  gl: WebGL2RenderingContext,
  index: BufferAttribute | null,
  drawStart: number,
  drawCount: number
): void {
  if (index !== null) {
    gl.drawElements(
      gl.TRIANGLES,
      drawCount,
      index.array instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
      drawStart * (index.array instanceof Uint32Array ? 4 : 2)
    );
  } else {
    gl.drawArrays(gl.TRIANGLES, drawStart, drawCount);
  }
}

private _renderInstanced(
  gl: WebGL2RenderingContext,
  index: BufferAttribute | null,
  drawStart: number,
  drawCount: number,
  instanceCount: number
): void {
  if (index !== null) {
    gl.drawElementsInstanced(
      gl.TRIANGLES,
      drawCount,
      index.array instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
      drawStart * (index.array instanceof Uint32Array ? 4 : 2),
      instanceCount
    );
  } else {
    gl.drawArraysInstanced(gl.TRIANGLES, drawStart, drawCount, instanceCount);
  }
}
```

### 资源清理

```typescript
dispose(): void {
  this.domElement.removeEventListener('webglcontextlost', this._onContextLost, false);
  this.domElement.removeEventListener('webglcontextrestored', this._onContextRestore, false);
  
  this._renderLists.dispose();
  this._renderStates.dispose();
  this._geometries.dispose();
  this._textures.dispose();
  this._programs.dispose();
  this._bindingStates.dispose();
  this._shadowMap.dispose();
  
  this.dispatchEvent({ type: 'dispose' });
}

forceContextLoss(): void {
  const extension = this._extensions.get('WEBGL_lose_context');
  if (extension) {
    extension.loseContext();
  }
}

forceContextRestore(): void {
  const extension = this._extensions.get('WEBGL_lose_context');
  if (extension) {
    extension.restoreContext();
  }
}
```

## 使用示例

```typescript
// 创建渲染器
const renderer = new WebGLRenderer({
  antialias: true,
  alpha: false,
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

document.body.appendChild(renderer.domElement);

// 设置清除颜色
renderer.setClearColor(0x000000, 1);

// 色调映射
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// 输出颜色空间
renderer.outputColorSpace = SRGBColorSpace;

// 渲染循环
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// 窗口大小变化
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

## 本章小结

- WebGLRenderer 协调所有渲染子系统
- 支持上下文丢失和恢复
- render() 执行完整渲染流程
- 视口、裁剪、清除可独立控制
- 支持实例化渲染
- dispose() 清理所有资源

下一章，我们将学习 WebGLProgram 着色器程序。
