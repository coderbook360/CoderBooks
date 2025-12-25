# Color 颜色类

> "颜色是 3D 世界的灵魂，正确处理颜色让场景更加真实。"

## 颜色基础

### 颜色模型

| 模型 | 说明 | 用途 |
|------|------|------|
| RGB | 红绿蓝 | 显示器显示 |
| HSL | 色相/饱和度/亮度 | 颜色调整 |
| sRGB | 伽马校正的 RGB | 图片存储 |
| Linear RGB | 线性 RGB | 光照计算 |

### 颜色空间

```
sRGB ─────────────────────── Linear RGB
    γ = 2.2                     γ = 1.0
  (显示/存储)                 (物理计算)
  
  颜色 0.5 在屏幕上
  看起来是中灰色
                              颜色 0.5 
                              物理上是 50% 的能量
                              但看起来偏亮
```

## Color 实现

### 基础结构

```typescript
// src/math/Color.ts
export class Color {
  r: number;
  g: number;
  b: number;
  
  constructor(r?: number | string | Color, g?: number, b?: number) {
    this.r = 1;
    this.g = 1;
    this.b = 1;
    
    if (r !== undefined) {
      this.set(r, g, b);
    }
  }
  
  set(r: number | string | Color, g?: number, b?: number): this {
    if (r instanceof Color) {
      this.copy(r);
    } else if (typeof r === 'number') {
      if (g === undefined && b === undefined) {
        // 十六进制
        this.setHex(r);
      } else {
        // RGB
        this.setRGB(r, g!, b!);
      }
    } else if (typeof r === 'string') {
      this.setStyle(r);
    }
    return this;
  }
  
  setScalar(scalar: number): this {
    this.r = scalar;
    this.g = scalar;
    this.b = scalar;
    return this;
  }
  
  setHex(hex: number): this {
    hex = Math.floor(hex);
    
    this.r = ((hex >> 16) & 255) / 255;
    this.g = ((hex >> 8) & 255) / 255;
    this.b = (hex & 255) / 255;
    
    return this;
  }
  
  setRGB(r: number, g: number, b: number): this {
    this.r = r;
    this.g = g;
    this.b = b;
    return this;
  }
  
  clone(): Color {
    return new Color(this.r, this.g, this.b);
  }
  
  copy(color: Color): this {
    this.r = color.r;
    this.g = color.g;
    this.b = color.b;
    return this;
  }
}
```

### 从 CSS 字符串设置

```typescript
setStyle(style: string): this {
  // rgb(255, 255, 255)
  let m = /^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(style);
  
  if (m) {
    this.r = Math.min(255, parseInt(m[1], 10)) / 255;
    this.g = Math.min(255, parseInt(m[2], 10)) / 255;
    this.b = Math.min(255, parseInt(m[3], 10)) / 255;
    return this;
  }
  
  // rgb(100%, 100%, 100%)
  m = /^rgb\s*\(\s*(\d+)%\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)$/i.exec(style);
  
  if (m) {
    this.r = Math.min(100, parseInt(m[1], 10)) / 100;
    this.g = Math.min(100, parseInt(m[2], 10)) / 100;
    this.b = Math.min(100, parseInt(m[3], 10)) / 100;
    return this;
  }
  
  // #ff0000
  m = /^\#([A-Fa-f\d]+)$/.exec(style);
  
  if (m) {
    const hex = m[1];
    const size = hex.length;
    
    if (size === 3) {
      // #f00
      this.r = parseInt(hex.charAt(0) + hex.charAt(0), 16) / 255;
      this.g = parseInt(hex.charAt(1) + hex.charAt(1), 16) / 255;
      this.b = parseInt(hex.charAt(2) + hex.charAt(2), 16) / 255;
    } else if (size === 6) {
      // #ff0000
      this.r = parseInt(hex.charAt(0) + hex.charAt(1), 16) / 255;
      this.g = parseInt(hex.charAt(2) + hex.charAt(3), 16) / 255;
      this.b = parseInt(hex.charAt(4) + hex.charAt(5), 16) / 255;
    }
    
    return this;
  }
  
  // hsl(0, 100%, 50%)
  m = /^hsl\s*\(\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)%\s*,\s*(\d+\.?\d*)%\s*\)$/i.exec(style);
  
  if (m) {
    const h = parseFloat(m[1]) / 360;
    const s = parseFloat(m[2]) / 100;
    const l = parseFloat(m[3]) / 100;
    return this.setHSL(h, s, l);
  }
  
  // 颜色名
  if (style) {
    return this.setColorName(style);
  }
  
  return this;
}

setColorName(name: string): this {
  const hex = _colorKeywords[name.toLowerCase()];
  
  if (hex !== undefined) {
    this.setHex(hex);
  } else {
    console.warn(`Color: Unknown color ${name}`);
  }
  
  return this;
}
```

