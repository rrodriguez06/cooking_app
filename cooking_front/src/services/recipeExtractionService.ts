import api from './api';

export interface ExtractedIngredient {
  name: string;
  quantity: number;
  unit?: string;
  notes?: string;
}

export interface ExtractedInstruction {
  step_number: number;
  title?: string;
  description: string;
  duration?: number;
  temperature?: number;
  tips?: string;
}

export interface ExtractedRecipeData {
  title: string;
  description?: string;
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: ExtractedIngredient[];
  instructions: ExtractedInstruction[];
  tips?: string[];
  equipment?: string[];
}

export interface ExtractRecipeResponse {
  success: boolean;
  message?: string;
  data?: ExtractedRecipeData;
  extracted_text?: string;
}

export interface ExtractionHealthResponse {
  ocr_service: string;
  llm_service: string;
  status: string;
}

class RecipeExtractionService {
  /**
   * Extrait une recette depuis une image
   */
  async extractFromImage(imageFile: File): Promise<ExtractRecipeResponse> {
    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      const response = await api.post('/recipes/extract-from-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'extraction de recette:', error);
      return {
        success: false,
        message: 'Erreur de connexion au serveur. Veuillez réessayer.',
      };
    }
  }

  /**
   * Vérifie l'état des services d'extraction
   */
  async checkHealth(): Promise<ExtractionHealthResponse> {
    try {
      const response = await api.get('/recipes/extraction/health');
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la vérification de santé:', error);
      return {
        ocr_service: 'unknown',
        llm_service: 'unknown',
        status: 'error',
      };
    }
  }

  /**
   * Valide qu'un fichier est une image acceptable
   */
  validateImageFile(file: File): { isValid: boolean; message?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff'];

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        message: 'Format de fichier non supporté. Utilisez JPG, PNG, BMP ou TIFF.',
      };
    }

    if (file.size > maxSize) {
      return {
        isValid: false,
        message: 'Fichier trop volumineux. Taille maximale: 10MB.',
      };
    }

    return { isValid: true };
  }

  /**
   * Formate les données extraites pour les utiliser dans le formulaire de recette
   */
  formatForRecipeForm(extractedData: ExtractedRecipeData) {
    return {
      title: extractedData.title,
      description: extractedData.description || '',
      prep_time: extractedData.prep_time,
      cook_time: extractedData.cook_time,
      servings: extractedData.servings,
      difficulty: extractedData.difficulty,
      // Les ingrédients et instructions nécessiteront un mapping avec les IDs de la base
      ingredients: extractedData.ingredients,
      instructions: extractedData.instructions,
      tips: extractedData.tips?.join('\n') || '',
      equipment_names: extractedData.equipment || [],
    };
  }
}

export const recipeExtractionService = new RecipeExtractionService();