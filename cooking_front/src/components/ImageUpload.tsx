import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui';
import { api } from '../services';
import { getFullImageUrl } from '../utils/imageUtils';

interface ImageUploadProps {
  value?: string; // URL de l'image actuelle
  onChange: (imageUrl: string) => void;
  onError?: (error: string) => void;
  className?: string;
  accept?: string;
  maxSize?: number; // en MB
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  onError,
  className = "",
  accept = "image/jpeg,image/png,image/webp",
  maxSize = 5
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value ? getFullImageUrl(value) : null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier la taille du fichier
    if (file.size > maxSize * 1024 * 1024) {
      const error = `Le fichier est trop volumineux (max ${maxSize}MB)`;
      onError?.(error);
      return;
    }

    // Vérifier le type de fichier
    const allowedTypes = accept.split(',').map(type => type.trim());
    if (!allowedTypes.includes(file.type)) {
      const error = `Type de fichier non supporté. Utilisez: ${allowedTypes.join(', ')}`;
      onError?.(error);
      return;
    }

    // Créer un aperçu local
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Uploader le fichier
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const imageUrl = response.data.image_url; // URL relative pour stockage
        const fullUrl = response.data.full_url;   // URL complète pour affichage
        onChange(imageUrl);
        // Utiliser l'URL complète si disponible, sinon construire l'URL
        setPreview(fullUrl || `${import.meta.env.VITE_API_URL}${imageUrl}`);
      } else {
        throw new Error(response.data.message || 'Erreur lors de l\'upload');
      }
    } catch (error: any) {
      console.error('Erreur upload:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de l\'upload';
      onError?.(errorMessage);
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    try {
      await api.delete('/upload/image', {
        data: { image_url: value }
      });
    } catch (error) {
      console.error('Erreur suppression image:', error);
      // Continue même si la suppression échoue
    }

    setPreview(null);
    onChange('');
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <div className="relative overflow-hidden rounded-lg border-2 border-gray-200">
            <img
              src={preview}
              alt="Aperçu de l'image"
              className="w-full h-48 object-cover"
            />
            
            {/* Overlay avec boutons */}
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={openFileDialog}
                disabled={isUploading}
                className="text-white bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Changer
              </Button>
              
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRemove}
                disabled={isUploading}
                className="text-white bg-red-600 hover:bg-red-700"
              >
                <X className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            </div>
          </div>

          {isUploading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={openFileDialog}
          className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors ${
            isUploading ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          <div className="flex flex-col items-center space-y-2">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full">
              <ImageIcon className="w-6 h-6 text-gray-500" />
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-900">
                {isUploading ? 'Upload en cours...' : 'Ajouter une image'}
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, WebP jusqu'à {maxSize}MB
              </p>
            </div>
            
            {isUploading && (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
