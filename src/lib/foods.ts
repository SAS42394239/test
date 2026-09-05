/* Local food knowledge base + photo estimation heuristic + Open Food Facts client. */

export interface FoodDef {
  name: string;
  kcal: number; // per 100 g
  p: number;
  c: number;
  f: number;
  serving: number; // typical serving in g
  tag: string;
}

export const FOODS: FoodDef[] = [
  { name: "Rolled oats (dry)", kcal: 379, p: 13, c: 68, f: 7, serving: 50, tag: "Grains" },
  { name: "Granola", kcal: 471, p: 10, c: 64, f: 20, serving: 60, tag: "Grains" },
  { name: "White rice (cooked)", kcal: 130, p: 2.7, c: 28, f: 0.3, serving: 180, tag: "Grains" },
  { name: "Pasta (cooked)", kcal: 158, p: 5.8, c: 31, f: 0.9, serving: 200, tag: "Grains" },
  { name: "Sourdough bread", kcal: 260, p: 9, c: 50, f: 2, serving: 60, tag: "Grains" },
  { name: "Wholemeal tortilla", kcal: 300, p: 8, c: 50, f: 8, serving: 65, tag: "Grains" },
  { name: "Banana", kcal: 89, p: 1.1, c: 23, f: 0.3, serving: 120, tag: "Fruit" },
  { name: "Apple", kcal: 52, p: 0.3, c: 14, f: 0.2, serving: 180, tag: "Fruit" },
  { name: "Blueberries", kcal: 57, p: 0.7, c: 14, f: 0.3, serving: 100, tag: "Fruit" },
  { name: "Avocado", kcal: 160, p: 2, c: 9, f: 15, serving: 100, tag: "Fruit" },
  { name: "Egg (whole)", kcal: 143, p: 13, c: 0.7, f: 9.5, serving: 110, tag: "Protein" },
  { name: "Chicken breast (cooked)", kcal: 165, p: 31, c: 0, f: 3.6, serving: 150, tag: "Protein" },
  { name: "Salmon (cooked)", kcal: 206, p: 22, c: 0, f: 12, serving: 140, tag: "Protein" },
  { name: "Beef mince 5% (cooked)", kcal: 170, p: 26, c: 0, f: 7, serving: 140, tag: "Protein" },
  { name: "Turkey breast (cooked)", kcal: 147, p: 30, c: 0, f: 2, serving: 140, tag: "Protein" },
  { name: "Prawns (cooked)", kcal: 99, p: 24, c: 0.2, f: 0.3, serving: 120, tag: "Protein" },
  { name: "Tofu (firm)", kcal: 144, p: 15, c: 3, f: 8, serving: 150, tag: "Protein" },
  { name: "Greek yoghurt 0%", kcal: 57, p: 10, c: 3.6, f: 0.4, serving: 170, tag: "Dairy" },
  { name: "Cottage cheese", kcal: 98, p: 11, c: 3.4, f: 4.3, serving: 150, tag: "Dairy" },
  { name: "Cheddar", kcal: 402, p: 25, c: 1.3, f: 33, serving: 30, tag: "Dairy" },
  { name: "Semi-skimmed milk", kcal: 50, p: 3.4, c: 4.8, f: 1.8, serving: 250, tag: "Dairy" },
  { name: "Whey protein (1 scoop in water)", kcal: 120, p: 24, c: 2, f: 1.5, serving: 30, tag: "Supplement" },
  { name: "Protein bar", kcal: 350, p: 30, c: 35, f: 10, serving: 60, tag: "Supplement" },
  { name: "Sweet potato (baked)", kcal: 90, p: 2, c: 21, f: 0.2, serving: 180, tag: "Veg" },
  { name: "Broccoli (cooked)", kcal: 35, p: 2.4, c: 7, f: 0.4, serving: 120, tag: "Veg" },
  { name: "Spinach (raw)", kcal: 23, p: 2.9, c: 3.6, f: 0.4, serving: 80, tag: "Veg" },
  { name: "Mixed salad bowl", kcal: 30, p: 1.5, c: 5, f: 0.3, serving: 150, tag: "Veg" },
  { name: "Hummus", kcal: 166, p: 8, c: 14, f: 10, serving: 40, tag: "Veg" },
  { name: "Peanut butter", kcal: 588, p: 25, c: 20, f: 50, serving: 32, tag: "Fats" },
  { name: "Almonds", kcal: 579, p: 21, c: 22, f: 50, serving: 30, tag: "Fats" },
  { name: "Olive oil", kcal: 884, p: 0, c: 0, f: 100, serving: 10, tag: "Fats" },
  { name: "Dark chocolate 70%", kcal: 565, p: 8, c: 42, f: 42, serving: 25, tag: "Treats" },
  { name: "Honey", kcal: 304, p: 0.3, c: 82, f: 0, serving: 21, tag: "Treats" },
  { name: "Pizza slice (pepperoni)", kcal: 298, p: 13, c: 34, f: 12, serving: 125, tag: "Meals" },
  { name: "Beef burger", kcal: 250, p: 17, c: 24, f: 10, serving: 220, tag: "Meals" },
  { name: "Sushi roll (8 pc)", kcal: 160, p: 6, c: 30, f: 2, serving: 200, tag: "Meals" },
  { name: "Latte (regular)", kcal: 54, p: 3.3, c: 5.1, f: 2.1, serving: 300, tag: "Drinks" },
  { name: "Orange juice", kcal: 45, p: 0.7, c: 10, f: 0.2, serving: 250, tag: "Drinks" },
];