### 颜色名映射表

```typescript
const _colorKeywords: Record<string, number> = {
  aliceblue: 0xf0f8ff,
  antiquewhite: 0xfaebd7,
  aqua: 0x00ffff,
  aquamarine: 0x7fffd4,
  azure: 0xf0ffff,
  beige: 0xf5f5dc,
  bisque: 0xffe4c4,
  black: 0x000000,
  blanchedalmond: 0xffebcd,
  blue: 0x0000ff,
  blueviolet: 0x8a2be2,
  brown: 0xa52a2a,
  burlywood: 0xdeb887,
  cadetblue: 0x5f9ea0,
  chartreuse: 0x7fff00,
  chocolate: 0xd2691e,
  coral: 0xff7f50,
  cornflowerblue: 0x6495ed,
  cornsilk: 0xfff8dc,
  crimson: 0xdc143c,
  cyan: 0x00ffff,
  darkblue: 0x00008b,
  darkcyan: 0x008b8b,
  darkgoldenrod: 0xb8860b,
  darkgray: 0xa9a9a9,
  darkgreen: 0x006400,
  darkgrey: 0xa9a9a9,
  darkkhaki: 0xbdb76b,
  darkmagenta: 0x8b008b,
  darkolivegreen: 0x556b2f,
  darkorange: 0xff8c00,
  darkorchid: 0x9932cc,
  darkred: 0x8b0000,
  darksalmon: 0xe9967a,
  darkseagreen: 0x8fbc8f,
  darkslateblue: 0x483d8b,
  darkslategray: 0x2f4f4f,
  darkslategrey: 0x2f4f4f,
  darkturquoise: 0x00ced1,
  darkviolet: 0x9400d3,
  deeppink: 0xff1493,
  deepskyblue: 0x00bfff,
  dimgray: 0x696969,
  dimgrey: 0x696969,
  dodgerblue: 0x1e90ff,
  firebrick: 0xb22222,
  floralwhite: 0xfffaf0,
  forestgreen: 0x228b22,
  fuchsia: 0xff00ff,
  gainsboro: 0xdcdcdc,
  ghostwhite: 0xf8f8ff,
  gold: 0xffd700,
  goldenrod: 0xdaa520,
  gray: 0x808080,
  green: 0x008000,
  greenyellow: 0xadff2f,
  grey: 0x808080,
  honeydew: 0xf0fff0,
  hotpink: 0xff69b4,
  indianred: 0xcd5c5c,
  indigo: 0x4b0082,
  ivory: 0xfffff0,
  khaki: 0xf0e68c,
  lavender: 0xe6e6fa,
  lavenderblush: 0xfff0f5,
  lawngreen: 0x7cfc00,
  lemonchiffon: 0xfffacd,
  lightblue: 0xadd8e6,
  lightcoral: 0xf08080,
  lightcyan: 0xe0ffff,
  lightgoldenrodyellow: 0xfafad2,
  lightgray: 0xd3d3d3,
  lightgreen: 0x90ee90,
  lightgrey: 0xd3d3d3,
  lightpink: 0xffb6c1,
  lightsalmon: 0xffa07a,
  lightseagreen: 0x20b2aa,
  lightskyblue: 0x87cefa,
  lightslategray: 0x778899,
  lightslategrey: 0x778899,
  lightsteelblue: 0xb0c4de,
  lightyellow: 0xffffe0,
  lime: 0x00ff00,
  limegreen: 0x32cd32,
  linen: 0xfaf0e6,
  magenta: 0xff00ff,
  maroon: 0x800000,
  mediumaquamarine: 0x66cdaa,
  mediumblue: 0x0000cd,
  mediumorchid: 0xba55d3,
  mediumpurple: 0x9370db,
  mediumseagreen: 0x3cb371,
  mediumslateblue: 0x7b68ee,
  mediumspringgreen: 0x00fa9a,
  mediumturquoise: 0x48d1cc,
  mediumvioletred: 0xc71585,
  midnightblue: 0x191970,
  mintcream: 0xf5fffa,
  mistyrose: 0xffe4e1,
  moccasin: 0xffe4b5,
  navajowhite: 0xffdead,
  navy: 0x000080,
  oldlace: 0xfdf5e6,
  olive: 0x808000,
  olivedrab: 0x6b8e23,
  orange: 0xffa500,
  orangered: 0xff4500,
  orchid: 0xda70d6,
  palegoldenrod: 0xeee8aa,
  palegreen: 0x98fb98,
  paleturquoise: 0xafeeee,
  palevioletred: 0xdb7093,
  papayawhip: 0xffefd5,
  peachpuff: 0xffdab9,
  peru: 0xcd853f,
  pink: 0xffc0cb,
  plum: 0xdda0dd,
  powderblue: 0xb0e0e6,
  purple: 0x800080,
  rebeccapurple: 0x663399,
  red: 0xff0000,
  rosybrown: 0xbc8f8f,
  royalblue: 0x4169e1,
  saddlebrown: 0x8b4513,
  salmon: 0xfa8072,
  sandybrown: 0xf4a460,
  seagreen: 0x2e8b57,
  seashell: 0xfff5ee,
  sienna: 0xa0522d,
  silver: 0xc0c0c0,
  skyblue: 0x87ceeb,
  slateblue: 0x6a5acd,
  slategray: 0x708090,
  slategrey: 0x708090,
  snow: 0xfffafa,
  springgreen: 0x00ff7f,
  steelblue: 0x4682b4,
  tan: 0xd2b48c,
  teal: 0x008080,
  thistle: 0xd8bfd8,
  tomato: 0xff6347,
  turquoise: 0x40e0d0,
  violet: 0xee82ee,
  wheat: 0xf5deb3,
  white: 0xffffff,
  whitesmoke: 0xf5f5f5,
  yellow: 0xffff00,
  yellowgreen: 0x9acd32,
};
```

