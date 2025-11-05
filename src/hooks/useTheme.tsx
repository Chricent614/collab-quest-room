import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type Theme = 'light' | 'dark' | 'system';

export const useTheme = () => {
  const { user } = useAuth();
  const [theme, setTheme] = useState<Theme>('light');
  const [wallpaper, setWallpaper] = useState<string | null>(null);

  useEffect(() => {
    const fetchTheme = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('theme, wallpaper_url')
        .eq('user_id', profile.id)
        .single();

      if (settings) {
        const userTheme = settings.theme as Theme;
        setTheme(userTheme);
        setWallpaper(settings.wallpaper_url);
        applyTheme(userTheme);
      }
    };

    fetchTheme();
  }, [user]);

  const applyTheme = (newTheme: Theme) => {
    const root = window.document.documentElement;
    
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.remove('light', 'dark');
      root.classList.add(systemTheme);
    } else {
      root.classList.remove('light', 'dark');
      root.classList.add(newTheme);
    }
  };

  const updateTheme = async (newTheme: Theme) => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) return;

    await supabase
      .from('user_settings')
      .update({ theme: newTheme })
      .eq('user_id', profile.id);

    setTheme(newTheme);
    applyTheme(newTheme);
  };

  return { theme, wallpaper, updateTheme };
};
