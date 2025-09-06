package orm

import (
	"errors"
	"fmt"
)

// Erreurs métier spécifiques
var (
	ErrRecordNotFound     = errors.New("record not found")
	ErrDuplicateEntry     = errors.New("duplicate entry")
	ErrInvalidInput       = errors.New("invalid input")
	ErrUnauthorized       = errors.New("unauthorized operation")
	ErrDatabaseConnection = errors.New("database connection error")
	ErrMigrationFailed    = errors.New("migration failed")
)

// ORMError encapsule les erreurs avec plus de contexte
type ORMError struct {
	Type    string
	Message string
	Err     error
}

func (e *ORMError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s (%v)", e.Type, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Type, e.Message)
}

func (e *ORMError) Unwrap() error {
	return e.Err
}

// Fonctions helper pour créer des erreurs typées
func NewNotFoundError(entity string, id interface{}) *ORMError {
	return &ORMError{
		Type:    "NOT_FOUND",
		Message: fmt.Sprintf("%s with id %v not found", entity, id),
		Err:     ErrRecordNotFound,
	}
}

func NewDuplicateError(entity string, field string, value interface{}) *ORMError {
	return &ORMError{
		Type:    "DUPLICATE",
		Message: fmt.Sprintf("%s with %s '%v' already exists", entity, field, value),
		Err:     ErrDuplicateEntry,
	}
}

func NewValidationError(message string) *ORMError {
	return &ORMError{
		Type:    "VALIDATION",
		Message: message,
		Err:     ErrInvalidInput,
	}
}

func NewUnauthorizedError(message string) *ORMError {
	return &ORMError{
		Type:    "UNAUTHORIZED",
		Message: message,
		Err:     ErrUnauthorized,
	}
}

func NewDatabaseError(operation string, err error) *ORMError {
	return &ORMError{
		Type:    "DATABASE",
		Message: fmt.Sprintf("database error during %s", operation),
		Err:     err,
	}
}
