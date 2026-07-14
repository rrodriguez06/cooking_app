import React, { useState } from 'react';
import type { Comment } from '../services/commentService';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from './ConfirmDialog';
import StarRating from './StarRating';

interface CommentItemProps {
  comment: Comment;
  onReply?: (parentId: number, content: string, rating: number) => void;
  onEdit?: (commentId: number, content: string, rating: number) => void;
  onDelete?: (commentId: number) => void;
  level?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onEdit,
  onDelete,
  level = 0
}) => {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyRating, setReplyRating] = useState(5);
  const [editContent, setEditContent] = useState(comment.content);
  const [editRating, setEditRating] = useState(comment.rating);
  const [showReplies, setShowReplies] = useState(false);

  const isOwner = user?.id === comment.user_id.toString();
  const marginLeft = level * 3; // Indentation pour les réponses

  const handleReplySubmit = () => {
    if (replyContent.trim() && onReply) {
      onReply(comment.id, replyContent, replyRating);
      setReplyContent('');
      setReplyRating(5);
      setIsReplying(false);
    }
  };

  const handleEditSubmit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(comment.id, editContent, editRating);
      setIsEditing(false);
    }
  };

  const handleDeleteClick = async () => {
    const ok = await confirm({
      title: 'Supprimer le commentaire',
      description: 'Êtes-vous sûr de vouloir supprimer ce commentaire ?',
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (ok) {
      onDelete?.(comment.id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`bg-card rounded-lg border border-border p-4 mb-4`} style={{ marginLeft: `${marginLeft}rem` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
            {comment.user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h4 className="font-medium text-foreground">{comment.user?.username || 'Utilisateur'}</h4>
            <p className="text-sm text-muted-foreground">{formatDate(comment.created_at)}</p>
          </div>
          <StarRating rating={comment.rating} readonly size="sm" />
        </div>
        
        {isOwner && (
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEditing(true)}
              className="text-primary hover:text-primary/80 text-sm"
            >
              Modifier
            </button>
            <button
              onClick={handleDeleteClick}
              className="text-destructive hover:text-destructive/80 text-sm"
            >
              Supprimer
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring resize-none"
            rows={3}
            placeholder="Votre commentaire..."
          />
          <div className="flex items-center space-x-3">
            <span className="text-sm text-foreground">Note :</span>
            <StarRating rating={editRating} onRatingChange={setEditRating} />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleEditSubmit}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Enregistrer
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-foreground mb-3">{comment.content}</p>
          
          <div className="flex items-center space-x-4">
            {user && level < 2 && (
              <button
                onClick={() => setIsReplying(true)}
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                Répondre
              </button>
            )}
            
            {comment.replies && comment.replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-muted-foreground hover:text-foreground text-sm font-medium"
              >
                {showReplies ? 'Masquer' : 'Afficher'} les réponses ({comment.replies.length})
              </button>
            )}
          </div>

          {isReplying && (
            <div className="mt-4 space-y-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring resize-none"
                rows={3}
                placeholder="Votre réponse..."
              />
              <div className="flex items-center space-x-3">
                <span className="text-sm text-foreground">Note :</span>
                <StarRating rating={replyRating} onRatingChange={setReplyRating} />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleReplySubmit}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Répondre
                </button>
                <button
                  onClick={() => setIsReplying(false)}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {showReplies && comment.replies && comment.replies.length > 0 && (
            <div className="mt-4">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CommentItem;
export { CommentItem };