## HSL 颜色

### 设置 HSL

```typescript
setHSL(h: number, s: number, l: number): this {
  // h, s, l 范围 [0, 1]
  h = euclideanModulo(h, 1);
  s = clamp(s, 0, 1);
  l = clamp(l, 0, 1);
  
  if (s === 0) {
    this.r = this.g = this.b = l;
  } else {
    const p = l <= 0.5 ? l * (1 + s) : l + s - (l * s);
    const q = (2 * l) - p;
    
    this.r = hue2rgb(q, p, h + 1 / 3);
    this.g = hue2rgb(q, p, h);
    this.b = hue2rgb(q, p, h - 1 / 3);
  }
  
  return this;
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * 6 * (2 / 3 - t);
  return p;
}
```

### 获取 HSL

```typescript
getHSL(target: { h: number; s: number; l: number }): typeof target {
  const r = this.r, g = this.g, b = this.b;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  
  let hue = 0, saturation = 0;
  const lightness = (min + max) / 2;
  
  if (min !== max) {
    const delta = max - min;
    
    saturation = lightness <= 0.5
      ? delta / (max + min)
      : delta / (2 - max - min);
    
    switch (max) {
      case r:
        hue = (g - b) / delta + (g < b ? 6 : 0);
        break;
      case g:
        hue = (b - r) / delta + 2;
        break;
      case b:
        hue = (r - g) / delta + 4;
        break;
    }
    
    hue /= 6;
  }
  
  target.h = hue;
  target.s = saturation;
  target.l = lightness;
  
  return target;
}
```

## 颜色空间转换

### sRGB ↔ Linear

