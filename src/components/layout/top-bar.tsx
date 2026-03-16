"use client";

import { PawPrint, Menu, Bell, LogOut, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PracticeSwitcher } from "./practice-switcher";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarDays,
  FileText,
  Receipt,
  LayoutDashboard,
  Package,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: PawPrint },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/consults", label: "Consults", icon: FileText },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/products", label: "Products", icon: Package },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Mobile: hamburger + logo */}
        <div className="flex items-center gap-2 md:hidden">
          <Sheet>
            <SheetTrigger className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md hover:bg-accent transition-colors cursor-pointer">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex items-center h-14 px-4 border-b">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <PawPrint className="h-6 w-6 text-primary" />
                  <span className="font-bold text-lg">VetFlow</span>
                </Link>
              </div>
              <div className="px-2 py-3 border-b">
                <PracticeSwitcher />
              </div>
              <nav className="px-2 py-3 space-y-1">
                {navItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px]",
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
            </SheetContent>
          </Sheet>
          <Link href="/dashboard" className="flex items-center gap-1.5">
            <PawPrint className="h-5 w-5 text-primary" />
            <span className="font-bold">VetFlow</span>
          </Link>
        </div>

        {/* Desktop: spacer (sidebar has logo) */}
        <div className="hidden md:block" />

        {/* Right side actions */}
        <div className="flex items-center gap-1">
          <button className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md hover:bg-accent transition-colors">
            <Bell className="h-5 w-5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md hover:bg-accent transition-colors cursor-pointer">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">SM</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onSelect={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
