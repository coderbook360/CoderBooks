# 混合模式

> "不同的混合模式创造出千变万化的视觉效果。"

## 混合模式概览

### 常见模式

```
┌─────────────────────────────────────────────────────────┐
│                    混合模式对比                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   正常 (Normal)     加法 (Additive)    乘法 (Multiply)  │
│   ┌─────────┐       ┌─────────┐       ┌─────────┐      │
│   │ ▓▓▓     │       │ ███     │       │ ░░░     │      │
│   │   ▓▓▓   │       │   ███   │       │   ░░░   │      │
│   │ 覆盖    │       │ 更亮    │       │ 更暗    │      │
│   └─────────┘       └─────────┘       └─────────┘      │
│                                                         │
│   滤色 (Screen)     叠加 (Overlay)    差值 (Diff)      │
│   ┌─────────┐       ┌─────────┐       ┌─────────┐      │
│   │ ███     │       │ ▓██     │       │ █ █     │      │
│   │   ███   │       │   ██▓   │       │  █ █    │      │
│   │ 提亮    │       │ 对比    │       │ 反色    │      │
│   └─────────┘       └─────────┘       └─────────┘      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 正常混合

### 标准 Alpha 混合

```javascript
// 标准透明
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.blendEquation(gl.FUNC_ADD);

// 公式: Result = Src × As + Dst × (1 - As)
```

### 预乘 Alpha 混合

```javascript
// 预乘 Alpha（推荐）
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

// 着色器中预乘
vec4 premultiplied = vec4(color.rgb * color.a, color.a);
```

### 预乘优势

```glsl
// 非预乘的问题：边缘黑边
// 透明像素通常是 (0, 0, 0, 0)
// 混合时黑色会渗入

// 预乘解决：
// 透明像素变为 (0, 0, 0, 0)
// 半透明白色从 (1, 1, 1, 0.5) 变为 (0.5, 0.5, 0.5, 0.5)
// 边缘更平滑
```

## 加法混合

### 基本加法

```javascript
// 简单加法（不考虑 Alpha）
gl.blendFunc(gl.ONE, gl.ONE);

// 公式: Result = Src + Dst
```

### Alpha 加权加法

```javascript
// 考虑透明度的加法
gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

// 公式: Result = Src × As + Dst
```

### 应用场景

```javascript
// 粒子效果
function renderGlowParticles() {
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.depthMask(false);
  
  // 渲染发光粒子
  for (const particle of particles) {
    drawParticle(particle);
  }
  
  gl.depthMask(true);
}

// 光效叠加
function renderLightFlares() {
  gl.blendFunc(gl.ONE, gl.ONE);
  
  // 叠加多个光晕
  for (const light of lights) {
    drawLightFlare(light);
  }
}
```

## 减法混合

### 基本减法

```javascript
// 减法混合
gl.blendFunc(gl.ONE, gl.ONE);
gl.blendEquation(gl.FUNC_SUBTRACT);

// 公式: Result = Src - Dst
```

### 反向减法

```javascript
// 反向减法
gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT);

// 公式: Result = Dst - Src
```

## 乘法混合

### 实现乘法

```javascript
// 乘法混合
gl.blendFunc(gl.DST_COLOR, gl.ZERO);
gl.blendEquation(gl.FUNC_ADD);

// 公式: Result = Src × Dst
```

### 着色器实现

```glsl
// 更灵活的乘法混合
uniform sampler2D u_base;
uniform sampler2D u_multiply;

void main() {
  vec4 base = texture(u_base, v_texCoord);
  vec4 mult = texture(u_multiply, v_texCoord);
  
  fragColor = base * mult;
}
```

## 滤色混合

### 实现

```javascript
// 滤色混合（乘法的反转）
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
gl.blendEquation(gl.FUNC_ADD);

