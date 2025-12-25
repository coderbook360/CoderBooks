# 多渲染目标

> "多渲染目标让片元着色器一次输出多个数据，是延迟渲染的基石。"

## MRT 概述

### 什么是 MRT

多渲染目标（Multiple Render Targets）允许片元着色器同时输出到多个颜色缓冲区。

```
┌─────────────────────────────────────────────────────────┐
│                    MRT 概念                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   片元着色器                                             │
│   ┌───────────────────────────┐                        │
│   │  layout(location=0)       │──→ 颜色附件 0 (Position)│
│   │  layout(location=1)       │──→ 颜色附件 1 (Normal)  │
│   │  layout(location=2)       │──→ 颜色附件 2 (Albedo)  │
│   │  layout(location=3)       │──→ 颜色附件 3 (Material)│
│   └───────────────────────────┘                        │
│                                                         │
│   单次绘制调用，多种数据输出                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 应用场景

| 应用 | 说明 |
|------|------|
| 延迟渲染 | G-Buffer 存储几何信息 |
| 后处理 | 分离不同信息（法线、深度等） |
| OIT | 透明度排序辅助数据 |
| 阴影映射 | 多光源阴影 |

## 创建 MRT 帧缓冲

### 基础设置

```javascript
class GBuffer {
  constructor(gl, width, height) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    
    // 创建帧缓冲
    this.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    
    // 位置纹理 (RGB16F)
    this.positionTexture = this.createTexture(gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.positionTexture, 0);
    
    // 法线纹理 (RGB16F)
    this.normalTexture = this.createTexture(gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.normalTexture, 0);
    
    // 颜色/反照率纹理 (RGBA8)
    this.albedoTexture = this.createTexture(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, this.albedoTexture, 0);
    
    // 材质属性纹理 (RGBA8) - 金属度、粗糙度、AO等
    this.materialTexture = this.createTexture(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT3, gl.TEXTURE_2D, this.materialTexture, 0);
    
    // 深度纹理
    this.depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);
    
    // 指定绘制缓冲
    gl.drawBuffers([
      gl.COLOR_ATTACHMENT0,
      gl.COLOR_ATTACHMENT1,
      gl.COLOR_ATTACHMENT2,
      gl.COLOR_ATTACHMENT3
    ]);
    
    // 检查完整性
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`G-Buffer incomplete: ${status}`);
    }
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  
  createTexture(internalFormat, format, type) {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, this.width, this.height, 0, format, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }
  
  bind() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.viewport(0, 0, this.width, this.height);
  }
  
  unbind() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }
  
  bindTextures() {
    const gl = this.gl;
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.positionTexture);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.normalTexture);
    
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.albedoTexture);
    
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.materialTexture);
    
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
  }
}
```

## G-Buffer 着色器

### 几何通道顶点着色器

```glsl
#version 300 es

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_texCoord;
layout(location = 3) in vec3 a_tangent;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat3 u_normalMatrix;

out vec3 v_worldPos;
out vec3 v_normal;
out vec2 v_texCoord;
out mat3 v_TBN;

void main() {
  vec4 worldPos = u_model * vec4(a_position, 1.0);
  v_worldPos = worldPos.xyz;
  
  v_normal = u_normalMatrix * a_normal;
  v_texCoord = a_texCoord;
  
  // TBN 矩阵用于法线贴图
  vec3 T = normalize(u_normalMatrix * a_tangent);
  vec3 N = normalize(v_normal);
  T = normalize(T - dot(T, N) * N);
  vec3 B = cross(N, T);
  v_TBN = mat3(T, B, N);
  
  gl_Position = u_projection * u_view * worldPos;
}
```

### 几何通道片元着色器

```glsl
#version 300 es
precision highp float;

// 多输出
layout(location = 0) out vec4 gPosition;
layout(location = 1) out vec4 gNormal;
layout(location = 2) out vec4 gAlbedo;
layout(location = 3) out vec4 gMaterial;

in vec3 v_worldPos;
in vec3 v_normal;
in vec2 v_texCoord;
in mat3 v_TBN;

uniform sampler2D u_albedoMap;
uniform sampler2D u_normalMap;
uniform sampler2D u_metallicMap;
uniform sampler2D u_roughnessMap;
uniform sampler2D u_aoMap;

uniform bool u_hasNormalMap;
uniform float u_metallic;
uniform float u_roughness;

