import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from './ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { passwordResetRequestSchema, passwordResetConfirmSchema } from '../utils/validation';
import type { PasswordResetRequestData, PasswordResetConfirmData } from '../utils/validation';
import { authService } from '../services';
import { toast } from './ui/sonner';
import { AlertCircle } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestForm = useForm<PasswordResetRequestData>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: '' },
  });

  const confirmForm = useForm<PasswordResetConfirmData>({
    resolver: zodResolver(passwordResetConfirmSchema),
    defaultValues: { token: '', new_password: '', confirm_password: '' },
  });

  const resetAll = () => {
    setStep('request');
    setEmail('');
    setError(null);
    requestForm.reset();
    confirmForm.reset();
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const handleRequest = async (data: PasswordResetRequestData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.requestPasswordReset({ email: data.email });
      setEmail(data.email);
      if (response.token) {
        // App familiale sans envoi d'email : le jeton est fourni directement pour l'étape 2.
        confirmForm.setValue('token', response.token);
        toast.success('Jeton généré. Choisissez un nouveau mot de passe.');
      } else {
        // Réponse générique (email inconnu) : on n'indique pas si le compte existe.
        toast(response.message || 'Si un compte existe pour cet email, un jeton a été généré.');
      }
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (data: PasswordResetConfirmData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.confirmPasswordReset({
        email,
        token: data.token,
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      });
      if (response.success) {
        toast.success('Mot de passe réinitialisé. Vous pouvez vous connecter.');
        handleClose();
      } else {
        setError(response.message || 'Une erreur est survenue.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Jeton invalide ou expiré.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Mot de passe oublié</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {step === 'request'
              ? 'Entrez votre email pour générer un jeton de réinitialisation à expiration.'
              : 'Saisissez le jeton et votre nouveau mot de passe.'}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-md">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {step === 'request' ? (
            <form onSubmit={requestForm.handleSubmit(handleRequest)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                {...requestForm.register('email')}
                error={requestForm.formState.errors.email?.message}
                placeholder="votre@email.com"
              />
              <div className="flex space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={handleClose} className="flex-1" disabled={isLoading}>
                  Annuler
                </Button>
                <Button type="submit" className="flex-1" isLoading={isLoading} disabled={isLoading}>
                  Continuer
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={confirmForm.handleSubmit(handleConfirm)} className="space-y-4">
              <Input
                label="Jeton de réinitialisation"
                type="text"
                {...confirmForm.register('token')}
                error={confirmForm.formState.errors.token?.message}
                placeholder="Collez le jeton"
              />
              <Input
                label="Nouveau mot de passe"
                type="password"
                {...confirmForm.register('new_password')}
                error={confirmForm.formState.errors.new_password?.message}
                placeholder="Au moins 8 caractères"
              />
              <Input
                label="Confirmer le mot de passe"
                type="password"
                {...confirmForm.register('confirm_password')}
                error={confirmForm.formState.errors.confirm_password?.message}
                placeholder="Confirmez votre nouveau mot de passe"
              />
              <div className="flex space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setStep('request')} className="flex-1" disabled={isLoading}>
                  Retour
                </Button>
                <Button type="submit" className="flex-1" isLoading={isLoading} disabled={isLoading}>
                  Réinitialiser
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
