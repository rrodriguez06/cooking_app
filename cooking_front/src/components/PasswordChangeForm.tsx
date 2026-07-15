import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Card, CardContent, CardHeader } from './ui';
import { userPasswordChangeSchema } from '../utils/validation';
import type { UserPasswordChangeData } from '../utils/validation';
import { userService } from '../services';
import { useAuth } from '../context';
import { AlertCircle, CheckCircle, Key } from 'lucide-react';

interface PasswordChangeFormProps {
  onSuccess?: () => void;
}

export const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({
  onSuccess,
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<UserPasswordChangeData>({
    resolver: zodResolver(userPasswordChangeSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const handleSubmit = async (data: UserPasswordChangeData) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await userService.changePassword(parseInt(user.id), {
        current_password: data.current_password,
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      });

      if (response.success) {
        setSuccess(true);
        form.reset();
        onSuccess?.();
        // Masquer le message de succès après 3 secondes
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Une erreur est survenue lors de la mise à jour du mot de passe');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Key className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Changer le mot de passe</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Mise à jour de votre mot de passe pour sécuriser votre compte.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {success && (
          <div className="flex items-center space-x-2 p-3 bg-herb-50 border border-herb-200 text-herb-700 rounded-md">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">Mot de passe mis à jour avec succès !</span>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-md">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <Input
            label="Mot de passe actuel"
            type="password"
            autoComplete="current-password"
            {...form.register('current_password')}
            error={form.formState.errors.current_password?.message}
            placeholder="Entrez votre mot de passe actuel"
          />

          <Input
            label="Nouveau mot de passe"
            type="password"
            autoComplete="new-password"
            {...form.register('new_password')}
            error={form.formState.errors.new_password?.message}
            placeholder="Au moins 8 caractères"
          />

          <Input
            label="Confirmer le mot de passe"
            type="password"
            {...form.register('confirm_password')}
            error={form.formState.errors.confirm_password?.message}
            placeholder="Confirmez votre nouveau mot de passe"
          />

          <Button
            type="submit"
            isLoading={isLoading}
            disabled={isLoading}
            className="w-full"
          >
            Mettre à jour le mot de passe
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
