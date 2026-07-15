import React, { useState, useRef } from 'react';
import { Upload, Camera, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from './ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { recipeExtractionService } from '../services/recipeExtractionService';
import type { ExtractedRecipeData, ExtractRecipeResponse } from '../services/recipeExtractionService';
import { difficultyLabel } from '../utils';

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
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${className}`}>
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Importer une recette depuis une photo
          </DialogTitle>
        </DialogHeader>

        {/* Étape 1: Sélection du fichier */}
        {step === 'idle' && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-muted-foreground transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">
                Glissez votre photo de recette ici
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                ou cliquez pour sélectionner un fichier
              </p>
              <p className="text-xs text-muted-foreground">
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
              <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span className="text-sm text-destructive">{errorMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Étape 2: Preview et confirmation */}
        {step === 'idle' && selectedFile && previewUrl && (
          <div className="space-y-4 mt-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-foreground mb-2">Image sélectionnée:</h3>
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-64 mx-auto rounded-lg shadow-sm"
              />
              <p className="text-sm text-muted-foreground mt-2 text-center">
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
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">
              {getStepMessage()}
            </p>
            <p className="text-sm text-muted-foreground">
              Cela peut prendre quelques instants...
            </p>
          </div>
        )}

        {/* Étape 4: Succès */}
        {step === 'success' && extractionResult?.data && (
          <div className="space-y-4">
            <div className="bg-herb-50 border border-herb-200 rounded-md p-3 flex items-center space-x-2 dark:bg-herb-500/10 dark:border-herb-500/30">
              <CheckCircle className="h-5 w-5 text-herb-600 dark:text-herb-400" />
              <span className="text-sm text-herb-700 dark:text-herb-300">{getStepMessage()}</span>
            </div>

            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
              <h3 className="font-medium text-foreground mb-2">Recette extraite:</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Titre:</strong> {extractionResult.data.title}</p>
                <p><strong>Temps de préparation:</strong> {extractionResult.data.prep_time} min</p>
                <p><strong>Temps de cuisson:</strong> {extractionResult.data.cook_time} min</p>
                <p><strong>Portions:</strong> {extractionResult.data.servings}</p>
                <p><strong>Difficulté:</strong> {difficultyLabel(extractionResult.data.difficulty)}</p>
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
            <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-sm text-destructive">{errorMessage}</span>
            </div>

            {extractionResult?.extracted_text && (
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-foreground mb-2">Texte extrait (pour diagnostic):</h3>
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto bg-muted/50 p-2 rounded">
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
          <div className="mt-6 p-4 bg-primary/10 rounded-lg">
            <h3 className="font-medium text-primary mb-2">💡 Conseils pour de meilleurs résultats:</h3>
            <ul className="text-sm text-primary space-y-1">
              <li>• Utilisez une photo claire et bien éclairée</li>
              <li>• Assurez-vous que le texte est lisible</li>
              <li>• Évitez les photos avec beaucoup d'ombres</li>
              <li>• Les recettes en français ou anglais fonctionnent mieux</li>
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
