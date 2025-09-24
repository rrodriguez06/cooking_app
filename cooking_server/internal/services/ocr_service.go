package services

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/otiai10/gosseract/v2"
)

// OCRService gère l'extraction de texte depuis des images
type OCRService struct{}

// NewOCRService crée une nouvelle instance du service OCR
func NewOCRService() *OCRService {
	return &OCRService{}
}

// ExtractTextFromImage extrait le texte d'une image en utilisant Tesseract
func (s *OCRService) ExtractTextFromImage(imageReader io.Reader, filename string) (string, error) {
	// Créer un fichier temporaire pour l'image
	tempDir := os.TempDir()
	tempFile := filepath.Join(tempDir, "ocr_"+filename)

	// Écrire l'image dans le fichier temporaire
	file, err := os.Create(tempFile)
	if err != nil {
		return "", fmt.Errorf("erreur lors de la création du fichier temporaire: %w", err)
	}
	defer file.Close()
	defer os.Remove(tempFile) // Nettoyer le fichier temporaire

	_, err = io.Copy(file, imageReader)
	if err != nil {
		return "", fmt.Errorf("erreur lors de l'écriture de l'image: %w", err)
	}

	// Initialiser le client Tesseract
	client := gosseract.NewClient()
	defer client.Close()

	// Configurer Tesseract pour français et anglais
	err = client.SetLanguage("fra+eng")
	if err != nil {
		// Fallback vers l'anglais si le français n'est pas disponible
		err = client.SetLanguage("eng")
		if err != nil {
			return "", fmt.Errorf("erreur lors de la configuration de la langue: %w", err)
		}
	}

	// Configurer le mode de segmentation de page pour du texte en bloc
	client.SetPageSegMode(gosseract.PSM_AUTO)

	// Définir l'image source
	err = client.SetImage(tempFile)
	if err != nil {
		return "", fmt.Errorf("erreur lors du chargement de l'image: %w", err)
	}

	// Extraire le texte
	text, err := client.Text()
	if err != nil {
		return "", fmt.Errorf("erreur lors de l'extraction de texte: %w", err)
	}

	// Nettoyer le texte extrait
	cleanedText := s.cleanExtractedText(text)

	if strings.TrimSpace(cleanedText) == "" {
		return "", fmt.Errorf("aucun texte détecté dans l'image")
	}

	return cleanedText, nil
}

// cleanExtractedText nettoie le texte extrait par l'OCR
func (s *OCRService) cleanExtractedText(text string) string {
	// Supprimer les espaces multiples
	lines := strings.Split(text, "\n")
	var cleanedLines []string

	for _, line := range lines {
		// Trim et ignorer les lignes vides ou trop courtes
		cleaned := strings.TrimSpace(line)
		if len(cleaned) >= 2 { // Ignorer les lignes avec moins de 2 caractères
			cleanedLines = append(cleanedLines, cleaned)
		}
	}

	// Rejoindre les lignes avec des retours à la ligne
	result := strings.Join(cleanedLines, "\n")

	// Remplacer les caractères spéciaux courants mal reconnus par l'OCR
	replacements := map[string]string{
		"—": "-",  // Em dash vers tiret
		"–": "-",  // En dash vers tiret
		"“": "\"", // Guillemets courbes
		"”": "\"",
		"‘": "'", // Apostrophes courbes
		"’": "'",
		"…": "...", // Points de suspension
	}

	for old, new := range replacements {
		result = strings.ReplaceAll(result, old, new)
	}

	return result
}

// ValidateImageFile valide qu'un fichier est une image supportée
func (s *OCRService) ValidateImageFile(filename string) error {
	ext := strings.ToLower(filepath.Ext(filename))
	supportedExts := []string{".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif"}

	for _, supportedExt := range supportedExts {
		if ext == supportedExt {
			return nil
		}
	}

	return fmt.Errorf("format d'image non supporté: %s. Formats acceptés: %s", ext, strings.Join(supportedExts, ", "))
}
