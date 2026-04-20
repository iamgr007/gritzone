export type FoodItem = {
  name: string;
  calories: number; // per 100g or per unit
  protein: number;
  carbs: number;
  fat: number;
  unit: string; // "g", "ml", "piece", "cup", "scoop"
  defaultQty: number;
  category: string;
};

export const FOOD_DATABASE: FoodItem[] = [
  // ========== INDIAN STAPLES ==========
  { name: "White Rice (cooked)", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, unit: "g", defaultQty: 200, category: "Grains" },
  { name: "Brown Rice (cooked)", calories: 112, protein: 2.6, carbs: 24, fat: 0.9, unit: "g", defaultQty: 200, category: "Grains" },
  { name: "Chapati", calories: 120, protein: 3.5, carbs: 20, fat: 3.5, unit: "piece", defaultQty: 1, category: "Grains" },
  { name: "Paratha", calories: 260, protein: 5, carbs: 30, fat: 13, unit: "piece", defaultQty: 1, category: "Grains" },
  { name: "Naan", calories: 262, protein: 9, carbs: 45, fat: 5, unit: "piece", defaultQty: 1, category: "Grains" },
  { name: "Dosa", calories: 120, protein: 3, carbs: 18, fat: 4, unit: "piece", defaultQty: 1, category: "Grains" },
  { name: "Idli", calories: 39, protein: 2, carbs: 8, fat: 0.2, unit: "piece", defaultQty: 2, category: "Grains" },
  { name: "Poha", calories: 180, protein: 3, carbs: 32, fat: 5, unit: "cup", defaultQty: 1, category: "Grains" },
  { name: "Upma", calories: 170, protein: 4, carbs: 28, fat: 5, unit: "cup", defaultQty: 1, category: "Grains" },
  { name: "Puri", calories: 150, protein: 3, carbs: 18, fat: 8, unit: "piece", defaultQty: 2, category: "Grains" },

  // ========== INDIAN CURRIES & DALS ==========
  { name: "Dal Tadka", calories: 120, protein: 8, carbs: 16, fat: 3, unit: "cup", defaultQty: 1, category: "Curries" },
  { name: "Rajma", calories: 140, protein: 9, carbs: 22, fat: 2, unit: "cup", defaultQty: 1, category: "Curries" },
  { name: "Chole", calories: 160, protein: 9, carbs: 24, fat: 4, unit: "cup", defaultQty: 1, category: "Curries" },
  { name: "Paneer Butter Masala", calories: 300, protein: 14, carbs: 12, fat: 22, unit: "cup", defaultQty: 1, category: "Curries" },
  { name: "Chicken Curry", calories: 240, protein: 22, carbs: 8, fat: 14, unit: "cup", defaultQty: 1, category: "Curries" },
  { name: "Egg Curry", calories: 200, protein: 14, carbs: 8, fat: 13, unit: "cup", defaultQty: 1, category: "Curries" },
  { name: "Sambar", calories: 65, protein: 3, carbs: 10, fat: 1.5, unit: "cup", defaultQty: 1, category: "Curries" },
  { name: "Palak Paneer", calories: 220, protein: 12, carbs: 8, fat: 16, unit: "cup", defaultQty: 1, category: "Curries" },
  { name: "Aloo Gobi", calories: 130, protein: 3, carbs: 18, fat: 5, unit: "cup", defaultQty: 1, category: "Curries" },
  { name: "Bhindi Masala", calories: 90, protein: 2, carbs: 10, fat: 5, unit: "cup", defaultQty: 1, category: "Curries" },
  { name: "Chicken Biryani", calories: 200, protein: 12, carbs: 25, fat: 6, unit: "g", defaultQty: 250, category: "Curries" },
  { name: "Veg Biryani", calories: 170, protein: 4, carbs: 28, fat: 5, unit: "g", defaultQty: 250, category: "Curries" },

  // ========== PROTEIN SOURCES ==========
  { name: "Chicken Breast (grilled)", calories: 165, protein: 31, carbs: 0, fat: 3.6, unit: "g", defaultQty: 150, category: "Protein" },
  { name: "Chicken Thigh", calories: 209, protein: 26, carbs: 0, fat: 11, unit: "g", defaultQty: 150, category: "Protein" },
  { name: "Eggs (whole)", calories: 78, protein: 6, carbs: 0.6, fat: 5, unit: "piece", defaultQty: 2, category: "Protein" },
  { name: "Egg Whites", calories: 17, protein: 3.6, carbs: 0.2, fat: 0.1, unit: "piece", defaultQty: 3, category: "Protein" },
  { name: "Paneer", calories: 265, protein: 18, carbs: 1.2, fat: 21, unit: "g", defaultQty: 100, category: "Protein" },
  { name: "Tofu", calories: 76, protein: 8, carbs: 1.9, fat: 4.8, unit: "g", defaultQty: 100, category: "Protein" },
  { name: "Fish (Rohu)", calories: 97, protein: 17, carbs: 0, fat: 3, unit: "g", defaultQty: 150, category: "Protein" },
  { name: "Salmon", calories: 208, protein: 20, carbs: 0, fat: 13, unit: "g", defaultQty: 150, category: "Protein" },
  { name: "Tuna", calories: 132, protein: 28, carbs: 0, fat: 1.3, unit: "g", defaultQty: 100, category: "Protein" },
  { name: "Prawns", calories: 99, protein: 24, carbs: 0.2, fat: 0.3, unit: "g", defaultQty: 100, category: "Protein" },
  { name: "Whey Protein", calories: 120, protein: 24, carbs: 3, fat: 1.5, unit: "scoop", defaultQty: 1, category: "Protein" },
  { name: "Soya Chunks", calories: 345, protein: 52, carbs: 33, fat: 0.5, unit: "g", defaultQty: 50, category: "Protein" },
  { name: "Moong Dal (raw)", calories: 347, protein: 24, carbs: 59, fat: 1.2, unit: "g", defaultQty: 50, category: "Protein" },

  // ========== DAIRY ==========
  { name: "Milk (whole)", calories: 60, protein: 3.2, carbs: 4.7, fat: 3.3, unit: "ml", defaultQty: 200, category: "Dairy" },
  { name: "Milk (toned)", calories: 45, protein: 3, carbs: 4.5, fat: 1.5, unit: "ml", defaultQty: 200, category: "Dairy" },
  { name: "Curd/Yogurt", calories: 60, protein: 3.5, carbs: 5, fat: 3.3, unit: "g", defaultQty: 150, category: "Dairy" },
  { name: "Greek Yogurt", calories: 59, protein: 10, carbs: 3.6, fat: 0.4, unit: "g", defaultQty: 150, category: "Dairy" },
  { name: "Buttermilk (Chaas)", calories: 40, protein: 3.3, carbs: 4.8, fat: 0.9, unit: "ml", defaultQty: 200, category: "Dairy" },
  { name: "Lassi (sweet)", calories: 80, protein: 3, carbs: 12, fat: 2, unit: "ml", defaultQty: 200, category: "Dairy" },
  { name: "Cheese (Cheddar)", calories: 402, protein: 25, carbs: 1.3, fat: 33, unit: "g", defaultQty: 30, category: "Dairy" },
  { name: "Butter", calories: 717, protein: 0.9, carbs: 0.1, fat: 81, unit: "g", defaultQty: 10, category: "Dairy" },
  { name: "Ghee", calories: 900, protein: 0, carbs: 0, fat: 100, unit: "g", defaultQty: 10, category: "Dairy" },

  // ========== FRUITS ==========
  { name: "Banana", calories: 89, protein: 1.1, carbs: 23, fat: 0.3, unit: "piece", defaultQty: 1, category: "Fruits" },
  { name: "Apple", calories: 52, protein: 0.3, carbs: 14, fat: 0.2, unit: "piece", defaultQty: 1, category: "Fruits" },
  { name: "Mango", calories: 60, protein: 0.8, carbs: 15, fat: 0.4, unit: "g", defaultQty: 150, category: "Fruits" },
  { name: "Papaya", calories: 43, protein: 0.5, carbs: 11, fat: 0.3, unit: "g", defaultQty: 150, category: "Fruits" },
  { name: "Watermelon", calories: 30, protein: 0.6, carbs: 8, fat: 0.2, unit: "g", defaultQty: 200, category: "Fruits" },
  { name: "Orange", calories: 47, protein: 0.9, carbs: 12, fat: 0.1, unit: "piece", defaultQty: 1, category: "Fruits" },
  { name: "Grapes", calories: 69, protein: 0.7, carbs: 18, fat: 0.2, unit: "g", defaultQty: 100, category: "Fruits" },
  { name: "Pomegranate", calories: 83, protein: 1.7, carbs: 19, fat: 1.2, unit: "g", defaultQty: 100, category: "Fruits" },

  // ========== VEGETABLES ==========
  { name: "Broccoli", calories: 34, protein: 2.8, carbs: 7, fat: 0.4, unit: "g", defaultQty: 100, category: "Vegetables" },
  { name: "Spinach (Palak)", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, unit: "g", defaultQty: 100, category: "Vegetables" },
  { name: "Sweet Potato", calories: 86, protein: 1.6, carbs: 20, fat: 0.1, unit: "g", defaultQty: 150, category: "Vegetables" },
  { name: "Potato (boiled)", calories: 87, protein: 1.9, carbs: 20, fat: 0.1, unit: "g", defaultQty: 150, category: "Vegetables" },
  { name: "Cucumber", calories: 16, protein: 0.7, carbs: 3.6, fat: 0.1, unit: "g", defaultQty: 100, category: "Vegetables" },
  { name: "Tomato", calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, unit: "piece", defaultQty: 1, category: "Vegetables" },
  { name: "Onion", calories: 40, protein: 1.1, carbs: 9, fat: 0.1, unit: "g", defaultQty: 50, category: "Vegetables" },
  { name: "Carrot", calories: 41, protein: 0.9, carbs: 10, fat: 0.2, unit: "g", defaultQty: 100, category: "Vegetables" },
  { name: "Mixed Salad", calories: 20, protein: 1, carbs: 3, fat: 0.2, unit: "cup", defaultQty: 1, category: "Vegetables" },

  // ========== NUTS & SEEDS ==========
  { name: "Almonds", calories: 579, protein: 21, carbs: 22, fat: 50, unit: "g", defaultQty: 20, category: "Nuts" },
  { name: "Peanuts", calories: 567, protein: 26, carbs: 16, fat: 49, unit: "g", defaultQty: 30, category: "Nuts" },
  { name: "Peanut Butter", calories: 588, protein: 25, carbs: 20, fat: 50, unit: "g", defaultQty: 20, category: "Nuts" },
  { name: "Walnuts", calories: 654, protein: 15, carbs: 14, fat: 65, unit: "g", defaultQty: 15, category: "Nuts" },
  { name: "Cashews", calories: 553, protein: 18, carbs: 30, fat: 44, unit: "g", defaultQty: 20, category: "Nuts" },
  { name: "Chia Seeds", calories: 486, protein: 17, carbs: 42, fat: 31, unit: "g", defaultQty: 15, category: "Nuts" },
  { name: "Flax Seeds", calories: 534, protein: 18, carbs: 29, fat: 42, unit: "g", defaultQty: 10, category: "Nuts" },

  // ========== BREADS & CEREALS ==========
  { name: "Oats", calories: 389, protein: 17, carbs: 66, fat: 7, unit: "g", defaultQty: 50, category: "Grains" },
  { name: "Bread (White)", calories: 265, protein: 9, carbs: 49, fat: 3.2, unit: "slice", defaultQty: 2, category: "Grains" },
  { name: "Bread (Brown)", calories: 247, protein: 13, carbs: 41, fat: 4.2, unit: "slice", defaultQty: 2, category: "Grains" },
  { name: "Muesli", calories: 340, protein: 10, carbs: 60, fat: 7, unit: "g", defaultQty: 50, category: "Grains" },
  { name: "Cornflakes", calories: 357, protein: 7, carbs: 84, fat: 0.4, unit: "g", defaultQty: 30, category: "Grains" },
  { name: "Pasta (cooked)", calories: 131, protein: 5, carbs: 25, fat: 1.1, unit: "g", defaultQty: 200, category: "Grains" },

  // ========== BEVERAGES ==========
  { name: "Black Coffee", calories: 2, protein: 0.3, carbs: 0, fat: 0, unit: "cup", defaultQty: 1, category: "Beverages" },
  { name: "Tea (with milk)", calories: 30, protein: 1, carbs: 4, fat: 1, unit: "cup", defaultQty: 1, category: "Beverages" },
  { name: "Green Tea", calories: 2, protein: 0, carbs: 0, fat: 0, unit: "cup", defaultQty: 1, category: "Beverages" },
  { name: "Protein Shake", calories: 150, protein: 25, carbs: 8, fat: 3, unit: "glass", defaultQty: 1, category: "Beverages" },
  { name: "Coconut Water", calories: 19, protein: 0.7, carbs: 3.7, fat: 0.2, unit: "ml", defaultQty: 200, category: "Beverages" },
  { name: "Sugarcane Juice", calories: 70, protein: 0, carbs: 18, fat: 0, unit: "ml", defaultQty: 200, category: "Beverages" },
  { name: "Nimbu Pani", calories: 40, protein: 0, carbs: 10, fat: 0, unit: "glass", defaultQty: 1, category: "Beverages" },

  // ========== SNACKS ==========
  { name: "Samosa", calories: 262, protein: 4, carbs: 28, fat: 15, unit: "piece", defaultQty: 1, category: "Snacks" },
  { name: "Vada Pav", calories: 290, protein: 5, carbs: 35, fat: 15, unit: "piece", defaultQty: 1, category: "Snacks" },
  { name: "Bhel Puri", calories: 180, protein: 5, carbs: 30, fat: 5, unit: "cup", defaultQty: 1, category: "Snacks" },
  { name: "Pakora/Bhaji", calories: 175, protein: 5, carbs: 15, fat: 11, unit: "piece", defaultQty: 3, category: "Snacks" },
  { name: "Dhokla", calories: 160, protein: 6, carbs: 25, fat: 4, unit: "piece", defaultQty: 3, category: "Snacks" },
  { name: "Sprouts Salad", calories: 100, protein: 8, carbs: 14, fat: 1, unit: "cup", defaultQty: 1, category: "Snacks" },
  { name: "Roasted Chana", calories: 360, protein: 22, carbs: 58, fat: 5, unit: "g", defaultQty: 30, category: "Snacks" },
  { name: "Makhana (Fox Nuts)", calories: 347, protein: 9, carbs: 77, fat: 0.1, unit: "g", defaultQty: 30, category: "Snacks" },
  { name: "Dark Chocolate", calories: 546, protein: 5, carbs: 60, fat: 31, unit: "g", defaultQty: 20, category: "Snacks" },

  // ========== FAST FOOD ==========
  { name: "Pizza Slice", calories: 285, protein: 12, carbs: 36, fat: 10, unit: "slice", defaultQty: 1, category: "Fast Food" },
  { name: "Burger (Veg)", calories: 350, protein: 12, carbs: 40, fat: 16, unit: "piece", defaultQty: 1, category: "Fast Food" },
  { name: "Burger (Chicken)", calories: 430, protein: 22, carbs: 38, fat: 22, unit: "piece", defaultQty: 1, category: "Fast Food" },
  { name: "French Fries", calories: 312, protein: 3.4, carbs: 41, fat: 15, unit: "g", defaultQty: 100, category: "Fast Food" },
  { name: "Momos (Chicken)", calories: 35, protein: 2, carbs: 4, fat: 1, unit: "piece", defaultQty: 6, category: "Fast Food" },
  { name: "Momos (Veg)", calories: 25, protein: 1, carbs: 4, fat: 0.5, unit: "piece", defaultQty: 6, category: "Fast Food" },
  { name: "Maggi Noodles", calories: 205, protein: 4.5, carbs: 27, fat: 9, unit: "packet", defaultQty: 1, category: "Fast Food" },
];

export function searchFoods(query: string): FoodItem[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return FOOD_DATABASE.filter(
    (f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)
  ).slice(0, 15);
}

export function getPopularFoods(): FoodItem[] {
  const popular = [
    "Chicken Breast (grilled)", "Eggs (whole)", "White Rice (cooked)",
    "Chapati", "Dal Tadka", "Banana", "Oats", "Whey Protein",
    "Curd/Yogurt", "Paneer", "Almonds", "Black Coffee",
  ];
  return FOOD_DATABASE.filter((f) => popular.includes(f.name));
}

export function calcNutrition(food: FoodItem, qty: number) {
  const isPerPiece = ["piece", "slice", "cup", "glass", "scoop", "packet"].includes(food.unit);
  const multiplier = isPerPiece ? qty : qty / 100;
  return {
    calories: Math.round(food.calories * multiplier),
    protein: Math.round(food.protein * multiplier * 10) / 10,
    carbs: Math.round(food.carbs * multiplier * 10) / 10,
    fat: Math.round(food.fat * multiplier * 10) / 10,
  };
}
