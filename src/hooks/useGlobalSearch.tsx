import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SearchResult {
  type: 'post' | 'user' | 'group' | 'resource' | 'task';
  id: string;
  title: string;
  description?: string;
  url: string;
  avatarUrl?: string;
}

export const useGlobalSearch = (query: string) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      if (!query || query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const searchTerm = `%${query.toLowerCase()}%`;
        const allResults: SearchResult[] = [];

        // Search posts
        const { data: posts } = await supabase
          .from('posts')
          .select('id, content, profiles(first_name, last_name)')
          .ilike('content', searchTerm)
          .limit(5);

        if (posts) {
          posts.forEach(post => {
            allResults.push({
              type: 'post',
              id: post.id,
              title: `Post by ${(post.profiles as any)?.first_name} ${(post.profiles as any)?.last_name}`,
              description: post.content.substring(0, 100),
              url: `/dashboard?post=${post.id}`
            });
          });
        }

        // Search users
        const { data: users } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, bio, avatar_url, school')
          .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},bio.ilike.${searchTerm},school.ilike.${searchTerm}`)
          .limit(5);

        if (users) {
          users.forEach(user => {
            allResults.push({
              type: 'user',
              id: user.id,
              title: `${user.first_name} ${user.last_name}`,
              description: user.bio || user.school,
              url: `/profile/${user.id}`,
              avatarUrl: user.avatar_url
            });
          });
        }

        // Search groups
        const { data: groups } = await supabase
          .from('groups')
          .select('id, name, description')
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(5);

        if (groups) {
          groups.forEach(group => {
            allResults.push({
              type: 'group',
              id: group.id,
              title: group.name,
              description: group.description,
              url: `/groups?group=${group.id}`
            });
          });
        }

        // Search resources
        const { data: resources } = await supabase
          .from('resources')
          .select('id, title, description')
          .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(5);

        if (resources) {
          resources.forEach(resource => {
            allResults.push({
              type: 'resource',
              id: resource.id,
              title: resource.title,
              description: resource.description,
              url: `/resources?resource=${resource.id}`
            });
          });
        }

        // Search tasks
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title, description')
          .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(5);

        if (tasks) {
          tasks.forEach(task => {
            allResults.push({
              type: 'task',
              id: task.id,
              title: task.title,
              description: task.description,
              url: `/tasks?task=${task.id}`
            });
          });
        }

        setResults(allResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(performSearch, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  return { results, loading };
};
