import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types/user';

interface UserLinkProps {
  user: User;
  children?: React.ReactNode;
  className?: string;
  showAvatar?: boolean;
}

// Fonction utilitaire pour comparer les IDs de manière robuste
const compareUserIds = (id1: string | number | undefined, id2: string | number | undefined): boolean => {
  if (!id1 || !id2) return false;
  return String(id1) === String(id2);
};

export const UserLink: React.FC<UserLinkProps> = ({ 
  user, 
  children, 
  className = "text-primary-600 hover:text-primary-800 font-medium transition-colors",
  showAvatar = false 
}) => {
  const { user: currentUser } = useAuth();
  
  // Si c'est l'utilisateur connecté, rediriger vers la page de profil
  const isCurrentUser = compareUserIds(currentUser?.id, user.id);
  const linkTo = isCurrentUser ? '/profile' : `/user/${user.id}`;

  return (
    <Link 
      to={linkTo} 
      className={`inline-flex items-center ${className}`}
    >
      {showAvatar && (
        <div className="w-6 h-6 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
          {user.avatar ? (
            <img 
              src={user.avatar} 
              alt={user.username}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            user.username.charAt(0).toUpperCase()
          )}
        </div>
      )}
      {children || user.username}
    </Link>
  );
};
