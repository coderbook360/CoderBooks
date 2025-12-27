# 色彩理论基础

> 色彩是设计系统的核心要素之一。理解色彩理论能帮助我们创建和谐、易用且具有品牌识别度的色彩系统。

## 色彩模型

### RGB 与 HEX

```typescript
// RGB: 屏幕显示的基础
interface RGB {
  r: number;  // 0-255
  g: number;  // 0-255
  b: number;  // 0-255
}

// HEX: RGB 的十六进制表示
const blue: string = '#1677ff';  // = rgb(22, 119, 255)

// 转换函数
function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
}
```

### HSL 模型

HSL 更符合人类对色彩的认知：

```typescript
interface HSL {
  h: number;  // 色相 (Hue): 0-360°
  s: number;  // 饱和度 (Saturation): 0-100%
  l: number;  // 亮度 (Lightness): 0-100%
}

// HSL 的优势：容易生成色彩变体
const primaryHsl: HSL = { h: 215, s: 100, l: 55 };  // #1677ff

// 生成浅色版本：增加亮度
const primaryLight: HSL = { h: 215, s: 100, l: 90 };  // 浅蓝

// 生成深色版本：降低亮度
const primaryDark: HSL = { h: 215, s: 100, l: 35 };   // 深蓝

// CSS 中使用 HSL
const style = {
  color: `hsl(${primaryHsl.h}, ${primaryHsl.s}%, ${primaryHsl.l}%)`,
};
```

## 色彩和谐

### 色轮关系

```
       0° 红
        │
   330° │  30°
    ·   │   ·
     \  │  /
300°─────┼───── 60°
     /  │  \
    ·   │   ·
   270° │  90°
        │
      180°
```

**常见色彩和谐方案**：

```typescript
// 1. 单色方案（Monochromatic）
// 同一色相，不同饱和度和亮度
const monochromaticPalette = [
  { h: 215, s: 100, l: 95 },  // 最浅
  { h: 215, s: 100, l: 75 },
  { h: 215, s: 100, l: 55 },  // 主色
  { h: 215, s: 100, l: 35 },
  { h: 215, s: 100, l: 15 },  // 最深
];

// 2. 补色方案（Complementary）
// 色轮上相对的颜色（相差 180°）
const primary = { h: 215, s: 100, l: 55 };  // 蓝色
const complementary = { h: 35, s: 100, l: 55 };  // 橙色

// 3. 三色方案（Triadic）
// 色轮上均匀分布的三种颜色（相差 120°）
const triadicPalette = [
  { h: 215, s: 80, l: 55 },  // 蓝
  { h: 335, s: 80, l: 55 },  // 粉红
  { h: 95, s: 80, l: 55 },   // 绿
];
```

### 生成色彩规模

```typescript
// 自动生成色彩规模（10 级色阶）
function generateColorScale(baseColor: HSL): HSL[] {
  const { h, s } = baseColor;
  
  return [
    { h, s: s * 0.3, l: 98 },   // 50:  最浅
    { h, s: s * 0.5, l: 95 },   // 100
    { h, s: s * 0.7, l: 88 },   // 200
    { h, s: s * 0.8, l: 78 },   // 300
    { h, s: s * 0.9, l: 65 },   // 400
    { h, s, l: 55 },            // 500: 主色
    { h, s, l: 45 },            // 600
    { h, s, l: 35 },            // 700
    { h, s, l: 25 },            // 800
    { h, s, l: 15 },            // 900: 最深
  ];
}

// 使用示例
const blueScale = generateColorScale({ h: 215, s: 100, l: 55 });
```

## 色彩语义

### 功能色

```typescript
// 设计系统中的语义色
const semanticColors = {
  // 成功/确认
  success: {
    main: '#52c41a',    // 绿色
    light: '#b7eb8f',
    dark: '#389e0d',
  },
  
  // 警告/注意
  warning: {
    main: '#faad14',    // 橙色
    light: '#fff1b8',
    dark: '#d48806',
  },
  
  // 错误/危险
  error: {
    main: '#ff4d4f',    // 红色
    light: '#ffccc7',
    dark: '#cf1322',
  },
  
  // 信息/提示
  info: {
    main: '#1677ff',    // 蓝色
    light: '#bae0ff',
    dark: '#0958d9',
  },
};
```

### 中性色

```typescript
// 用于文本、边框、背景
const neutralColors = {
  // 文本色
  text: {
    primary: 'rgba(0, 0, 0, 0.88)',    // 主要文本
    secondary: 'rgba(0, 0, 0, 0.65)',  // 次要文本
    tertiary: 'rgba(0, 0, 0, 0.45)',   // 禁用/提示文本
  },
  
  // 背景色
  background: {
    page: '#f5f5f5',      // 页面背景
    container: '#ffffff', // 容器背景
    elevated: '#ffffff',  // 抬起的元素
  },
  
  // 边框色
  border: {
    default: '#d9d9d9',
    light: '#f0f0f0',
  },
};
```

## 可访问性

### 对比度要求

```typescript
// WCAG 2.1 对比度要求
// AA 级：正常文本 4.5:1，大文本 3:1
// AAA 级：正常文本 7:1，大文本 4.5:1

// 计算相对亮度
function getLuminance(rgb: RGB): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// 计算对比度
function getContrastRatio(color1: RGB, color2: RGB): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// 检查是否满足 AA 标准
function meetsAA(foreground: RGB, background: RGB): boolean {
  return getContrastRatio(foreground, background) >= 4.5;
}
```

## 暗色模式

```typescript
// 使用 CSS 变量实现主题切换
const lightTheme = {
  '--color-bg-primary': '#ffffff',
  '--color-text-primary': 'rgba(0, 0, 0, 0.88)',
  '--color-border': '#d9d9d9',
};

const darkTheme = {
  '--color-bg-primary': '#141414',
  '--color-text-primary': 'rgba(255, 255, 255, 0.85)',
  '--color-border': '#424242',
};

// 应用主题
function applyTheme(theme: 'light' | 'dark') {
  const tokens = theme === 'light' ? lightTheme : darkTheme;
  Object.entries(tokens).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
}
```

## 总结

色彩理论核心要点：

1. **色彩模型**：HSL 更适合设计系统
2. **和谐方案**：单色、补色、三色等
3. **语义色彩**：功能色和中性色
4. **可访问性**：确保足够的对比度
5. **暗色模式**：使用 CSS 变量实现主题切换