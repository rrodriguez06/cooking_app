import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import type { Ingredient } from '../types';

interface IngredientSearchProps {
  ingredients: Ingredient[];
  selectedIngredientId?: number;
  onSelect: (ingredient: Ingredient | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

export const IngredientSearch: React.FC<IngredientSearchProps> = ({
  ingredients,
  selectedIngredientId,
  onSelect,
  placeholder = "Rechercher un ingrédient...",
  disabled = false,
  error
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredIngredients, setFilteredIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialiser l'ingrédient sélectionné
  useEffect(() => {
    if (selectedIngredientId) {
      const ingredient = ingredients.find(ing => ing.id === selectedIngredientId);
      if (ingredient) {
        setSelectedIngredient(ingredient);
        // Afficher le nom avec l'icône si elle existe
        const displayName = ingredient.icon 
          ? `${ingredient.icon} ${ingredient.name}` 
          : ingredient.name;
        setSearchQuery(displayName);
      }
    } else {
      setSelectedIngredient(null);
      setSearchQuery('');
    }
  }, [selectedIngredientId, ingredients]);

  // Filtrer les ingrédients selon la recherche
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredIngredients(ingredients);
    } else {
      // Nettoyer la requête de recherche (supprimer les emojis pour la recherche)
      const cleanQuery = searchQuery.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
      
      const filtered = ingredients.filter(ingredient => {
        // Rechercher dans le nom de l'ingrédient et sa catégorie
        const nameMatch = ingredient.name.toLowerCase().includes(cleanQuery.toLowerCase());
        const categoryMatch = ingredient.category?.toLowerCase().includes(cleanQuery.toLowerCase());
        
        // Aussi permettre la recherche avec l'emoji inclus dans la requête
        const fullDisplayName = ingredient.icon 
          ? `${ingredient.icon} ${ingredient.name}` 
          : ingredient.name;
        const fullMatch = fullDisplayName.toLowerCase().includes(searchQuery.toLowerCase());
        
        return nameMatch || categoryMatch || fullMatch;
      });
      setFilteredIngredients(filtered);
    }
    setHighlightedIndex(-1);
  }, [searchQuery, ingredients]);

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
    setSearchQuery(value);
    setIsOpen(true);
    
    // Si on vide le champ, on désélectionne l'ingrédient
    if (!value.trim() && selectedIngredient) {
      setSelectedIngredient(null);
      onSelect(null);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleIngredientSelect = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    // Afficher le nom avec l'icône si elle existe
    const displayName = ingredient.icon 
      ? `${ingredient.icon} ${ingredient.name}` 
      : ingredient.name;
    setSearchQuery(displayName);
    setIsOpen(false);
    onSelect(ingredient);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredIngredients.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredIngredients.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredIngredients[highlightedIndex]) {
          handleIngredientSelect(filteredIngredients[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setSelectedIngredient(null);
    onSelect(null);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            ${error ? 'border-red-500' : 'border-gray-300'}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          `}
        />
        
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {searchQuery && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
          <ChevronDown 
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredIngredients.length > 0 ? (
            <ul>
              {filteredIngredients.map((ingredient, index) => (
                <li
                  key={ingredient.id}
                  onClick={() => handleIngredientSelect(ingredient)}
                  className={`
                    px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between
                    ${index === highlightedIndex ? 'bg-blue-100' : ''}
                    ${selectedIngredient?.id === ingredient.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}
                  `}
                >
                  <div className="flex items-center space-x-2">
                    {ingredient.icon && (
                      <span className="text-lg">{ingredient.icon}</span>
                    )}
                    <div>
                      <div className="font-medium">{ingredient.name}</div>
                      {ingredient.category && (
                        <div className="text-xs text-gray-500">{ingredient.category}</div>
                      )}
                    </div>
                  </div>
                  {selectedIngredient?.id === ingredient.id && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-gray-500 text-center">
              {searchQuery.trim() ? 'Aucun ingrédient trouvé' : 'Tapez pour rechercher...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};