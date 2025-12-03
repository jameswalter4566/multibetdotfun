import { cn } from "@/lib/utils";
interface SiteFooterProps {
  className?: string;
}

export default function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer className={cn("w-full bg-background text-foreground border-t border-border/70", className)}>
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: brand statement */}
          <div className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            multibet brings crisp, leveraged prediction markets to Solana with transparent pricing and instant settlement.
          </div>

          {/* Right: social icons in circles */}
          <div className="md:justify-self-end flex items-center gap-3">
            <a
              href="https://x.com/multibetdotfun"
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 w-9 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-white shadow-sm"
              aria-label="Follow us on X"
            >
              <span className="text-foreground text-lg font-semibold leading-none">X</span>
            </a>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-6 pt-4 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground">
          <div>multibet — trade prediction markets with leverage on Solana</div>
          <div className="hidden md:block" />
        </div>
      </div>
    </footer>
  );
}
