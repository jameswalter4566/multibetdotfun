import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SiteFooter from "@/components/SiteFooter";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="max-w-4xl mx-auto px-6 pt-24 pb-12 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Create your marketplace account</h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          One wallet-backed session unlocks publishing, analytics, and Hub X 402 billing across the entire platform.
        </p>
      </header>

      <main className="max-w-md mx-auto px-6 pb-16">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-border bg-secondary/40 p-6 shadow-glow space-y-5"
        >
          <div>
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter a secure password"
              className="mt-2"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Minimum 8 characters. Use a mix of letters, numbers, and symbols for best security.
            </p>
          </div>
          <Button type="submit" className="w-full rounded-xl bg-[#0ea5ff] py-4 text-sm font-semibold text-white hover:bg-[#08b0ff]">
            Sign up
          </Button>
          {submitted && (
            <div className="rounded-xl border border-emerald-400/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              Thanks! We just saved your submission. The integrations team will reach out with next steps.
            </div>
          )}
        </form>
      </main>

      <SiteFooter />
    </div>
  );
}
