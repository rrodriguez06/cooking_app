import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context';
import { Button, Input, Card, CardContent, ForgotPasswordModal } from '../components';
import { userLoginSchema, userRegisterSchema } from '../utils/validation';
import type { UserLoginData, UserRegisterData } from '../utils/validation';
import { ChefHat } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register, isAuthenticated } = useAuth();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'register');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    console.log('LoginPage: useEffect triggered, isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      console.log('LoginPage: Navigating to:', from);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const loginForm = useForm<UserLoginData>({
    resolver: zodResolver(userLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registerForm = useForm<UserRegisterData>({
    resolver: zodResolver(userRegisterSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      avatar: '',
    },
  });

  const handleLogin = async (data: UserLoginData) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('LoginPage: handleLogin starting...');
      await login(data.email, data.password);
      console.log('LoginPage: login completed, isAuthenticated:', isAuthenticated);
      // Let the useEffect handle navigation
    } catch (error) {
      console.error('LoginPage: Login error:', error);
      setError(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: UserRegisterData) => {
    setIsLoading(true);
    setError(null);

    try {
      await register(data.username, data.email, data.password, data.avatar || undefined);
      // Let the useEffect handle navigation
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    loginForm.reset();
    registerForm.reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <ChefHat className="h-12 w-12 text-primary-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Connectez-vous' : 'Créez votre compte'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? (
              <>
                Pas encore de compte ?{' '}
                <button
                  onClick={toggleMode}
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Inscrivez-vous
                </button>
              </>
            ) : (
              <>
                Déjà un compte ?{' '}
                <button
                  onClick={toggleMode}
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Connectez-vous
                </button>
              </>
            )}
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardContent className="pt-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
                {error}
              </div>
            )}

            {isLogin ? (
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  {...loginForm.register('email')}
                  error={loginForm.formState.errors.email?.message}
                />
                <Input
                  label="Mot de passe"
                  type="password"
                  {...loginForm.register('password')}
                  error={loginForm.formState.errors.password?.message}
                />
                
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="text-sm text-primary-600 hover:text-primary-500"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  Se connecter
                </Button>
              </form>
            ) : (
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                <Input
                  label="Nom d'utilisateur"
                  {...registerForm.register('username')}
                  error={registerForm.formState.errors.username?.message}
                />
                <Input
                  label="Email"
                  type="email"
                  {...registerForm.register('email')}
                  error={registerForm.formState.errors.email?.message}
                />
                <Input
                  label="Mot de passe"
                  type="password"
                  {...registerForm.register('password')}
                  error={registerForm.formState.errors.password?.message}
                />
                <Input
                  label="Avatar (URL optionnel)"
                  {...registerForm.register('avatar')}
                  error={registerForm.formState.errors.avatar?.message}
                  helperText="Lien vers une image de profil"
                />
                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  S'inscrire
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Back to home */}
        <div className="text-center">
          <Link
            to="/"
            className="text-sm text-gray-600 hover:text-primary-600"
          >
            Retour à l'accueil
          </Link>
        </div>

        {/* Forgot Password Modal */}
        <ForgotPasswordModal
          isOpen={isForgotPasswordOpen}
          onClose={() => setIsForgotPasswordOpen(false)}
        />
      </div>
    </div>
  );
};
