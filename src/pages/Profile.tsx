import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Edit3, Save, X, Camera } from 'lucide-react';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  school?: string;
  bio?: string;
  avatar_url?: string;
  phone_verified: boolean;
  email_verified: boolean;
}

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setEditedProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(editedProfile)
        .eq('user_id', user?.id);

      if (error) throw error;

      setProfile({ ...profile!, ...editedProfile });
      setEditing(false);
      toast({
        title: "Success",
        description: "Profile updated successfully!"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      setEditedProfile(prev => ({ ...prev, avatar_url: publicUrl }));

      toast({
        title: "Success",
        description: "Profile picture updated successfully!"
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "Failed to upload profile picture",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const cancelEdit = () => {
    setEditedProfile(profile || {});
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">Profile not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Profile Information</CardTitle>
            {!editing ? (
              <Button 
                variant="outline" 
                onClick={() => setEditing(true)}
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            ) : (
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button 
                  onClick={updateProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={editing ? editedProfile.avatar_url || profile.avatar_url : profile.avatar_url} />
                <AvatarFallback className="text-lg">
                  {profile.first_name?.charAt(0)}{profile.last_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {editing && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                  <label htmlFor="avatar-upload" className="cursor-pointer">
                    <Camera className="h-6 w-6 text-white" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {profile.first_name} {profile.last_name}
              </h2>
              <p className="text-muted-foreground">{profile.email}</p>
              {profile.school && (
                <p className="text-sm text-muted-foreground">{profile.school}</p>
              )}
              {editing && (
                <p className="text-xs text-muted-foreground mt-1">
                  Click the camera icon to change your profile picture
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={editing ? editedProfile.first_name || '' : profile.first_name}
                onChange={(e) => setEditedProfile({ ...editedProfile, first_name: e.target.value })}
                disabled={!editing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={editing ? editedProfile.last_name || '' : profile.last_name}
                onChange={(e) => setEditedProfile({ ...editedProfile, last_name: e.target.value })}
                disabled={!editing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={editing ? editedProfile.phone || '' : profile.phone || ''}
                onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                disabled={!editing}
                placeholder="Enter phone number"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="school">School</Label>
              <Input
                id="school"
                value={editing ? editedProfile.school || '' : profile.school || ''}
                onChange={(e) => setEditedProfile({ ...editedProfile, school: e.target.value })}
                disabled={!editing}
                placeholder="Enter your school"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={editing ? editedProfile.bio || '' : profile.bio || ''}
                onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                disabled={!editing}
                placeholder="Tell us about yourself"
                className="min-h-20"
              />
            </div>
          </div>

          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${profile.email_verified ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              <span className="text-muted-foreground">
                Email {profile.email_verified ? 'Verified' : 'Not Verified'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${profile.phone_verified ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              <span className="text-muted-foreground">
                Phone {profile.phone_verified ? 'Verified' : 'Not Verified'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;