```typescript
// sRGB 转 Linear（用于光照计算前）
function SRGBToLinear(c: number): number {
  return c < 0.04045
    ? c * 0.0773993808
    : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);
}

// Linear 转 sRGB（用于输出显示）
function LinearToSRGB(c: number): number {
  return c < 0.0031308
    ? c * 12.92
    : 1.055 * Math.pow(c, 0.41666) - 0.055;
}

copySRGBToLinear(color: Color): this {
  this.r = SRGBToLinear(color.r);
  this.g = SRGBToLinear(color.g);
  this.b = SRGBToLinear(color.b);
  return this;
}

copyLinearToSRGB(color: Color): this {
  this.r = LinearToSRGB(color.r);
  this.g = LinearToSRGB(color.g);
  this.b = LinearToSRGB(color.b);
  return this;
}

convertSRGBToLinear(): this {
  return this.copySRGBToLinear(this);
}

convertLinearToSRGB(): this {
  return this.copyLinearToSRGB(this);
}
```

### 颜色空间说明

```
纹理加载:
  sRGB 图片 ──────────────────────────────────────→ GPU
              ↓                                      ↓
         解码时转为 Linear                      采样时自动转换
              ↓                                      ↓
          Linear RGB ←───── 着色器光照计算 ←──── Linear RGB
              ↓
          输出转 sRGB
              ↓
           显示器
```

## 颜色运算

### 基础运算

```typescript
add(color: Color): this {
  this.r += color.r;
  this.g += color.g;
  this.b += color.b;
  return this;
}

addColors(color1: Color, color2: Color): this {
  this.r = color1.r + color2.r;
  this.g = color1.g + color2.g;
  this.b = color1.b + color2.b;
  return this;
}

addScalar(s: number): this {
  this.r += s;
  this.g += s;
  this.b += s;
  return this;
}

sub(color: Color): this {
  this.r = Math.max(0, this.r - color.r);
  this.g = Math.max(0, this.g - color.g);
  this.b = Math.max(0, this.b - color.b);
  return this;
}

multiply(color: Color): this {
  this.r *= color.r;
  this.g *= color.g;
  this.b *= color.b;
  return this;
}

multiplyScalar(s: number): this {
  this.r *= s;
  this.g *= s;
  this.b *= s;
  return this;
}
```

### 插值

```typescript
lerp(color: Color, alpha: number): this {
  this.r += (color.r - this.r) * alpha;
  this.g += (color.g - this.g) * alpha;
  this.b += (color.b - this.b) * alpha;
  return this;
}

lerpColors(color1: Color, color2: Color, alpha: number): this {
  this.r = color1.r + (color2.r - color1.r) * alpha;
  this.g = color1.g + (color2.g - color1.g) * alpha;
  this.b = color1.b + (color2.b - color1.b) * alpha;
  return this;
}

// HSL 空间插值（更自然的颜色过渡）
lerpHSL(color: Color, alpha: number): this {
  this.getHSL(_hslA);
  color.getHSL(_hslB);
  
  const h = lerp(_hslA.h, _hslB.h, alpha);
  const s = lerp(_hslA.s, _hslB.s, alpha);
  const l = lerp(_hslA.l, _hslB.l, alpha);
  
  this.setHSL(h, s, l);
  
  return this;
}
```

## 格式转换

### 输出格式

```typescript
getHex(): number {
  return (
    Math.round(clamp(this.r * 255, 0, 255)) << 16 ^
    Math.round(clamp(this.g * 255, 0, 255)) << 8 ^
    Math.round(clamp(this.b * 255, 0, 255)) << 0
  );
}

getHexString(): string {
  return ('000000' + this.getHex().toString(16)).slice(-6);
}

getStyle(): string {
  const r = Math.round(clamp(this.r * 255, 0, 255));
  const g = Math.round(clamp(this.g * 255, 0, 255));
  const b = Math.round(clamp(this.b * 255, 0, 255));
  return `rgb(${r},${g},${b})`;
}

getRGB(target: { r: number; g: number; b: number }): typeof target {
  target.r = this.r;
  target.g = this.g;
  target.b = this.b;
  return target;
}
```

### 数组转换

