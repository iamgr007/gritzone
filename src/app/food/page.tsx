"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";
import { FOOD_DATABASE, searchFoods, getPopularFoods, calcNutrition, type FoodItem } from "@/lib/food-data";

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
  const [showSearch, setShowSearch] = useState<MealType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

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
      user_id: user.id,
      date,
      meal_type: meal,
      food_name: selectedFood.name,
      quantity: qty,
      unit: selectedFood.unit,
      ...nutr,
    };
    const { data } = await supabase.from("food_logs").insert(entry).select("*").single();
    if (data) setLogs((prev) => [...prev, data as FoodLog]);
    closeSearch();
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
  }

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
                    <div className="flex items-center gap-3">
                      {mealCal > 0 && (
                        <span className="text-xs text-neutral-400">{mealCal} cal</span>
                      )}
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

      {/* Food Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
          <div className="bg-[#0a0a0a] flex-1 flex flex-col max-w-lg mx-auto w-full">
            {/* Modal Header */}
            <div className="flex items-center gap-3 p-4 border-b border-neutral-800">
              <button onClick={closeSearch} className="text-neutral-400 text-lg">←</button>
              <div className="flex-1">
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search food..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSelectedFood(null); }}
                  className="!bg-transparent !border-0 !p-0 text-lg !rounded-none"
                />
              </div>
            </div>

            {/* Selected Food - Quantity Picker */}
            {selectedFood ? (
              <div className="p-4 flex flex-col gap-4">
                <div className="bg-[#141414] rounded-2xl p-4 border border-neutral-800">
                  <h3 className="font-semibold mb-1">{selectedFood.name}</h3>
                  <p className="text-xs text-neutral-500 mb-4">{selectedFood.category}</p>

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

                  {/* Preview nutrition */}
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
            ) : (
              /* Search Results */
              <div className="flex-1 overflow-y-auto">
                {!searchQuery && (
                  <p className="px-4 pt-3 pb-2 text-xs text-neutral-500 uppercase tracking-wider">
                    Popular Foods
                  </p>
                )}
                {results.map((food, i) => {
                  const n = calcNutrition(food, food.defaultQty);
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedFood(food);
                        setQuantity(food.defaultQty.toString());
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-900 border-b border-neutral-800/50 text-left"
                    >
                      <div>
                        <p className="text-sm font-medium">{food.name}</p>
                        <p className="text-[10px] text-neutral-500">
                          {food.defaultQty} {food.unit} · P:{n.protein}g C:{n.carbs}g F:{n.fat}g
                        </p>
                      </div>
                      <span className="text-amber-400 text-sm font-semibold">{n.calories}</span>
                    </button>
                  );
                })}
                {results.length === 0 && searchQuery && (
                  <p className="text-center text-neutral-500 py-12 text-sm">
                    No matches for &ldquo;{searchQuery}&rdquo;
                  </p>
                )}
              </div>
            )}
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
        <circle
          cx="40" cy="40" r={r} fill="none"
          stroke={over ? "#ef4444" : "#f59e0b"}
          strokeWidth="6"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-bold ${over ? "text-red-400" : "text-amber-400"}`}>
          {current}
        </span>
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
      <p className="text-[10px] text-neutral-400 mt-0.5">
        {Math.round(current)}{unit}
      </p>
    </div>
  );
}