void main() {
  // 位置
  gPosition = vec4(v_worldPos, 1.0);
  
  // 法线
  vec3 normal;
  if (u_hasNormalMap) {
    vec3 normalSample = texture(u_normalMap, v_texCoord).rgb * 2.0 - 1.0;
    normal = normalize(v_TBN * normalSample);
  } else {
    normal = normalize(v_normal);
  }
  gNormal = vec4(normal * 0.5 + 0.5, 1.0);  // 编码到 [0, 1]
  
  // 反照率
  vec4 albedo = texture(u_albedoMap, v_texCoord);
  gAlbedo = albedo;
  
  // 材质属性
  float metallic = texture(u_metallicMap, v_texCoord).r * u_metallic;
  float roughness = texture(u_roughnessMap, v_texCoord).r * u_roughness;
  float ao = texture(u_aoMap, v_texCoord).r;
  
  gMaterial = vec4(metallic, roughness, ao, 1.0);
}
```

## 光照通道

### 延迟光照着色器

```glsl
#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

// G-Buffer 纹理
uniform sampler2D u_gPosition;
uniform sampler2D u_gNormal;
uniform sampler2D u_gAlbedo;
uniform sampler2D u_gMaterial;

// 光源
struct Light {
  vec3 position;
  vec3 color;
  float intensity;
  float radius;
};

#define MAX_LIGHTS 32
uniform Light u_lights[MAX_LIGHTS];
uniform int u_numLights;
uniform vec3 u_viewPos;

// PBR 光照计算
const float PI = 3.14159265359;

float DistributionGGX(vec3 N, vec3 H, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH = max(dot(N, H), 0.0);
  float NdotH2 = NdotH * NdotH;
  
  float denom = (NdotH2 * (a2 - 1.0) + 1.0);
  denom = PI * denom * denom;
  
  return a2 / denom;
}

float GeometrySchlickGGX(float NdotV, float roughness) {
  float r = (roughness + 1.0);
  float k = (r * r) / 8.0;
  return NdotV / (NdotV * (1.0 - k) + k);
}

float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
  float NdotV = max(dot(N, V), 0.0);
  float NdotL = max(dot(N, L), 0.0);
  float ggx2 = GeometrySchlickGGX(NdotV, roughness);
  float ggx1 = GeometrySchlickGGX(NdotL, roughness);
  return ggx1 * ggx2;
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

void main() {
  // 从 G-Buffer 读取数据
  vec3 fragPos = texture(u_gPosition, v_texCoord).rgb;
  vec3 normal = texture(u_gNormal, v_texCoord).rgb * 2.0 - 1.0;  // 解码法线
  vec3 albedo = texture(u_gAlbedo, v_texCoord).rgb;
  vec4 material = texture(u_gMaterial, v_texCoord);
  
  float metallic = material.r;
  float roughness = material.g;
  float ao = material.b;
  
  // 视线方向
  vec3 V = normalize(u_viewPos - fragPos);
  vec3 N = normalize(normal);
  
  // 菲涅尔基础反射率
  vec3 F0 = vec3(0.04);
  F0 = mix(F0, albedo, metallic);
  
  // 累积光照
  vec3 Lo = vec3(0.0);
  
  for (int i = 0; i < u_numLights; i++) {
    Light light = u_lights[i];
    
    vec3 L = light.position - fragPos;
    float distance = length(L);
    
    // 距离裁剪
    if (distance > light.radius) continue;
    
    L = normalize(L);
    vec3 H = normalize(V + L);
    
    // 衰减
    float attenuation = 1.0 / (distance * distance);
    attenuation *= smoothstep(light.radius, 0.0, distance);
    
    vec3 radiance = light.color * light.intensity * attenuation;
    
    // Cook-Torrance BRDF
    float NDF = DistributionGGX(N, H, roughness);
    float G = GeometrySmith(N, V, L, roughness);
    vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);
    
    vec3 numerator = NDF * G * F;
    float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
    vec3 specular = numerator / denominator;
    
    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - metallic;
    
    float NdotL = max(dot(N, L), 0.0);
    
    Lo += (kD * albedo / PI + specular) * radiance * NdotL;
  }
  
  // 环境光
  vec3 ambient = vec3(0.03) * albedo * ao;
  vec3 color = ambient + Lo;
  
  fragColor = vec4(color, 1.0);
}
```

## 渲染流程

### 延迟渲染器

```javascript
class DeferredRenderer {
  constructor(gl, width, height) {
    this.gl = gl;
    this.gBuffer = new GBuffer(gl, width, height);
    
    // 着色器
    this.geometryProgram = createProgram(gl, geoVertSource, geoFragSource);
    this.lightingProgram = createProgram(gl, quadVertSource, lightingFragSource);
    
    this.quad = new FullscreenQuad(gl);
    this.lights = [];
  }
  