// 公式: Result = 1 - (1 - Src) × (1 - Dst)
//      = Src + Dst - Src × Dst
```

### 着色器实现

```glsl
// 滤色混合
void main() {
  vec4 base = texture(u_base, v_texCoord);
  vec4 screen = texture(u_screen, v_texCoord);
  
  // 1 - (1 - base) * (1 - screen)
  fragColor = vec4(
    1.0 - (1.0 - base.rgb) * (1.0 - screen.rgb),
    base.a
  );
}
```

## 叠加混合

### 着色器实现

```glsl
// 叠加混合（Overlay）
float overlayChannel(float base, float blend) {
  if (base < 0.5) {
    return 2.0 * base * blend;
  } else {
    return 1.0 - 2.0 * (1.0 - base) * (1.0 - blend);
  }
}

void main() {
  vec4 base = texture(u_base, v_texCoord);
  vec4 blend = texture(u_blend, v_texCoord);
  
  fragColor = vec4(
    overlayChannel(base.r, blend.r),
    overlayChannel(base.g, blend.g),
    overlayChannel(base.b, blend.b),
    base.a
  );
}
```

## 柔光混合

### 着色器实现

```glsl
// 柔光混合（Soft Light）
float softLightChannel(float base, float blend) {
  if (blend < 0.5) {
    return base - (1.0 - 2.0 * blend) * base * (1.0 - base);
  } else {
    float d = base < 0.25 
      ? ((16.0 * base - 12.0) * base + 4.0) * base
      : sqrt(base);
    return base + (2.0 * blend - 1.0) * (d - base);
  }
}

void main() {
  vec4 base = texture(u_base, v_texCoord);
  vec4 blend = texture(u_blend, v_texCoord);
  
  fragColor = vec4(
    softLightChannel(base.r, blend.r),
    softLightChannel(base.g, blend.g),
    softLightChannel(base.b, blend.b),
    base.a
  );
}
```

## 差值混合

### 实现

```javascript
// 需要两次渲染
// 第一遍：正常渲染基色
// 第二遍：使用着色器计算差值
```

### 着色器实现

```glsl
// 差值混合（Difference）
void main() {
  vec4 base = texture(u_base, v_texCoord);
  vec4 blend = texture(u_blend, v_texCoord);
  
  fragColor = vec4(abs(base.rgb - blend.rgb), base.a);
}
```

## 排除混合

### 着色器实现

```glsl
// 排除混合（Exclusion）
void main() {
  vec4 base = texture(u_base, v_texCoord);
  vec4 blend = texture(u_blend, v_texCoord);
  
  // base + blend - 2 * base * blend
  vec3 result = base.rgb + blend.rgb - 2.0 * base.rgb * blend.rgb;
  fragColor = vec4(result, base.a);
}
```

## 颜色减淡/加深

### 颜色减淡

```glsl
// Color Dodge
vec3 colorDodge(vec3 base, vec3 blend) {
  return base / (1.0 - blend + 0.00001);
}
```

### 颜色加深

```glsl
// Color Burn
vec3 colorBurn(vec3 base, vec3 blend) {
  return 1.0 - (1.0 - base) / (blend + 0.00001);
}
```

### 线性减淡/加深

```glsl
// Linear Dodge (Add)
vec3 linearDodge(vec3 base, vec3 blend) {
  return base + blend;
}

// Linear Burn
vec3 linearBurn(vec3 base, vec3 blend) {
  return base + blend - 1.0;
}
```

## Min/Max 混合

### 变暗

```javascript
// 取最小值
gl.blendEquation(gl.MIN);
gl.blendFunc(gl.ONE, gl.ONE);

// Result = min(Src, Dst)
```

### 变亮

```javascript
// 取最大值
gl.blendEquation(gl.MAX);
gl.blendFunc(gl.ONE, gl.ONE);

// Result = max(Src, Dst)
```

## 混合模式封装

### 工具函数

```javascript
class BlendMode {
  static Normal(gl) {
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.blendEquation(gl.FUNC_ADD);
  }
  
  static Premultiplied(gl) {
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.blendEquation(gl.FUNC_ADD);
  }
  
  static Additive(gl) {
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.blendEquation(gl.FUNC_ADD);
  }
  
  static Multiply(gl) {
    gl.blendFunc(gl.DST_COLOR, gl.ZERO);
    gl.blendEquation(gl.FUNC_ADD);
  }
  
