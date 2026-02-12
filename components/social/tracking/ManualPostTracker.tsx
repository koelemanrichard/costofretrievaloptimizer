/**
 * ManualPostTracker Component
 *
 * Track manually posted social content and record platform URLs.
 */

import React, { useState } from 'react';
import type { SocialPost, SocialMediaPlatform } from '../../../types/social';
import { SOCIAL_PLATFORM_CONFIG } from '../../../types/social';
import { AuditButton } from '../../audit/AuditButton';

interface ManualPostTrackerProps {
  post: SocialPost;
  onMarkPosted: (postUrl?: string) => void;
  onUnmarkPosted?: () => void;
}

export const ManualPostTracker: React.FC<ManualPostTrackerProps> = ({
  post,
  onMarkPosted,
  onUnmarkPosted
}) => {
  const [postUrl, setPostUrl] = useState(post.platform_post_url || '');
  const [isEditing, setIsEditing] = useState(false);

  const config = SOCIAL_PLATFORM_CONFIG[post.platform];
  const isPosted = post.status === 'posted' || !!post.manually_posted_at;

  const handleMarkPosted = () => {
    onMarkPosted(postUrl || undefined);
    setIsEditing(false);
  };

  const getPlaceholder = (platform: SocialMediaPlatform): string => {
    switch (platform) {
      case 'linkedin':
        return 'https://www.linkedin.com/posts/...';
      case 'twitter':
        return 'https://x.com/user/status/...';
      case 'facebook':
        return 'https://www.facebook.com/.../posts/...';
      case 'instagram':
        return 'https://www.instagram.com/p/...';
      case 'pinterest':
        return 'https://www.pinterest.com/pin/...';
      default:
        return 'https://...';
    }
  };

  if (isPosted && !isEditing) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-green-400">Posted</p>
              {post.manually_posted_at && (
                <p className="text-xs text-gray-500">
                  {new Date(post.manually_posted_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs text-gray-400 hover:text-white"
          >
            Edit
          </button>
        </div>

        {post.platform_post_url && (
          <div className="mt-3 pt-3 border-t border-green-500/20">
            <p className="text-xs text-gray-500 mb-1">Post URL:</p>
            <div className="flex items-center gap-2">
              <a
                href={post.platform_post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 break-all"
              >
                {post.platform_post_url}
              </a>
              <AuditButton url={post.platform_post_url} variant="icon" size="sm" />
            </div>
          </div>
        )}

        {onUnmarkPosted && (
          <button
            type="button"
            onClick={onUnmarkPosted}
            className="mt-3 text-xs text-red-400 hover:text-red-300"
          >
            Mark as not posted
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: config.color }}
        >
          <span className="text-white text-sm font-bold">{config.name.charAt(0)}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-white">Track {config.name} Post</p>
          <p className="text-xs text-gray-500">Mark as posted and optionally add link</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Post URL input */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Post URL (optional)
          </label>
          <input
            type="url"
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            placeholder={getPlaceholder(post.platform)}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
          />
          <p className="text-[10px] text-gray-500 mt-1">
            Add the URL after posting to track engagement
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleMarkPosted}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            Mark as Posted
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Batch post tracker for multiple posts
 */
interface BatchPostTrackerProps {
  posts: SocialPost[];
  onMarkPosted: (postId: string, postUrl?: string) => void;
}

export const BatchPostTracker: React.FC<BatchPostTrackerProps> = ({
  posts,
  onMarkPosted
}) => {
  const postedCount = posts.filter(p => p.status === 'posted' || p.manually_posted_at).length;
  const pendingPosts = posts.filter(p => p.status !== 'posted' && !p.manually_posted_at);

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Posting Progress</span>
          <span className="text-sm font-medium text-white">
            {postedCount}/{posts.length}
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(postedCount / posts.length) * 100}%` }}
          />
        </div>
        {postedCount === posts.length && (
          <p className="text-xs text-green-400 mt-2 text-center">
            All posts published!
          </p>
        )}
      </div>

      {/* Pending posts */}
      {pendingPosts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Pending Posts ({pendingPosts.length})
          </h4>
          <div className="space-y-2">
            {pendingPosts.map(post => {
              const config = SOCIAL_PLATFORM_CONFIG[post.platform];
              return (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-2 bg-gray-900/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center"
                      style={{ backgroundColor: config.color }}
                    >
                      <span className="text-white text-xs font-bold">
                        {config.name.charAt(0)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-300">
                      {config.name}
                      {post.spoke_position && ` #${post.spoke_position}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onMarkPosted(post.id)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Mark posted
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualPostTracker;
