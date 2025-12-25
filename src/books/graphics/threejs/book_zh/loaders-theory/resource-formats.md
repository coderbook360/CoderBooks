# 资源格式深入

> "选择正确的格式是高效 3D 开发的第一步。"

## 3D 模型格式对比

```
常见 3D 模型格式：

格式      压缩  动画  材质  二进制  适用场景
────────────────────────────────────────────────
glTF     ✓    ✓    ✓    ✓      Web 首选格式
OBJ      ✗    ✗    △    ✗      简单静态模型
FBX      ✓    ✓    ✓    ✓      建模软件交换
Collada  ✗    ✓    ✓    ✗      通用交换格式
3DS      ✗    △    △    ✓      旧版 3DS Max
STL      ✗    ✗    ✗    ✓      3D 打印
PLY      △    ✗    △    ✓      点云/扫描
USD      ✓    ✓    ✓    ✓      电影/VFX
```

## glTF 格式详解

```
glTF (GL Transmission Format) 结构：

┌─────────────────────────────────────────┐
│                glTF 2.0                  │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐    ┌──────────────────┐  │
│  │ .gltf    │    │     .glb         │  │
│  │ (JSON)   │    │   (Binary)       │  │
│  └────┬─────┘    └────────┬─────────┘  │
│       │                    │           │
│  ┌────▼────┐         ┌─────▼─────┐    │
│  │.bin 文件│         │单个二进制  │    │
│  │外部缓冲 │         │  文件     │    │
│  └────┬────┘         └───────────┘    │
│       │                               │
│  ┌────▼────┐                          │
│  │纹理图片 │                          │
│  │.jpg/.png│                          │
│  └─────────┘                          │
│                                       │
└───────────────────────────────────────┘
```

### glTF JSON 结构

```json
{
  "asset": {
    "version": "2.0",
    "generator": "Blender 3.0"
  },
  "scene": 0,
  "scenes": [
    {
      "name": "Scene",
      "nodes": [0, 1, 2]
    }
  ],
  "nodes": [
    {
      "name": "Camera",
      "camera": 0,
      "translation": [0, 2, 5]
    },
    {
      "name": "Light",
      "extensions": {
        "KHR_lights_punctual": { "light": 0 }
      }
    },
    {
      "name": "Cube",
      "mesh": 0,
      "rotation": [0, 0.38, 0, 0.92],
      "scale": [1, 1, 1]
    }
  ],
  "meshes": [
    {
      "name": "Cube",
      "primitives": [
        {
          "attributes": {
            "POSITION": 0,
            "NORMAL": 1,
            "TEXCOORD_0": 2
          },
          "indices": 3,
          "material": 0
        }
      ]
    }
  ],
  "materials": [
    {
      "name": "Material",
      "pbrMetallicRoughness": {
        "baseColorFactor": [0.8, 0.2, 0.2, 1.0],
        "metallicFactor": 0.0,
        "roughnessFactor": 0.5,
        "baseColorTexture": {
          "index": 0,
          "texCoord": 0
        }
      },
      "normalTexture": {
        "index": 1,
        "scale": 1.0
      }
    }
  ],
  "textures": [
    { "source": 0, "sampler": 0 },
    { "source": 1, "sampler": 0 }
  ],
  "images": [
    { "uri": "textures/baseColor.png" },
    { "uri": "textures/normal.png" }
  ],
  "samplers": [
    {
      "magFilter": 9729,
      "minFilter": 9987,
      "wrapS": 10497,
      "wrapT": 10497
    }
  ],
  "accessors": [
    {
      "bufferView": 0,
      "componentType": 5126,
      "count": 24,
      "type": "VEC3",
      "max": [1, 1, 1],
      "min": [-1, -1, -1]
    }
  ],
  "bufferViews": [
    {
      "buffer": 0,
      "byteOffset": 0,
      "byteLength": 288,
      "target": 34962
    }
  ],
  "buffers": [
    {
      "uri": "data.bin",
      "byteLength": 1024
    }
  ],
  "animations": [
    {
      "name": "Action",
      "channels": [
        {
          "sampler": 0,
          "target": {
            "node": 2,
            "path": "rotation"
          }
        }
      ],
      "samplers": [
        {
          "input": 4,
          "output": 5,
          "interpolation": "LINEAR"
        }
      ]
    }
  ]
}
```