  static Screen(gl) {
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
    gl.blendEquation(gl.FUNC_ADD);
  }
  
  static Darken(gl) {
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.blendEquation(gl.MIN);
  }
  
  static Lighten(gl) {
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.blendEquation(gl.MAX);
  }
  
  static Subtract(gl) {
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT);
  }
}
```

### 使用示例

```javascript
function render() {
  gl.enable(gl.BLEND);
  
  // 渲染背景
  BlendMode.Normal(gl);
  drawBackground();
  
  // 叠加光效
  BlendMode.Additive(gl);
  drawLightEffects();
  
  // 阴影
  BlendMode.Multiply(gl);
  drawShadows();
  
  gl.disable(gl.BLEND);
}
```

## 着色器混合模式库

### 完整实现

```glsl
// 混合模式函数库
#define BLEND_NORMAL     0
#define BLEND_MULTIPLY   1
#define BLEND_SCREEN     2
#define BLEND_OVERLAY    3
#define BLEND_SOFT_LIGHT 4
#define BLEND_DIFFERENCE 5

uniform int u_blendMode;

vec3 blendNormal(vec3 base, vec3 blend) {
  return blend;
}

vec3 blendMultiply(vec3 base, vec3 blend) {
  return base * blend;
}

vec3 blendScreen(vec3 base, vec3 blend) {
  return 1.0 - (1.0 - base) * (1.0 - blend);
}

vec3 blendOverlay(vec3 base, vec3 blend) {
  return mix(
    2.0 * base * blend,
    1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
    step(0.5, base)
  );
}

vec3 blendSoftLight(vec3 base, vec3 blend) {
  return mix(
    base - (1.0 - 2.0 * blend) * base * (1.0 - base),
    base + (2.0 * blend - 1.0) * (sqrt(base) - base),
    step(0.5, blend)
  );
}

vec3 blendDifference(vec3 base, vec3 blend) {
  return abs(base - blend);
}

vec3 applyBlend(vec3 base, vec3 blend, float opacity) {
  vec3 result;
  
  if (u_blendMode == BLEND_MULTIPLY) {
    result = blendMultiply(base, blend);
  } else if (u_blendMode == BLEND_SCREEN) {
    result = blendScreen(base, blend);
  } else if (u_blendMode == BLEND_OVERLAY) {
    result = blendOverlay(base, blend);
  } else if (u_blendMode == BLEND_SOFT_LIGHT) {
    result = blendSoftLight(base, blend);
  } else if (u_blendMode == BLEND_DIFFERENCE) {
    result = blendDifference(base, blend);
  } else {
    result = blendNormal(base, blend);
  }
  
  return mix(base, result, opacity);
}

void main() {
  vec4 base = texture(u_baseTexture, v_texCoord);
  vec4 blend = texture(u_blendTexture, v_texCoord);
  
  vec3 result = applyBlend(base.rgb, blend.rgb, blend.a);
  fragColor = vec4(result, base.a);
}
```

## 性能考虑

### 硬件混合 vs 着色器混合

| 方式 | 优点 | 缺点 |
|------|------|------|
| 硬件混合 | 快速，免费 | 模式有限 |
| 着色器混合 | 任意模式 | 需要额外 Pass |

### 优化建议

```javascript
// 1. 尽量使用硬件混合
// 2. 相同混合模式的物体一起渲染
// 3. 复杂混合使用离屏渲染

function optimizedRender() {
  const groups = groupByBlendMode(objects);
  
  for (const [mode, objs] of groups) {
    setBlendMode(mode);
    for (const obj of objs) {
      draw(obj);
    }
  }
}
```

## 本章小结

- 不同混合模式产生不同视觉效果
- 硬件支持：Normal、Additive、Multiply、Screen、Min、Max
- 复杂模式需要着色器实现
- 预乘 Alpha 避免边缘黑边
- 加法混合适合发光效果
- 乘法混合产生阴影效果
- 封装工具类便于切换模式

下一章，我们将学习模板测试。
