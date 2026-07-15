import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '../components';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="font-display text-7xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Page introuvable</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <Button onClick={() => navigate('/')} className="mt-6 gap-2">
        <Home className="h-4 w-4" />
        Retour à l'accueil
      </Button>
    </div>
  );
};
