#!/bin/bash

# Script d'initialisation pour Ollama avec Gemma 2B

echo "Démarrage d'Ollama..."

# Démarrer le serveur Ollama en arrière-plan
ollama serve &

# Attendre que le serveur soit prêt
echo "Attente du démarrage du serveur Ollama..."
while ! curl -s http://localhost:11434/api/version > /dev/null; do
  sleep 2
done

echo "Serveur Ollama démarré, téléchargement du modèle Gemma 2B..."

# Télécharger et installer le modèle Gemma 2B
ollama pull gemma2:2b

echo "Modèle Gemma 2B téléchargé avec succès!"

# Garder le serveur en vie
wait