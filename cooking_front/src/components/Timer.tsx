import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Button, Card } from './ui';

interface TimerProps {
  className?: string;
}

export interface TimerRef {
  startTimer: (minutes: number) => void;
}

export const Timer = forwardRef<TimerRef, TimerProps>(({ className = '' }, ref) => {
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(5);

  // Exposer la méthode startTimer via ref
  useImperativeHandle(ref, () => ({
    startTimer: (minutes: number) => {
      setTimeLeft(minutes * 60);
      setTimerActive(true);
    }
  }));

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
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Timer terminé !', {
          body: 'Le temps de cuisson est écoulé.',
          icon: '/chef-hat.svg'
        });
      } else {
        alert('Temps écoulé !');
      }
    }

    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // Demander la permission pour les notifications
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const startCustomTimer = () => {
    setTimeLeft(customMinutes * 60);
    setTimerActive(true);
  };

  const stopTimer = () => {
    setTimerActive(false);
    setTimeLeft(0);
  };

  const pauseTimer = () => {
    setTimerActive(false);
  };

  const resumeTimer = () => {
    if (timeLeft > 0) {
      setTimerActive(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={`p-3 ${timeLeft > 0 ? 'bg-primary-50 border-primary-200' : 'bg-gray-50'} ${className}`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Timer</h3>
          {timeLeft > 0 && (
            <div className={`text-lg font-bold ${timerActive ? 'text-primary-600' : 'text-orange-600'}`}>
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
        
        {timeLeft === 0 ? (
          // Interface de configuration du timer
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                id="timer-minutes"
                type="number"
                min="1"
                max="180"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-primary-500 focus:border-primary-500"
                placeholder="min"
              />
              <Button size="sm" onClick={startCustomTimer} className="text-xs px-2 py-1">
                Start
              </Button>
            </div>
            <p className="text-xs text-gray-500 leading-tight">
              💡 Cliquez sur une durée d'étape pour lancer le timer
            </p>
          </div>
        ) : (
          // Interface de contrôle du timer actif
          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              {timerActive ? (
                <Button size="sm" variant="secondary" onClick={pauseTimer} className="text-xs px-2 py-1">
                  Pause
                </Button>
              ) : (
                <Button size="sm" onClick={resumeTimer} className="text-xs px-2 py-1">
                  Reprendre
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={stopTimer} className="text-xs px-2 py-1">
                Stop
              </Button>
            </div>
            
            {timerActive && (
              <div className="flex items-center space-x-1 text-xs text-primary-600">
                <div className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
});