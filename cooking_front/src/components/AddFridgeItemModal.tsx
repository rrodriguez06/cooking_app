import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Hash, FileText, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { toast } from './ui/sonner';
import type { FridgeItemCreateRequest, Ingredient } from '../types';
import { ingredientService } from '../services';
import { UNIT_OPTIONS } from './recipe-form/units';

interface AddFridgeItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: FridgeItemCreateRequest) => Promise<void>;
}

const AddFridgeItemModal: React.FC<AddFridgeItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  // États pour le formulaire
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [unit, setUnit] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // États pour la recherche d'ingrédients
  const [ingredientSearch, setIngredientSearch] = useState<string>('');
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [searchResults, setSearchResults] = useState<Ingredient[]>([]);
  const [showIngredientsList, setShowIngredientsList] = useState(false);

  // Charger les ingrédients
  useEffect(() => {
    if (isOpen) {
      loadIngredients();
      resetForm();
    }
  }, [isOpen]);

  // Filtrer les ingrédients selon la recherche
  useEffect(() => {
    if (ingredientSearch.trim()) {
      const filtered = availableIngredients.filter(ingredient =>
        ingredient.name.toLowerCase().includes(ingredientSearch.toLowerCase())
      );
      setSearchResults(filtered);
      setShowIngredientsList(true);
    } else {
      setSearchResults([]);
      setShowIngredientsList(false);
    }
  }, [ingredientSearch, availableIngredients]);

  const loadIngredients = async () => {
    try {
      const response = await ingredientService.getIngredients({ limit: 1000 });
      if (response.success && response.data) {
        // Gérer le nouveau format paginé ou l'ancien format tableau
        const ingredientsArray = Array.isArray(response.data)
          ? response.data
          : response.data.ingredients || [];
        setAvailableIngredients(ingredientsArray);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des ingrédients:', error);
    }
  };

  const resetForm = () => {
    setSelectedIngredient(null);
    setQuantity('');
    setUnit('');
    setExpiryDate('');
    setNotes('');
    setIngredientSearch('');
    setSearchResults([]);
    setShowIngredientsList(false);
  };

  const handleSelectIngredient = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setIngredientSearch(ingredient.name);
    setShowIngredientsList(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedIngredient) {
      toast.error('Veuillez sélectionner un ingrédient');
      return;
    }

    setIsSubmitting(true);

    try {
      const fridgeItem: FridgeItemCreateRequest = {
        ingredient_id: selectedIngredient.id,
        quantity: quantity ? parseFloat(quantity) : undefined,
        unit: unit || undefined,
        expiry_date: expiryDate || undefined,
        notes: notes || undefined
      };

      await onSubmit(fridgeItem);
      onClose();
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Obtenir la date d'aujourd'hui pour le min de l'input date
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Ajouter au frigo
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recherche d'ingrédient */}
          <div className="relative">
            <label className="block text-sm font-medium text-foreground mb-2">
              Ingrédient *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher un ingrédient..."
                value={ingredientSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIngredientSearch(e.target.value)}
                className="pl-10"
                required
              />
            </div>

            {/* Liste des suggestions d'ingrédients */}
            {showIngredientsList && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map(ingredient => (
                  <button
                    key={ingredient.id}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-muted focus:bg-muted focus:outline-none transition-colors duration-150"
                    onClick={() => handleSelectIngredient(ingredient)}
                  >
                    <div className="flex items-center gap-2">
                      {ingredient.icon && (
                        <span className="text-lg">{ingredient.icon}</span>
                      )}
                      <span>{ingredient.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showIngredientsList && searchResults.length === 0 && ingredientSearch.trim() && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
                Aucun ingrédient trouvé
              </div>
            )}
          </div>

          {/* Quantité et unité */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Hash className="inline h-4 w-4 mr-1" />
                Quantité
              </label>
              <Input
                type="number"
                placeholder="2"
                value={quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(e.target.value)}
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Unité
              </label>
              <Input
                type="text"
                list="fridge-unit-options"
                placeholder="g, ml, pièce…"
                value={unit}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUnit(e.target.value)}
              />
              <datalist id="fridge-unit-options">
                {UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Date d'expiration */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Date d'expiration
            </label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpiryDate(e.target.value)}
              min={today}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <FileText className="inline h-4 w-4 mr-1" />
              Notes
            </label>
            <Input
              type="text"
              placeholder="Notes supplémentaires..."
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
            />
          </div>

          {/* Résumé de l'ingrédient sélectionné */}
          {selectedIngredient && (
            <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
              <div className="flex items-center gap-2">
                {selectedIngredient.icon && (
                  <span className="text-lg">{selectedIngredient.icon}</span>
                )}
                <div>
                  <div className="font-medium text-primary">
                    {selectedIngredient.name}
                  </div>
                  {quantity && (
                    <div className="text-sm text-primary">
                      {quantity} {unit || 'unité(s)'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={!selectedIngredient}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddFridgeItemModal;
