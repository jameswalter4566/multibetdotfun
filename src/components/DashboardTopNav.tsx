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
    const byHref = new Map<string, DashboardNavLink>();
    for (const link of links) {
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
        if (typeof document !== "undefined") {
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
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
            className="text-sm font-medium text-foreground/90 underline-offset-4 hover:underline"
          >
            Follow us on X
          </a>
        </div>
      </div>
    </header>
  );
};

export default DashboardTopNav;