export const scaleFood = (f: FoodDef, grams: number) => ({
  kcal: Math.round((f.kcal * grams) / 100),
  protein: Math.round((f.p * grams) / 10) / 10,
  carbs: Math.round((f.c * grams) / 10) / 10,
  fat: Math.round((f.f * grams) / 10) / 10,
});

/* ------------------------------------------------------------------ */
/* Photo → macro estimate.                                              */
/* Deterministic per image: samples pixels on a canvas, derives colour  */
/* stats and picks a plated-meal archetype. Swappable with a real       */
/* vision endpoint later — inputs/outputs stay identical.               */
/* ------------------------------------------------------------------ */

interface Archetype {
  name: string;
  per100: { kcal: number; p: number; c: number; f: number };
  grams: [number, number]; // portion range
  // crude colour signature: [greenAffinity, warmAffinity, paleAffinity]
  sig: [number, number, number];
}

const ARCHETYPES: Archetype[] = [
  { name: "Chicken, rice & greens bowl", per100: { kcal: 148, p: 14, c: 16, f: 3.4 }, grams: [380, 520], sig: [0.6, 0.45, 0.5] },
  { name: "Salmon fillet with vegetables", per100: { kcal: 168, p: 16, c: 6, f: 9 }, grams: [320, 450], sig: [0.5, 0.75, 0.35] },
  { name: "Pasta with tomato sauce", per100: { kcal: 132, p: 4.5, c: 24, f: 2.2 }, grams: [350, 480], sig: [0.15, 0.9, 0.5] },
  { name: "Burger & fries", per100: { kcal: 236, p: 9.5, c: 22, f: 11.5 }, grams: [350, 520], sig: [0.2, 0.95, 0.3] },
  { name: "Pizza (2–3 slices)", per100: { kcal: 268, p: 11, c: 32, f: 10 }, grams: [250, 360], sig: [0.15, 1, 0.55] },
  { name: "Big chopped salad", per100: { kcal: 76, p: 4, c: 7, f: 3.6 }, grams: [320, 430], sig: [1, 0.25, 0.2] },
  { name: "Oatmeal with berries", per100: { kcal: 112, p: 3.8, c: 18, f: 2.6 }, grams: [300, 400], sig: [0.2, 0.3, 0.95] },
  { name: "Eggs on toast", per100: { kcal: 196, p: 10.5, c: 16, f: 9.5 }, grams: [220, 320], sig: [0.15, 0.7, 0.75] },
  { name: "Steak & potatoes", per100: { kcal: 172, p: 15, c: 12, f: 6.5 }, grams: [360, 500], sig: [0.3, 0.6, 0.4] },
  { name: "Sushi set", per100: { kcal: 143, p: 6.5, c: 24, f: 2.4 }, grams: [260, 360], sig: [0.35, 0.3, 0.9] },
  { name: "Burrito", per100: { kcal: 206, p: 9.5, c: 24, f: 8 }, grams: [320, 450], sig: [0.4, 0.65, 0.5] },
  { name: "Protein smoothie bowl", per100: { kcal: 96, p: 6, c: 14, f: 2 }, grams: [300, 420], sig: [0.55, 0.35, 0.8] },
  { name: "Sandwich / toastie", per100: { kcal: 232, p: 10, c: 26, f: 9.5 }, grams: [200, 300], sig: [0.25, 0.55, 0.85] },
  { name: "Chicken curry & rice", per100: { kcal: 152, p: 9, c: 18, f: 5 }, grams: [380, 500], sig: [0.35, 0.95, 0.45] },
];

