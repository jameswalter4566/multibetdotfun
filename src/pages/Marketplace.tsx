import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { apiProviders } from "@/data/apiProviders";

export default function Marketplace() {
  const navigate = useNavigate();

  const openDocs = useCallback(
    (slug: string) => {
      navigate(`/documentation/${slug}`);
    },
    [navigate]
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-center">API Marketplace</h1>
        <p className="mt-3 text-center text-muted-foreground text-base md:text-lg">
          Browse and call top third‑party APIs via a single unified endpoint.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apiProviders.map((provider) => (
            <div
              key={provider.slug}
              role="link"
              tabIndex={0}
              aria-label={`View documentation for ${provider.name}`}
              className="ios-card flex cursor-pointer flex-col p-6 transition-transform duration-200 hover:-translate-y-1"
              onClick={() => openDocs(provider.slug)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openDocs(provider.slug);
                }
              }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-secondary/50">
                  <img
                    src={provider.logo || "/placeholder.svg"}
                    alt={provider.name}
                    className="h-12 w-12 object-contain"
                    onError={(event) => {
                      (event.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                </div>
                <div className="mt-4 text-lg font-semibold text-foreground">{provider.name}</div>
                <div className="mt-2 text-sm text-muted-foreground">{provider.tagline}</div>
              </div>

              <div className="mt-auto pt-6">
                <Button
                  type="button"
                  className="w-full rounded-xl bg-[#0ea5ff] px-4 py-5 text-sm font-semibold text-white shadow-[0_0_12px_rgba(14,165,255,0.6)] hover:bg-[#08b0ff]"
                  onClick={(event) => {
                    event.stopPropagation();
                    openDocs(provider.slug);
                  }}
                >
                  Test Endpoint now
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
