package dto

import "time"

type User struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	Username string `json:"username" gorm:"uniqueIndex;not null"`
	Email    string `json:"email" gorm:"uniqueIndex;not null"`
	Password string `json:"-" gorm:"not null"` // Exclure le mot de passe des réponses JSON
	Avatar   string `json:"avatar"`
	IsActive bool   `json:"is_active" gorm:"default:true"`

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	Recipes  []Recipe  `json:"recipes,omitempty" gorm:"foreignKey:AuthorID"`
	Comments []Comment `json:"comments,omitempty" gorm:"foreignKey:UserID"`

	// Relations pour les favoris et listes personnalisées
	FavoriteRecipes []Recipe     `json:"favorite_recipes,omitempty" gorm:"many2many:user_favorite_recipes;"`
	RecipeLists     []RecipeList `json:"recipe_lists,omitempty" gorm:"foreignKey:UserID"`

	// Relations pour le système de suivi
	Following []User `json:"following,omitempty" gorm:"many2many:user_follows;foreignKey:ID;joinForeignKey:FollowerID;References:ID;joinReferences:FollowingID"`
	Followers []User `json:"followers,omitempty" gorm:"many2many:user_follows;foreignKey:ID;joinForeignKey:FollowingID;References:ID;joinReferences:FollowerID"`
}

type UserCreateRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Avatar   string `json:"avatar,omitempty"`
}

type UserUpdateRequest struct {
	Username string `json:"username,omitempty" binding:"omitempty,min=3,max=50"`
	Email    string `json:"email,omitempty" binding:"omitempty,email"`
	Password string `json:"password,omitempty" binding:"omitempty,min=6"`
	Avatar   string `json:"avatar,omitempty"`
	IsActive bool   `json:"is_active,omitempty"`
}

type UserLoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type UserPasswordResetRequest struct {
	Email           string `json:"email" binding:"required,email"`
	NewPassword     string `json:"new_password" binding:"required,min=6"`
	ConfirmPassword string `json:"confirm_password" binding:"required,min=6"`
}

type UserLoginResponse struct {
	User  *User  `json:"user"`
	Token string `json:"token"`
}

type UserResponse struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Avatar   string `json:"avatar,omitempty"`
}

// UserDetailsResponse représente la réponse pour un utilisateur avec détails
type UserDetailsResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Data    User   `json:"data"`
}

// UserListResponse représente la réponse pour une liste d'utilisateurs
type UserListResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Users       []User `json:"users"`
		TotalCount  int64  `json:"total_count"`
		CurrentPage int    `json:"current_page"`
		TotalPages  int    `json:"total_pages"`
		HasNext     bool   `json:"has_next"`
		HasPrev     bool   `json:"has_prev"`
	} `json:"data"`
}

// AuthSuccessResponse représente la réponse d'authentification réussie
type AuthSuccessResponse struct {
	Success bool              `json:"success"`
	Message string            `json:"message"`
	Data    UserLoginResponse `json:"data"`
}

// UserFollow représente une relation de suivi entre utilisateurs
type UserFollow struct {
	FollowerID  uint `json:"follower_id" gorm:"primaryKey"`
	FollowingID uint `json:"following_id" gorm:"primaryKey"`

	// Relations
	Follower  User `json:"follower,omitempty" gorm:"foreignKey:FollowerID"`
	Following User `json:"following,omitempty" gorm:"foreignKey:FollowingID"`
}

// TableName spécifie le nom de la table
func (UserFollow) TableName() string {
	return "user_follows"
}

// UserProfileResponse représente le profil public d'un utilisateur
type UserProfileResponse struct {
	Success bool `json:"success"`
	Data    struct {
		User           User         `json:"user"`
		PublicRecipes  []Recipe     `json:"public_recipes"`
		PublicLists    []RecipeList `json:"public_lists"`
		IsFollowing    bool         `json:"is_following"`
		FollowersCount int64        `json:"followers_count"`
		FollowingCount int64        `json:"following_count"`
		RecipeCount    int64        `json:"recipe_count"`
	} `json:"data"`
}

// UserFollowResponse représente la réponse pour les actions de suivi
type UserFollowResponse struct {
	Success     bool   `json:"success"`
	Message     string `json:"message"`
	IsFollowing bool   `json:"is_following"`
}

// UserFollowListResponse représente la liste des utilisateurs suivis/suiveurs
type UserFollowListResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Users       []User `json:"users"`
		TotalCount  int64  `json:"total_count"`
		CurrentPage int    `json:"current_page"`
		TotalPages  int    `json:"total_pages"`
		HasNext     bool   `json:"has_next"`
		HasPrev     bool   `json:"has_prev"`
	} `json:"data"`
}
