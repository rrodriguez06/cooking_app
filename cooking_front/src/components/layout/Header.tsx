import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context';
import { useTheme } from '../../hooks';
import { Button } from '../ui';
import { cn } from '../../utils';
import { Home, Search, Calendar, User, PlusCircle, Menu, X, LogOut, ChefHat, Refrigerator, Sun, Moon } from 'lucide-react';

const navigation = [
  { name: 'Accueil', href: '/', icon: Home },
  { name: 'Recherche', href: '/search', icon: Search },
  { name: 'Planning', href: '/planning', icon: Calendar },
  { name: 'Mon Frigo', href: '/fridge', icon: Refrigerator },
  { name: 'Nouvelle recette', href: '/recipe/new', icon: PlusCircle },
];

export const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Surligne l'item courant : égalité stricte pour l'accueil, préfixe pour les sections
  // (ex. /recipe/123, /user/5) — corrige NAV-5.
  const isCurrentPath = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  // Fermer le menu mobile à chaque changement de route (A11Y-5).
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  const ThemeToggle = () => (
    <button
      type="button"
      onClick={toggle}
      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
      title={theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );

  return (
    <header className="border-b border-border bg-card shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-primary" />
            <span className="font-display text-xl font-bold text-foreground">CookingApp</span>
          </Link>

          {/* Navigation desktop */}
          {isAuthenticated && (
            <nav className="hidden gap-1 md:flex">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isCurrentPath(item.href)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Menu utilisateur desktop */}
          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                  <User className="h-5 w-5" />
                  <span>{user?.username}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1">
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Connexion
                  </Button>
                </Link>
                <Link to="/login?mode=register">
                  <Button size="sm">Inscription</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Bouton menu mobile */}
          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Navigation mobile */}
        {isMobileMenuOpen && (
          <div id="mobile-nav" className="border-t border-border py-4 md:hidden">
            {isAuthenticated && (
              <nav className="mb-4 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium transition-colors',
                        isCurrentPath(item.href)
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            )}

            <div className="border-t border-border pt-4">
              {isAuthenticated ? (
                <div className="space-y-1">
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary"
                  >
                    <User className="h-5 w-5" />
                    <span>{user?.username}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-base font-medium text-muted-foreground hover:text-primary"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Déconnexion</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary"
                  >
                    Connexion
                  </Link>
                  <Link
                    to="/login?mode=register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-primary"
                  >
                    Inscription
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
