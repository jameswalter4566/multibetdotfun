export default function Marketplace() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-center">API Marketplace</h1>
        <p className="mt-3 text-center text-muted-foreground text-base md:text-lg">
          Browse and call top third‑party APIs via a single unified endpoint.
        </p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {["OpenAI", "Claude", "Stripe", "Google Maps", "YouTube Data", "Twilio"].map((name) => (
            <div key={name} className="ios-card p-5">
              <div className="text-lg font-semibold">{name}</div>
              <div className="text-sm text-muted-foreground mt-1">Instant access. No API key required. Powered by x402.</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

