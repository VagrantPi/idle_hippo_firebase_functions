## Stage B2-4｜ 在 `/verifyPurchase` 先做「靜態檢查」

* 在呼叫 Google Play API 之前，先檢查：

  * `packageName === ALLOWED_PACKAGE`
  * `productId ∈ SKU_MAP`（若不在白名單 → 直接回 `{ok:false, reason:'sku_not_allowed'}`）
* Google Play API 驗證通過後再回傳 `{ ok: true }`。

#### 給 windsurf 的規格（修改 `verifyPurchase` 流程）

```
在 functions/src/index.ts 的 verifyPurchase 中：
1) 解析 req.body（packageName, productId, purchaseToken）
2) 調用 helper：validateBasic(packageName, productId)
   - 若 packageName 與 ALLOWED_PACKAGE 不同：回 200, {ok:false, reason:'package_not_allowed'}
   - 若 productId 不在 SKU_MAP：回 200, {ok:false, reason:'sku_not_allowed'}
3) 若 USE_PLAY_API=false：走 mock，直接回 200, {ok:true, purchaseState:0, ...}
4) 若 USE_PLAY_API=true：呼叫 playVerify()，並把結果包回標準型別
```

---
## 實作重點（本倉庫對應）

- 檔案：`functions/src/index.ts`
  - 新增 `validateBasic(packageName, productId)` helper。
  - 若靜態檢查未通過，統一回 `200` 並帶 `{ ok:false, reason:'package_not_allowed' | 'sku_not_allowed' }`。
  - 皆通過時才進入 Mock 或（未來）Play API 驗證。
- 白名單來源：`functions/src/skuConfig.ts` 中 `ALLOWED_PACKAGES` 與 `SKU_MAP`。

## 測試方式（本地）

- 安裝與建置：
  - `npm i`（根目錄會為 functions workspace 安裝）
  - `npm test`（會 `tsc` 後以 Node 內建測試跑 `functions/lib/test/**/*.test.js`）

- 單元測試案例（Node `node:test`）：
  - 合法請求（Mock 模式）：
    - `packageName: com.example.idleHippo`
    - `productId: card_click_perm`（或 `SKU_MAP` 內任一鍵）
    - 期望：`200` 與 `{ ok:true, purchaseState:0, ... }`
  - 靜態檢查失敗（仍回 200）：
    - package 不允許 → `200` 與 `{ ok:false, reason:'package_not_allowed' }`
    - SKU 不允許 → `200` 與 `{ ok:false, reason:'sku_not_allowed' }`
  - 其他檢查：
    - 缺少欄位 → `400`（`packageName/productId/purchaseToken` 其一缺失）
    - CORS 預檢（OPTIONS）→ `204` 並含對應 CORS 標頭
    - 設定了 `API_KEY` 但未帶/錯誤 → `401`

- cURL（Emulator）範例：
  - 成功：
    - `curl -X POST http://localhost:5001/<project>/us-central1/verifyPurchase \
      -H 'Content-Type: application/json' \
      -d '{"packageName":"com.example.idleHippo","productId":"card_click_perm","purchaseToken":"token"}'`
  - 失敗（靜態檢查）：
    - package 不允許：將 `packageName` 改為 `com.other.app` → `{ok:false, reason:'package_not_allowed'}`
    - SKU 不允許：將 `productId` 改為 `unknown_sku` → `{ok:false, reason:'sku_not_allowed'}`
