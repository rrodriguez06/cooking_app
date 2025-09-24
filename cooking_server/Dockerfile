# Build stage
FROM golang:1.25-alpine AS builder

# Installer les dépendances nécessaires incluant tesseract
RUN apk add --no-cache git ca-certificates tzdata \
    tesseract-ocr tesseract-ocr-dev \
    tesseract-ocr-data-fra tesseract-ocr-data-eng \
    leptonica-dev pkgconfig gcc musl-dev

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers de module Go
COPY go.mod go.sum ./

# Télécharger les dépendances
RUN go mod download

# Copier tout le code source
COPY . .

# Compiler l'application principale avec CGO activé pour Tesseract
RUN CGO_ENABLED=1 GOOS=linux go build -a -o main .

# Compiler le seeder
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o seeder ./seed_data

# Production stage
FROM alpine:latest

# Installer les dépendances runtime incluant tesseract
RUN apk --no-cache add ca-certificates tzdata \
    tesseract-ocr tesseract-ocr-data-fra tesseract-ocr-data-eng \
    leptonica

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copier les binaires depuis le stage de build
COPY --from=builder /app/main .
COPY --from=builder /app/seeder .
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/seed_data ./seed_data

# Créer le dossier uploads
RUN mkdir -p /app/uploads/images

# Changer les permissions
RUN chown -R appuser:appgroup /app
USER appuser

# Exposer le port
EXPOSE 8080

# Lancer l'application
CMD ["./main"]