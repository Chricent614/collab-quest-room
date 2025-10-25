import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Bell, MessageSquare, Users, Image as ImageIcon } from 'lucide-react';

interface UserSettings {
  id: string;
  theme: 'light' | 'dark';
  notifications_enabled: boolean;
  privacy_level: 'public' | 'friends' | 'private';
  message_notifications: boolean;
  group_notifications: boolean;
  like_notifications: boolean;
  comment_notifications: boolean;
  wallpaper_url?: string;
}

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', profile.id)
        .single();

      if (error) throw error;
      
      // Set defaults for new fields if they don't exist
      setSettings({
        ...data,
        message_notifications: data.message_notifications ?? true,
        group_notifications: data.group_notifications ?? true,
        like_notifications: data.like_notifications ?? true,
        comment_notifications: data.comment_notifications ?? true,
        wallpaper_url: data.wallpaper_url
      } as UserSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWallpaperUpload = async (file: File) => {
    if (!user) return;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/wallpaper-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-avatars')
        .getPublicUrl(fileName);

      if (settings) {
        setSettings({ ...settings, wallpaper_url: publicUrl });
      }

      toast({
        title: "Success",
        description: "Wallpaper uploaded successfully!"
      });
    } catch (error) {
      console.error('Error uploading wallpaper:', error);
      toast({
        title: "Error",
        description: "Failed to upload wallpaper",
        variant: "destructive"
      });
    }
  };

  const updateSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          theme: settings.theme,
          notifications_enabled: settings.notifications_enabled,
          privacy_level: settings.privacy_level,
          message_notifications: settings.message_notifications,
          group_notifications: settings.group_notifications,
          like_notifications: settings.like_notifications,
          comment_notifications: settings.comment_notifications,
          wallpaper_url: settings.wallpaper_url
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Settings updated successfully!"
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">Settings not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-20 px-4 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={settings.theme}
              onValueChange={(value: 'light' | 'dark') => 
                setSettings({ ...settings, theme: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wallpaper">Chat Wallpaper</Label>
            <div className="flex items-center gap-2">
              <Input
                id="wallpaper"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleWallpaperUpload(file);
                }}
                className="flex-1"
              />
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            {settings.wallpaper_url && (
              <p className="text-xs text-muted-foreground">Custom wallpaper set</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                All Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Master switch for all notifications
              </p>
            </div>
            <Switch
              id="notifications"
              checked={settings.notifications_enabled}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, notifications_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="message-notif" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Message Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified for new messages
              </p>
            </div>
            <Switch
              id="message-notif"
              checked={settings.message_notifications ?? true}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, message_notifications: checked })
              }
              disabled={!settings.notifications_enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="group-notif" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Group Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified for group activity
              </p>
            </div>
            <Switch
              id="group-notif"
              checked={settings.group_notifications ?? true}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, group_notifications: checked })
              }
              disabled={!settings.notifications_enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="like-notif">Like Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when someone likes your posts
              </p>
            </div>
            <Switch
              id="like-notif"
              checked={settings.like_notifications ?? true}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, like_notifications: checked })
              }
              disabled={!settings.notifications_enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="comment-notif">Comment Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when someone comments on your posts
              </p>
            </div>
            <Switch
              id="comment-notif"
              checked={settings.comment_notifications ?? true}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, comment_notifications: checked })
              }
              disabled={!settings.notifications_enabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="privacy">Privacy Level</Label>
            <Select
              value={settings.privacy_level}
              onValueChange={(value: 'public' | 'friends' | 'private') => 
                setSettings({ ...settings, privacy_level: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="friends">Friends Only</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={updateSettings} disabled={saving} className="w-full">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Password</Label>
            <Button variant="outline">Change Password</Button>
          </div>
          
          <div className="space-y-2">
            <Label>Two-Factor Authentication</Label>
            <Button variant="outline">Enable 2FA</Button>
          </div>

          <div className="space-y-2">
            <Label>Account Deletion</Label>
            <Button variant="destructive" className="bg-destructive text-destructive-foreground">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;