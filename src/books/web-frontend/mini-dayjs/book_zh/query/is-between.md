# isBetween 范围判断

`isBetween` 判断日期是否在两个日期之间，是 Day.js 的插件功能。

## API 设计

```javascript
import isBetween from 'dayjs/plugin/isBetween'
dayjs.extend(isBetween)

dayjs('2024-06-15').isBetween('2024-01-01', '2024-12-31')  // true
dayjs('2024-06-15').isBetween('2024-01-01', '2024-06-15')  // false（不含边界）
dayjs('2024-06-15').isBetween('2024-01-01', '2024-06-15', null, '[]')  // true（含边界）
```

## 参数说明

```typescript
isBetween(
  start: DateInput,      // 开始日期
  end: DateInput,        // 结束日期
  unit?: string,         // 比较单位
  inclusivity?: string   // 边界包含方式
): boolean
```

**inclusivity** 参数：
- `'()'`：不包含两端（默认）
- `'[]'`：包含两端
- `'[)'`：包含开始，不包含结束
- `'(]'`：不包含开始，包含结束

## 实现

```typescript
// src/plugins/isBetween.ts
export default function(option: unknown, DayjsClass: typeof Dayjs) {
  DayjsClass.prototype.isBetween = function(
    start: DateInput,
    end: DateInput,
    unit?: string | null,
    inclusivity: string = '()'
  ): boolean {
    const startDate = dayjs(start)
    const endDate = dayjs(end)
    
    // 解析包含方式
    const includeStart = inclusivity[0] === '['
    const includeEnd = inclusivity[1] === ']'
    
    // 判断开始边界
    const afterStart = includeStart
      ? !this.isBefore(startDate, unit || undefined)
      : this.isAfter(startDate, unit || undefined)
    
    // 判断结束边界
    const beforeEnd = includeEnd
      ? !this.isAfter(endDate, unit || undefined)
      : this.isBefore(endDate, unit || undefined)
    
    return afterStart && beforeEnd
  }
}
```

## 优化实现

更直观的实现方式：

```typescript
DayjsClass.prototype.isBetween = function(
  start: DateInput,
  end: DateInput,
  unit?: string | null,
  inclusivity: string = '()'
): boolean {
  const startDate = dayjs(start)
  const endDate = dayjs(end)
  const u = unit || undefined
  
  const includeStart = inclusivity[0] === '['
  const includeEnd = inclusivity[1] === ']'
  
  // 开始边界检查
  let startOk: boolean
  if (includeStart) {
    startOk = this.isSameOrAfter(startDate, u)
  } else {
    startOk = this.isAfter(startDate, u)
  }
  
  if (!startOk) return false
  
  // 结束边界检查
  let endOk: boolean
  if (includeEnd) {
    endOk = this.isSameOrBefore(endDate, u)
  } else {
    endOk = this.isBefore(endDate, u)
  }
  
  return endOk
}
```

## 使用场景

### 工作日判断

```javascript
function isWeekday(date) {
  const d = dayjs(date)
  const day = d.day()
  // 1-5 是周一到周五
  return day >= 1 && day <= 5
}
```

### 营业时间判断

```javascript
function isBusinessHour(datetime) {
  const d = dayjs(datetime)
  const start = d.startOf('day').add(9, 'hour')  // 9:00
  const end = d.startOf('day').add(18, 'hour')   // 18:00
  return d.isBetween(start, end, null, '[)')     // 包含9点，不包含18点
}
```

### 有效期判断

```javascript
function isValid(startDate, endDate) {
  return dayjs().isBetween(startDate, endDate, 'day', '[]')
}

function isCouponValid(coupon) {
  return dayjs().isBetween(
    coupon.startDate, 
    coupon.endDate, 
    'day', 
    '[]'
  )
}
```

### 季度判断

```javascript
function isInQ2(date) {
  const year = dayjs(date).year()
  const q2Start = dayjs(`${year}-04-01`)
  const q2End = dayjs(`${year}-06-30`)
  return dayjs(date).isBetween(q2Start, q2End, 'day', '[]')
}
```

## 边界情况

### 开始等于结束

```javascript
const date = dayjs('2024-06-15')
date.isBetween('2024-06-15', '2024-06-15')         // false
date.isBetween('2024-06-15', '2024-06-15', null, '[]')  // true
```

### 开始大于结束

```javascript
// Day.js 不会自动交换，结果可能不符合预期
dayjs('2024-06-15').isBetween('2024-12-31', '2024-01-01')  // false
```

### 无效日期

```javascript
dayjs('invalid').isBetween('2024-01-01', '2024-12-31')  // false
```

## 测试用例

```typescript
describe('isBetween', () => {
  const middle = dayjs('2024-06-15')
  const start = dayjs('2024-01-01')
  const end = dayjs('2024-12-31')

  describe('默认边界（不包含）', () => {
    it('中间日期返回 true', () => {
      expect(middle.isBetween(start, end)).toBe(true)
    })

    it('边界日期返回 false', () => {
      expect(start.isBetween(start, end)).toBe(false)
      expect(end.isBetween(start, end)).toBe(false)
    })
  })

  describe('包含边界', () => {
    it('[] 包含两端', () => {
      expect(start.isBetween(start, end, null, '[]')).toBe(true)
      expect(end.isBetween(start, end, null, '[]')).toBe(true)
    })

    it('[) 包含开始', () => {
      expect(start.isBetween(start, end, null, '[)')).toBe(true)
      expect(end.isBetween(start, end, null, '[)')).toBe(false)
    })

    it('(] 包含结束', () => {
      expect(start.isBetween(start, end, null, '(]')).toBe(false)
      expect(end.isBetween(start, end, null, '(]')).toBe(true)
    })
  })

  describe('带单位', () => {
    it('按月比较', () => {
      expect(dayjs('2024-03-15').isBetween('2024-01-01', '2024-06-30', 'month')).toBe(true)
    })
  })
})
```

## 小结

本章实现了 `isBetween` 方法：

- **范围判断**：判断日期是否在两个日期之间
- **边界控制**：`()`、`[]`、`[)`、`(]` 四种模式
- **单位支持**：可指定比较精度

这是日期范围查询的常用方法。
