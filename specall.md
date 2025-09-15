讚，我把「B. Firebase 專案 + Functions（用來驗證訂單）」細拆成**可逐步執行**的小階段。
規則如下：

* **需要你手動操作**的步驟 → 我會給「清單式步驟」與命令。
* **需要程式碼**的部分 → 我給 **給 AI（windsurf）看的規格文件**，裡面寫清楚要產生哪些檔案、輸出結構、API 介面、環境變數與測試方式。
* 因你目前 **SKU 還不能在 Play Console 設定**，我們會先做 **可運作但不依賴 SKU 的「Mock 驗證模式」**；等審核通過，再切實際 Google Play 驗證。

---

# B. Firebase Functions 驗證後端 — 分階段計畫

## Stage B0｜準備環境（手動）

**目標**：有一個新的 Firebase 專案，並在本機可以部署 Functions。

**步驟**

1. 安裝工具（如未安裝）

   ```bash
   npm i -g firebase-tools
   firebase login
   ```
2. 建立或選擇 Firebase 專案

   ```bash
   firebase projects:create <your-firebase-project-id>
   # 或者選用既有專案：firebase use --add
   ```
3. 初始化 Functions（Node 18+）

   ```bash
   firebase init functions
   # 選 TypeScript 或 JavaScript 皆可（以下規格以 TypeScript 為例）
   # 選用 ESLint: yes / 詢問是否用 npm 安裝依賴: yes
   ```

**驗收**

* 專案根目錄出現 `functions/` 目錄，內含 `package.json`、`tsconfig.json`、`src/index.ts`。

---

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

---

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

---

## Stage B3｜部署到雲端（手動）

**目標**：把 Mock 驗證上線到 Firebase，供 App 串接調試。

**步驟**

1. 設定環境變數（先不上 Play API 金鑰）

   ```bash
   firebase functions:config:set env.use_play_api="false"
   # 或改用 secrets（推薦用 secrets 管敏感字串）：
   # 這階段只需：USE_PLAY_API = false
   ```

   > 若你偏好用「Secrets」：
   > `firebase functions:secrets:set USE_PLAY_API` → 輸入 `false`

2. 部署

   ```bash
   firebase deploy --only functions
   ```

3. 取得雲端 URL（部署輸出會印出）：

   * `https://us-central1-<project-id>.cloudfunctions.net/verifyPurchase`
   * `https://us-central1-<project-id>.cloudfunctions.net/healthz`

**驗收**

* `curl` 打雲端 `/healthz` 與 `/verifyPurchase`，回傳正常。

---

## Stage B4｜接上 Google Play 驗簽（待主控台審核後進行，含手動 + 規格）

**目標**：把 Mock 換成真正呼叫 Google Play Android Publisher API 的版本。

### B4-1 手動：開通 API 與服務帳戶

1. **Play Console → API access**

   * Link 到對應的 Google Cloud 專案（可用 Firebase 的那個）。
   * **Create new service account** → 進入 GCP IAM，建立服務帳戶並下載 **JSON 金鑰**。
   * 回 Play Console **Grant access** 給該服務帳戶，權限至少：

     * `View app information`
     * `Manage orders`（必須，才能查 purchases.products.get）
2. **GCP**：在同專案啟用 **Google Play Android Developer API**。
3. **把 JSON 金鑰上傳為 Secret**

   ```bash
   firebase functions:secrets:set PLAY_API_SA --data-file ./service-account.json
   ```
4. **切換到 Play 驗證模式**

   ```bash
   firebase functions:secrets:set USE_PLAY_API
   # 輸入: true
   ```

### B4-2 規格（給 windsurf）：實作 `playVerify()`

**檔案/輸出**

* 更新 `functions/src/index.ts`，在 `verifyPurchase` 中呼叫 `playVerify()`
* 新增/更新 `functions/src/play.ts`，輸出 `playVerify(input): Promise<VerifyResult>`

**依賴**

* 安裝 `googleapis`

  ```
  cd functions
  npm i googleapis
  ```

**介面**

```ts
// input
type VerifyInput = {
  packageName: string;
  productId: string;
  purchaseToken: string;
  debug?: boolean;
};

// output
type VerifyResult = {
  ok: boolean;
  purchaseState?: number;     // 0 purchased | 1 canceled | 2 pending
  consumptionState?: number;  // 0 not consumed | 1 consumed
  orderId?: string | null;
  purchaseTimeMillis?: string | null;
  reason?: string | null;
};
```

**邏輯**

