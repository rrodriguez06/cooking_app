package config

import (
	"fmt"
	"os"
	"strconv"
)

// DatabaseConfig contient la configuration de la base de données
type DatabaseConfig struct {
	Host         string
	Port         int
	User         string
	Password     string
	Database     string
	SSLMode      string
	MaxOpenConns int
	MaxIdleConns int
	Debug        bool
}

// LoadDatabaseConfig charge la configuration depuis les variables d'environnement
func LoadDatabaseConfig() *DatabaseConfig {
	config := &DatabaseConfig{
		Host:         getEnvString("DB_HOST", "localhost"),
		Port:         getEnvInt("DB_PORT", 5432),
		User:         getEnvString("DB_USER", "postgres"),
		Password:     getEnvString("DB_PASSWORD", ""),
		Database:     getEnvString("DB_NAME", "cooking_server"),
		SSLMode:      getEnvString("DB_SSL_MODE", "disable"),
		MaxOpenConns: getEnvInt("DB_MAX_OPEN_CONNS", 25),
		MaxIdleConns: getEnvInt("DB_MAX_IDLE_CONNS", 5),
		Debug:        getEnvBool("DB_DEBUG", false),
	}

	return config
}

// GetDSN retourne la chaîne de connexion PostgreSQL
func (c *DatabaseConfig) GetDSN() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.Database, c.SSLMode)
}

// Fonctions helper pour lire les variables d'environnement
func getEnvString(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}
