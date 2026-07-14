import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Input } from './ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { api } from '../services';
import type { Ingredient } from '../types';

interface AddIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (ingredient: Ingredient) => void;
}

export const AddIngredientModal: React.FC<AddIngredientModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    icon: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    'légume',
    'viande',
    'poisson',
    'fruits de mer',
    'produit laitier',
    'épice',
    'herbe',
    'féculent',
    'graine',
    'farine',
    'huile',
    'condiment',
    'fruit',
    'autre'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Le nom de l\'ingrédient est requis');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post<{
        success: boolean;
        data: Ingredient;
        message?: string;
      }>('/ingredients', {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        icon: formData.icon.trim(),
      });

      if (response.data.success) {
        onSuccess(response.data.data);
        handleClose();
      } else {
        setError(response.data.message || 'Erreur lors de la création de l\'ingrédient');
      }
    } catch (error: any) {
      console.error('Error creating ingredient:', error);
      if (error.response?.status === 409) {
        setError('Un ingrédient avec ce nom existe déjà');
      } else {
        setError('Erreur lors de la création de l\'ingrédient');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        name: '',
        description: '',
        category: '',
        icon: '',
      });
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Nouvel ingrédient
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <Input
            label="Nom de l'ingrédient"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Tomates cerises"
            required
            disabled={isLoading}
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Catégorie
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="">Sélectionnez une catégorie</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Icône (optionnel)"
            value={formData.icon}
            onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
            placeholder="Ex: 🍅"
            disabled={isLoading}
            maxLength={2}
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Description (optionnel)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description de l'ingrédient"
              disabled={isLoading}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
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
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Création...' : 'Créer l\'ingrédient'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
