# Build stage
FROM golang:1.25-alpine AS builder

# Installer les dépendances nécessaires
RUN apk add --no-cache git ca-certificates tzdata

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers de module Go
COPY go.mod go.sum ./

# Télécharger les dépendances
RUN go mod download

# Copier tout le code source
COPY . .

# Compiler l'application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Production stage
FROM alpine:latest

# Installer ca-certificates pour les connexions HTTPS
RUN apk --no-cache add ca-certificates tzdata

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /root/

# Copier le binaire depuis le stage de build
COPY --from=builder /app/main .
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/seed_data ./seed_data

# Changer les permissions
RUN chown -R appuser:appgroup /root
USER appuser

# Exposer le port
EXPOSE 8080

# Lancer l'application
CMD ["./main"]