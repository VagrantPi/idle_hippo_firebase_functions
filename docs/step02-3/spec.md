## Stage B2-3｜在 Functions 增加「SKU 白名單 + 型別表」

* 在 `functions/src/skuConfig.ts`（寫死配置：

  * **允許的 packageName**（避免跨包名濫用）
  * **允許的 productId 清單（白名單）**
  * **商品型別**：`consumable` / `nonConsumable`

## 給 windsurf 的規格（新增檔案）

```
文件：functions/src/skuConfig.ts
輸出：
  export type ProductType = 'consumable' | 'nonConsumable';

  export const ALLOWED_PACKAGE: string = 'kais.idle.hippo'; // 預設正式包名； TODO: 這邊幫我使用環境變數

  export const SKU_MAP: Record<string, ProductType> = {
    // 非消耗（永久）
    'card_click_perm': 'nonConsumable',
    'card_idle_perm': 'nonConsumable',
    'card_offline_perm_6h': 'nonConsumable',
    'card_cap_perm': 'nonConsumable',
    'ticket_pet_10plus1': 'nonConsumable',

    // 消耗（一次性）
    'card_click_2x_30m': 'consumable',
    'card_idle_2x_1h': 'consumable',
    'card_offline_once_6h': 'consumable'
    'ticket_pet_single': 'consumable',
    'pack_daily': 'consumable',
    'pack_monthly': 'consumable',
    'pack_7n_starter': 'consumable',
    'pack_30n_starter': 'consumable',
  };
```

## 驗證說明（Whitelist 檢查與回應）

- 驗證時機：在 `verifyPurchase` 進入 Mock/Play 流程前先檢查下列條件。
- 檢查項目：
  - packageName：必須等於 `ALLOWED_PACKAGE`；否則回 400。
  - productId：必須存在於 `SKU_MAP`（白名單）；否則回 400。
- 回應行為：
  - packageName 不在白名單 → `400 { ok:false, reason:"invalid packageName" }`
  - productId 不在白名單 → `400 { ok:false, reason:"invalid productId" }`
  - 皆通過時才進入 Mock 或（未來的）Play API 驗證邏輯。
- Mock 模式（`USE_PLAY_API=false`）下：
  - 通過白名單後回 `200`，payload 仍為 Mock 既定格式（`ok:true`, `purchaseState:0`, `orderId:"MOCK.ORDER"` 等）。

### 測試與驗收

- 單元測試（Node `node:test`）：
  - 合法 packageName + 合法 productId → 200 + Mock 成功。
  - packageName 不合法 → 400 + `reason:"invalid packageName"`。
  - productId 不在 `SKU_MAP` → 400 + `reason:"invalid productId"`。
- cURL 範例（本地 Emulator）：
  - 成功案例：
    - `packageName: com.example.idleHippo`
    - `productId: card_click_perm`（或 `SKU_MAP` 中任一鍵）
  - 失敗案例：
    - `packageName: com.other.app` → 400 invalid packageName
    - `productId: unknown_sku` → 400 invalid productId

### 維護說明

- 新增/調整商品時，僅需更新 `functions/src/skuConfig.ts`：
  - 需要允許新 App 套件時，修改 `ALLOWED_PACKAGE`。
  - 新增商品時，加到 `SKU_MAP` 並標注 `consumable` 或 `nonConsumable`。
