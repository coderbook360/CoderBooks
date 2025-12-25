---
sidebar_position: 99
title: "表单验证"
---

# 表单验证

本章实现响应式表单验证。

## 需求分析

表单验证的核心挑战：

1. **实时验证**：输入时即时反馈
2. **防抖**：避免频繁验证
3. **异步验证**：如检查用户名是否存在
4. **联动验证**：如确认密码
5. **表单状态**：valid/invalid/pending
6. **错误消息**：清晰的错误提示

## 基础验证

### 同步验证器

```javascript
// 验证器函数：返回错误信息或 null
const required = (value) => 
  value.trim() ? null : '必填项'

const minLength = (min) => (value) =>
  value.length >= min ? null : `至少 ${min} 个字符`

const maxLength = (max) => (value) =>
  value.length <= max ? null : `最多 ${max} 个字符`

const pattern = (regex, message) => (value) =>
  regex.test(value) ? null : message

const email = pattern(
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  '请输入有效的邮箱地址'
)

const phone = pattern(
  /^1[3-9]\d{9}$/,
  '请输入有效的手机号'
)
```

### 组合验证器

```javascript
function compose(...validators) {
  return (value) => {
    for (const validator of validators) {
      const error = validator(value)
      if (error) return error
    }
    return null
  }
}

// 使用
const usernameValidator = compose(
  required,
  minLength(3),
  maxLength(20),
  pattern(/^[a-zA-Z0-9_]+$/, '只能包含字母、数字和下划线')
)
```

## 响应式表单控件

### FormControl

```javascript
class FormControl {
  constructor(initialValue = '', validators = []) {
    this.value$ = new BehaviorSubject(initialValue)
    this.touched$ = new BehaviorSubject(false)
    this.validators = Array.isArray(validators) ? validators : [validators]
    
    this.error$ = this.value$.pipe(
      debounceTime(300),
      map(value => this.validate(value)),
      shareReplay(1)
    )
    
    this.valid$ = this.error$.pipe(
      map(error => error === null)
    )
    
    this.invalid$ = this.valid$.pipe(
      map(valid => !valid)
    )
  }
  
  validate(value) {
    for (const validator of this.validators) {
      const error = validator(value)
      if (error) return error
    }
    return null
  }
  
  setValue(value) {
    this.value$.next(value)
  }
  
  getValue() {
    return this.value$.getValue()
  }
  
  markAsTouched() {
    this.touched$.next(true)
  }
  
  reset(value = '') {
    this.value$.next(value)
    this.touched$.next(false)
  }
  
  // 绑定到 input 元素
  bindTo(input) {
    const subscriptions = []
    
    // 值同步
    subscriptions.push(
      fromEvent(input, 'input').pipe(
        map(e => e.target.value)
      ).subscribe(value => this.setValue(value))
    )
    
    // 触摸状态
    subscriptions.push(
      fromEvent(input, 'blur').subscribe(() => this.markAsTouched())
    )
    
    // 值回显
    subscriptions.push(
      this.value$.subscribe(value => {
        if (input.value !== value) {
          input.value = value
        }
      })
    )
    
    return () => subscriptions.forEach(s => s.unsubscribe())
  }
}

// 使用
const emailControl = new FormControl('', [required, email])

emailControl.error$.subscribe(error => {
  if (error) {
    showError(error)
  } else {
    hideError()
  }
})

// 绑定
const unbind = emailControl.bindTo(document.getElementById('email'))
```

### 带异步验证的 FormControl

```javascript
class AsyncFormControl extends FormControl {
  constructor(initialValue, syncValidators, asyncValidators = []) {
    super(initialValue, syncValidators)
    this.asyncValidators = asyncValidators
    this.pending$ = new BehaviorSubject(false)
    
    // 重写 error$
    this.error$ = this.value$.pipe(
      debounceTime(300),
      switchMap(value => {
        // 先同步验证
        const syncError = this.validate(value)
        if (syncError) {
          this.pending$.next(false)
          return of(syncError)
        }
        
        // 再异步验证
        if (this.asyncValidators.length === 0) {
          this.pending$.next(false)
          return of(null)
        }
        
        this.pending$.next(true)
        
        return forkJoin(
          this.asyncValidators.map(v => v(value))
        ).pipe(
          map(errors => errors.find(e => e !== null) || null),
          tap(() => this.pending$.next(false)),
          catchError(() => {
            this.pending$.next(false)
            return of('验证失败')
          })
        )
      }),
      shareReplay(1)
    )
    
    this.valid$ = combineLatest([this.error$, this.pending$]).pipe(
      map(([error, pending]) => error === null && !pending)
    )
  }
}

// 异步验证器
const checkUsernameExists = (value) => 
  fetchApi(`/api/check-username?name=${value}`).pipe(
    map(exists => exists ? '用户名已存在' : null),
    catchError(() => of(null))
  )

// 使用
const usernameControl = new AsyncFormControl(
  '',
  [required, minLength(3)],
  [checkUsernameExists]
)

// 显示 pending 状态
usernameControl.pending$.subscribe(pending => {
  if (pending) {
    showSpinner()
  } else {
    hideSpinner()
  }
})
```

