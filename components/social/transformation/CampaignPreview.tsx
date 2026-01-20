/**
 * CampaignPreview Component
 *
 * Shows a preview of all posts that will be generated before confirmation.
 */

import React from 'react';
import type {
  SocialPost,
  SocialCampaign,
  SocialMediaPlatform,
  CampaignComplianceReport
} from '../../../types/social';
import { SOCIAL_PLATFORM_CONFIG, TARGET_COMPLIANCE_SCORE } from '../../../types/social';
import PostPreviewCard from '../preview/PostPreviewCard';

interface CampaignPreviewProps {
  campaign: SocialCampaign;
  posts: SocialPost[];
  complianceReport?: CampaignComplianceReport;
  onEditPost?: (post: SocialPost) => void;
}

export const CampaignPreview: React.FC<CampaignPreviewProps> = ({
  campaign,
  posts,
  complianceReport,
  onEditPost
}) => {
  const hubPost = posts.find(p => p.is_hub);
  const spokePosts = posts.filter(p => !p.is_hub).sort((a, b) =>
    (a.spoke_position || 0) - (b.spoke_position || 0)
  );

  // Group spokes by platform
  const spokesByPlatform = spokePosts.reduce((acc, post) => {
    if (!acc[post.platform]) {
      acc[post.platform] = [];
    }
    acc[post.platform].push(post);
    return acc;
  }, {} as Record<SocialMediaPlatform, SocialPost[]>);

  const overallScore = complianceReport?.overall_score || 0;
  const scoreColor = overallScore >= TARGET_COMPLIANCE_SCORE
    ? 'text-green-400'
    : overallScore >= 70
      ? 'text-yellow-400'
      : 'text-red-400';

  return (
    <div className="space-y-6">
      {/* Campaign summary header */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">
              {campaign.campaign_name || 'Social Campaign'}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {posts.length} post{posts.length !== 1 ? 's' : ''} across {Object.keys(spokesByPlatform).length + (hubPost ? 1 : 0)} platform{(Object.keys(spokesByPlatform).length + (hubPost ? 1 : 0)) !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Compliance score */}
          {complianceReport && (
            <div className="text-right">
              <div className={`text-2xl font-bold ${scoreColor}`}>
                {Math.round(overallScore)}%
              </div>
              <p className="text-xs text-gray-500">Compliance Score</p>
              {overallScore < TARGET_COMPLIANCE_SCORE && (
                <p className="text-xs text-yellow-500 mt-1">
                  Target: {TARGET_COMPLIANCE_SCORE}%
                </p>
              )}
            </div>
          )}
        </div>

        {/* UTM preview */}
        {campaign.utm_campaign && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              <span className="font-medium">UTM Campaign:</span>{' '}
              <span className="text-gray-400">{campaign.utm_campaign}</span>
            </p>
          </div>
        )}
      </div>

      {/* Hub post section */}
      {hubPost && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">H</span>
            </div>
            <h4 className="text-sm font-semibold text-gray-300">Hub Post</h4>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: SOCIAL_PLATFORM_CONFIG[hubPost.platform].color }}
            >
              {SOCIAL_PLATFORM_CONFIG[hubPost.platform].name}
            </span>
          </div>

          <PostPreviewCard
            post={hubPost}
            complianceReport={complianceReport?.post_reports?.find(r => r.post_id === hubPost.id)}
            onEdit={onEditPost ? () => onEditPost(hubPost) : undefined}
            isHub
          />
        </div>
      )}

      {/* Spoke posts section */}
      {spokePosts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <h4 className="text-sm font-semibold text-gray-300">
              Spoke Posts ({spokePosts.length})
            </h4>
          </div>

          {/* Group by platform */}
          {Object.entries(spokesByPlatform).map(([platform, platformPosts]) => {
            const config = SOCIAL_PLATFORM_CONFIG[platform as SocialMediaPlatform];

            return (
              <div key={platform} className="space-y-3">
                <div className="flex items-center gap-2 pl-8">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center"
                    style={{ backgroundColor: config.color }}
                  >
                    <span className="text-white text-xs font-bold">
                      {config.name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {config.name} ({platformPosts.length})
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pl-8">
                  {platformPosts.map(post => (
                    <PostPreviewCard
                      key={post.id}
                      post={post}
                      complianceReport={complianceReport?.post_reports?.find(r => r.post_id === post.id)}
                      onEdit={onEditPost ? () => onEditPost(post) : undefined}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compliance recommendations */}
      {complianceReport?.recommendations && complianceReport.recommendations.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-yellow-400 mb-2">Recommendations</h4>
          <ul className="space-y-1">
            {complianceReport.recommendations.map((rec, i) => (
              <li key={i} className="text-xs text-yellow-300/80 flex items-start gap-2">
                <span className="text-yellow-500">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty state */}
      {posts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No posts generated yet.</p>
          <p className="text-sm mt-1">Configure platforms and templates to preview posts.</p>
        </div>
      )}
    </div>
  );
};

export default CampaignPreview;
