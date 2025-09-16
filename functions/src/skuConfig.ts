export type ProductType = "consumable" | "nonConsumable";

export const ALLOWED_PACKAGES: string[] = [
  "com.example.idleHippo",
];

export const SKU_MAP: Record<string, ProductType> = {
  // 非消耗（永久）
  "card_click_perm": "nonConsumable",
  "card_idle_perm": "nonConsumable",
  "card_offline_perm_6h": "nonConsumable",
  "card_cap_perm": "nonConsumable",
  "ticket_pet_10plus1": "nonConsumable",

  // 消耗（一次性）
  "card_click_2x_30m": "consumable",
  "card_idle_2x_1h": "consumable",
  "card_offline_once_6h": "consumable",
  "ticket_pet_single": "consumable",
  "pack_daily": "consumable",
  "pack_monthly": "consumable",
  "pack_7n_starter": "consumable",
  "pack_30n_starter": "consumable",
};

