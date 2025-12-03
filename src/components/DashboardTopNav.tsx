import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import UserBadge from "@/components/UserBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type DashboardNavLink = {
  label: string;
  href: string;
  cta?: boolean;
};

export const DEFAULT_NAV_LINKS: DashboardNavLink[] = [
  { label: "Markets", href: "/marketplace" },
  { label: "GitHub", href: "https://github.com/jameswalter4566/multibetdotfun" },
  { label: "Follow us", href: "https://x.com/multibetdotfun" },
];

interface DashboardTopNavProps {
  links?: DashboardNavLink[];
  homePath?: string;
}

const DashboardTopNav = ({ links = DEFAULT_NAV_LINKS, homePath = "/home" }: DashboardTopNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = useMemo(
    () => (links || DEFAULT_NAV_LINKS).filter((l) => l.label !== "Add your API" && l.label !== "Add your App"),
    [links]
  );

  const isActive = useCallback(
    (href: string) => {
      const path = location.pathname || "/";
      if (href === "/marketplace") return path === "/" || path === "/home" || path.startsWith("/marketplace");
      // Fallback: startsWith match
      return path.startsWith(href);
    },
    [location.pathname]
  );

  const handleNavigation = useCallback(
    (href: string) => {
      if (href.startsWith("#")) {
        // Only scroll in-place on home routes; otherwise go to home with hash
        const onHome = location.pathname === "/" || location.pathname === "/home";
        if (onHome) {
          if (typeof document !== "undefined") {
            const target = document.querySelector(href);
            if (target) {
              target.scrollIntoView({ behavior: "smooth", block: "start" });
              return;
            }
          }
        }
        if (typeof window !== "undefined") {
          window.location.href = `${homePath}${href}`;
        }
        return;
      }

      if (href.includes("#")) {
        if (typeof window !== "undefined") {
          window.location.href = href;
        }
        return;
      }

      if (href.startsWith("http")) {
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }

      navigate(href);
    },
    [homePath, navigate]
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1800px] items-center gap-3 px-3 py-3 sm:px-6">
        <a href="/" className="flex items-center gap-3 -ml-1 sm:-ml-2">
          <img src="/multibet-favicon.jpg" alt="multibet" className="h-11 w-11 rounded-xl border border-border object-cover shadow-sm" />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-sm uppercase tracking-[0.08em] text-muted-foreground">multibet</span>
            <span className="text-base font-semibold text-foreground">Prediction markets</span>
          </div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex flex-1 items-center gap-2 text-sm font-medium text-foreground/85 overflow-x-auto whitespace-nowrap">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <button
                key={link.label}
                type="button"
                onClick={() => handleNavigation(link.href)}
                className={cn(
                  "rounded-full border px-4 py-2 transition-all duration-150 shadow-sm hover:-translate-y-0.5",
                  active
                    ? "border-border/80 bg-white text-foreground"
                    : "border-transparent bg-secondary/80 text-foreground hover:border-border/80 hover:bg-white"
                )}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Mobile menu */}
        <div className="ml-auto md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-sm shadow-sm">Menu</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              {navLinks.map((link) => (
                <DropdownMenuItem key={link.label} onClick={() => handleNavigation(link.href)}>
                  {link.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <UserBadge />
          <a
            href="https://x.com/multibetdotfun"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow us on X"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/80 hover:bg-accent/60 text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path fill="currentColor" d="M3.5 0H9l4.5 6.5L18 0h6l-7.5 9.2L24 24h-5.5l-4.7-6.9L9 24H3.5l7.7-9.5L3.5 0Z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
};

export default DashboardTopNav;
