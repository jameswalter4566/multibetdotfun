import { cn } from "@/lib/utils";
import UserBadge from "@/components/UserBadge";

interface HeaderProps {
  className?: string;
}

const Header = ({ className }: HeaderProps) => {
  return (
    <header className={cn("w-full nav-glass py-3 px-6 border-b border-border/30", className)}>
      <div className="container mx-auto flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <img src="/f6cc0350-62e9-4a52-a7b4-e9955a2333a3.png" alt="Liberated" className="h-8 w-auto" />
          <img src="/950b5320-c3a6-44f1-8b8e-bdd46eb85fdf.png" alt="Partner" className="h-8 w-auto ml-2 align-middle" />
        </a>
        <nav className="hidden md:flex items-center gap-2">
          <a href="/#mission" className="ios-nav-link">Mission</a>
          <a href="/#workers" className="ios-nav-link">Explore Organizers</a>
          <a href="/campaigns" className="ios-nav-link">Campaigns</a>
          <a href="/explore" className="ios-nav-link">Explore Campaigns</a>
          <a href="https://x.com/liberatedorg" target="_blank" rel="noreferrer" className="ios-nav-link">X</a>
          <UserBadge />
        </nav>
      </div>
    </header>
  );
};

export default Header;
