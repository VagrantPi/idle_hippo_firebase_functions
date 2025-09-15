## Stage B1｜雲端函式介面設計（規格，給 windsurf）

**目標**：定義「**購買驗證 API**」與「健康檢查 API」規格（尚不實作 Play 驗簽，可先提供 Mock 模式）。

**檔案/輸出**

* 修改/新增 `functions/src/index.ts`
* 新增 `functions/src/config.ts`
* （若為 TS）調整 `tsconfig.json` 允許 ES2020

**API 規格**

1. `POST /verifyPurchase`（主要驗證端點）

* **Request（JSON）**：

  ```json
  {
    "packageName": "com.example.idleHippo",
    "productId": "any.string.id",
    "purchaseToken": "opaque-token-from-android",
    "debug": false
  }
  ```

  * `packageName`：Android App 的 package name
  * `productId`：商品 ID（本階段可不校驗格式）
  * `purchaseToken`：Android 端 `PurchaseDetails` 取得的 token
  * `debug`（可選）：true 時啟用 debug log

* **Response（JSON）**：

  ```json
  {
    "ok": true,
    "purchaseState": 0,
    "consumptionState": 0,
    "orderId": "GPA.XXXX-XXXX-XXXX-XXXXX",
    "purchaseTimeMillis": "1736857600000",
    "reason": null
  }
  ```

  * `ok`：是否視為有效購買（Mock 模式可固定 true）
  * `purchaseState`：0=purchased, 1=canceled, 2=pending（Mock 時固定 0）
  * `consumptionState`：0=未消耗、1=已消耗（Mock 時可固定 0）
  * `orderId`：可為 null（Mock 時可填 `MOCK.ORDER`）
  * `reason`：失敗時回傳錯因字串

* **HTTP 狀態碼**：

  * 200：驗證流程執行完成（無論 `ok` true/false 都給 200，由 `ok` 表示結果）
  * 400：缺少必填欄位
  * 500：伺服器錯誤

2. `GET /healthz`（健康檢查）

* 回 200 與 `{ status: "ok", mock: true|false }`

**設定/環境變數**

* `USE_PLAY_API`（"true"/"false"，預設 `"false"`，表示先以 **Mock 驗證**工作）
* `PLAY_API_SA`（Service Account JSON；審核通過與 API 打通後才會設定）

**程式邏輯**

* 若 `USE_PLAY_API === "false"` → 直接回傳 Mock 結果（`ok: true`）。
* 若 `USE_PLAY_API === "true"` → 走 `googleapis` 呼叫 `androidpublisher.purchases.products.get()` 驗證（Stage B4 會補上）。

**安全**

* 先用簡單方案：支援一個可選的 **簡易簽章/金鑰**（header：`X-API-KEY`），若設了 `API_KEY` 環境變數就必須比對正確才受理。

**CORS**

* 允許 `POST` 來自 App（原生 App 不需要 CORS，但先允許 `*` 以便調試；上線可收斂）。

**測試（本地）**

* `firebase emulators:start --only functions`
* `curl -X POST http://localhost:5001/<project>/us-central1/verifyPurchase -H 'Content-Type: application/json' -d '{"packageName":"com.example.idleHippo","productId":"foo","purchaseToken":"bar"}'`

