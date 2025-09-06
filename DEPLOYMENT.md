# Cooking App - Guide de Déploiement

Ce guide explique comment déployer la cooking_app sur votre home server avec le sous-domaine `cooking.rrodriguez.dev`.

## Architecture de Déploiement

La solution utilise **Docker Compose + Traefik** pour :
- **Reverse proxy automatique** avec SSL/TLS via Let's Encrypt
- **Gestion multi-services** (frontend, backend, base de données)
- **Mises à jour simplifiées**
- **Monitoring et logs centralisés**

### Services déployés

- **Frontend React** : `cooking.rrodriguez.dev`
- **Backend Go API** : `cooking.rrodriguez.dev/api/*`
- **Base de données PostgreSQL** : Interne au réseau Docker
- **Traefik Dashboard** : `traefik.rrodriguez.dev` (optionnel)
- **pgAdmin** : `pgadmin.rrodriguez.dev` (optionnel)

## Prérequis

1. **Docker et Docker Compose** installés sur votre home server
2. **Port 80 et 443** ouverts sur votre routeur/firewall
3. **DNS configuré** : sous-domaine `cooking.rrodriguez.dev` pointant vers votre IP publique
4. **Email valide** pour Let's Encrypt

## Installation

### 1. Préparer l'environnement

```bash
# Cloner le projet sur votre home server
git clone <url-du-repo> /opt/cooking_app
cd /opt/cooking_app

# Copier et configurer le fichier d'environnement
cp .env.example .env
nano .env  # Modifier avec vos vraies valeurs
```

### 2. Configuration du fichier .env

Modifiez le fichier `.env` avec vos valeurs :

```bash
# Configuration de la base de données
DB_PASSWORD=votre_mot_de_passe_db_securise

# Configuration JWT (générez une clé de 32+ caractères)
JWT_SECRET=votre_cle_jwt_super_secrete_de_32_caracteres_minimum

# Configuration pgAdmin
PGADMIN_EMAIL=admin@rrodriguez.dev
PGADMIN_PASSWORD=votre_mot_de_passe_pgadmin

# Configuration Let's Encrypt
LETSENCRYPT_EMAIL=votre-email@rrodriguez.dev
```

### 3. Configuration DNS

Ajoutez ces enregistrements DNS à votre domaine `rrodriguez.dev` :

```
cooking.rrodriguez.dev    A    VOTRE_IP_PUBLIQUE
traefik.rrodriguez.dev    A    VOTRE_IP_PUBLIQUE  (optionnel)
pgadmin.rrodriguez.dev    A    VOTRE_IP_PUBLIQUE  (optionnel)
```

## Déploiement

### Démarrage initial

```bash
# Démarrer l'application
./deploy.sh start

# Ou sur Windows
.\deploy.ps1 start
```

### Commandes utiles

```bash
# Voir le statut des services
./deploy.sh status

# Voir les logs
./deploy.sh logs

# Voir les logs d'un service spécifique
./deploy.sh logs cooking-server

# Mettre à jour l'application
./deploy.sh update

# Redémarrer l'application
./deploy.sh restart

# Arrêter l'application
./deploy.sh stop
```

### Backup et restauration

```bash
# Créer un backup de la base de données
./deploy.sh backup

# Restaurer depuis un backup
./deploy.sh restore ./backups/cooking_db_backup_20250906_143022.sql
```

## Mise à jour du code

Pour mettre à jour l'application après des modifications :

```bash
# 1. Pull des dernières modifications
git pull origin main

# 2. Mise à jour automatique (rebuild + redémarrage)
./deploy.sh update
```

## Configuration Reverse Proxy

Traefik est configuré pour :
- **Redirection HTTP → HTTPS** automatique
- **Certificats SSL** via Let's Encrypt
- **Routing par domaine** et chemin
- **Load balancing** (si nécessaire)

### URLs d'accès

- **Application principale** : https://cooking.rrodriguez.dev
- **API Backend** : https://cooking.rrodriguez.dev/api/
- **Traefik Dashboard** : https://traefik.rrodriguez.dev
- **pgAdmin** : https://pgadmin.rrodriguez.dev

## Sécurité

### Recommandations

1. **Changez tous les mots de passe** dans `.env`
2. **Utilisez des clés JWT fortes** (32+ caractères)
3. **Configurez un firewall** (UFW, iptables)
4. **Mises à jour régulières** des images Docker
5. **Backups automatisés** de la base de données

### Firewall minimal

```bash
# Autoriser SSH, HTTP et HTTPS seulement
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## Monitoring et Logs

### Logs en temps réel

```bash
# Tous les services
docker-compose logs -f

# Service spécifique
docker-compose logs -f cooking-server
```

### Monitoring des ressources

```bash
# Utilisation des conteneurs
docker stats

# Espace disque
docker system df
```

## Dépannage

### Problèmes courants

1. **Certificat SSL non généré**
   - Vérifiez la configuration DNS
   - Vérifiez que les ports 80/443 sont ouverts
   - Consultez les logs Traefik : `docker-compose logs traefik`

2. **Application inaccessible**
   - Vérifiez le statut : `./deploy.sh status`
   - Vérifiez les logs : `./deploy.sh logs`
   - Vérifiez la connectivité réseau

3. **Base de données inaccessible**
   - Vérifiez les logs PostgreSQL : `docker-compose logs postgres`
   - Vérifiez les variables d'environnement dans `.env`

### Logs utiles

```bash
# Logs Traefik (routing, SSL)
docker-compose logs traefik

# Logs backend (API)
docker-compose logs cooking-server

# Logs frontend (Nginx)
docker-compose logs cooking-frontend

# Logs base de données
docker-compose logs postgres
```

## Avantages de cette solution

✅ **Simple à déployer** : Une seule commande `./deploy.sh start`  
✅ **SSL automatique** : Let's Encrypt via Traefik  
✅ **Mises à jour faciles** : `./deploy.sh update`  
✅ **Sauvegarde intégrée** : Scripts de backup/restore  
✅ **Monitoring inclus** : Logs centralisés  
✅ **Scalable** : Peut s'étendre facilement  
✅ **Production-ready** : Configuration sécurisée  

Cette solution est bien plus adaptée que Pterodactyl pour votre cas d'usage web multi-services !