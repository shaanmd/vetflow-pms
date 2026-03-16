"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  PawPrint,
  Receipt,
  LayoutDashboard,
  Settings,
  BarChart3,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PracticeSwitcher } from "./practice-switcher";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: PawPrint },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/products", label: "Products", icon: Package },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r bg-background">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b">
          <Link href="/dashboard" className="flex items-center gap-2">
            <PawPrint className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">VetFlow</span>
          </Link>
        </div>

        {/* Practice Switcher */}
        <div className="px-2 py-3 border-b">
          <PracticeSwitcher />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