  addLight(light) {
    this.lights.push(light);
  }
  
  render(scene, camera) {
    const gl = this.gl;
    
    // ============ 几何通道 ============
    this.gBuffer.bind();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    
    gl.useProgram(this.geometryProgram);
    
    // 设置相机 uniform
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.geometryProgram, 'u_view'),
      false, camera.viewMatrix
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.geometryProgram, 'u_projection'),
      false, camera.projectionMatrix
    );
    
    // 渲染所有网格
    for (const mesh of scene.meshes) {
      this.renderMesh(mesh, this.geometryProgram);
    }
    
    this.gBuffer.unbind();
    
    // ============ 光照通道 ============
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    
    gl.useProgram(this.lightingProgram);
    
    // 绑定 G-Buffer 纹理
    this.gBuffer.bindTextures();
    gl.uniform1i(gl.getUniformLocation(this.lightingProgram, 'u_gPosition'), 0);
    gl.uniform1i(gl.getUniformLocation(this.lightingProgram, 'u_gNormal'), 1);
    gl.uniform1i(gl.getUniformLocation(this.lightingProgram, 'u_gAlbedo'), 2);
    gl.uniform1i(gl.getUniformLocation(this.lightingProgram, 'u_gMaterial'), 3);
    
    // 设置相机位置
    gl.uniform3fv(
      gl.getUniformLocation(this.lightingProgram, 'u_viewPos'),
      camera.position
    );
    
    // 设置光源
    gl.uniform1i(
      gl.getUniformLocation(this.lightingProgram, 'u_numLights'),
      this.lights.length
    );
    
    for (let i = 0; i < this.lights.length; i++) {
      const light = this.lights[i];
      gl.uniform3fv(
        gl.getUniformLocation(this.lightingProgram, `u_lights[${i}].position`),
        light.position
      );
      gl.uniform3fv(
        gl.getUniformLocation(this.lightingProgram, `u_lights[${i}].color`),
        light.color
      );
      gl.uniform1f(
        gl.getUniformLocation(this.lightingProgram, `u_lights[${i}].intensity`),
        light.intensity
      );
      gl.uniform1f(
        gl.getUniformLocation(this.lightingProgram, `u_lights[${i}].radius`),
        light.radius
      );
    }
    
    this.quad.draw();
  }
  
  renderMesh(mesh, program) {
    const gl = this.gl;
    
    // 模型矩阵
    gl.uniformMatrix4fv(
      gl.getUniformLocation(program, 'u_model'),
      false, mesh.modelMatrix
    );
    
    // 法线矩阵
    const normalMatrix = mat3.create();
    mat3.normalFromMat4(normalMatrix, mesh.modelMatrix);
    gl.uniformMatrix3fv(
      gl.getUniformLocation(program, 'u_normalMatrix'),
      false, normalMatrix
    );
    
    // 绑定材质纹理
    mesh.material.bind(gl, program);
    
    // 绘制
    mesh.draw();
  }
}
```

## 优化技术

### 法线压缩

```glsl
// 球面映射编码 (2 分量)
vec2 encodeNormal(vec3 n) {
  float f = sqrt(8.0 * n.z + 8.0);
  return n.xy / f + 0.5;
}

vec3 decodeNormal(vec2 enc) {
  vec2 fenc = enc * 4.0 - 2.0;
  float f = dot(fenc, fenc);
  float g = sqrt(1.0 - f / 4.0);
  return vec3(fenc * g, 1.0 - f / 2.0);
}
```

### 位置重建

```glsl
// 从深度重建位置，而不是存储位置
uniform mat4 u_invProjection;
uniform mat4 u_invView;

