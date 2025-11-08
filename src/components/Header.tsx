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
          <img src="/HUBX402DESIGN.png" alt="Hub X 402" className="h-8 w-auto" />
        </a>
        <nav className="hidden md:flex items-center gap-2">
          <a href="/#mission" className="ios-nav-link">Mission</a>
          <a href="/#workers" className="ios-nav-link">Explore Organizers</a>
          <a href="/campaigns" className="ios-nav-link">Campaigns</a>
          <a href="/explore" className="ios-nav-link">Explore Campaigns</a>
          <a href="https://x.com/hubdotapp" target="_blank" rel="noreferrer" className="ios-nav-link">X</a>
          <UserBadge />
        </nav>
      </div>
    </header>
  );
};

export default Header;
