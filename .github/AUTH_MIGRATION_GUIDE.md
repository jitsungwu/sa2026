# 认证系统迁移：从 localStorage 到 Firebase Auth + Context

**迁移日期**：2026-04-23  
**状态**：✅ 完成

---

## 📋 迁移概要

### 问题
- **旧系统**：使用 localStorage 存储登入用户信息
- **限制**：所有浏览器标签页共享相同的 localStorage，无法模拟多人登入
- **E2E 测试困难**：无法同时打开多个学生页面进行测试

### 解决方案
- **新系统**：使用 Firebase Authentication + Context API
- **优点**：每个浏览器上下文（页面实例）维护独立的认证状态，支持真正的多人登入模拟

---

## 🏗️ 架构变更

### 旧架构
```
Browser Tab 1          Browser Tab 2
    ↓                      ↓
localStorage["studentAuth"]  ← 同步、共享
    ↓
Student Page          Student Page
```

### 新架构
```
Browser Tab 1          Browser Tab 2
    ↓                      ↓
Firebase Auth (独立)    Firebase Auth (独立)
    ↓                      ↓
StudentAuthContext      StudentAuthContext
    ↓                      ↓
Student Page 1          Student Page 2
```

---

## 📁 新增文件

### 1. `src/contexts/StudentAuthContext.jsx` ✅ 新建
**作用**：核心认证 Context，管理学生登入状态

**功能**：
- `StudentAuthProvider`：提供 Context，监听 Firebase Auth 状态变化
- `useStudentAuth()`：Hook，用于在组件中获取认证信息
- 导出字段：
  - `studentInfo`：学生信息（account, name, groupId, classId 等）
  - `firebaseUser`：Firebase 用户对象
  - `isAuthenticated`：是否已登入
  - `updateStudentInfo(newInfo)`：更新学生信息
  - `logout()`：登出函数

**核心特点**：
```javascript
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      // 用户已登入，获取学生信息
      setStudentInfo(...)
    } else {
      // 用户已登出
      setStudentInfo(null)
    }
  })
  return unsubscribe
}, [])
```

### 2. `src/app/providers.jsx` ✅ 新建
**作用**：客户端 Provider 包装器，解决 Server Component 与 Client Component 混用

**内容**：
```javascript
"use client"
export function Providers({ children }) {
  return <StudentAuthProvider>{children}</StudentAuthProvider>
}
```

---

## 🔄 修改的文件

### 1. `src/app/layout.jsx` ✅ 修改
**变更**：
- 导入 `Providers` 组件
- 用 `<Providers>` 包装内容替代直接使用 `StudentAuthProvider`

**原因**：Layout 是 Server Component，不能直接使用 Client Provider

### 2. `src/components/StudentSignInForm.jsx` ✅ 修改
**变更**：
- 导入 `useStudentAuth` 而不是 `localStorage`
- 使用 `updateStudentInfo()` 替代 `localStorage.setItem()`
- 移除所有 localStorage 调用

**代码变更**：
```javascript
// 旧
localStorage.setItem('studentAuth', JSON.stringify({...}))

// 新
updateStudentInfo({
  account: studentInfo.account,
  name: studentInfo.name,
  // ...
})
```

### 3. `src/components/RaiseHandButton.jsx` ✅ 修改
**变更**：
- 导入 `useStudentAuth`
- 从 Context 获取 `studentInfo` 而不是 localStorage
- 移除 localStorage 读取逻辑
- `claimScorer()` 添加 1 秒延迟确保 Firestore 同步

```javascript
// 旧
const authStr = localStorage.getItem('studentAuth')
const auth = JSON.parse(authStr)
const studentAccount = auth.account

// 新
const { studentInfo } = useStudentAuth()
const studentAccount = studentInfo?.account
```

### 4. `src/components/PresentingGroupScorer.jsx` ✅ 修改
**变更**：
- 导入 `useStudentAuth`
- 从 Context 获取 `studentInfo`
- 移除 localStorage 读取

### 5. `src/app/class/[classId]/seat-selection/page.jsx` ✅ 修改
**变更**：
- 导入 `useStudentAuth` 和 `useRouter`
- 使用 `studentInfo` 而非 `student` state
- 使用 `updateStudentInfo()` 替代 `localStorage.setItem()`
- 登出按钮调用 `logout()` 然后 `router.push('/signin')`

### 6. `src/app/class/[classId]/dashboard/page.jsx` ✅ 修改
**变更**：
- 导入 `useStudentAuth` 和 `useRouter`
- 使用 `studentInfo` 获取学生信息
- 使用 `updateStudentInfo()` 更新座位状态
- 移除所有 localStorage 调用
- 登出使用 `logout()` + `router.push()`

---

## 🚀 E2E 测试优势

