import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense } from "react";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Marketplace from "./pages/Marketplace";
import Stream from "./pages/Stream";
import Profile from "./pages/Profile";
import SignIn from "./pages/SignIn";
import Campaigns from "./pages/Campaigns";
import ExploreCampaigns from "./pages/ExploreCampaigns";
import Campaign from "./pages/Campaign";
import NotFound from "./pages/NotFound";
import ProviderDocumentation from "./pages/ProviderDocumentation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="app-content">
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<Index />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/documentation/:slug" element={<ProviderDocumentation />} />
          <Route path="/stream/:channel" element={<Stream />} />
          <Route path="/profile/:channel" element={<Profile />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaign/:id" element={<Campaign />} />
          <Route path="/explore" element={<ExploreCampaigns />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
