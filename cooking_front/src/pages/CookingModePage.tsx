import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Loading } from '../components';
import { recipeService } from '../services/recipe';
import type { Recipe } from '../types';

export const CookingModePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const loadRecipe = async () => {
      if (!id) return;
      
      try {
        const response = await recipeService.getRecipe(parseInt(id));
        setRecipe(response.data);
      } catch (error) {
        console.error('Erreur lors du chargement de la recette:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecipe();
  }, [id]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      // Notification sonore ou visuelle
      alert('Temps écoulé !');
    }

    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const startTimer = (minutes: number) => {
    setTimeLeft(minutes * 60);
    setTimerActive(true);
  };

  const stopTimer = () => {
    setTimerActive(false);
    setTimeLeft(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const nextStep = () => {
    if (recipe && currentStep < recipe.instructions.length - 1) {
      setCurrentStep(prev => prev + 1);
      stopTimer(); // Arrêter le timer de l'étape précédente
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      stopTimer();
    }
  };

  const exitCookingMode = () => {
    navigate(`/recipe/${id}`);
  };

  if (loading) {
    return <Loading />;
  }

  if (!recipe) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Recette introuvable</h1>
          <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  const currentInstruction = recipe.instructions[currentStep];
  const progress = ((currentStep + 1) / recipe.instructions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-4 min-h-screen bg-gray-50">
      {/* Header avec contrôles */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{recipe.title}</h1>
            <p className="text-gray-600">Mode cuisson</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="secondary" onClick={exitCookingMode}>
              Quitter
            </Button>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Étape {currentStep + 1} sur {recipe.instructions.length}</span>
            <span>{Math.round(progress)}% terminé</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Timer */}
      {(timerActive || timeLeft > 0) && (
        <Card className="p-4 mb-6 bg-primary-50 border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-primary-900">Timer</h3>
              <p className="text-3xl font-bold text-primary-600">
                {formatTime(timeLeft)}
              </p>
            </div>
            <div className="space-x-2">
              {!timerActive && timeLeft === 0 && (
                <Button
                  onClick={() => startTimer(currentInstruction.duration || 5)}
                  variant="secondary"
                >
                  Démarrer
                </Button>
              )}
              {timerActive && (
                <Button onClick={stopTimer} variant="secondary">
                  Arrêter
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Étape courante */}
      <Card className="p-6 mb-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
            {currentStep + 1}
          </div>
          <div className="flex-1">
            {currentInstruction.title && (
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {currentInstruction.title}
              </h2>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {currentInstruction.duration && currentInstruction.duration > 0 && (
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-blue-600 font-semibold">Durée</div>
                  <div className="text-2xl font-bold text-blue-800">
                    {currentInstruction.duration} min
                  </div>
                  {!timerActive && (
                    <Button
                      size="sm"
                      onClick={() => startTimer(currentInstruction.duration || 0)}
                      className="mt-2"
                    >
                      Lancer le timer
                    </Button>
                  )}
                </div>
              )}
              
              {currentInstruction.temperature && currentInstruction.temperature > 0 && (
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-red-600 font-semibold">Température</div>
                  <div className="text-2xl font-bold text-red-800">
                    {currentInstruction.temperature}°C
                  </div>
                </div>
              )}
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-green-600 font-semibold">Portions</div>
                <div className="text-2xl font-bold text-green-800">
                  {recipe.servings}
                </div>
              </div>
            </div>
            
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 leading-relaxed">
                {currentInstruction.description}
              </p>
            </div>
            
            {currentInstruction.tips && (
              <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Conseil :</strong> {currentInstruction.tips}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Navigation entre les étapes */}
      <div className="flex justify-between items-center">
        <Button
          variant="secondary"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          ← Étape précédente
        </Button>
        
        <div className="flex space-x-2">
          <span className="text-sm text-gray-500">
            {currentStep + 1} / {recipe.instructions.length}
          </span>
        </div>
        
        {currentStep < recipe.instructions.length - 1 ? (
          <Button onClick={nextStep}>
            Étape suivante →
          </Button>
        ) : (
          <Button onClick={exitCookingMode} className="bg-green-600 hover:bg-green-700">
            Terminer la recette
          </Button>
        )}
      </div>

      {/* Ingrédients en sidebar fixe */}
      <div className="fixed right-4 top-4 w-80 max-h-96 overflow-y-auto bg-white rounded-lg shadow-lg p-4 hidden lg:block">
        <h3 className="font-semibold text-gray-900 mb-3">Ingrédients</h3>
        <div className="space-y-2">
          {recipe.ingredients?.map((ingredient, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-gray-700">{ingredient.ingredient.name}</span>
              <span className="text-gray-500">
                {ingredient.quantity} {ingredient.unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
