import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button, Input } from './ui';
import { recipeListService } from '../services';
import type { RecipeListCreateRequest } from '../types';

interface QuickCreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onListCreated: (listId: number) => void;
  recipeId?: number;
}

export const QuickCreateListModal: React.FC<QuickCreateListModalProps> = ({
  isOpen,
  onClose,
  onListCreated,
  recipeId
}) => {
  const [formData, setFormData] = useState<RecipeListCreateRequest>({
    name: '',
    description: '',
    is_public: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await recipeListService.createRecipeList(formData);
      if (response.success) {
        const listId = response.data.id;
        
        // Si un recipeId est fourni, ajouter automatiquement la recette à la liste
        if (recipeId) {
          await recipeListService.addRecipeToList(listId, {
            recipe_id: recipeId,
            notes: '',
            position: 0
          });
        }
        
        onListCreated(listId);
        onClose();
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          is_public: false
        });
      }
    } catch (error) {
      console.error('Erreur lors de la création de la liste:', error);
      setError('Erreur lors de la création de la liste');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setError(null);
    setFormData({
      name: '',
      description: '',
      is_public: false
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Créer une nouvelle liste
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Nom de la liste"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ma liste de recettes..."
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optionnelle)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de votre liste..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_public"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="is_public" className="ml-2 block text-sm text-gray-900">
                Rendre cette liste publique (pour le partage futur)
              </label>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className="flex-1"
            >
              {isLoading ? 'Création...' : 'Créer la liste'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
