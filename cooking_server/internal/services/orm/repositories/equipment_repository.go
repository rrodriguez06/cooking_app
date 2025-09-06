package repositories

import (
	"context"
	"errors"
	"strings"

	"github.com/romainrodriguez/cooking_server/internal/dto"
	ormerrors "github.com/romainrodriguez/cooking_server/internal/services/orm/errors"
	"gorm.io/gorm"
)

type equipmentRepository struct {
	db *gorm.DB
}

// NewEquipmentRepository crée une nouvelle instance du repository équipement
func NewEquipmentRepository(db *gorm.DB) *equipmentRepository {
	return &equipmentRepository{db: db}
}

// Create crée un nouvel équipement
func (r *equipmentRepository) Create(ctx context.Context, equipment *dto.Equipment) error {
	if err := r.db.WithContext(ctx).Create(equipment).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return ormerrors.NewDuplicateError("equipment", "name", equipment.Name)
		}
		return ormerrors.NewDatabaseError("create equipment", err)
	}
	return nil
}

// GetByID récupère un équipement par son ID
func (r *equipmentRepository) GetByID(ctx context.Context, id uint) (*dto.Equipment, error) {
	var equipment dto.Equipment
	if err := r.db.WithContext(ctx).First(&equipment, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ormerrors.NewNotFoundError("equipment", id)
		}
		return nil, ormerrors.NewDatabaseError("get equipment by id", err)
	}
	return &equipment, nil
}

// GetByName récupère un équipement par son nom
func (r *equipmentRepository) GetByName(ctx context.Context, name string) (*dto.Equipment, error) {
	var equipment dto.Equipment
	if err := r.db.WithContext(ctx).Where("LOWER(name) = LOWER(?)", name).First(&equipment).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ormerrors.NewNotFoundError("equipment", name)
		}
		return nil, ormerrors.NewDatabaseError("get equipment by name", err)
	}
	return &equipment, nil
}

// Update met à jour un équipement
func (r *equipmentRepository) Update(ctx context.Context, equipment *dto.Equipment) error {
	if err := r.db.WithContext(ctx).Save(equipment).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return ormerrors.NewDuplicateError("equipment", "name", equipment.Name)
		}
		return ormerrors.NewDatabaseError("update equipment", err)
	}
	return nil
}

// Delete supprime un équipement
func (r *equipmentRepository) Delete(ctx context.Context, id uint) error {
	result := r.db.WithContext(ctx).Delete(&dto.Equipment{}, id)
	if result.Error != nil {
		return ormerrors.NewDatabaseError("delete equipment", result.Error)
	}
	if result.RowsAffected == 0 {
		return ormerrors.NewNotFoundError("equipment", id)
	}
	return nil
}

// List récupère une liste d'équipements avec pagination
func (r *equipmentRepository) List(ctx context.Context, limit, offset int) ([]*dto.Equipment, int64, error) {
	var equipment []*dto.Equipment
	var total int64

	// Compter le total
	if err := r.db.WithContext(ctx).Model(&dto.Equipment{}).Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count equipment", err)
	}

	// Récupérer les équipements paginés
	if err := r.db.WithContext(ctx).
		Limit(limit).
		Offset(offset).
		Order("name ASC").
		Find(&equipment).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("list equipment", err)
	}

	return equipment, total, nil
}

// SearchByName recherche des équipements par nom (pour l'autocomplétion)
func (r *equipmentRepository) SearchByName(ctx context.Context, name string, limit int) ([]*dto.Equipment, error) {
	var equipment []*dto.Equipment
	searchTerm := "%" + strings.ToLower(name) + "%"

	if err := r.db.WithContext(ctx).
		Where("LOWER(name) LIKE ?", searchTerm).
		Limit(limit).
		Order("name ASC").
		Find(&equipment).Error; err != nil {
		return nil, ormerrors.NewDatabaseError("search equipment by name", err)
	}

	return equipment, nil
}