export interface PhotoEstimate {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

export async function estimateFromPhoto(file: Blob): Promise<PhotoEstimate> {
  const bmp = await createImageBitmap(file);
  const c = document.createElement("canvas");
  const S = 48;
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, S, S);
  const data = ctx.getImageData(0, 0, S, S).data;

  let hash = 0;
  let green = 0,
    warm = 0,
    pale = 0,
    sat = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    hash = (hash * 31 + r * 3 + g * 5 + b * 7) >>> 0;
    const mx = Math.max(r, g, b),
      mn = Math.min(r, g, b);
    const lum = (r + g + b) / 765;
    sat += mx === 0 ? 0 : (mx - mn) / mx;
    if (g > r * 0.95 && g > b * 1.1) green++;
    if (r > b * 1.25 && r >= g * 0.85) warm++;
    if (lum > 0.62 && mx - mn < 60) pale++;
  }
  const n = data.length / 4;
  const stats: [number, number, number] = [
    green / n,
    warm / n,
    pale / n + Math.min(0.25, sat / n / 4),
  ];

  // score archetypes by colour-signature distance, seeded jitter keeps it lively
  let best = ARCHETYPES[0];
  let bestScore = -Infinity;
  ARCHETYPES.forEach((a, i) => {
    const d =
      Math.abs(a.sig[0] - stats[0]) * 1.5 +
      Math.abs(a.sig[1] - stats[1]) * 1.2 +
      Math.abs(a.sig[2] - stats[2]);
    const jitter = (((hash >> (i % 24)) & 15) / 15) * 0.18;
    const score = 1 - d + jitter;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  });

  const span = best.grams[1] - best.grams[0];
  const grams = Math.round((best.grams[0] + (((hash >> 8) & 255) / 255) * span) / 10) * 10;
  const k = grams / 100;
  const confidence = Math.min(
    0.93,
    Math.max(0.58, 0.62 + bestScore * 0.24 + (((hash >> 4) & 15) / 15) * 0.08)
  );
  return {
    name: best.name,
    grams,
    kcal: Math.round(best.per100.kcal * k),
    protein: Math.round(best.per100.p * k * 10) / 10,
    carbs: Math.round(best.per100.c * k * 10) / 10,
    fat: Math.round(best.per100.f * k * 10) / 10,
    confidence,
  };
}

/* ------------------------------------------------------------------ */
/* Open Food Facts                                                       */
/* ------------------------------------------------------------------ */

export interface OffProduct {
  barcode: string;
  name: string;
  brand?: string;
  image?: string;
  servingGrams?: number;
  per100: { kcal: number; p: number; c: number; f: number };
}

export async function lookupBarcode(code: string): Promise<OffProduct | null> {
  const clean = code.replace(/[^0-9]/g, "");
  if (clean.length < 8) return null;
  const url = `https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=product_name,brands,nutriments,serving_size,serving_quantity,image_front_small_url`;
  const res = await fetch(url, { headers: { "User-Agent": "CoreSync/1.0" } });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json || json.status !== 1 || !json.product) return null;
  const p = json.product;
  const nm = p.nutriments ?? {};
  let kcal = nm["energy-kcal_100g"];
  if (kcal == null && nm["energy-kj_100g"]) kcal = nm["energy-kj_100g"] / 4.184;
  const servingGrams =
    Number(p.serving_quantity) ||
    Number(String(p.serving_size ?? "").replace(/[^\d.]/g, "")) ||
    undefined;
  return {
    barcode: clean,
    name: p.product_name || "Unknown product",
    brand: p.brands || undefined,
    image: p.image_front_small_url || undefined,
    servingGrams,
    per100: {
      kcal: Math.round(kcal ?? 0),
      p: Math.round((nm.proteins_100g ?? 0) * 10) / 10,
      c: Math.round((nm.carbohydrates_100g ?? 0) * 10) / 10,
      f: Math.round((nm.fat_100g ?? 0) * 10) / 10,
    },
  };
}
