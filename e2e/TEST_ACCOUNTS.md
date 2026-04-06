# Test Accounts Registry

此文檔紀錄已完成 signup 的測試帳號。未來測試應只使用這些帳號，避免重複註冊或測試數據汙染。

## 帳號來源

主要參考：[`.github/Group_list_2026-04-04(demo).xlsx`](../.github/Group_list_2026-04-04(demo).xlsx)

該 Excel 檔案包含 demo 班級的完整學生清單與組別分配。

## 環境變數使用

在 `.env.local` 中定義：
- `TEST_CLASS_ID`：測試班級 ID（預設：`demo`）
- `TEST_STUDENT_ACCOUNT`：測試學生帳號（預設：`413000001`）
- `TEST_STUDENT_GROUP_ID`：測試學生組別 ID（預設：`1`）

## 已完成 Signup 的帳號清單

| 帳號 | 班級 | 組別 | 狀態 | 備註 |
|------|------|------|------|------|
| 413000001 | demo | 1 | ✅ Active | 主要測試帳號（來自Excel：Group_list_2026-04-04.xlsx） |

## 帳號新增步驟

1. **確認班級與組別**：該帳號必須預先在 Firestore 的 `classes/{classId}/students` 中存在
2. **執行前端 signup 流程**：使用 Firebase Auth 建立帳號，完成 `/api/auth/link-student-to-auth` 連結
3. **驗證登入成功**：確認能用帳號密碼登入
4. **記錄到此表格**：更新此文檔

## 測試使用流程

```bash
# E2E 測試自動使用環境變數中的帳號
npm run test:e2e

# 或指定帳號
TEST_STUDENT_ACCOUNT=999888777 npm run test:e2e
```

## 廢棄帳號

如帳號不再使用，標記為 `❌ Deprecated` 並記錄棄用原因。

---

最後更新：2026-04-06