### 多人登入支持
现在可以在同一测试中打开多个浏览器上下文，每个可以独立登入：

```javascript
test('multi-student interaction', async ({ browser }) => {
  const context1 = await browser.newContext()
  const page1 = await context1.newPage()
  
  // 学生1登入
  await page1.fill('input[name=account]', '413000001')
  await page1.fill('input[name=password]', '123456')
  await page1.click('button:has-text("登入")')
  
  const context2 = await browser.newContext()
  const page2 = await context2.newPage()
  
  // 学生2同时登入（独立认证）
  await page2.fill('input[name=account]', '413000002')
  await page2.fill('input[name=password]', '123456')
  await page2.click('button:has-text("登入")')
  
  // 现在可以测试两个学生的交互
})
```

### 独立认证状态
- 每个 Context 有自己的 Firebase Auth Session
- 学生1 的认证状态不影响学生2
- 可以模拟"班级内多组学生同时操作"的真实场景

---

## 📊 核心设计模式

### 1. Auth State 流程
```
Firebase onAuthStateChanged
        ↓
    authUser 改变
        ↓
  查询 Firestore 获取学生信息
        ↓
  Context 更新 (studentInfo)
        ↓
  所有订阅组件重新渲染
```

### 2. 登入流程
```
用户输入账密
    ↓
调用 signInWithEmail()
    ↓
Firebase 登入成功
    ↓
onAuthStateChanged 触发
    ↓
调用 API 获取学生信息
    ↓
updateStudentInfo()
    ↓
redirect 到座位选择/仪表板
```

### 3. 登出流程
```
用户点击登出
    ↓
调用 logout()
    ↓
auth.signOut()
    ↓
onAuthStateChanged 触发
    ↓
studentInfo 设为 null
    ↓
组件检测 !studentInfo，显示登入页
```

---

## ✨ 使用 Hook 的组件

所有这些组件现在都使用 `useStudentAuth()`：

| 组件 | 用途 |
|------|------|
| `StudentSignInForm` | 登入表单 |
| `RaiseHandButton` | 学生举手 |
| `PresentingGroupScorer` | 报告组计分 |
| `seat-selection/page` | 座位选择页 |
| `dashboard/page` | 学生仪表板 |

---

## 🔒 安全改进

### 旧系统风险
- localStorage 可被浏览器 DevTools 直接查看修改
- 恶意用户可手动修改 `groupId`、`account` 等字段
- 没有真正的认证验证

### 新系统安全性
- 认证由 Firebase 管理，只有登入的用户才会在 Context 中设值
- `studentInfo` 来自后端 API（`/api/auth/get-student-info`），由服务器验证
- 修改 Context 中的数据后刷新页面会重新从 Firebase 验证

---

## 🧪 测试改进

### E2E 测试现在可以：
✅ 同时打开多个学生页面  
✅ 每个页面独立登入不同学生  
✅ 模拟真实的多人课堂互动  
✅ 测试组间协作功能（报告、计分）  

### 例如：11-presenting-scorer.spec.js 现在可以：
1. 打开报告组学生页面（group 04）
2. 打开其他学生页面（group 01）
3. 让报告组指定评分者
4. 验证其他学生能否举手（受控制）
5. 完全独立的认证状态，无干扰

---

## 🔧 迁移检查清单

- ✅ 创建 StudentAuthContext
- ✅ 创建 Providers 包装器
- ✅ 更新 layout.jsx
- ✅ 更新 StudentSignInForm
- ✅ 更新 RaiseHandButton
- ✅ 更新 PresentingGroupScorer
- ✅ 更新 seat-selection/page
- ✅ 更新 dashboard/page
- ✅ 移除所有 localStorage 调用
- ✅ 更新登出逻辑使用 Firebase signOut

---

## 🚨 注意事项

### 1. Hydration Issues
如果看到 hydration 错误，确保所有使用 Hook 的组件都有 `"use client"` 标记

### 2. Auth 初始化延迟
第一次访问时，Context 的 `loading` 会是 `true`，直到 Firebase 确认认证状态

### 3. API 依赖
`/api/auth/get-student-info` 必须存在并正确返回学生信息

### 4. 浏览器隐私模式
某些浏览器隐私模式可能限制 IndexedDB（Firebase 使用的存储）

---

## 🎯 后续优化建议

1. **添加 Auth Persistence Options**
   - 控制登入信息如何持久化（localStorage vs sessionStorage）
   
2. **Error Handling**
   - 添加更详细的认证错误处理（网络错误、过期等）
   
3. **Loading States**
   - 在 `loading` 时显示加载指示器
   
4. **Auto Logout**
   - 长时间无活动自动登出

5. **Refresh Token 处理**
   - Firebase 自动处理，无需额外配置

---

✅ **迁移完成！现在可以支持真正的多人 E2E 测试。**
