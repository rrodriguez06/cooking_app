# Script PowerShell de déploiement pour cooking_app
# Usage: .\deploy.ps1 [start|stop|restart|update|logs|status|backup|restore|help]

param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "restart", "update", "logs", "status", "backup", "restore", "help")]
    [string]$Action = "help",
    
    [Parameter(Position=1)]
    [string]$ServiceOrFile = ""
)

$APP_NAME = "cooking_app"
$COMPOSE_FILE = "docker-compose.yml"

# Fonction de logging avec couleurs
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    switch ($Level) {
        "ERROR" { Write-Host "[$timestamp] [ERROR] $Message" -ForegroundColor Red }
        "WARNING" { Write-Host "[$timestamp] [WARNING] $Message" -ForegroundColor Yellow }
        "SUCCESS" { Write-Host "[$timestamp] [SUCCESS] $Message" -ForegroundColor Green }
        "INFO" { Write-Host "[$timestamp] [INFO] $Message" -ForegroundColor Blue }
        default { Write-Host "[$timestamp] $Message" -ForegroundColor White }
    }
}

# Vérifier les prérequis
function Test-Requirements {
    $dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
    $composeInstalled = Get-Command docker-compose -ErrorAction SilentlyContinue
    
    if (-not $dockerInstalled) {
        Write-Log "Docker n'est pas installé ou pas dans le PATH" "ERROR"
        exit 1
    }
    
    if (-not $composeInstalled) {
        Write-Log "Docker Compose n'est pas installé ou pas dans le PATH" "ERROR"
        exit 1
    }
}

# Vérifier le fichier .env
function Test-EnvFile {
    if (-not (Test-Path ".env")) {
        Write-Log "Fichier .env non trouvé" "WARNING"
        if (Test-Path ".env.example") {
            Write-Log "Copie de .env.example vers .env" "INFO"
            Copy-Item ".env.example" ".env"
            Write-Log "Veuillez modifier le fichier .env avec vos vraies valeurs avant de continuer" "WARNING"
            exit 1
        } else {
            Write-Log "Ni .env ni .env.example trouvés" "ERROR"
            exit 1
        }
    }
}

# Démarrer l'application
function Start-App {
    Write-Log "Démarrage de $APP_NAME..." "INFO"
    Test-Requirements
    Test-EnvFile
    
    docker-compose -f $COMPOSE_FILE up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Application démarrée avec succès!" "SUCCESS"
        Write-Log "Services disponibles:" "INFO"
        Write-Log "  - Application: https://cooking.rrodriguez.dev" "INFO"
        Write-Log "  - Traefik Dashboard: https://traefik.rrodriguez.dev" "INFO"
        Write-Log "  - pgAdmin: https://pgadmin.rrodriguez.dev" "INFO"
    } else {
        Write-Log "Erreur lors du démarrage" "ERROR"
        exit 1
    }
}

# Arrêter l'application
function Stop-App {
    Write-Log "Arrêt de $APP_NAME..." "INFO"
    docker-compose -f $COMPOSE_FILE down
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Application arrêtée" "SUCCESS"
    } else {
        Write-Log "Erreur lors de l'arrêt" "ERROR"
        exit 1
    }
}

# Redémarrer l'application
function Restart-App {
    Write-Log "Redémarrage de $APP_NAME..." "INFO"
    Stop-App
    Start-App
}

# Mettre à jour l'application
function Update-App {
    Write-Log "Mise à jour de $APP_NAME..." "INFO"
    
    # Pull des dernières images
    Write-Log "Récupération des dernières images..." "INFO"
    docker-compose -f $COMPOSE_FILE pull
    
    # Rebuild des images custom
    Write-Log "Reconstruction des images personnalisées..." "INFO"
    docker-compose -f $COMPOSE_FILE build --no-cache
    
    # Redémarrage avec les nouvelles images
    Write-Log "Redémarrage avec les nouvelles images..." "INFO"
    docker-compose -f $COMPOSE_FILE up -d
    
    # Nettoyage des anciennes images
    Write-Log "Nettoyage des anciennes images..." "INFO"
    docker image prune -f
    
    Write-Log "Mise à jour terminée!" "SUCCESS"
}

# Afficher les logs
function Show-Logs {
    if ($ServiceOrFile) {
        Write-Log "Logs du service $ServiceOrFile:" "INFO"
        docker-compose -f $COMPOSE_FILE logs -f $ServiceOrFile
    } else {
        Write-Log "Logs de tous les services:" "INFO"
        docker-compose -f $COMPOSE_FILE logs -f
    }
}

# Afficher le statut des services
function Show-Status {
    Write-Log "Statut des services $APP_NAME:" "INFO"
    docker-compose -f $COMPOSE_FILE ps
}

# Backup de la base de données
function Backup-Database {
    $backupDir = "./backups"
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "$backupDir/cooking_db_backup_$timestamp.sql"
    
    Write-Log "Création d'un backup de la base de données..." "INFO"
    
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir | Out-Null
    }
    
    docker-compose -f $COMPOSE_FILE exec -T postgres pg_dump -U postgres cooking_db | Out-File -FilePath $backupFile -Encoding UTF8
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Backup créé: $backupFile" "SUCCESS"
    } else {
        Write-Log "Échec du backup" "ERROR"
        exit 1
    }
}

# Restaurer la base de données
function Restore-Database {
    $backupFile = $ServiceOrFile
    
    if (-not $backupFile) {
        Write-Log "Veuillez spécifier le fichier de backup" "ERROR"
        Write-Log "Usage: .\deploy.ps1 restore <backup_file>" "ERROR"
        exit 1
    }
    
    if (-not (Test-Path $backupFile)) {
        Write-Log "Fichier de backup non trouvé: $backupFile" "ERROR"
        exit 1
    }
    
    Write-Log "Cette opération va remplacer toutes les données de la base!" "WARNING"
    $confirmation = Read-Host "Êtes-vous sûr? (y/N)"
    
    if ($confirmation -notmatch "^[Yy]$") {
        Write-Log "Restauration annulée" "INFO"
        exit 0
    }
    
    Write-Log "Restauration de la base de données depuis $backupFile..." "INFO"
    
    Get-Content $backupFile | docker-compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d cooking_db
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Restauration terminée" "SUCCESS"
    } else {
        Write-Log "Échec de la restauration" "ERROR"
        exit 1
    }
}

# Afficher l'aide
function Show-Help {
    Write-Host @"
Usage: .\deploy.ps1 {start|stop|restart|update|logs|status|backup|restore|help}

Commandes:
  start     - Démarrer l'application
  stop      - Arrêter l'application
  restart   - Redémarrer l'application
  update    - Mettre à jour et redémarrer l'application
  logs      - Afficher les logs (optionnel: nom du service)
  status    - Afficher le statut des services
  backup    - Créer un backup de la base de données
  restore   - Restaurer la base de données depuis un backup
  help      - Afficher cette aide

Exemples:
  .\deploy.ps1 start
  .\deploy.ps1 logs cooking-server
  .\deploy.ps1 restore .\backups\cooking_db_backup_20250906_143022.sql
"@
}

# Point d'entrée principal
switch ($Action) {
    "start" { Start-App }
    "stop" { Stop-App }
    "restart" { Restart-App }
    "update" { Update-App }
    "logs" { Show-Logs }
    "status" { Show-Status }
    "backup" { Backup-Database }
    "restore" { Restore-Database }
    "help" { Show-Help }
    default { 
        Write-Log "Commande inconnue: $Action" "ERROR"
        Show-Help
        exit 1
    }
}