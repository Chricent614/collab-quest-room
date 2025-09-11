import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PenTool, Image as ImageIcon, Video, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

interface Group {
  id: string;
  name: string;
}

const CreatePost = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    content_type: 'text',
    group_id: 'public',
    image_url: '',
    video_url: '',
    live_stream_url: ''
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name');

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const createPost = async () => {
    if (!formData.content.trim()) {
      toast({
        title: "Error",
        description: "Please enter some content for your post",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const postData = {
        content: formData.content,
        content_type: formData.content_type,
        author_id: profile.id,
        group_id: formData.group_id || null,
        image_url: formData.content_type === 'image' ? formData.image_url : null,
        video_url: formData.content_type === 'video' ? formData.video_url : null,
        live_stream_url: formData.content_type === 'live' ? formData.live_stream_url : null,
        is_live: formData.content_type === 'live'
      };

      const { error } = await supabase
        .from('posts')
        .insert(postData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post created successfully!"
      });

      // Reset form
      setFormData({
        content: '',
        content_type: 'text',
        group_id: '',
        image_url: '',
        video_url: '',
        live_stream_url: ''
      });

      // Navigate to appropriate page
      navigate(formData.group_id ? '/groups' : '/dashboard');
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'live': return <Radio className="h-4 w-4" />;
      default: return <PenTool className="h-4 w-4" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold">Create New Post</h1>
        <p className="text-muted-foreground mt-2">Share your thoughts, images, videos, or start a live stream</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getContentTypeIcon(formData.content_type)}
            New Post
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Post Type</Label>
            <RadioGroup
              value={formData.content_type}
              onValueChange={(value) => setFormData({ ...formData, content_type: value })}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2"
            >
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="text" id="text" />
                <Label htmlFor="text" className="flex items-center gap-2 cursor-pointer">
                  <PenTool className="h-4 w-4" />
                  Text
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="image" id="image" />
                <Label htmlFor="image" className="flex items-center gap-2 cursor-pointer">
                  <ImageIcon className="h-4 w-4" />
                  Image
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="video" id="video" />
                <Label htmlFor="video" className="flex items-center gap-2 cursor-pointer">
                  <Video className="h-4 w-4" />
                  Video
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="live" id="live" />
                <Label htmlFor="live" className="flex items-center gap-2 cursor-pointer">
                  <Radio className="h-4 w-4" />
                  Live
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="What's on your mind?"
              rows={4}
              className="mt-2"
            />
          </div>

          {formData.content_type === 'image' && (
            <div>
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="mt-2"
              />
            </div>
          )}

          {formData.content_type === 'video' && (
            <div>
              <Label htmlFor="video_url">Video URL</Label>
              <Input
                id="video_url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="https://example.com/video.mp4"
                className="mt-2"
              />
            </div>
          )}

          {formData.content_type === 'live' && (
            <div>
              <Label htmlFor="live_stream_url">Live Stream URL</Label>
              <Input
                id="live_stream_url"
                value={formData.live_stream_url}
                onChange={(e) => setFormData({ ...formData, live_stream_url: e.target.value })}
                placeholder="https://example.com/stream"
                className="mt-2"
              />
            </div>
          )}

          <div>
            <Label htmlFor="group">Share to Group (optional)</Label>
            <Select value={formData.group_id} onValueChange={(value) => setFormData({ ...formData, group_id: value === 'public' ? '' : value })}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a group or leave empty for public post" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public Post</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={createPost}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Creating..." : "Create Post"}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatePost;