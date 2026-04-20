export type Badge = {
  key: string;
  name: string;
  icon: string;
  description: string;
  category: "streak" | "workout" | "diet" | "discipline" | "social" | "beta";
  rarity: "common" | "rare" | "epic" | "legendary";
};

export const ALL_BADGES: Badge[] = [
  // ===== STREAK BADGES =====
  { key: "first_checkin", name: "Day One", icon: "🌅", description: "Logged your first check-in", category: "streak", rarity: "common" },
  { key: "streak_3", name: "3-Day Fire", icon: "🔥", description: "3-day check-in streak", category: "streak", rarity: "common" },
  { key: "streak_7", name: "Week Warrior", icon: "⚔️", description: "7-day check-in streak", category: "streak", rarity: "common" },
  { key: "streak_14", name: "Two Week Terror", icon: "💀", description: "14-day check-in streak", category: "streak", rarity: "rare" },
  { key: "streak_21", name: "Habit Formed", icon: "🧠", description: "21-day streak — it's a habit now", category: "streak", rarity: "rare" },
  { key: "streak_30", name: "Monthly Machine", icon: "⚙️", description: "30-day check-in streak", category: "streak", rarity: "rare" },
  { key: "streak_60", name: "Iron Will", icon: "🦾", description: "60-day check-in streak", category: "streak", rarity: "epic" },
  { key: "streak_90", name: "Quarter Beast", icon: "🐉", description: "90-day check-in streak", category: "streak", rarity: "epic" },
  { key: "streak_100", name: "Century Club", icon: "💯", description: "100-day check-in streak", category: "streak", rarity: "legendary" },
  { key: "streak_365", name: "Year of GRIT", icon: "👑", description: "365-day check-in streak", category: "streak", rarity: "legendary" },

  // ===== WORKOUT BADGES =====
  { key: "first_workout", name: "First Rep", icon: "💪", description: "Logged your first workout", category: "workout", rarity: "common" },
  { key: "workouts_10", name: "Getting Serious", icon: "🏋️", description: "Completed 10 workouts", category: "workout", rarity: "common" },
  { key: "workouts_25", name: "Quarter Ton", icon: "🔨", description: "Completed 25 workouts", category: "workout", rarity: "rare" },
  { key: "workouts_50", name: "Half Century", icon: "⚡", description: "Completed 50 workouts", category: "workout", rarity: "rare" },
  { key: "workouts_100", name: "Century Lifter", icon: "🏆", description: "Completed 100 workouts", category: "workout", rarity: "epic" },
  { key: "workouts_200", name: "Iron Addict", icon: "🔩", description: "Completed 200 workouts", category: "workout", rarity: "legendary" },
  { key: "heavy_100kg", name: "Heavy Lifter", icon: "🪨", description: "Lifted 100kg+ on any exercise", category: "workout", rarity: "rare" },
  { key: "heavy_150kg", name: "Beast Mode", icon: "🦍", description: "Lifted 150kg+ on any exercise", category: "workout", rarity: "epic" },
  { key: "volume_king", name: "Volume King", icon: "📊", description: "15+ sets in a single workout", category: "workout", rarity: "rare" },
  { key: "five_day_week", name: "5-Day Split", icon: "📅", description: "Worked out 5 days in one week", category: "workout", rarity: "rare" },
  { key: "six_day_week", name: "6-Day Animal", icon: "🐺", description: "Worked out 6 days in one week", category: "workout", rarity: "epic" },
  { key: "chest_day", name: "Chest Day", icon: "🫁", description: "First chest workout logged", category: "workout", rarity: "common" },
  { key: "back_day", name: "Back Attack", icon: "🦅", description: "First back workout logged", category: "workout", rarity: "common" },
  { key: "leg_day", name: "Never Skip", icon: "🦵", description: "First leg day logged", category: "workout", rarity: "common" },
  { key: "arm_day", name: "Gun Show", icon: "💪", description: "First arms workout logged", category: "workout", rarity: "common" },

  // ===== DIET BADGES =====
  { key: "first_food_log", name: "Calorie Conscious", icon: "🍽️", description: "Logged your first meal", category: "diet", rarity: "common" },
  { key: "food_7_days", name: "Diet Tracker", icon: "📝", description: "Logged food for 7 days straight", category: "diet", rarity: "common" },
  { key: "food_30_days", name: "Nutrition Nerd", icon: "🧪", description: "Logged food for 30 days straight", category: "diet", rarity: "rare" },
  { key: "protein_goal_7", name: "Protein King", icon: "🥩", description: "Hit 100g+ protein for 7 days", category: "diet", rarity: "rare" },
  { key: "under_calories_7", name: "Deficit Discipline", icon: "📉", description: "Under 2000 cal for 7 days straight", category: "diet", rarity: "rare" },
  { key: "clean_week", name: "Clean Eater", icon: "🥗", description: "No fast food logged for 14 days", category: "diet", rarity: "epic" },
  { key: "meal_prep_master", name: "Meal Prep Master", icon: "🍱", description: "All 3 meals logged for 21 days", category: "diet", rarity: "epic" },

  // ===== DISCIPLINE BADGES =====
  { key: "early_bird", name: "Early Bird", icon: "🐦", description: "Checked in before 7 AM", category: "discipline", rarity: "common" },
  { key: "hydration_7", name: "Hydration Hero", icon: "💧", description: "3L+ water for 7 days straight", category: "discipline", rarity: "rare" },
  { key: "sleep_master_7", name: "Sleep Master", icon: "😴", description: "7+ hours sleep for 7 nights", category: "discipline", rarity: "rare" },
  { key: "steps_10k_7", name: "Step Machine", icon: "🚶", description: "10K+ steps for 7 days straight", category: "discipline", rarity: "rare" },
  { key: "complete_log", name: "Completionist", icon: "✅", description: "All fields filled in one check-in", category: "discipline", rarity: "common" },
  { key: "perfect_week", name: "Perfect Week", icon: "🌟", description: "Complete check-in every day for 7 days", category: "discipline", rarity: "epic" },
  { key: "perfect_month", name: "Perfect Month", icon: "💎", description: "Complete check-in every day for 30 days", category: "discipline", rarity: "legendary" },
  { key: "no_rest_day", name: "No Days Off", icon: "😤", description: "Workout + check-in for 14 straight days", category: "discipline", rarity: "epic" },

  // ===== SOCIAL BADGES =====
  { key: "first_photo", name: "Gym Selfie", icon: "📸", description: "Uploaded your first workout photo", category: "social", rarity: "common" },
  { key: "photos_10", name: "Content Creator", icon: "🎬", description: "Uploaded 10 workout photos", category: "social", rarity: "rare" },
  { key: "photos_30", name: "Gym Rat", icon: "🐀", description: "Uploaded 30 workout photos", category: "social", rarity: "epic" },
  { key: "first_follower", name: "Influencer", icon: "⭐", description: "Got your first follower", category: "social", rarity: "common" },
  { key: "followers_5", name: "Squad Leader", icon: "👥", description: "5 people following you", category: "social", rarity: "rare" },
  { key: "referral_1", name: "Recruiter", icon: "🤝", description: "Your first successful referral", category: "social", rarity: "common" },
  { key: "referral_5", name: "Ambassador", icon: "🎖️", description: "5 successful referrals", category: "social", rarity: "epic" },

  // ===== BETA BADGES =====
  { key: "beta_tester", name: "Beta Tester", icon: "🧪", description: "Signed up during GRITZONE beta", category: "beta", rarity: "legendary" },
  { key: "beta_30", name: "Beta Warrior", icon: "🛡️", description: "30 days active during beta", category: "beta", rarity: "legendary" },
  { key: "beta_60", name: "Beta Veteran", icon: "🎗️", description: "60 days active during beta", category: "beta", rarity: "legendary" },
  { key: "beta_og", name: "OG Grinder", icon: "💀", description: "Among the first 10 beta users", category: "beta", rarity: "legendary" },
];

export const BADGE_MAP = Object.fromEntries(ALL_BADGES.map((b) => [b.key, b]));

export const RARITY_COLORS: Record<Badge["rarity"], string> = {
  common: "border-neutral-600 bg-neutral-900",
  rare: "border-blue-500/40 bg-blue-500/10",
  epic: "border-purple-500/40 bg-purple-500/10",
  legendary: "border-amber-500/40 bg-amber-500/10",
};

export const RARITY_LABELS: Record<Badge["rarity"], string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};
