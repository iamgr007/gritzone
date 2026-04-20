"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/food", label: "Food", icon: "🍽️" },
  { href: "/workout", label: "Workout", icon: "💪" },
  { href: "/achievements", label: "Badges", icon: "🏆" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#141414] border-t border-neutral-800 z-50 safe-bottom">
      <div className="max-w-lg mx-auto flex justify-around items-center py-2 px-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors ${
                active ? "text-amber-500" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
