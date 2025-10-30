import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AutomationSandbox } from "@/components/automation/AutomationSandbox";
import SiteFooter from "@/components/SiteFooter";

export default function Automation() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/marketx-logo.png" alt="x402 marketplace" className="h-10 w-auto" />
            <span className="text-sm font-semibold tracking-tight">x402 marketplace</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="rounded-full border border-transparent hover:border-border/60">
              <Link to="/home">Back to dashboard</Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="rounded-full">
              <Link to="/documentation/openai">View docs</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10">
        <AutomationSandbox />
      </main>

      <SiteFooter className="mt-12 border-t border-border/70" />
    </div>
  );
}
