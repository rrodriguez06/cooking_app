import React, { useState } from 'react';
import { Button } from './index';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { mealPlanService } from '../services';
import { getFullImageUrl } from '../utils/imageUtils';
import { buildPlannedDate, type MealTimeType } from '../utils';
import { Calendar, Clock, Users } from 'lucide-react';
import type { Recipe, MealPlanCreateRequest } from '../types';

interface PlanRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe;
  onSuccess?: () => void;
}

export const PlanRecipeModal: React.FC<PlanRecipeModalProps> = ({
  isOpen,
  onClose,
  recipe,
  onSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    planned_date: '',
    meal_type: 'dinner' as const,
    servings: recipe.servings,
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.planned_date) {
      setIsSubmitting(false);
      return;
    }

    try {
      // planned_date construit en heure locale (cohérent avec le générateur — GEN-1)
      const plannedDate = buildPlannedDate(formData.planned_date, formData.meal_type as MealTimeType);

      const requestData: MealPlanCreateRequest = {
        recipe_id: recipe.id,
        planned_date: plannedDate,
        meal_type: formData.meal_type,
        servings: formData.servings,
        notes: formData.notes || ''
      };

      const response = await mealPlanService.createMealPlan(requestData);

      if (response.success) {
        onSuccess?.();
        onClose();
        // Reset form
        setFormData({
          planned_date: '',
          meal_type: 'dinner',
          servings: recipe.servings,
          notes: ''
        });
      }
    } catch (error) {
      console.error('Error planning recipe:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Planifier la recette</DialogTitle>
        </DialogHeader>

        {/* Recipe Preview */}
        <div className="p-4 border border-border rounded-lg bg-muted/50">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {recipe.image_url ? (
                <img
                  src={getFullImageUrl(recipe.image_url)}
                  alt={recipe.title}
                  className="h-12 w-12 rounded-lg object-cover"
                  onError={(e) => {
                    // Fallback propre (pas d'innerHTML hors cycle React) : image placeholder
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/chef-hat.svg';
                  }}
                />
              ) : (
                <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <h3 className="font-medium text-foreground">{recipe.title}</h3>
              <p className="text-sm text-muted-foreground">{recipe.description}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              Date prévue
            </label>
            <input
              type="date"
              value={formData.planned_date}
              onChange={(e) => handleChange('planned_date', e.target.value)}
              min={today}
              required
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Meal Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Clock className="h-4 w-4 inline mr-2" />
              Type de repas
            </label>
            <select
              value={formData.meal_type}
              onChange={(e) => handleChange('meal_type', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="breakfast">Petit-déjeuner</option>
              <option value="lunch">Déjeuner</option>
              <option value="dinner">Dîner</option>
              <option value="snack">Collation</option>
            </select>
          </div>

          {/* Servings */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Users className="h-4 w-4 inline mr-2" />
              Nombre de portions
            </label>
            <input
              type="number"
              value={formData.servings}
              onChange={(e) => handleChange('servings', parseInt(e.target.value))}
              min="1"
              max="20"
              required
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes (optionnel)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              placeholder="Notes personnelles pour ce planning..."
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
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
              disabled={isSubmitting || !formData.planned_date}
              className="flex-1"
            >
              {isSubmitting ? 'Planification...' : 'Planifier'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