1. 從 `process.env.PLAY_API_SA` 讀取 JSON（由 Secrets 注入）
2. 用 `google.auth.JWT` 建立客戶端，scope：`https://www.googleapis.com/auth/androidpublisher`
3. 呼叫 `androidpublisher.purchases.products.get({ packageName, productId, token })`
4. 映射回 `VerifyResult`（購買成立條件：`purchaseState === 0`）
5. 捕捉錯誤（包含 404/410 等），回 `ok:false` 與 `reason`

**錯誤處理**

* 若 `PLAY_API_SA` 缺失 → 回 500 與 `reason:"missing service account"`
* 若 API 回 404/invalid token → 200 + `{ok:false, reason:"invalid token"}`
* 其他 → 500 + `{ok:false, reason:"internal"}`

**測試**

* 部署到雲端後，用真的 `purchaseToken` 測（在你有 SKU 後）
* 用假的 token → 應回 `{ok:false}`

---

## Stage B5｜安全與節流（規格，給 windsurf，可選）

**目標**：增加簡單的防濫用機制。

**內容**

* 在 `functions/src/http.ts` 增加：

  * `validateApiKey(req)`：若設定 `API_KEY` secret，必須通過
  * `rateLimit`（簡易 in-memory：同 IP 每分鐘最多 N 次；在 Functions 的無狀態環境可換用 Google Cloud Armor 或 ReCAPTCHA/App Check 之後再補）
* 在 `verifyPurchase` 前置：

  * 若 `API_KEY` 存在 → 驗 header
  * 記錄 `req.ip` / `user-agent`（僅日誌，不存個資）

**環境變數/Secrets**

* `API_KEY`（可選）
* `RATE_LIMIT_PER_MIN`（可選，預設 60）

---

## Stage B6｜客戶端串接（手動檢查）

**目標**：你的 Flutter `IapPurchaseService` 可以對接雲端驗證（目前仍 Mock 模式 ok）。

**要點**

* 將 `verifyEndpoint` 設為雲端 `verifyPurchase` URL
* `packageName` 設為你的 Android 包名
* 成功購入時，取出 `purchaseToken` 丟給該 API
* 看到回傳 `{ok:true}` 才發放權益，並完成/消耗交易

---

## Stage B7｜切換到 Play 驗證（待審核通過後）

**手動**

* `firebase functions:secrets:set USE_PLAY_API` → 輸入 `true`
* 確認 `PLAY_API_SA` Secret 已存在
* `firebase deploy --only functions`

**驗收**

* 真機安裝測試版 → 真內購 → 你的 Functions 回傳 `ok:true` 且帶有 `orderId`
* 假 token 測試 → `ok:false`

---

# 你可以直接貼給 windsurf 的任務標題（範例）

> 任務 1：建立 Functions 基礎結構（B1, B2）
> **說明**：在 `functions` 內新增 `src/config.ts`, `src/http.ts`，修改 `src/index.ts`，實作 `healthz` 與 `verifyPurchase`（目前只支援 Mock 模式，讀 `USE_PLAY_API`＝"false" 即直接回 `{ok:true}`）。加入 CORS 與必填欄位檢查、可選 `API_KEY` 檢查。提供 `curl` 測試指令於程式文件註解中。

> 任務 2：部署設定文件
> **說明**：在 README 節點新增部署步驟：`firebase functions:secrets:set USE_PLAY_API`（值 `false`）、`firebase deploy --only functions`、如何取得雲端 URL、如何本地 emulator 啟動測試。

> 任務 3：接上 Google Play API（B4-2）
> **說明**：新增 `src/play.ts` 實作 `playVerify()`，安裝 `googleapis`，讀取 Secret `PLAY_API_SA`（JSON），以 `google.auth.JWT` 建立 `androidpublisher`，呼叫 `purchases.products.get()`，映射回規格的 `VerifyResult`。在 `index.ts` 內 `USE_PLAY_API === "true"` 時走 `playVerify`。

> 任務 4（可選）：安全與節流
> **說明**：在 `http.ts` 加入 `validateApiKey()` 與簡易 `rateLimit()`，並在 `verifyPurchase` 套用。

---

這樣拆完，你現在可以直接先做 **B0 → B1 → B2 → B3**（Mock 驗證已可串 App 流程），
等 Play Console 能用再做 **B4** 切換到真驗簽。需要我把「windsurf 任務 1」的更精細檔案骨架（每支檔案的函式簽章與範例註解）也列出來嗎？