### glTF 扩展

```
常用 glTF 扩展：

核心扩展：
KHR_materials_unlit        无光照材质
KHR_materials_pbrSpecularGlossiness  高光-光泽度工作流
KHR_texture_transform      纹理变换
KHR_mesh_quantization      网格量化压缩
KHR_lights_punctual        灯光支持
KHR_draco_mesh_compression Draco 网格压缩
KHR_texture_basisu         Basis 纹理压缩

扩展材质：
KHR_materials_transmission 透射
KHR_materials_volume       体积
KHR_materials_ior          折射率
KHR_materials_clearcoat    清漆层
KHR_materials_sheen        光泽层
KHR_materials_emissive_strength 发光强度
```

## 纹理格式详解

### 标准图像格式

```
Web 支持的图像格式：

格式    压缩类型   透明  文件大小  质量
──────────────────────────────────────
JPEG    有损       ✗    小       中
PNG     无损       ✓    大       高
WebP    有损/无损  ✓    最小     高
AVIF    有损       ✓    更小     最高
GIF     无损       ✓    中       低
```

### GPU 压缩纹理格式

```
GPU 压缩格式：

格式         平台支持              压缩比  质量
─────────────────────────────────────────────
DXT/S3TC     桌面 (Windows/Mac)   6:1    中
ETC1/ETC2    Android, iOS (A8+)   6:1    中
PVRTC        iOS (旧设备)         6:1    中低
ASTC         现代移动设备, Apple  可变   高
BC7          现代桌面             6:1    高

Basis Universal / KTX2：
- 统一的跨平台格式
- 运行时转码为原生格式
- 支持所有主要平台
```

### HDR 纹理格式

```
高动态范围格式：

格式      位深    压缩   用途
──────────────────────────────────
HDR/RGBE  8-bit   RLE   环境贴图（常用）
EXR       16/32   ZIP   电影/高端渲染
TIFF      16-bit  LZW   摄影/后期
```

## 二进制数据布局

### BufferView 和 Accessor

```
glTF 数据组织：

┌─────────── Buffer (原始字节) ───────────┐
│ ┌────────────────────────────────────┐ │
│ │ 位置数据 │ 法线数据 │ UV 数据 │索引│ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
         │           │         │      │
    BufferView  BufferView BufferView BufferView
         │           │         │      │
    Accessor    Accessor  Accessor Accessor
    (VEC3)      (VEC3)    (VEC2)   (SCALAR)
```

```typescript
// 数据类型常量
const GL_BYTE = 5120;
const GL_UNSIGNED_BYTE = 5121;
const GL_SHORT = 5122;
const GL_UNSIGNED_SHORT = 5123;
const GL_UNSIGNED_INT = 5125;
const GL_FLOAT = 5126;

// Accessor 类型
type AccessorType = 
  | 'SCALAR'  // 1 个分量
  | 'VEC2'    // 2 个分量
  | 'VEC3'    // 3 个分量
  | 'VEC4'    // 4 个分量
  | 'MAT2'    // 2x2 矩阵
  | 'MAT3'    // 3x3 矩阵
  | 'MAT4';   // 4x4 矩阵

// 计算步长
function getComponentSize(componentType: number): number {
  switch (componentType) {
    case GL_BYTE:
    case GL_UNSIGNED_BYTE:
      return 1;
    case GL_SHORT:
    case GL_UNSIGNED_SHORT:
      return 2;
    case GL_UNSIGNED_INT:
    case GL_FLOAT:
      return 4;
    default:
      return 0;
  }
}

function getNumComponents(type: AccessorType): number {
  switch (type) {
    case 'SCALAR': return 1;
    case 'VEC2': return 2;
    case 'VEC3': return 3;
    case 'VEC4': return 4;
    case 'MAT2': return 4;
    case 'MAT3': return 9;
    case 'MAT4': return 16;
  }
}
```

## 网格压缩技术

### Draco 压缩