```typescript
fromArray(array: number[], offset = 0): this {
  this.r = array[offset];
  this.g = array[offset + 1];
  this.b = array[offset + 2];
  return this;
}

toArray(array: number[] = [], offset = 0): number[] {
  array[offset] = this.r;
  array[offset + 1] = this.g;
  array[offset + 2] = this.b;
  return array;
}

fromBufferAttribute(attribute: BufferAttribute, index: number): this {
  this.r = attribute.getX(index);
  this.g = attribute.getY(index);
  this.b = attribute.getZ(index);
  return this;
}
```

## 实用函数

### 随机颜色

```typescript
// 完全随机
randomColor(): Color {
  return new Color(Math.random(), Math.random(), Math.random());
}

// 随机饱和颜色
randomSaturatedColor(): Color {
  return new Color().setHSL(Math.random(), 1, 0.5);
}

// 随机柔和颜色
randomPastelColor(): Color {
  return new Color().setHSL(Math.random(), 0.5, 0.8);
}
```

### 颜色对比度

```typescript
// 计算亮度（用于确定文字颜色）
getLuminance(): number {
  // 人眼对绿色最敏感
  const r = this.r <= 0.03928 
    ? this.r / 12.92 
    : Math.pow((this.r + 0.055) / 1.055, 2.4);
  const g = this.g <= 0.03928 
    ? this.g / 12.92 
    : Math.pow((this.g + 0.055) / 1.055, 2.4);
  const b = this.b <= 0.03928 
    ? this.b / 12.92 
    : Math.pow((this.b + 0.055) / 1.055, 2.4);
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// 确定文字颜色（黑或白）
getContrastColor(): Color {
  return this.getLuminance() > 0.179
    ? new Color(0x000000)
    : new Color(0xffffff);
}
```

### 颜色调整

```typescript
// 调亮
lighten(amount: number): this {
  this.getHSL(_hslA);
  _hslA.l = Math.min(1, _hslA.l + amount);
  this.setHSL(_hslA.h, _hslA.s, _hslA.l);
  return this;
}

// 调暗
darken(amount: number): this {
  this.getHSL(_hslA);
  _hslA.l = Math.max(0, _hslA.l - amount);
  this.setHSL(_hslA.h, _hslA.s, _hslA.l);
  return this;
}

// 调整饱和度
saturate(amount: number): this {
  this.getHSL(_hslA);
  _hslA.s = clamp(_hslA.s + amount, 0, 1);
  this.setHSL(_hslA.h, _hslA.s, _hslA.l);
  return this;
}

// 降低饱和度
desaturate(amount: number): this {
  return this.saturate(-amount);
}

// 完全去饱和（灰度）
grayscale(): this {
  return this.setScalar(this.getLuminance());
}

// 反色
invert(): this {
  this.r = 1 - this.r;
  this.g = 1 - this.g;
  this.b = 1 - this.b;
  return this;
}
```

## 静态变量

```typescript
const _hslA: { h: number; s: number; l: number } = { h: 0, s: 0, l: 0 };
const _hslB: { h: number; s: number; l: number } = { h: 0, s: 0, l: 0 };

function euclideanModulo(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(x: number, y: number, t: number): number {
  return (1 - t) * x + t * y;
}
```

## 使用示例

```typescript
// 创建颜色
const red = new Color(0xff0000);
const green = new Color('green');
const blue = new Color('rgb(0, 0, 255)');
const hsl = new Color().setHSL(0.5, 1, 0.5);

// 颜色运算
const mixed = red.clone().lerp(blue, 0.5);  // 紫色

// 颜色调整
const light = red.clone().lighten(0.3);
const dark = red.clone().darken(0.3);
const gray = red.clone().grayscale();

// 输出
console.log(red.getHexString());  // 'ff0000'
console.log(red.getStyle());      // 'rgb(255,0,0)'
```

## 本章小结

- Color 支持多种输入格式
- HSL 便于颜色调整
- sRGB 和 Linear 转换对渲染很重要
- 颜色运算支持加减乘和插值
- 亮度计算用于文字颜色选择
- 静态变量避免临时对象

下一章，我们将学习 Object3D 层次结构与场景图。
