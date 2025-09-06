import React, { useState, useEffect } from 'react';
import { X, Save, List } from 'lucide-react';
import { recipeListService } from '../services';
import { Button, Input, Card, CardContent, CardHeader } from './ui';
import type { RecipeList, RecipeListCreateRequest, RecipeListUpdateRequest } from '../types';

interface RecipeListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (list: RecipeList) => void;
  editingList?: RecipeList | null;
}

export const RecipeListModal: React.FC<RecipeListModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingList = null
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_public: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingList;

  // Initialiser le formulaire quand on ouvre le modal
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: editingList?.name || '',
        description: editingList?.description || '',
        is_public: editingList?.is_public || false
      });
      setError(null);
    }
  }, [isOpen, editingList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Le nom de la liste est requis');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let response;
      
      if (isEditing && editingList) {
        // Mise à jour d'une liste existante
        const updateData: RecipeListUpdateRequest = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          is_public: formData.is_public
        };
        response = await recipeListService.updateRecipeList(editingList.id, updateData);
      } else {
        // Création d'une nouvelle liste
        const createData: RecipeListCreateRequest = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          is_public: formData.is_public
        };
        response = await recipeListService.createRecipeList(createData);
      }

      onSuccess(response.data);
      onClose();
    } catch (error) {
      console.error('Error saving recipe list:', error);
      setError(isEditing ? 'Erreur lors de la mise à jour de la liste' : 'Erreur lors de la création de la liste');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <List className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold">
                {isEditing ? 'Modifier la liste' : 'Nouvelle liste de recettes'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <Input
              label="Nom de la liste"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Mes recettes d'hiver"
              required
              disabled={isLoading}
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description optionnelle de votre liste"
                rows={3}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_public"
                checked={formData.is_public}
                onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                disabled={isLoading}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="is_public" className="text-sm text-gray-700">
                Rendre cette liste publique (pourra être partagée avec d'autres utilisateurs)
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
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
                className="flex-1 flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{isEditing ? 'Modifier' : 'Créer'}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
