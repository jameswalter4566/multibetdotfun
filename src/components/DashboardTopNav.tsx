import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import UserBadge from "@/components/UserBadge";

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
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-4 sm:px-8">
        <a href="/" className="flex items-center gap-2">
          <img src="/HUBX402DESIGN.png" alt="Hub X 402" className="h-9 w-auto" />
        </a>

        <nav className="flex flex-1 flex-wrap items-center gap-2 text-sm font-medium text-foreground/85">
          {links.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={() => handleNavigation(link.href)}
              className={cn(
                "rounded-full border border-transparent px-3 py-1.5 transition-all duration-150 hover:border-border/70 hover:bg-accent/40",
                link.cta && "bg-[#0ea5ff] px-4 py-2 font-semibold text-white shadow-[0_0_15px_rgba(14,165,255,0.35)] hover:bg-[#0c9ae8]"
              )}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
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
