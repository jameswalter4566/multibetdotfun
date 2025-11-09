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

interface DashboardTopNavProps {
  links: DashboardNavLink[];
  homePath?: string;
}

const DashboardTopNav = ({ links, homePath = "/home" }: DashboardTopNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const dedupedLinks: DashboardNavLink[] = useMemo(() => {
    // Remove sandbox link entirely
    const filtered = links.filter((l) => {
      const label = (l.label || '').toLowerCase();
      const href = (l.href || '').toLowerCase();
      return !(href === '#sandbox' || label.includes('sandbox'));
    });

    const byHref = new Map<string, DashboardNavLink>();
    for (const link of filtered) {
      const existing = byHref.get(link.href);
      if (!existing) {
        byHref.set(link.href, link);
      } else if (link.cta && !existing.cta) {
        // Prefer CTA variant when duplicates exist
        byHref.set(link.href, link);
      }
      // Otherwise keep the first
    }
    return Array.from(byHref.values());
  }, [links]);

  const isActive = useCallback(
    (href: string) => {
      const path = location.pathname || "/";
      // Docs: any documentation/* page
      if (href.startsWith("/documentation") || href.startsWith("/documentation/")) {
        return path.startsWith("/documentation");
      }
      // Agent: any /agent page
      if (href.startsWith("/agent")) return path.startsWith("/agent");
      // List API
      if (href.startsWith("/list-api")) return path.startsWith("/list-api");
      // Home anchors: consider active when on home or root
      if (href.startsWith("#")) return path === "/" || path === "/home";
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
    [homePath, navigate, location.pathname]
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1800px] items-center gap-3 px-3 py-2 sm:px-6">
        <a href="/" className="flex items-center gap-2 -ml-1 sm:-ml-2">
          <img src="/HUBX402DESIGN.png" alt="Hub X 402" className="h-12 w-auto" />
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex flex-1 items-center gap-2 text-sm font-medium text-foreground/85 overflow-x-auto whitespace-nowrap">
          {dedupedLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <button
                key={link.label}
                type="button"
                onClick={() => handleNavigation(link.href)}
                className={cn(
                  "rounded-full border px-3 py-1.5 transition-all duration-150",
                  link.cta
                    ? cn(
                        "px-4 py-2 font-semibold text-white shadow-[0_0_15px_rgba(168,85,247,0.35)]",
                        active ? "bg-[#7e22ce] border-transparent" : "bg-[#a855f7] border-transparent hover:bg-[#7e22ce]"
                      )
                    : cn(
                        "border-transparent hover:border-border/70 hover:bg-accent/40",
                        active && "bg-accent/60 border-border/70"
                      )
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
              <button className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-sm">Menu</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              {dedupedLinks.map((link) => (
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
            href="https://x.com/hubdotapp"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow us on X"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/80 hover:bg-accent/40"
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