## FormGroup

### 表单组

```javascript
class FormGroup {
  constructor(controls) {
    this.controls = controls
    
    // 值
    this.value$ = combineLatest(
      Object.entries(controls).reduce((acc, [key, control]) => {
        acc[key] = control.value$
        return acc
      }, {})
    ).pipe(
      map(values => {
        const result = {}
        Object.keys(controls).forEach((key, i) => {
          result[key] = Object.values(values)[i]
        })
        return result
      })
    )
    
    // 错误
    this.errors$ = combineLatest(
      Object.entries(controls).map(([key, control]) =>
        control.error$.pipe(map(error => [key, error]))
      )
    ).pipe(
      map(entries => {
        const errors = {}
        entries.forEach(([key, error]) => {
          if (error) errors[key] = error
        })
        return Object.keys(errors).length > 0 ? errors : null
      })
    )
    
    // 有效性
    this.valid$ = combineLatest(
      Object.values(controls).map(c => c.valid$)
    ).pipe(
      map(valids => valids.every(v => v))
    )
    
    // pending 状态
    this.pending$ = combineLatest(
      Object.values(controls).map(c => c.pending$ || of(false))
    ).pipe(
      map(pendings => pendings.some(p => p))
    )
  }
  
  get(name) {
    return this.controls[name]
  }
  
  getValue() {
    const result = {}
    Object.entries(this.controls).forEach(([key, control]) => {
      result[key] = control.getValue()
    })
    return result
  }
  
  setValue(values) {
    Object.entries(values).forEach(([key, value]) => {
      if (this.controls[key]) {
        this.controls[key].setValue(value)
      }
    })
  }
  
  reset() {
    Object.values(this.controls).forEach(c => c.reset())
  }
  
  markAllAsTouched() {
    Object.values(this.controls).forEach(c => c.markAsTouched())
  }
}

// 使用
const form = new FormGroup({
  username: new AsyncFormControl('', [required, minLength(3)], [checkUsernameExists]),
  email: new FormControl('', [required, email]),
  password: new FormControl('', [required, minLength(8)])
})

form.valid$.subscribe(valid => {
  submitBtn.disabled = !valid
})

form.errors$.subscribe(errors => {
  if (errors) {
    Object.entries(errors).forEach(([field, error]) => {
      showFieldError(field, error)
    })
  }
})
```

## 联动验证

### 密码确认

```javascript
const passwordMatch = (passwordField) => (value) => {
  const password = passwordField.getValue()
  return value === password ? null : '两次密码不一致'
}

// 创建控件
const password = new FormControl('', [required, minLength(8)])
const confirmPassword = new FormControl('', [
  required,
  passwordMatch(password)
])

// 密码变化时重新验证确认密码
password.value$.pipe(
  skip(1)
).subscribe(() => {
  confirmPassword.setValue(confirmPassword.getValue())
})
```

### 条件验证

```javascript
class ConditionalFormControl extends FormControl {
  constructor(initialValue, validatorsFn) {
    super(initialValue, [])
    this.validatorsFn = validatorsFn
    this.condition$ = new BehaviorSubject(null)
    
    this.error$ = combineLatest([
      this.value$.pipe(debounceTime(300)),
      this.condition$
    ]).pipe(
      map(([value, condition]) => {
        const validators = this.validatorsFn(condition)
        for (const validator of validators) {
          const error = validator(value)
          if (error) return error
        }
        return null
      }),
      shareReplay(1)
    )
  }
  
  setCondition(condition) {
    this.condition$.next(condition)
  }
}

// 使用：根据用户类型决定验证规则
const companyName = new ConditionalFormControl('', (userType) => {
  if (userType === 'business') {
    return [required, minLength(2)]
  }
  return []  // 个人用户不需要填写公司名
})

// 用户类型变化时
userTypeControl.value$.subscribe(type => {
  companyName.setCondition(type)
})
```

## 完整表单示例

