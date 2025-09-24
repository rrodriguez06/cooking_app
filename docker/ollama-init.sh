#!/bin/bash

# Script d'initialisation pour Ollama avec Gemma 2B

echo "Démarrage d'Ollama..."

# Démarrer le serveur Ollama en arrière-plan
ollama serve &
OLLAMA_PID=$!

echo "Serveur Ollama démarré avec PID: $OLLAMA_PID"

# Attendre que le serveur soit prêt (timeout de 2 minutes)
echo "Attente du démarrage du serveur Ollama..."
timeout=120
counter=0
while ! curl -s http://localhost:11434/api/version > /dev/null; do
  sleep 2
  counter=$((counter + 2))
  if [ $counter -ge $timeout ]; then
    echo "Timeout: Le serveur Ollama n'a pas démarré dans les temps"
    exit 1
  fi
done

echo "Serveur Ollama opérationnel, téléchargement du modèle Gemma 2B..."

# Télécharger le modèle Gemma 2B (peut prendre du temps)
if ollama pull gemma2:2b; then
  echo "Modèle Gemma 2B téléchargé avec succès!"
else
  echo "Erreur lors du téléchargement du modèle Gemma 2B"
fi

echo "Ollama initialisé et prêt à recevoir des requêtes"

# Garder le serveur en vie
wait $OLLAMA_PID