```
Draco 压缩原理：

原始数据：           Draco 压缩：
┌───────────────┐   ┌───────────────┐
│ 位置 (Float32)│   │ 量化位置      │
│ 288 KB        │   │ (16-bit)      │
├───────────────┤   ├───────────────┤
│ 法线 (Float32)│ → │ 八面体编码    │
│ 288 KB        │   │ (8-bit)       │
├───────────────┤   ├───────────────┤
│ 索引 (Uint32) │   │ 熵编码索引    │
│ 96 KB         │   │               │
└───────────────┘   └───────────────┘
  总计: 672 KB        总计: ~80 KB
                      压缩比: 8:1
```

```typescript
// Draco 解码器使用
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/libs/draco/');
dracoLoader.setDecoderConfig({ type: 'js' }); // 或 'wasm'

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// 加载压缩模型
gltfLoader.load('model.glb', (gltf) => {
  scene.add(gltf.scene);
});
```

### meshopt 压缩

```typescript
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader';

const gltfLoader = new GLTFLoader();
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

// 特点：
// - 解码速度更快
// - 支持顶点缓存优化
// - 与 Draco 互补
```

## 动画数据格式

```
glTF 动画结构：

Animation
    │
    ├── Channel 1
    │   ├── Sampler → 旋转插值
    │   └── Target  → Node 0, rotation
    │
    ├── Channel 2
    │   ├── Sampler → 位移插值
    │   └── Target  → Node 0, translation
    │
    └── Channel 3
        ├── Sampler → 缩放插值
        └── Target  → Node 0, scale

Sampler:
    input  → 时间关键帧 [0, 0.5, 1.0, 1.5, 2.0]
    output → 值关键帧   [四元数/向量数据...]
    interpolation → LINEAR / STEP / CUBICSPLINE
```

```typescript
// 动画数据解析示例
interface AnimationChannel {
  sampler: number;
  target: {
    node: number;
    path: 'translation' | 'rotation' | 'scale' | 'weights';
  };
}

interface AnimationSampler {
  input: number;   // 时间 accessor
  output: number;  // 值 accessor
  interpolation?: 'LINEAR' | 'STEP' | 'CUBICSPLINE';
}

// 插值计算
function interpolate(
  sampler: AnimationSampler,
  time: number,
  times: Float32Array,
  values: Float32Array
): number[] {
  // 找到时间区间
  let i = 0;
  while (i < times.length - 1 && times[i + 1] < time) {
    i++;
  }
  
  const t0 = times[i];
  const t1 = times[i + 1];
  const alpha = (time - t0) / (t1 - t0);
  
  switch (sampler.interpolation) {
    case 'STEP':
      return Array.from(values.slice(i * 4, (i + 1) * 4));
      
    case 'CUBICSPLINE':
      // 三次样条插值
      return cubicSpline(values, i, alpha);
      
    case 'LINEAR':
    default:
      // 线性插值
      return linearInterpolate(values, i, alpha);
  }
}
```

## 格式转换最佳实践

```
格式选择建议：

场景                  推荐格式
─────────────────────────────────
Web 3D 应用          glTF/GLB + Draco
静态展示模型          glTF/GLB (无压缩)
高面数扫描数据        PLY + 点云渲染
实时应用             glTF + KTX2 纹理
需要编辑的模型        FBX (导入) → glTF (导出)
3D 打印              STL
VR/AR 应用           glTF + meshopt
```

```typescript
// 完整加载示例
async function loadOptimizedModel(url: string): Promise<Group> {
  const gltfLoader = new GLTFLoader();
  
  // 设置 Draco 解码器
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/libs/draco/');
  gltfLoader.setDRACOLoader(dracoLoader);
  
  // 设置 KTX2 加载器
  const ktx2Loader = new KTX2Loader();
  ktx2Loader.setTranscoderPath('/libs/basis/');
  ktx2Loader.detectSupport(renderer);
  gltfLoader.setKTX2Loader(ktx2Loader);
  
  // 设置 meshopt 解码器
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  
  const gltf = await gltfLoader.loadAsync(url);
  
  // 清理解码器
  dracoLoader.dispose();
  ktx2Loader.dispose();
  
  return gltf.scene;
}
```

## 本章小结

- glTF 是 Web 3D 的首选格式
- GPU 压缩纹理减少显存占用
- Draco/meshopt 大幅压缩网格数据
- 选择合适格式平衡质量与性能
- 理解二进制布局有助于优化加载

下一章，我们将学习各种模型加载器的使用。
