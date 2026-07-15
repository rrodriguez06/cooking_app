import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Comment, CreateCommentRequest } from '../services/commentService';
import { commentService } from '../services/commentService';
import { useAuth } from '../context/AuthContext';
import CommentItem from './CommentItem';
import StarRating from './StarRating';

interface CommentsectionProps {
  recipeId: number;
}

const CommentSection: React.FC<CommentsectionProps> = ({ recipeId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [recipeId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const commentsData = await commentService.getCommentsByRecipe(recipeId);
      setComments(commentsData);
    } catch (err) {
      console.error('Error loading comments:', err);
      setError('Erreur lors du chargement des commentaires');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateComment = async () => {
    if (!newComment.trim() || !user) return;

    try {
      setSubmitting(true);
      const commentRequest: CreateCommentRequest = {
        content: newComment,
        rating: newRating,
        recipe_id: recipeId
      };

      await commentService.createComment(commentRequest);
      setNewComment('');
      setNewRating(0);
      await loadComments(); // Recharger les commentaires
    } catch (err) {
      console.error('Error creating comment:', err);
      setError('Erreur lors de la création du commentaire');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: number, content: string, rating: number) => {
    if (!user) return;

    try {
      const commentRequest: CreateCommentRequest = {
        content,
        rating,
        recipe_id: recipeId,
        parent_id: parentId
      };

      await commentService.createComment(commentRequest);
      await loadComments(); // Recharger les commentaires
    } catch (err) {
      console.error('Error creating reply:', err);
      setError('Erreur lors de la création de la réponse');
    }
  };

  const handleEdit = async (commentId: number, content: string, rating: number) => {
    try {
      await commentService.updateComment(commentId, { content, rating });
      await loadComments(); // Recharger les commentaires
    } catch (err) {
      console.error('Error updating comment:', err);
      setError('Erreur lors de la modification du commentaire');
    }
  };

  const handleDelete = async (commentId: number) => {
    try {
      await commentService.deleteComment(commentId);
      await loadComments(); // Recharger les commentaires
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Erreur lors de la suppression du commentaire');
    }
  };

  const averageRating = comments.length > 0 
    ? comments.reduce((sum, comment) => sum + comment.rating, 0) / comments.length 
    : 0;

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-md p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-foreground">
            Commentaires ({comments.length})
          </h3>
          {comments.length > 0 && (
            <div className="flex items-center space-x-2">
              <StarRating rating={Math.round(averageRating)} readonly />
              <span className="text-sm text-muted-foreground">
                ({averageRating.toFixed(1)}/5)
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/15 border border-destructive/30 text-destructive rounded-lg">
            {error}
          </div>
        )}

        {/* Formulaire pour nouveau commentaire */}
        {user ? (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-foreground mb-3">Laisser un commentaire</h4>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring resize-none"
              rows={4}
              placeholder="Partagez votre avis sur cette recette..."
            />
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm text-foreground">Votre note :</span>
                <StarRating rating={newRating} onRatingChange={setNewRating} />
              </div>
              <button
                onClick={handleCreateComment}
                disabled={!newComment.trim() || newRating < 1 || submitting}
                title={newRating < 1 ? 'Sélectionnez une note' : undefined}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Publication...' : 'Publier'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-muted-foreground">
              <Link to="/login" className="text-primary hover:text-primary/80">
                Connectez-vous
              </Link>{' '}
              pour laisser un commentaire
            </p>
          </div>
        )}
      </div>

      {/* Liste des commentaires */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.001 8.001 0 01-7.97-7.301c-.07-.446-.07-.894 0-1.34A8.001 8.001 0 0121 12z" />
              </svg>
            </div>
            <p className="text-muted-foreground">Aucun commentaire pour le moment</p>
            <p className="text-sm text-muted-foreground">Soyez le premier à donner votre avis !</p>
          </div>
        ) : (
          <>
            {comments
              .filter(comment => !comment.parent_id) // Afficher seulement les commentaires racine
              .map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
          </>
        )}
      </div>
    </div>
  );
};

export default CommentSection;
export { CommentSection };
