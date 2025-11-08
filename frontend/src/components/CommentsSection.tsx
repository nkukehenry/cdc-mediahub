'use client';

import { Dispatch, FormEvent, SetStateAction } from 'react';
import { getImageUrl, PLACEHOLDER_IMAGE_PATH } from '@/utils/fileUtils';

type CommentAuthor = {
  firstName?: string | null;
  username?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  [key: string]: unknown;
};

export type PublicationComment = {
  id: string;
  content: string;
  createdAt: string;
  authorName?: string | null;
  authorEmail?: string | null;
  author?: CommentAuthor | null;
};

type UserLike = {
  id?: string;
} | null | undefined;

interface CommentsSectionProps {
  enabled: boolean;
  user: UserLike;
  comments: PublicationComment[];
  commentsCount: number;
  commentsLoading: boolean;
  commentsLoadingMore: boolean;
  pagination: {
    total: number;
    page: number;
    totalPages: number;
    limit: number;
    offset: number;
  };
  guestName: string;
  setGuestName: Dispatch<SetStateAction<string>>;
  guestEmail: string;
  setGuestEmail: Dispatch<SetStateAction<string>>;
  commentContent: string;
  setCommentContent: Dispatch<SetStateAction<string>>;
  commentSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onLoadMore: () => Promise<void>;
  formatDateTime: (dateString: string) => string;
}

export default function CommentsSection({
  enabled,
  user,
  comments,
  commentsCount,
  commentsLoading,
  commentsLoadingMore,
  pagination,
  guestName,
  setGuestName,
  guestEmail,
  setGuestEmail,
  commentContent,
  setCommentContent,
  commentSubmitting,
  onSubmit,
  onLoadMore,
  formatDateTime,
}: CommentsSectionProps) {
  if (!enabled) {
    return <p className="text-sm text-au-grey-text/70">Comments are disabled for this publication.</p>;
  }

  const isInitialLoading = commentsLoading && comments.length === 0;
  const hasNoComments = comments.length === 0;
  const moreCommentsAvailable = pagination.page < pagination.totalPages;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-au-grey-text">Comments ({commentsCount})</h2>
        {commentsCount > 0 && (
          <span className="text-sm text-au-grey-text/70">Showing {comments.length} of {commentsCount}</span>
        )}
      </div>

      
      <div>
        {isInitialLoading ? (
          <div className="space-y-4">
            <div className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
            <div className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
          </div>
        ) : hasNoComments ? (
          <p className="text-sm text-au-grey-text/70">No comments yet. Be the first to share your thoughts.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => {
              const authorDisplayName = comment.authorName || comment.author?.firstName || comment.author?.username || 'Anonymous';
              const avatarSrc = comment.author?.avatar ? getImageUrl(comment.author.avatar) : null;
              const fallbackAvatar = getImageUrl(PLACEHOLDER_IMAGE_PATH);
              const initials = (authorDisplayName || 'A')
                .split(/\s+/)
                .filter(Boolean)
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'A';

              return (
                <div key={comment.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-au-grey-text/10 flex items-center justify-center overflow-hidden">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={authorDisplayName}
                          className="w-full h-full object-cover"
                          onError={(event) => {
                            const target = event.currentTarget;
                            target.onerror = null;
                            target.src = fallbackAvatar;
                          }}
                        />
                      ) : (
                        <span className="text-sm font-semibold text-au-grey-text">{initials}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-au-grey-text">{authorDisplayName}</div>
                        <div className="text-xs text-au-grey-text/60">{formatDateTime(comment.createdAt)}</div>
                      </div>
                      <p className="text-sm text-au-grey-text leading-relaxed whitespace-pre-line">{comment.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {moreCommentsAvailable && (
        <div className="flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={commentsLoadingMore}
            className="px-4 py-2 bg-gray-100 text-au-grey-text rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {commentsLoadingMore ? 'Loading...' : 'Load more comments'}
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        {!user && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-au-grey-text mb-1">Name *</label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-au-grey-text mb-1">Email *</label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                placeholder="your@email.com"
              />
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-au-grey-text mb-1">Comment *</label>
          <textarea
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
            placeholder="Share your thoughts..."
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={commentSubmitting}
            className="px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {commentSubmitting ? 'Submitting...' : 'Post Comment'}
          </button>
        </div>
      </form>

    </div>
  );
}
