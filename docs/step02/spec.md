## Stage B2｜Functions 專案設定與基本中介層（規格，給 windsurf）

**目標**：建立統一的環境變數讀取、CORS、輸入檢查、日誌。

**檔案/輸出**

* `functions/src/config.ts`

  * 匯出 `getConfig()`：讀取 `process.env`
  * 預設值：`USE_PLAY_API = "false"`、`API_KEY`（可為空）、`ALLOWED_ORIGINS`（可為 `*`）
* `functions/src/http.ts`

  * `withCors(handler)`：封裝 CORS
  * `requireJson(req)`：檢查 `content-type`
  * `requireFields(req, ["packageName","productId","purchaseToken"])`
  * `requireApiKeyIfSet(req)`：若設定了 `API_KEY`，比對 header
* `functions/src/index.ts`

  * 匯出兩個 https functions：`verifyPurchase`、`healthz`
  * `verifyPurchase`：讀取 `USE_PLAY_API`，分派到 `mockVerify()` 或 `playVerify()`（playVerify 先留空，回 501 Not Implemented）

**驗收**

* 本地啟動 emulator 後，`/healthz` 回 200 與 `{status:"ok", mock:true}`
* `/verifyPurchase` 在 Mock 模式下回 `{ok:true, ...}`

