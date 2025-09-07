import React, { useState, useEffect, useRef } from 'react';
import { Search, User, ChefHat } from 'lucide-react';
import type { Ingredient } from '../types';

export interface SearchSuggestion {
  type: 'recipe' | 'author' | 'ingredient';
  value: string;
  label: string;
  icon?: string;
  meta?: string; // Info supplémentaire (catégorie pour ingrédient, etc.)
}

interface SmartSearchBarProps {
  onSearch: (suggestion: SearchSuggestion) => void;
  onClear: () => void;
  ingredients: Ingredient[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const SmartSearchBar: React.FC<SmartSearchBarProps> = ({
  onSearch,
  onClear,
  ingredients,
  placeholder = "Rechercher une recette, un auteur, un ingrédient...",
  disabled = false,
  className = ""
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Générer les suggestions basées sur la requête
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const searchTerm = query.toLowerCase().trim();
    const newSuggestions: SearchSuggestion[] = [];

    // Toujours proposer la recherche par nom de recette
    newSuggestions.push({
      type: 'recipe',
      value: query,
      label: `Recette: "${query}"`,
      meta: 'Recherche par nom de recette'
    });

    // Proposer la recherche par auteur si ça pourrait être un nom d'utilisateur
    // (pas de caractères spéciaux, longueur raisonnable)
    if (/^[a-zA-Z0-9_-]+$/.test(searchTerm) && searchTerm.length >= 2) {
      newSuggestions.push({
        type: 'author',
        value: query,
        label: `Auteur: "${query}"`,
        meta: 'Recherche par nom d\'utilisateur'
      });
    }

    // Rechercher dans les ingrédients
    const matchingIngredients = ingredients
      .filter(ingredient => 
        ingredient.name.toLowerCase().includes(searchTerm) ||
        ingredient.category?.toLowerCase().includes(searchTerm)
      )
      .slice(0, 5); // Limiter à 5 suggestions d'ingrédients

    matchingIngredients.forEach(ingredient => {
      newSuggestions.push({
        type: 'ingredient',
        value: ingredient.name,
        label: `Ingrédient: ${ingredient.name}`,
        icon: ingredient.icon,
        meta: ingredient.category
      });
    });

    setSuggestions(newSuggestions);
    setHighlightedIndex(-1);
  }, [query, ingredients]);

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.length >= 2);
  };

  const handleInputFocus = () => {
    if (query.length >= 2) {
      setIsOpen(true);
    }
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setQuery('');
    setIsOpen(false);
    setSuggestions([]);
    onSearch(suggestion);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        // Recherche directe par nom de recette
        handleSuggestionSelect({
          type: 'recipe',
          value: query,
          label: `Recette: "${query}"`,
          meta: 'Recherche par nom de recette'
        });
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSuggestionSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const getSuggestionIcon = (suggestion: SearchSuggestion) => {
    switch (suggestion.type) {
      case 'recipe':
        return <ChefHat className="h-4 w-4 text-blue-600" />;
      case 'author':
        return <User className="h-4 w-4 text-purple-600" />;
      case 'ingredient':
        return suggestion.icon ? (
          <span className="text-sm">{suggestion.icon}</span>
        ) : (
          <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-xs text-green-600">🥬</span>
          </div>
        );
      default:
        return null;
    }
  };

  const getSuggestionTypeColor = (type: string) => {
    switch (type) {
      case 'recipe':
        return 'bg-blue-100 text-blue-800';
      case 'author':
        return 'bg-purple-100 text-purple-800';
      case 'ingredient':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Barre de recherche */}
      <div className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={`
              w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-lg
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            `}
          />
          
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>

        {/* Dropdown des suggestions */}
        {isOpen && !disabled && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto"
          >
            <div className="py-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.value}-${index}`}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className={`
                    w-full px-4 py-3 text-left hover:bg-gray-100 flex items-center justify-between
                    ${index === highlightedIndex ? 'bg-blue-100' : ''}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    {getSuggestionIcon(suggestion)}
                    <div>
                      <div className="font-medium text-gray-900">{suggestion.label}</div>
                      {suggestion.meta && (
                        <div className="text-xs text-gray-500">{suggestion.meta}</div>
                      )}
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded ${getSuggestionTypeColor(suggestion.type)}`}>
                    {suggestion.type === 'recipe' ? 'Recette' : 
                     suggestion.type === 'author' ? 'Auteur' : 'Ingrédient'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Message d'aide */}
      {query.length > 0 && query.length < 2 && (
        <p className="text-xs text-gray-500 mt-1">
          Tapez au moins 2 caractères pour voir les suggestions
        </p>
      )}
    </div>
  );
};