import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import bdVoteLogo from "@/assets/bd-vote-logo.png";

<<<<<<< HEAD
interface NavbarProps {
  variant?: 'landing' | 'app';
}

interface NavLinkItemProps {
  href: string;
  label: string;
  isActive: boolean;
  mobile?: boolean;
  onClose?: () => void;
}

function NavLinkItem({ href, label, isActive, mobile = false, onClose }: NavLinkItemProps) {
  const isHash = href.includes("#");
  const baseClass = mobile
    ? "px-4 py-3 rounded-lg text-base font-medium transition-colors"
    : "text-sm font-medium transition-colors hover:text-primary";
  const activeClass = mobile ? "bg-primary/10 text-primary" : "text-primary";
  const inactiveClass = mobile
    ? "text-muted-foreground hover:bg-muted hover:text-foreground"
    : "text-muted-foreground";
  const className = cn(baseClass, isActive ? activeClass : inactiveClass);

  const handleHashClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onClose?.();
    const id = href.split("#")[1];
    if (window.location.pathname !== "/") {
      window.location.href = href;
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (isHash) {
    return (
      <a href={href} onClick={handleHashClick} className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link to={href} onClick={onClose} className={className}>
      {label}
    </Link>
  );
}

export function Navbar({ variant = 'landing' }: NavbarProps) {
=======
export function Navbar({ variant = 'landing' }) {
>>>>>>> main
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const landingLinks = [
    { href: "/#how-it-works", label: "কিভাবে কাজ করে" },
    { href: "/#features", label: "ফিচারসমূহ" },
    { href: "/results", label: "ফলাফল" },
  ];

  const links = variant === 'landing' ? landingLinks : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 sm:gap-3">
          <img src={bdVoteLogo} alt="BD Vote" className="h-9 w-auto" />
          <span className="text-lg sm:text-xl font-bold text-foreground">BD Vote</span>
        </Link>

        {/* Desktop */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
<<<<<<< HEAD
          {links.map((link) => {
            const isActive = link.href.includes("#")
              ? location.pathname === "/" && location.hash === link.href.replace("/", "")
              : location.pathname === link.href;
            return (
              <NavLinkItem key={link.href} href={link.href} label={link.label} isActive={isActive} />
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/verification">লগইন</Link>
          </Button>
          
          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="size-5" />
                <span className="sr-only">মেনু খুলুন</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-8">
                  <img src={bdVoteLogo} alt="BD Vote" className="h-9 w-auto" />
                  <span className="text-xl font-bold">BD Vote</span>
                </div>
                
                <nav className="flex flex-col gap-2">
                  {links.map((link) => {
                    const isActive = link.href.includes("#")
                      ? location.pathname === "/" && location.hash === link.href.replace("/", "")
                      : location.pathname === link.href;
                    return (
                      <NavLinkItem
                        key={link.href}
                        href={link.href}
                        label={link.label}
                        isActive={isActive}
                        mobile
                        onClose={() => setIsOpen(false)}
                      />
                    );
                  })}
                </nav>

                <div className="mt-auto pt-8">
                  <Button asChild className="w-full" size="lg">
                    <Link to="/verification" onClick={() => setIsOpen(false)}>
                      লগইন
                    </Link>
                  </Button>
                </div>
=======
          {links.map(link => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                location.pathname === link.href ? "text-primary" : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
          <Button asChild size="sm">
            <Link to="/admin/login">লগইন</Link>
          </Button>
        </nav>

        {/* Mobile */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] sm:w-[320px]">
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 mb-8">
                <img src={bdVoteLogo} alt="BD Vote" className="h-9 w-auto" />
                <span className="text-xl font-bold">BD Vote</span>
>>>>>>> main
              </div>

              <nav className="flex flex-col gap-2">
                {links.map(link => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "px-4 py-3 rounded-lg text-base font-medium transition-colors",
                      location.pathname === link.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}

                <Button asChild className="w-full mt-4">
                  <Link to="/admin/login" onClick={() => setIsOpen(false)}>
                    লগইন
                  </Link>
                </Button>
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
