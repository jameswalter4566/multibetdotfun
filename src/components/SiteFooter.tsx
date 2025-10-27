import { cn } from "@/lib/utils";
import { Twitter, Instagram, Linkedin } from "lucide-react";

interface SiteFooterProps {
  className?: string;
}

export default function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer className={cn("w-full bg-black text-white border-t border-white/10", className)}>
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: vertical text links + CTA */}
          <div>
            <nav className="flex flex-col gap-2 text-sm">
              <a href="/about" className="text-white/90 hover:text-white hover:underline">About us</a>
              <a href="/what-we-do" className="text-white/90 hover:text-white hover:underline">What we do</a>
              <a href="/campaigns" className="text-white/90 hover:text-white hover:underline">Start a Campaign</a>
            </nav>
            <div className="mt-4">
              <a
                href="#buy-liberated"
                className="inline-block px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium border border-white/20 hover:bg-white/15"
              >
                Buy $LIBERATED now
              </a>
            </div>
          </div>

          {/* Right: social icons in circles */}
          <div className="md:justify-self-end flex items-center gap-3">
            <a
              href="https://x.com/liberatedorg"
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 w-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/15"
              aria-label="Follow us on X"
            >
              <Twitter className="h-4 w-4 text-white" />
            </a>
            <a
              href="#instagram"
              className="h-9 w-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/15"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4 text-white" />
            </a>
            <a
              href="#linkedin"
              className="h-9 w-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/15"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-4 w-4 text-white" />
            </a>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/70">
          <div>© 2025 Liberated — all rights reserved</div>
          <div className="hidden md:block" />
        </div>
      </div>
    </footer>
  );
}
