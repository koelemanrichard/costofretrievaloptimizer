/**
 * Hook to fetch and manage publication status for topics
 * Provides publication data for topic badges in the topical map display
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { batchedIn } from '../utils/supabaseBatchQuery';
import { WordPressPublication, WordPressConnection } from '../types/wordpress';

export interface TopicPublicationInfo {
  topicId: string;
  publication: WordPressPublication;
  connection?: WordPressConnection;
}

export interface UseTopicPublicationsResult {
  publications: Map<string, TopicPublicationInfo>;
  connections: WordPressConnection[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getPublicationForTopic: (topicId: string, connectionId?: string) => TopicPublicationInfo | null;
}

/**
 * Fetch publication status for all topics in a map
 */
export function useTopicPublications(
  supabase: SupabaseClient | null,
  userId: string | null,
  topicIds: string[]
): UseTopicPublicationsResult {
  const [publications, setPublications] = useState<Map<string, TopicPublicationInfo>>(new Map());
  const [connections, setConnections] = useState<WordPressConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPublications = useCallback(async () => {
    if (!supabase || !userId || topicIds.length === 0) {
      setPublications(new Map());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all verified connections for the user
      const { data: connectionsData, error: connError } = await supabase
        .from('wordpress_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'verified');

      if (connError) {
        console.error('[useTopicPublications] Failed to fetch connections:', connError);
        setError('Failed to load WordPress connections');
        return;
      }

      setConnections(connectionsData || []);

      if (!connectionsData || connectionsData.length === 0) {
        setPublications(new Map());
        return;
      }

      // Fetch publications for these topics
      const connectionIds = connectionsData.map(c => c.id);
      const { data: pubsData, error: pubsError } = await batchedIn(
        supabase, 'wordpress_publications', '*', 'topic_id', topicIds,
        (q) => q.in('connection_id', connectionIds)
      );

      if (pubsError) {
        console.error('[useTopicPublications] Failed to fetch publications:', pubsError);
        setError('Failed to load publication status');
        return;
      }

      // Build map of topicId -> publication info
      const pubMap = new Map<string, TopicPublicationInfo>();

      for (const pub of (pubsData || [])) {
        const connection = connectionsData.find(c => c.id === pub.connection_id);
        pubMap.set(pub.topic_id, {
          topicId: pub.topic_id,
          publication: pub as WordPressPublication,
          connection
        });
      }

      setPublications(pubMap);
    } catch (err) {
      console.error('[useTopicPublications] Error:', err);
      setError('Failed to load publication data');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, userId, topicIds.join(',')]); // Join topicIds for stable dependency

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchPublications();
  }, [fetchPublications]);

  // Get publication for a specific topic
  const getPublicationForTopic = useCallback((topicId: string, connectionId?: string): TopicPublicationInfo | null => {
    const pub = publications.get(topicId);
    if (!pub) return null;
    if (connectionId && pub.publication.connection_id !== connectionId) return null;
    return pub;
  }, [publications]);

  return {
    publications,
    connections,
    isLoading,
    error,
    refresh: fetchPublications,
    getPublicationForTopic
  };
}

/**
 * Get summary statistics for publications
 */
export function usePublicationStats(publications: Map<string, TopicPublicationInfo>) {
  return useMemo(() => {
    const stats = {
      total: publications.size,
      published: 0,
      draft: 0,
      scheduled: 0,
      pending: 0,
      hasChanges: 0
    };

    for (const info of publications.values()) {
      const pub = info.publication;
      switch (pub.status) {
        case 'published':
          stats.published++;
          break;
        case 'draft':
          stats.draft++;
          break;
        case 'scheduled':
          stats.scheduled++;
          break;
        case 'pending_review':
          stats.pending++;
          break;
      }
      if (pub.has_wp_changes) {
        stats.hasChanges++;
      }
    }

    return stats;
  }, [publications]);
}

export default useTopicPublications;
