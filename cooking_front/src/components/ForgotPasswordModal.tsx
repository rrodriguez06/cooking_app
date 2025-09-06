import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Card, CardContent, CardHeader, Modal } from './ui';
import { userPasswordResetSchema } from '../utils/validation';
import type { UserPasswordResetData } from '../utils/validation';
import { authService } from '../services';
import { X, AlertCircle, CheckCircle } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<UserPasswordResetData>({
    resolver: zodResolver(userPasswordResetSchema),
    defaultValues: {
      email: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const handleSubmit = async (data: UserPasswordResetData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.resetPassword(data);
      if (response.success) {
        setSuccess(true);
        form.reset();
        // Fermer automatiquement après 2 secondes
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2000);
      } else {
        setError(response.message || 'Une erreur est survenue');
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Une erreur est survenue lors de la réinitialisation du mot de passe');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Mot de passe oublié</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="p-1 h-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Entrez votre email et votre nouveau mot de passe pour réinitialiser votre compte.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Mot de passe réinitialisé !
              </h3>
              <p className="text-green-600">
                Votre mot de passe a été mis à jour avec succès.
              </p>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <Input
                label="Email"
                type="email"
                {...form.register('email')}
                error={form.formState.errors.email?.message}
                placeholder="votre@email.com"
              />

              <Input
                label="Nouveau mot de passe"
                type="password"
                {...form.register('new_password')}
                error={form.formState.errors.new_password?.message}
                placeholder="Entrez votre nouveau mot de passe"
              />

              <Input
                label="Confirmer le mot de passe"
                type="password"
                {...form.register('confirm_password')}
                error={form.formState.errors.confirm_password?.message}
                placeholder="Confirmez votre nouveau mot de passe"
              />

              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  Réinitialiser
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </Modal>
  );
};
