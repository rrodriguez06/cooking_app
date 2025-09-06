#!/bin/bash

# Script de déploiement pour cooking_app
# Usage: ./deploy.sh [start|stop|restart|update|logs|status|backup|restore|seed|help]

set -e

APP_NAME="cooking_app"
COMPOSE_FILE="docker-compose.yml"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Vérifier que docker et docker-compose sont installés
check_requirements() {
    if ! command -v docker &> /dev/null; then
        error "Docker n'est pas installé"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose n'est pas installé"
        exit 1
    fi
}

# Vérifier le fichier .env
check_env_file() {
    if [[ ! -f ".env" ]]; then
        warning "Fichier .env non trouvé"
        if [[ -f ".env.example" ]]; then
            info "Copie de .env.example vers .env"
            cp .env.example .env
            warning "Veuillez modifier le fichier .env avec vos vraies valeurs avant de continuer"
            exit 1
        else
            error "Ni .env ni .env.example trouvés"
            exit 1
        fi
    fi
}

# Démarrer l'application
start() {
    log "Démarrage de $APP_NAME..."
    check_requirements
    check_env_file
    
    docker-compose -f $COMPOSE_FILE up -d
    
    log "Application démarrée avec succès!"
    info "Services disponibles:"
    info "  - Application: https://cooking.rrodriguez.dev"
    info "  - Traefik Dashboard: https://traefik.rrodriguez.dev"
    info "  - pgAdmin: https://pgadmin.rrodriguez.dev"
}

# Arrêter l'application
stop() {
    log "Arrêt de $APP_NAME..."
    docker-compose -f $COMPOSE_FILE down
    log "Application arrêtée"
}

# Redémarrer l'application
restart() {
    log "Redémarrage de $APP_NAME..."
    stop
    start
}

# Mettre à jour l'application
update() {
    log "Mise à jour de $APP_NAME..."
    
    # Arrêter et supprimer les containers existants
    log "Arrêt des containers existants..."
    docker-compose -f $COMPOSE_FILE down
    
    # Pull des dernières images
    log "Téléchargement des dernières images..."
    docker-compose -f $COMPOSE_FILE pull
    
    # Rebuild des images custom
    log "Reconstruction des images personnalisées..."
    docker-compose -f $COMPOSE_FILE build --no-cache
    
    # Redémarrage avec les nouvelles images
    log "Démarrage avec les nouvelles images..."
    docker-compose -f $COMPOSE_FILE up -d
    
    # Nettoyage des anciennes images
    log "Nettoyage des anciennes images..."
    docker image prune -f
    
    log "Mise à jour terminée!"
}

# Afficher les logs
logs() {
    local service=${2:-}
    if [[ -n $service ]]; then
        log "Logs du service $service:"
        docker-compose -f $COMPOSE_FILE logs -f $service
    else
        log "Logs de tous les services:"
        docker-compose -f $COMPOSE_FILE logs -f
    fi
}

# Afficher le statut des services
status() {
    log "Statut des services $APP_NAME:"
    docker-compose -f $COMPOSE_FILE ps
}

# Backup de la base de données
backup() {
    local backup_dir="./backups"
    local backup_file="$backup_dir/cooking_db_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    log "Création d'un backup de la base de données..."
    
    mkdir -p $backup_dir
    
    docker-compose -f $COMPOSE_FILE exec -T postgres pg_dump -U postgres cooking_db > $backup_file
    
    if [[ $? -eq 0 ]]; then
        log "Backup créé: $backup_file"
    else
        error "Échec du backup"
        exit 1
    fi
}

# Restaurer la base de données
restore() {
    local backup_file=$2
    
    if [[ -z $backup_file ]]; then
        error "Veuillez spécifier le fichier de backup"
        error "Usage: $0 restore <backup_file>"
        exit 1
    fi
    
    if [[ ! -f $backup_file ]]; then
        error "Fichier de backup non trouvé: $backup_file"
        exit 1
    fi
    
    warning "Cette opération va remplacer toutes les données de la base!"
    read -p "Êtes-vous sûr? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Restauration annulée"
        exit 0
    fi
    
    log "Restauration de la base de données depuis $backup_file..."
    
    docker-compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d cooking_db < $backup_file
    
    if [[ $? -eq 0 ]]; then
        log "Restauration terminée"
    else
        error "Échec de la restauration"
        exit 1
    fi
}

# Lancer le seeder
seed() {
    log "Vérification que l'application est en cours d'exécution..."
    
    if ! docker-compose -f $COMPOSE_FILE ps | grep -q "cooking_server.*Up"; then
        error "Le serveur cooking_server n'est pas en cours d'exécution"
        info "Veuillez démarrer l'application avec: $0 start"
        exit 1
    fi
    
    warning "⚠️  ATTENTION: Cette opération va ajouter des données de démonstration à la base de données!"
    warning "Si la base contient déjà ces données, cela pourrait créer des doublons."
    read -p "Voulez-vous continuer? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Seeding annulé"
        exit 0
    fi
    
    log "🌱 Lancement du seeder dans le conteneur cooking_server..."
    
    # Exécuter le seeder dans le conteneur
    if docker-compose -f $COMPOSE_FILE exec cooking-server ./seeder; then
        log "✅ Seeder exécuté avec succès!"
        info "La base de données a été peuplée avec des données de démonstration."
    else
        error "❌ Erreur lors de l'exécution du seeder"
        exit 1
    fi
}

# Afficher l'aide
help() {
    echo "Usage: $0 {start|stop|restart|update|logs|status|backup|restore|seed|help}"
    echo ""
    echo "Commandes:"
    echo "  start     - Démarrer l'application"
    echo "  stop      - Arrêter l'application"
    echo "  restart   - Redémarrer l'application"
    echo "  update    - Mettre à jour et redémarrer l'application"
    echo "  logs      - Afficher les logs (optionnel: nom du service)"
    echo "  status    - Afficher le statut des services"
    echo "  backup    - Créer un backup de la base de données"
    echo "  restore   - Restaurer la base de données depuis un backup"
    echo "  seed      - Peupler la base de données avec des données de démonstration"
    echo "  help      - Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 start"
    echo "  $0 logs cooking-server"
    echo "  $0 restore ./backups/cooking_db_backup_20250906_143022.sql"
    echo "  $0 seed"
}

# Point d'entrée principal
case "${1:-}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    update)
        update
        ;;
    logs)
        logs $@
        ;;
    status)
        status
        ;;
    backup)
        backup
        ;;
    restore)
        restore $@
        ;;
    seed)
        seed
        ;;
    help|--help|-h)
        help
        ;;
    "")
        error "Aucune commande spécifiée"
        help
        exit 1
        ;;
    *)
        error "Commande inconnue: $1"
        help
        exit 1
        ;;
esac