import React, { useState } from 'react';
import { Button } from './index';
import { mealPlanService } from '../services';
import { getFullImageUrl } from '../utils/imageUtils';
import { Calendar, Clock, Users, X } from 'lucide-react';
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convert date to ISO string format expected by Go backend
      const plannedDate = new Date(formData.planned_date + 'T12:00:00.000Z').toISOString();
      
      const requestData: MealPlanCreateRequest = {
        recipe_id: recipe.id,
        planned_date: plannedDate,
        meal_type: formData.meal_type,
        servings: formData.servings,
        notes: formData.notes || ''
      };

      console.log('PlanRecipeModal: Sending request data:', requestData);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Planifier la recette
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Recipe Preview */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {recipe.image_url ? (
                <img
                  src={getFullImageUrl(recipe.image_url)}
                  alt={recipe.title}
                  className="h-12 w-12 rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `
                      <div class="h-12 w-12 bg-gray-300 rounded-lg flex items-center justify-center">
                        <svg class="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z" />
                        </svg>
                      </div>
                    `;
                  }}
                />
              ) : (
                <div className="h-12 w-12 bg-gray-300 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-gray-500" />
                </div>
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{recipe.title}</h3>
              <p className="text-sm text-gray-500">{recipe.description}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              Date prévue
            </label>
            <input
              type="date"
              value={formData.planned_date}
              onChange={(e) => handleChange('planned_date', e.target.value)}
              min={today}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Meal Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline mr-2" />
              Type de repas
            </label>
            <select
              value={formData.meal_type}
              onChange={(e) => handleChange('meal_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="breakfast">Petit-déjeuner</option>
              <option value="lunch">Déjeuner</option>
              <option value="dinner">Dîner</option>
              <option value="snack">Collation</option>
            </select>
          </div>

          {/* Servings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optionnel)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              placeholder="Notes personnelles pour ce planning..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
      </div>
    </div>
  );
};