vec3 reconstructPosition(vec2 uv, float depth) {
  // 转换到 NDC
  vec4 clipPos = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  
  // 转换到观察空间
  vec4 viewPos = u_invProjection * clipPos;
  viewPos /= viewPos.w;
  
  // 转换到世界空间
  vec4 worldPos = u_invView * viewPos;
  
  return worldPos.xyz;
}
```

### 紧凑 G-Buffer

```
┌─────────────────────────────────────────────────────────┐
│                紧凑 G-Buffer 布局                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   纹理 0 (RGBA8):                                       │
│     R: 反照率 R                                         │
│     G: 反照率 G                                         │
│     B: 反照率 B                                         │
│     A: 金属度                                           │
│                                                         │
│   纹理 1 (RGBA8):                                       │
│     R: 法线 X (压缩)                                    │
│     G: 法线 Y (压缩)                                    │
│     B: 粗糙度                                           │
│     A: AO                                              │
│                                                         │
│   深度纹理: 用于重建位置                                │
│                                                         │
│   从 4 个纹理减少到 2 个 + 深度                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 紧凑 G-Buffer 着色器

```glsl
// 几何通道输出
layout(location = 0) out vec4 gAlbedoMetallic;
layout(location = 1) out vec4 gNormalRoughnessAO;

void main() {
  // 反照率 + 金属度
  gAlbedoMetallic = vec4(albedo, metallic);
  
  // 法线 (压缩) + 粗糙度 + AO
  vec2 encodedNormal = encodeNormal(normalize(normal));
  gNormalRoughnessAO = vec4(encodedNormal, roughness, ao);
}

// 光照通道输入
void main() {
  vec4 albedoMetallic = texture(u_gAlbedoMetallic, v_texCoord);
  vec4 normalRoughnessAO = texture(u_gNormalRoughnessAO, v_texCoord);
  float depth = texture(u_depthTexture, v_texCoord).r;
  
  vec3 albedo = albedoMetallic.rgb;
  float metallic = albedoMetallic.a;
  vec3 normal = decodeNormal(normalRoughnessAO.xy);
  float roughness = normalRoughnessAO.z;
  float ao = normalRoughnessAO.w;
  
  vec3 fragPos = reconstructPosition(v_texCoord, depth);
  
  // 继续光照计算...
}
```

## 调试可视化

```javascript
class GBufferDebugger {
  constructor(gl, gBuffer) {
    this.gl = gl;
    this.gBuffer = gBuffer;
    this.mode = 0;  // 0=最终, 1=位置, 2=法线, 3=反照率, 4=材质, 5=深度
    
    this.debugProgram = createProgram(gl, quadVert, `
      #version 300 es
      precision highp float;
      
      in vec2 v_texCoord;
      out vec4 fragColor;
      
      uniform sampler2D u_texture;
      uniform int u_mode;
      uniform float u_near;
      uniform float u_far;
      
      float linearizeDepth(float depth) {
        float z = depth * 2.0 - 1.0;
        return (2.0 * u_near * u_far) / (u_far + u_near - z * (u_far - u_near));
      }
      
      void main() {
        vec4 value = texture(u_texture, v_texCoord);
        
        if (u_mode == 5) {
          // 深度线性化显示
          float depth = linearizeDepth(value.r) / u_far;
          fragColor = vec4(vec3(depth), 1.0);
        } else {
          fragColor = vec4(value.rgb, 1.0);
        }
      }
    `);
  }
  
  render(mode) {
    const gl = this.gl;
    
    gl.useProgram(this.debugProgram);
    gl.uniform1i(gl.getUniformLocation(this.debugProgram, 'u_mode'), mode);
    gl.uniform1f(gl.getUniformLocation(this.debugProgram, 'u_near'), 0.1);
    gl.uniform1f(gl.getUniformLocation(this.debugProgram, 'u_far'), 100.0);
    
    gl.activeTexture(gl.TEXTURE0);
    
    switch (mode) {
      case 1: gl.bindTexture(gl.TEXTURE_2D, this.gBuffer.positionTexture); break;
      case 2: gl.bindTexture(gl.TEXTURE_2D, this.gBuffer.normalTexture); break;
      case 3: gl.bindTexture(gl.TEXTURE_2D, this.gBuffer.albedoTexture); break;
      case 4: gl.bindTexture(gl.TEXTURE_2D, this.gBuffer.materialTexture); break;
      case 5: gl.bindTexture(gl.TEXTURE_2D, this.gBuffer.depthTexture); break;
    }
    
    this.quad.draw();
  }
}
```

## 本章小结

- MRT 允许一次绘制输出多个颜色
- G-Buffer 存储几何信息供后续光照使用
- 法线可压缩为 2 分量节省空间
- 位置可从深度重建
- 紧凑 G-Buffer 减少显存占用
- 调试工具帮助可视化各通道

下一章，我们将学习实例化渲染技术。