```javascript
// 注册表单
class RegistrationForm {
  constructor() {
    this.form = new FormGroup({
      username: new AsyncFormControl(
        '',
        [required, minLength(3), maxLength(20)],
        [this.checkUsername.bind(this)]
      ),
      email: new AsyncFormControl(
        '',
        [required, email],
        [this.checkEmail.bind(this)]
      ),
      password: new FormControl('', [
        required,
        minLength(8),
        this.passwordStrength
      ]),
      confirmPassword: new FormControl('', [required]),
      agreeTerms: new FormControl(false, [
        (value) => value ? null : '请同意服务条款'
      ])
    })
    
    // 密码确认验证
    this.setupPasswordMatch()
    
    // 密码强度
    this.passwordStrength$ = this.form.get('password').value$.pipe(
      map(this.calculateStrength),
      shareReplay(1)
    )
  }
  
  checkUsername(value) {
    return fetchApi(`/api/check-username?name=${value}`).pipe(
      map(res => res.exists ? '用户名已存在' : null),
      catchError(() => of(null))
    )
  }
  
  checkEmail(value) {
    return fetchApi(`/api/check-email?email=${value}`).pipe(
      map(res => res.exists ? '邮箱已注册' : null),
      catchError(() => of(null))
    )
  }
  
  passwordStrength(value) {
    if (!/[A-Z]/.test(value)) return '需要包含大写字母'
    if (!/[a-z]/.test(value)) return '需要包含小写字母'
    if (!/[0-9]/.test(value)) return '需要包含数字'
    return null
  }
  
  calculateStrength(password) {
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    
    if (score < 2) return 'weak'
    if (score < 4) return 'medium'
    return 'strong'
  }
  
  setupPasswordMatch() {
    const password = this.form.get('password')
    const confirm = this.form.get('confirmPassword')
    
    // 添加匹配验证
    const originalValidate = confirm.validate.bind(confirm)
    confirm.validate = (value) => {
      const baseError = originalValidate(value)
      if (baseError) return baseError
      
      return value === password.getValue() ? null : '两次密码不一致'
    }
    
    // 密码变化时重新验证
    password.value$.pipe(skip(1)).subscribe(() => {
      confirm.setValue(confirm.getValue())
    })
  }
  
  submit() {
    return this.form.valid$.pipe(
      take(1),
      filter(valid => valid),
      switchMap(() => {
        const values = this.form.getValue()
        return submitRegistration(values)
      })
    )
  }
  
  bindToDOM() {
    // 绑定各个控件
    this.form.get('username').bindTo(document.getElementById('username'))
    this.form.get('email').bindTo(document.getElementById('email'))
    this.form.get('password').bindTo(document.getElementById('password'))
    this.form.get('confirmPassword').bindTo(document.getElementById('confirm-password'))
    
    // 复选框特殊处理
    const checkbox = document.getElementById('agree-terms')
    fromEvent(checkbox, 'change').pipe(
      map(e => e.target.checked)
    ).subscribe(checked => {
      this.form.get('agreeTerms').setValue(checked)
    })
    
    // 提交按钮
    this.form.valid$.subscribe(valid => {
      document.getElementById('submit').disabled = !valid
    })
    
    // 错误显示
    Object.keys(this.form.controls).forEach(name => {
      const control = this.form.get(name)
      
      combineLatest([control.error$, control.touched$]).subscribe(
        ([error, touched]) => {
          const errorEl = document.getElementById(`${name}-error`)
          if (error && touched) {
            errorEl.textContent = error
            errorEl.style.display = 'block'
          } else {
            errorEl.style.display = 'none'
          }
        }
      )
    })
    
    // 密码强度指示器
    this.passwordStrength$.subscribe(strength => {
      const indicator = document.getElementById('password-strength')
      indicator.className = `strength-${strength}`
    })
  }
}

// 使用
const registrationForm = new RegistrationForm()
registrationForm.bindToDOM()

// 提交
document.getElementById('form').addEventListener('submit', (e) => {
  e.preventDefault()
  registrationForm.form.markAllAsTouched()
  
  registrationForm.submit().subscribe({
    next: () => {
      alert('注册成功！')
    },
    error: (err) => {
      alert('注册失败：' + err.message)
    }
  })
})
```

## TypeScript 类型

```typescript
interface Validator {
  (value: any): string | null
}

interface AsyncValidator {
  (value: any): Observable<string | null>
}

interface FormControlOptions {
  validators?: Validator[]
  asyncValidators?: AsyncValidator[]
}

interface FormGroupControls {
  [key: string]: FormControl
}

class FormControl {
  value$: BehaviorSubject<any>
  error$: Observable<string | null>
  valid$: Observable<boolean>
  touched$: BehaviorSubject<boolean>
  pending$: BehaviorSubject<boolean>
  
  constructor(initialValue?: any, options?: FormControlOptions)
  
  setValue(value: any): void
  getValue(): any
  markAsTouched(): void
  reset(value?: any): void
  bindTo(element: HTMLInputElement): () => void
}

class FormGroup {
  controls: FormGroupControls
  value$: Observable<Record<string, any>>
  errors$: Observable<Record<string, string> | null>
  valid$: Observable<boolean>
  pending$: Observable<boolean>
  
  constructor(controls: FormGroupControls)
  
  get(name: string): FormControl
  getValue(): Record<string, any>
  setValue(values: Record<string, any>): void
  reset(): void
  markAllAsTouched(): void
}
```

## 本章小结

- 验证器是返回错误信息的纯函数
- FormControl 封装单个输入控件的状态
- 异步验证使用 `switchMap` 取消过期请求
- FormGroup 组合多个控件
- 联动验证通过订阅其他控件实现
- 响应式表单天然支持实时验证

下一章进入工程化部分。
