import React, { useState, useRef } from 'react';
import { Upload, X, User } from 'lucide-react';
import { Button } from './ui';
import { api } from '../services';
import { getFullImageUrl } from '../utils/imageUtils';

interface ProfileImageUploadProps {
  value?: string; // URL de l'image actuelle
  onChange: (imageUrl: string) => void;
  onError?: (error: string) => void;
  className?: string;
  accept?: string;
  maxSize?: number; // en MB
}

export const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({
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

      const response = await api.post('/upload/profile-image', formData, {
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

    // Pour les photos de profil, on ne supprime pas directement le fichier
    // car la suppression est gérée automatiquement lors du prochain upload
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
          <div className="relative overflow-hidden rounded-full border-4 border-gray-200 w-32 h-32 mx-auto">
            <img
              src={preview}
              alt="Photo de profil"
              className="w-full h-full object-cover"
            />
            
            {/* Overlay avec boutons */}
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={openFileDialog}
                  disabled={isUploading}
                  className="text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="w-4 h-4" />
                </Button>
                
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleRemove}
                  disabled={isUploading}
                  className="text-white bg-red-600 hover:bg-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {isUploading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            )}
          </div>
          
          <p className="text-center text-sm text-gray-500 mt-2">
            Survolez pour modifier ou supprimer
          </p>
        </div>
      ) : (
        <div
          onClick={openFileDialog}
          className={`border-2 border-dashed border-gray-300 rounded-full w-32 h-32 mx-auto cursor-pointer hover:border-gray-400 transition-colors flex items-center justify-center ${
            isUploading ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          <div className="flex flex-col items-center space-y-2">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full">
              {isUploading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              ) : (
                <User className="w-6 h-6 text-gray-500" />
              )}
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">
                {isUploading ? 'Upload...' : 'Photo de profil'}
              </p>
              <p className="text-xs text-gray-500">
                Cliquez pour ajouter
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};