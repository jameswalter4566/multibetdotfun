import { cn } from "@/lib/utils";
import { Instagram, Linkedin } from "lucide-react";

interface SiteFooterProps {
  className?: string;
}

export default function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer className={cn("w-full bg-black text-white border-t border-white/10", className)}>
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: brand statement */}
          <div className="text-sm text-white/80 leading-relaxed max-w-sm">
            x402 marketplace connects builders to production-ready APIs with wallet-based billing and zero credential sprawl.
          </div>

          {/* Right: social icons in circles */}
          <div className="md:justify-self-end flex items-center gap-3">
            <a
              href="https://x.com/marketx402"
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 w-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/15"
              aria-label="Follow us on X"
            >
              <span className="text-white text-lg font-semibold leading-none">X</span>
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
          <div>x402 marketplace - all rights reserved</div>
          <div className="hidden md:block" />
        </div>
      </div>
    </footer>
  );
}
