"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";
import { searchFoods, getPopularFoods, calcNutrition, type FoodItem } from "@/lib/food-data";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type FoodLog = {
  id: string;
  meal_type: MealType;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type AIFoodItem = {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const MEAL_CONFIG: { type: MealType; label: string; icon: string; time: string }[] = [
  { type: "breakfast", label: "Breakfast", icon: "🌅", time: "6 - 10 AM" },
  { type: "lunch", label: "Lunch", icon: "☀️", time: "12 - 2 PM" },
  { type: "snack", label: "Snacks", icon: "🍿", time: "Anytime" },
  { type: "dinner", label: "Dinner", icon: "🌙", time: "7 - 10 PM" },
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function FoodPage() {
  const { user, loading: authLoading } = useAuth();
  const [date, setDate] = useState(todayStr());
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Search modal
  const [showSearch, setShowSearch] = useState<MealType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Custom food entry
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customQty, setCustomQty] = useState("100");
  const [customUnit, setCustomUnit] = useState("g");
  const [customCal, setCustomCal] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFat, setCustomFat] = useState("");

  // AI photo scan
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<AIFoodItem[] | null>(null);
  const [scanMeal, setScanMeal] = useState<MealType | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanMealRef = useRef<MealType | null>(null);

  // Toast for errors
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  }


  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .order("created_at")
      .then(({ data }) => {
        setLogs((data as FoodLog[]) ?? []);
        setLoading(false);
      });
  }, [user, date]);

  useEffect(() => {
    if (showSearch && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [showSearch]);

  const totalCal = logs.reduce((s, l) => s + l.calories, 0);
  const totalProtein = logs.reduce((s, l) => s + l.protein, 0);
  const totalCarbs = logs.reduce((s, l) => s + l.carbs, 0);
  const totalFat = logs.reduce((s, l) => s + l.fat, 0);
  const calGoal = 2200;

  async function addFood(meal: MealType) {
    if (!user || !selectedFood) return;
    const qty = parseFloat(quantity) || selectedFood.defaultQty;
    const nutr = calcNutrition(selectedFood, qty);
    const entry = {
      user_id: user.id, date, meal_type: meal,
      food_name: selectedFood.name, quantity: qty, unit: selectedFood.unit, ...nutr,
    };
    const { data, error } = await supabase.from("food_logs").insert(entry).select("*").single();
    if (error) { showToast(`Failed to log: ${error.message}`); return; }
    if (data) setLogs((prev) => [...prev, data as FoodLog]);
    closeSearch();
  }

  async function quickAdd(food: FoodItem, meal: MealType) {
    if (!user) return;
    const nutr = calcNutrition(food, food.defaultQty);
    const entry = {
      user_id: user.id, date, meal_type: meal,
      food_name: food.name, quantity: food.defaultQty, unit: food.unit, ...nutr,
    };
    const { data, error } = await supabase.from("food_logs").insert(entry).select("*").single();
    if (error) { showToast(`Failed to log: ${error.message}`); return; }
    if (data) setLogs((prev) => [...prev, data as FoodLog]);
    closeSearch();
  }

  async function addCustomFood(meal: MealType) {
    if (!user || !customName.trim()) return;
    const entry = {
      user_id: user.id, date, meal_type: meal,
      food_name: customName.trim(), quantity: parseFloat(customQty) || 100, unit: customUnit,
      calories: parseInt(customCal) || 0, protein: parseFloat(customProtein) || 0,
      carbs: parseFloat(customCarbs) || 0, fat: parseFloat(customFat) || 0,
    };
    const { data, error } = await supabase.from("food_logs").insert(entry).select("*").single();
    if (error) { showToast(`Failed to log: ${error.message}`); return; }
    if (data) setLogs((prev) => [...prev, data as FoodLog]);
    closeSearch();
  }

  async function addAIFood(item: AIFoodItem, meal: MealType) {
    if (!user) return;
    const entry = {
      user_id: user.id, date, meal_type: meal,
      food_name: item.name, quantity: item.quantity, unit: item.unit,
      calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat,
    };
    const { data } = await supabase.from("food_logs").insert(entry).select("*").single();
    if (data) setLogs((prev) => [...prev, data as FoodLog]);
  }

  async function addAllAIFoods() {
    if (!scanResults || !scanMeal) return;
    for (const item of scanResults) {
      await addAIFood(item, scanMeal);
    }
    closeScan();
  }

  async function removeFood(id: string) {
    await supabase.from("food_logs").delete().eq("id", id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  function closeSearch() {
    setShowSearch(null);
    setSearchQuery("");
    setSelectedFood(null);
    setQuantity("");
    setShowCustom(false);
    setCustomName(""); setCustomQty("100"); setCustomUnit("g");
    setCustomCal(""); setCustomProtein(""); setCustomCarbs(""); setCustomFat("");
  }

  function closeScan() {
    setScanResults(null);
    setScanMeal(null);
    setScanError(null);
  }

  function triggerScan(meal: MealType) {
    scanMealRef.current = meal;
    setScanMeal(meal);
    fileInputRef.current?.click();
  }

  const handlePhotoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) { setScanError("Image too large (max 10MB)"); return; }

    setScanning(true);
    setScanError(null);
    setScanResults(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const resized = await resizeImage(base64, 1024);

      const res = await fetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: resized }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }

      const data = await res.json();
      if (data.items?.length > 0) {
        setScanResults(data.items);
        setScanMeal(scanMealRef.current);
      } else {
        setScanError("Couldn't identify any food. Try a clearer photo.");
      }
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const results = searchQuery ? searchFoods(searchQuery) : getPopularFoods();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Food Log</h1>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="!w-auto text-sm !py-1.5 !px-2.5"
          />
        </div>

        {/* Daily Summary Ring */}
        <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4 mb-5">
          <div className="flex items-center gap-5">
            <CalorieRing current={totalCal} goal={calGoal} />
            <div className="flex-1 grid grid-cols-3 gap-2">
              <MacroBar label="Protein" current={totalProtein} goal={150} color="bg-blue-500" unit="g" />
              <MacroBar label="Carbs" current={totalCarbs} goal={250} color="bg-amber-500" unit="g" />
              <MacroBar label="Fat" current={totalFat} goal={70} color="bg-pink-500" unit="g" />
            </div>
          </div>
        </div>

        {/* Scanning indicator */}
        {scanning && (
          <div className="bg-[#141414] rounded-2xl border border-amber-500/30 p-4 mb-4 flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="text-sm font-medium text-amber-400">Analyzing your food...</p>
              <p className="text-xs text-neutral-500">AI is identifying items & macros</p>
            </div>
          </div>
        )}

        {/* Meal Sections */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {MEAL_CONFIG.map((meal) => {
              const mealLogs = logs.filter((l) => l.meal_type === meal.type);
              const mealCal = mealLogs.reduce((s, l) => s + l.calories, 0);
              return (
                <div key={meal.type} className="bg-[#141414] rounded-2xl border border-neutral-800 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{meal.icon}</span>
                      <div>
                        <p className="font-semibold text-sm">{meal.label}</p>
                        <p className="text-[10px] text-neutral-500">{meal.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {mealCal > 0 && (
                        <span className="text-xs text-neutral-400">{mealCal} cal</span>
                      )}
                      <button
                        onClick={() => triggerScan(meal.type)}
                        className="text-amber-500 w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-500/10 text-base"
                        title="Scan food photo"
                      >
                        📷
                      </button>
                      <button
                        onClick={() => setShowSearch(meal.type)}
                        className="text-amber-500 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-500/10"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {mealLogs.length > 0 && (
                    <div className="divide-y divide-neutral-800">
                      {mealLogs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{log.food_name}</p>
                            <p className="text-[10px] text-neutral-500">
                              {log.quantity}{log.unit} · P:{log.protein}g · C:{log.carbs}g · F:{log.fat}g
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-neutral-300">{log.calories}</span>
                            <button
                              onClick={() => removeFood(log.id)}
                              className="text-neutral-600 hover:text-red-400 text-xs p-1"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden file input for camera */}
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />

      {/* ===== FOOD SEARCH MODAL ===== */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
          <div className="bg-[#0a0a0a] flex-1 flex flex-col max-w-lg mx-auto w-full">
            <div className="flex items-center gap-3 p-4 border-b border-neutral-800">
              <button onClick={closeSearch} className="text-neutral-400 text-lg">←</button>
              <div className="flex-1">
                <input
                  ref={searchRef}
                  type="text"
                  placeholder={`Search food (e.g. "upma", "chicken")...`}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSelectedFood(null); setShowCustom(false); }}
                  className="!bg-transparent !border-0 !p-0 text-lg !rounded-none"
                />
              </div>
            </div>

            {/* Selected Food — Detail + Quantity */}
            {selectedFood ? (
              <div className="p-4 flex flex-col gap-4">
                <div className="bg-[#141414] rounded-2xl p-4 border border-neutral-800">
                  <h3 className="font-semibold mb-0.5">{selectedFood.name}</h3>
                  <p className="text-xs text-neutral-500 mb-4">
                    {selectedFood.category} · Default: {selectedFood.defaultQty} {selectedFood.unit}
                  </p>
                  <div className="flex items-end gap-3 mb-4">
                    <div className="flex-1">
                      <label className="text-xs text-neutral-400 mb-1 block">Quantity</label>
                      <input
                        type="number"
                        step="any"
                        placeholder={selectedFood.defaultQty.toString()}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="text-center text-lg !py-2"
                      />
                    </div>
                    <div className="pb-1">
                      <span className="text-neutral-400 text-sm">{selectedFood.unit}</span>
                    </div>
                  </div>
                  {(() => {
                    const qty = parseFloat(quantity) || selectedFood.defaultQty;
                    const n = calcNutrition(selectedFood, qty);
                    return (
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-neutral-900 rounded-lg py-2">
                          <p className="text-amber-400 font-bold">{n.calories}</p>
                          <p className="text-[9px] text-neutral-500">Cal</p>
                        </div>
                        <div className="bg-neutral-900 rounded-lg py-2">
                          <p className="text-blue-400 font-bold">{n.protein}g</p>
                          <p className="text-[9px] text-neutral-500">Protein</p>
                        </div>
                        <div className="bg-neutral-900 rounded-lg py-2">
                          <p className="text-amber-300 font-bold">{n.carbs}g</p>
                          <p className="text-[9px] text-neutral-500">Carbs</p>
                        </div>
                        <div className="bg-neutral-900 rounded-lg py-2">
                          <p className="text-pink-400 font-bold">{n.fat}g</p>
                          <p className="text-[9px] text-neutral-500">Fat</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <button
                  onClick={() => addFood(showSearch)}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl py-3.5 transition-colors"
                >
                  Add to {MEAL_CONFIG.find((m) => m.type === showSearch)?.label}
                </button>
              </div>
            ) : showCustom ? (
              /* Custom Food Entry */
              <div className="p-4 flex flex-col gap-3 overflow-y-auto">
                <div className="bg-[#141414] rounded-2xl p-4 border border-neutral-800">
                  <h3 className="font-semibold mb-3 text-sm">Add Custom Food</h3>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-xs text-neutral-400 mb-1 block">Food Name</label>
                      <input type="text" placeholder="e.g. Homemade Khichdi" value={customName} onChange={(e) => setCustomName(e.target.value)} autoFocus />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-neutral-400 mb-1 block">Qty</label>
                        <input type="number" value={customQty} onChange={(e) => setCustomQty(e.target.value)} className="text-center" />
                      </div>
                      <div>
                        <label className="text-xs text-neutral-400 mb-1 block">Unit</label>
                        <select value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded-lg py-2 px-2 text-sm w-full">
                          {["g","ml","piece","cup","bowl","plate","glass","tbsp"].map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-neutral-400 mb-1 block">Calories</label>
                        <input type="number" placeholder="0" value={customCal} onChange={(e) => setCustomCal(e.target.value)} className="text-center" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-neutral-400 mb-1 block">Protein (g)</label>
                        <input type="number" step="0.1" placeholder="0" value={customProtein} onChange={(e) => setCustomProtein(e.target.value)} className="text-center" />
                      </div>
                      <div>
                        <label className="text-xs text-neutral-400 mb-1 block">Carbs (g)</label>
                        <input type="number" step="0.1" placeholder="0" value={customCarbs} onChange={(e) => setCustomCarbs(e.target.value)} className="text-center" />
                      </div>
                      <div>
                        <label className="text-xs text-neutral-400 mb-1 block">Fat (g)</label>
                        <input type="number" step="0.1" placeholder="0" value={customFat} onChange={(e) => setCustomFat(e.target.value)} className="text-center" />
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => addCustomFood(showSearch!)}
                  disabled={!customName.trim()}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black font-bold rounded-xl py-3.5 transition-colors"
                >
                  Add to {MEAL_CONFIG.find((m) => m.type === showSearch)?.label}
                </button>
              </div>
            ) : (
              /* Search Results — Healthify style */
              <div className="flex-1 overflow-y-auto">
                {/* Scan photo shortcut */}
                <button
                  onClick={() => { const meal = showSearch!; closeSearch(); setTimeout(() => triggerScan(meal), 100); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-900 border-b border-neutral-800/50 text-left"
                >
                  <span className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center text-lg">📷</span>
                  <div>
                    <p className="text-sm font-medium text-amber-400">Scan Food Photo <span className="text-[8px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full ml-1 font-bold">FREE IN BETA</span></p>
                    <p className="text-[10px] text-neutral-500">AI identifies food & calculates macros</p>
                  </div>
                </button>

                {!searchQuery && (
                  <p className="px-4 pt-3 pb-2 text-xs text-neutral-500 uppercase tracking-wider">Popular Foods</p>
                )}

                {results.map((food, i) => {
                  const n = calcNutrition(food, food.defaultQty);
                  return (
                    <div key={i} className="flex items-center px-4 py-3 hover:bg-neutral-900 border-b border-neutral-800/50">
                      <button
                        onClick={() => { setSelectedFood(food); setQuantity(food.defaultQty.toString()); }}
                        className="flex-1 text-left"
                      >
                        <p className="text-sm font-medium">{food.name}</p>
                        <p className="text-[10px] text-neutral-500">
                          {food.defaultQty} {food.unit} ·{" "}
                          <span className="text-blue-400">P:{n.protein}g</span>{" "}
                          <span className="text-amber-300">C:{n.carbs}g</span>{" "}
                          <span className="text-pink-400">F:{n.fat}g</span>
                        </p>
                      </button>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-amber-400 text-sm font-semibold">{n.calories}</span>
                        <button
                          onClick={() => quickAdd(food, showSearch!)}
                          className="w-8 h-8 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg flex items-center justify-center text-lg"
                          title={`Quick add ${food.defaultQty} ${food.unit}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* No results — custom entry */}
                {results.length === 0 && searchQuery && (
                  <div className="text-center py-8 px-4">
                    <p className="text-neutral-500 text-sm mb-4">No matches for &ldquo;{searchQuery}&rdquo;</p>
                    <button
                      onClick={() => { setShowCustom(true); setCustomName(searchQuery); }}
                      className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-medium rounded-xl py-3 px-6 transition-colors text-sm"
                    >
                      + Add &ldquo;{searchQuery}&rdquo; manually
                    </button>
                  </div>
                )}

                {results.length > 0 && searchQuery && (
                  <div className="px-4 py-4 text-center">
                    <button
                      onClick={() => { setShowCustom(true); setCustomName(searchQuery); }}
                      className="text-amber-500 text-xs hover:underline"
                    >
                      Can&apos;t find it? Add custom food →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== AI SCAN RESULTS MODAL ===== */}
      {(scanResults || scanError) && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-[#141414] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 border border-neutral-800 max-h-[80vh] overflow-y-auto">
            {scanError ? (
              <>
                <h2 className="text-lg font-bold mb-2 text-red-400">Scan Failed</h2>
                <p className="text-sm text-neutral-400 mb-4">{scanError}</p>
                <button onClick={closeScan} className="w-full bg-neutral-800 text-neutral-300 font-medium rounded-xl py-3">Close</button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🤖</span>
                  <h2 className="text-lg font-bold">AI Found {scanResults!.length} Item{scanResults!.length !== 1 ? "s" : ""}</h2>
                </div>
                <p className="text-xs text-neutral-500 mb-4">Adding to {MEAL_CONFIG.find((m) => m.type === scanMeal)?.label}</p>

                <div className="flex flex-col gap-2 mb-4">
                  {scanResults!.map((item, i) => (
                    <div key={i} className="bg-neutral-900 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-[10px] text-neutral-500">
                          {item.quantity}{item.unit} ·{" "}
                          <span className="text-blue-400">P:{item.protein}g</span>{" "}
                          <span className="text-amber-300">C:{item.carbs}g</span>{" "}
                          <span className="text-pink-400">F:{item.fat}g</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-amber-400 font-semibold text-sm">{item.calories}</span>
                        <button onClick={() => addAIFood(item, scanMeal!)} className="w-7 h-7 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center text-sm">+</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={addAllAIFoods} className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl py-3 transition-colors">Add All Items</button>
                  <button onClick={closeScan} className="px-4 bg-neutral-800 text-neutral-400 rounded-xl py-3">Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Toast */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-[60] max-w-lg mx-auto">
          <div className="bg-red-500/90 text-white text-sm rounded-xl px-4 py-3 flex items-center justify-between shadow-lg">
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white">✕</button>
          </div>
        </div>
      )}

      <Nav />
    </div>
  );
}

function CalorieRing({ current, goal }: { current: number; goal: number }) {
  const pct = Math.min(current / goal, 1);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const over = current > goal;
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#262626" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={over ? "#ef4444" : "#f59e0b"} strokeWidth="6" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-bold ${over ? "text-red-400" : "text-amber-400"}`}>{current}</span>
        <span className="text-[9px] text-neutral-500">/ {goal} cal</span>
      </div>
    </div>
  );
}

function MacroBar({ label, current, goal, color, unit }: {
  label: string; current: number; goal: number; color: string; unit: string;
}) {
  const pct = Math.min((current / goal) * 100, 100);
  return (
    <div>
      <p className="text-[10px] text-neutral-500 mb-1">{label}</p>
      <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-neutral-400 mt-0.5">{Math.round(current)}{unit}</p>
    </div>
  );
}

function resizeImage(dataUrl: string, maxDim: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
        else { width = Math.round((width * maxDim) / height); height = maxDim; }
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = dataUrl;
  });
}
