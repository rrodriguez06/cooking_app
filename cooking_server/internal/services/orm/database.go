package orm

import (
	"context"
	"log"
	"time"

	"github.com/romainrodriguez/cooking_server/internal/services/orm/config"
	ormerrors "github.com/romainrodriguez/cooking_server/internal/services/orm/errors"
	"github.com/romainrodriguez/cooking_server/internal/services/orm/interfaces"
	"github.com/romainrodriguez/cooking_server/internal/services/orm/migrations"
	"github.com/romainrodriguez/cooking_server/internal/services/orm/repositories"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// ORMService est le service principal qui orchestre toutes les opérations de base de données
type ORMService struct {
	db               *gorm.DB
	config           *config.DatabaseConfig
	migrationService *migrations.MigrationService

	// Repositories
	UserRepository             interfaces.UserRepository
	RecipeRepository           interfaces.RecipeRepository
	IngredientRepository       interfaces.IngredientRepository
	EquipmentRepository        interfaces.EquipmentRepository
	CategoryRepository         interfaces.CategoryRepository
	TagRepository              interfaces.TagRepository
	CommentRepository          interfaces.CommentRepository
	RecipeIngredientRepository interfaces.RecipeIngredientRepository
	RecipeEquipmentRepository  interfaces.RecipeEquipmentRepository
	MealPlanRepository         interfaces.MealPlanRepository

	// Nouveaux repositories pour favoris et listes
	UserFavoriteRecipeRepository interfaces.UserFavoriteRecipeRepository
	RecipeListRepository         interfaces.RecipeListRepository
	UserFollowRepository         interfaces.UserFollowRepository
}

// NewORMService crée une nouvelle instance du service ORM
func NewORMService(cfg *config.DatabaseConfig) (*ORMService, error) {
	// Configuration du logger GORM
	var gormLogger logger.Interface
	if cfg.Debug {
		gormLogger = logger.Default.LogMode(logger.Info)
	} else {
		gormLogger = logger.Default.LogMode(logger.Silent)
	}

	// Connexion à la base de données
	db, err := gorm.Open(postgres.Open(cfg.GetDSN()), &gorm.Config{
		Logger: gormLogger,
	})
	if err != nil {
		return nil, ormerrors.NewDatabaseError("connection", err)
	}

	// Configuration de la pool de connexions
	sqlDB, err := db.DB()
	if err != nil {
		return nil, ormerrors.NewDatabaseError("db instance", err)
	}

	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// Test de la connexion
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, ormerrors.NewDatabaseError("ping", err)
	}

	log.Println("Successfully connected to database")

	// Initialisation du service
	service := &ORMService{
		db:               db,
		config:           cfg,
		migrationService: migrations.NewMigrationService(db),
	}

	// Initialisation des repositories
	service.initRepositories()

	return service, nil
}

// initRepositories initialise tous les repositories
func (s *ORMService) initRepositories() {
	s.UserRepository = repositories.NewUserRepository(s.db)
	s.RecipeRepository = repositories.NewRecipeRepository(s.db)
	s.IngredientRepository = repositories.NewIngredientRepository(s.db)
	s.EquipmentRepository = repositories.NewEquipmentRepository(s.db)
	s.CategoryRepository = repositories.NewCategoryRepository(s.db)
	s.TagRepository = repositories.NewTagRepository(s.db)
	s.CommentRepository = repositories.NewCommentRepository(s.db)
	s.RecipeIngredientRepository = repositories.NewRecipeIngredientRepository(s.db)
	s.RecipeEquipmentRepository = repositories.NewRecipeEquipmentRepository(s.db)
	s.MealPlanRepository = repositories.NewMealPlanRepository(s.db)

	// Nouveaux repositories
	s.UserFavoriteRecipeRepository = repositories.NewUserFavoriteRecipeRepository(s.db)
	s.RecipeListRepository = repositories.NewRecipeListRepository(s.db)
	s.UserFollowRepository = repositories.NewUserFollowRepository(s.db)
}

// Migrate exécute les migrations de la base de données
func (s *ORMService) Migrate() error {
	return s.migrationService.RunMigrations()
}

// SeedData insère des données de démonstration
func (s *ORMService) SeedData() error {
	return s.migrationService.SeedData()
}

// DropAllTables supprime toutes les tables (à utiliser avec précaution)
func (s *ORMService) DropAllTables() error {
	return s.migrationService.DropAllTables()
}

// Close ferme la connexion à la base de données
func (s *ORMService) Close() error {
	sqlDB, err := s.db.DB()
	if err != nil {
		return ormerrors.NewDatabaseError("get db instance", err)
	}

	if err := sqlDB.Close(); err != nil {
		return ormerrors.NewDatabaseError("close connection", err)
	}

	log.Println("Database connection closed")
	return nil
}

// GetDB retourne l'instance GORM (à utiliser avec précaution)
func (s *ORMService) GetDB() *gorm.DB {
	return s.db
}

// Transaction exécute une fonction dans une transaction
func (s *ORMService) Transaction(fn func(*gorm.DB) error) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := fn(tx); err != nil {
			return ormerrors.NewDatabaseError("transaction", err)
		}
		return nil
	})
}

// HealthCheck vérifie l'état de la connexion à la base de données
func (s *ORMService) HealthCheck(ctx context.Context) error {
	sqlDB, err := s.db.DB()
	if err != nil {
		return ormerrors.NewDatabaseError("get db instance", err)
	}

	if err := sqlDB.PingContext(ctx); err != nil {
		return ormerrors.NewDatabaseError("health check", err)
	}

	return nil
}

// GetStats retourne les statistiques de la base de données
func (s *ORMService) GetStats() (*DatabaseStats, error) {
	sqlDB, err := s.db.DB()
	if err != nil {
		return nil, ormerrors.NewDatabaseError("get db instance", err)
	}

	stats := sqlDB.Stats()
	return &DatabaseStats{
		OpenConnections:   stats.OpenConnections,
		InUse:             stats.InUse,
		Idle:              stats.Idle,
		WaitCount:         stats.WaitCount,
		WaitDuration:      stats.WaitDuration,
		MaxIdleClosed:     stats.MaxIdleClosed,
		MaxIdleTimeClosed: stats.MaxIdleTimeClosed,
		MaxLifetimeClosed: stats.MaxLifetimeClosed,
	}, nil
}

// DatabaseStats contient les statistiques de la base de données
type DatabaseStats struct {
	OpenConnections   int           `json:"open_connections"`
	InUse             int           `json:"in_use"`
	Idle              int           `json:"idle"`
	WaitCount         int64         `json:"wait_count"`
	WaitDuration      time.Duration `json:"wait_duration"`
	MaxIdleClosed     int64         `json:"max_idle_closed"`
	MaxIdleTimeClosed int64         `json:"max_idle_time_closed"`
	MaxLifetimeClosed int64         `json:"max_lifetime_closed"`
}

// NewORMServiceFromConfig crée un service ORM depuis les variables d'environnement
func NewORMServiceFromConfig() (*ORMService, error) {
	cfg := config.LoadDatabaseConfig()
	return NewORMService(cfg)
}
