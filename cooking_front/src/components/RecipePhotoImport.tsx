import React, { useState, useRef } from 'react';
import { Upload, Camera, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import { Button } from './ui';
import { recipeExtractionService } from '../services/recipeExtractionService';
import type { ExtractedRecipeData, ExtractRecipeResponse } from '../services/recipeExtractionService';

interface RecipePhotoImportProps {
  onRecipeExtracted: (data: ExtractedRecipeData) => void;
  onClose: () => void;
  className?: string;
}

type ExtractionStep = 'idle' | 'uploading' | 'ocr' | 'llm' | 'success' | 'error';

export const RecipePhotoImport: React.FC<RecipePhotoImportProps> = ({
  onRecipeExtracted,
  onClose,
  className = '',
}) => {
  const [step, setStep] = useState<ExtractionStep>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractRecipeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Valider le fichier
    const validation = recipeExtractionService.validateImageFile(file);
    if (!validation.isValid) {
      setErrorMessage(validation.message || 'Fichier invalide');
      return;
    }

    setSelectedFile(file);
    setErrorMessage('');
    
    // Créer une preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const startExtraction = async () => {
    if (!selectedFile) return;

    setStep('uploading');
    setErrorMessage('');

    try {
      // Vérifier l'état des services avant de commencer
      setStep('ocr');
      const health = await recipeExtractionService.checkHealth();
      
      if (health.status === 'error') {
        throw new Error('Services d\'extraction temporairement indisponibles');
      }

      // Lancer l'extraction
      setStep('llm');
      const result = await recipeExtractionService.extractFromImage(selectedFile);
      setExtractionResult(result);

      if (result.success && result.data) {
        setStep('success');
      } else {
        setStep('error');
        setErrorMessage(result.message || 'Erreur lors de l\'extraction');
      }
    } catch (error) {
      setStep('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erreur inattendue');
    }
  };

  const handleUseExtraction = () => {
    if (extractionResult?.data) {
      onRecipeExtracted(extractionResult.data);
      onClose();
    }
  };

  const handleRetry = () => {
    setStep('idle');
    setSelectedFile(null);
    setPreviewUrl(null);
    setExtractionResult(null);
    setErrorMessage('');
  };

  const getStepMessage = () => {
    switch (step) {
      case 'uploading':
        return 'Téléchargement de l\'image...';
      case 'ocr':
        return 'Analyse de l\'image et extraction du texte...';
      case 'llm':
        return 'Traitement de la recette par l\'IA...';
      case 'success':
        return 'Recette extraite avec succès !';
      case 'error':
        return 'Erreur lors de l\'extraction';
      default:
        return '';
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Importer une recette depuis une photo
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Étape 1: Sélection du fichier */}
        {step === 'idle' && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Glissez votre photo de recette ici
              </p>
              <p className="text-sm text-gray-500 mb-4">
                ou cliquez pour sélectionner un fichier
              </p>
              <p className="text-xs text-gray-400">
                JPG, PNG, BMP ou TIFF - Maximum 10MB
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/bmp,image/tiff"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <span className="text-sm text-red-600">{errorMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Étape 2: Preview et confirmation */}
        {step === 'idle' && selectedFile && previewUrl && (
          <div className="space-y-4 mt-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Image sélectionnée:</h3>
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-64 mx-auto rounded-lg shadow-sm"
              />
              <p className="text-sm text-gray-500 mt-2 text-center">
                {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)
              </p>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={startExtraction}
                className="flex-1 flex items-center justify-center space-x-2"
              >
                <Camera size={16} />
                <span>Extraire la recette</span>
              </Button>
              <Button
                variant="secondary"
                onClick={handleRetry}
              >
                Changer d'image
              </Button>
            </div>
          </div>
        )}

        {/* Étape 3: Extraction en cours */}
        {['uploading', 'ocr', 'llm'].includes(step) && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              {getStepMessage()}
            </p>
            <p className="text-sm text-gray-500">
              Cela peut prendre quelques instants...
            </p>
          </div>
        )}

        {/* Étape 4: Succès */}
        {step === 'success' && extractionResult?.data && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-sm text-green-600">{getStepMessage()}</span>
            </div>

            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
              <h3 className="font-medium text-gray-900 mb-2">Recette extraite:</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Titre:</strong> {extractionResult.data.title}</p>
                <p><strong>Temps de préparation:</strong> {extractionResult.data.prep_time} min</p>
                <p><strong>Temps de cuisson:</strong> {extractionResult.data.cook_time} min</p>
                <p><strong>Portions:</strong> {extractionResult.data.servings}</p>
                <p><strong>Difficulté:</strong> {extractionResult.data.difficulty}</p>
                <p><strong>Ingrédients:</strong> {extractionResult.data.ingredients.length} éléments</p>
                <p><strong>Étapes:</strong> {extractionResult.data.instructions.length} instructions</p>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={handleUseExtraction}
                className="flex-1"
              >
                Utiliser cette recette
              </Button>
              <Button
                variant="secondary"
                onClick={handleRetry}
              >
                Recommencer
              </Button>
            </div>
          </div>
        )}

        {/* Étape 5: Erreur */}
        {step === 'error' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <span className="text-sm text-red-600">{errorMessage}</span>
            </div>

            {extractionResult?.extracted_text && (
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Texte extrait (pour diagnostic):</h3>
                <pre className="text-sm text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto bg-gray-50 p-2 rounded">
                  {extractionResult.extracted_text}
                </pre>
              </div>
            )}

            <div className="flex space-x-3">
              <Button
                onClick={handleRetry}
                className="flex-1"
              >
                Réessayer avec une autre image
              </Button>
            </div>
          </div>
        )}

        {/* Footer avec conseils */}
        {step === 'idle' && !selectedFile && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">💡 Conseils pour de meilleurs résultats:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Utilisez une photo claire et bien éclairée</li>
              <li>• Assurez-vous que le texte est lisible</li>
              <li>• Évitez les photos avec beaucoup d'ombres</li>
              <li>• Les recettes en français ou anglais fonctionnent mieux</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};