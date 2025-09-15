# AGENTS 規則（B0–B7｜雲端函式驗證後端）

本文件提供給 Codex 在本倉庫作業的完整規範，覆蓋 `specall.md` 之 B0–B7 內容。以 TypeScript（ES2020）實作 Firebase Functions 之「購買驗證 API」與「健康檢查 API」，由 Mock 模式起步，後續再接 Google Play 驗簽。

## 重要路徑
- `functions/src/index.ts`：匯出 `verifyPurchase`、`healthz`。
- `functions/src/config.ts`：讀取設定（`USE_PLAY_API`, `API_KEY`, 之後可擴充 `ALLOWED_ORIGINS`）。
- `functions/src/http.ts`（B2 引入）：CORS 與輸入檢查、API Key 驗證等共用工具。
- `functions/src/play.ts`（B4 引入）：Google Play 驗證邏輯。
- `functions/tsconfig.json`：`target: ES2020`、`outDir: lib`、嚴格模式。

## Stage B1｜API 介面（Mock）
- 端點：
  - `POST /verifyPurchase`：Request 需含 `packageName`, `productId`, `purchaseToken`；可選 `debug`。
  - `GET /healthz`：回 `{status:"ok", mock: true|false}`。
- 共同規則：
  - CORS：`*`、允許 `POST, GET, OPTIONS`、允許 `Content-Type, X-API-KEY`；`OPTIONS` 回 204。
  - API Key（可選）：若 `API_KEY` 有設定，需驗證 `X-API-KEY`。
  - Mock：`USE_PLAY_API=false` 時，`verifyPurchase` 回：
    - `{ ok: true, purchaseState: 0, consumptionState: 0, orderId: "MOCK.ORDER", purchaseTimeMillis: Date.now().toString(), reason: null }`。
  - 錯誤碼：缺欄位回 400；未帶或錯誤 API Key 建議回 401；非 POST 建議回 405；例外回 500。

## Stage B2｜共用中介層
- `functions/src/http.ts` 應提供：
  - `withCors(handler)`：統一加上 CORS 與 OPTIONS 處理。
  - `requireJson(req)`：檢查 `content-type`。
  - `requireFields(req, ["packageName","productId","purchaseToken"])`。
  - `requireApiKeyIfSet(req)`：在設有 `API_KEY` 時比對 `X-API-KEY`。
- `functions/src/index.ts`：
  - `verifyPurchase` 依 `USE_PLAY_API` 分派到 `mockVerify()` 或 `playVerify()`（B4 前者已實作，後者先回 501 或 `ok:false, reason:"PLAY_API_NOT_IMPLEMENTED"`）。

## Stage B3｜部署（手動）
- 以 Secrets 設 `USE_PLAY_API=false`，部署 functions，確認雲端 URL 可用。

## Stage B4｜Google Play 驗簽
- 依賴：安裝 `googleapis`。
- 新增 `functions/src/play.ts`：
  - 從 `PLAY_API_SA`（JSON）建立 `google.auth.JWT`，scope：`androidpublisher`。
  - 呼叫 `androidpublisher.purchases.products.get({ packageName, productId, token })`。
  - 映射為 `VerifyResult`；`purchaseState===0` 視為 `ok:true`。
  - 錯誤處理：缺 `PLAY_API_SA` 回 500+`reason:"missing service account"`；404/invalid token → 200+`{ok:false, reason:"invalid token"}`；其他 500+`reason:"internal"`。

## Stage B5（可選）｜安全與節流
- 在 `http.ts` 增加 `validateApiKey(req)` 與簡易 `rateLimit`（同 IP 每分鐘 N 次；可由 `RATE_LIMIT_PER_MIN` 控制，預設 60）。
- 在 `verifyPurchase` 前置掛上上述檢查。

## 測試與驗證
- 單元測試：使用 Node 內建 `node:test`。涵蓋：
  - Mock 成功；缺欄位 400；API Key 錯誤 401；CORS 預檢 204；healthz 的 `mock` 切換。
- 本地 Emulator：`npm run serve` 後使用 `curl` 測試。

## 提交流程（給 Codex）
- 修改前給一句 preamble；用 `apply_patch` 精準變更；必要時更新腳本與文件。
- 完成後簡述更動、檔案、驗收點；如需用到網路安裝套件，請以 scripts 提供命令並標註目的。

## 驗收清單（滾動）
- B1：
  - `verifyPurchase`、`healthz` 具 CORS 與 API Key 檢查（可選）。
  - Mock 模式回傳規格值；缺欄位 400；非 POST 405。
  - `tsconfig.json` 目標 ES2020。
- B2：
  - `http.ts` 提供共用工具並在 `index.ts` 套用。
- B4：
  - `play.ts` 串 `googleapis` 並以 `PLAY_API_SA` 驗簽；對錯誤狀態映射正確。
- B5（可選）：
  - `validateApiKey`、`rateLimit` 加入與可設定化。

—

若尚未切到 B4，`USE_PLAY_API` 應維持為 `false` 以確保 Mock 流程可用，並於雲端與本地行為一致。
