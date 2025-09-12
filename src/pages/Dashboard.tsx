import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, MessageCircle, Share2, ThumbsDown, Send, Image, Video, Radio, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Post {
  id: string;
  content: string;
  content_type: string;
  image_url?: string;
  video_url?: string;
  is_live: boolean;
  live_stream_url?: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  post_reactions: Array<{
    reaction_type: string;
    user_id: string;
  }>;
  comments: Array<{
    id: string;
    content: string;
    created_at: string;
    profiles: {
      first_name: string;
      last_name: string;
    };
  }>;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<'text' | 'photo' | 'video' | 'live'>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (first_name, last_name, avatar_url),
          post_reactions (reaction_type, user_id),
          comments (
            id,
            content,
            created_at,
            profiles (first_name, last_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!newPost.trim()) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const postData: any = {
        content: newPost,
        author_id: profile.id,
        content_type: postType,
        is_live: postType === 'live'
      };

      if (postType === 'photo' && mediaUrl) {
        postData.image_url = mediaUrl;
      } else if (postType === 'video' && mediaUrl) {
        postData.video_url = mediaUrl;
      } else if (postType === 'live' && mediaUrl) {
        postData.live_stream_url = mediaUrl;
      }

      const { error } = await supabase
        .from('posts')
        .insert(postData);

      if (error) throw error;

      setNewPost('');
      setMediaUrl('');
      setPostType('text');
      fetchPosts();
      toast({
        title: "Success",
        description: "Post created successfully!"
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      if (!user?.id) throw new Error('Not authenticated');

      const bucket = postType === 'photo' ? 'post-images'
        : postType === 'video' ? 'post-videos'
        : null;

      if (!bucket) throw new Error('Unsupported post type for file upload');

      const fileName = `${user.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      setMediaUrl(publicUrl);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      });
    }
  };

  const reactToPost = async (postId: string, reactionType: 'like' | 'dislike') => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Check if user already reacted
      const { data: existingReaction } = await supabase
        .from('post_reactions')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', profile.id)
        .single();

      if (existingReaction) {
        // Update existing reaction or remove if same type
        if (existingReaction.reaction_type === reactionType) {
          await supabase
            .from('post_reactions')
            .delete()
            .eq('id', existingReaction.id);
        } else {
          await supabase
            .from('post_reactions')
            .update({ reaction_type: reactionType })
            .eq('id', existingReaction.id);
        }
      } else {
        // Create new reaction
        await supabase
          .from('post_reactions')
          .insert({
            post_id: postId,
            user_id: profile.id,
            reaction_type: reactionType
          });
      }

      fetchPosts();
    } catch (error) {
      console.error('Error reacting to post:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-4">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-20 bg-muted rounded"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Post */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback>
                {user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">Share your thoughts</p>
              <p className="text-sm text-muted-foreground">What's on your mind?</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={postType} onValueChange={(value: any) => setPostType(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select post type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">
                <div className="flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  Text Post
                </div>
              </SelectItem>
              <SelectItem value="photo">
                <div className="flex items-center">
                  <Image className="mr-2 h-4 w-4" />
                  Photo Post
                </div>
              </SelectItem>
              <SelectItem value="video">
                <div className="flex items-center">
                  <Video className="mr-2 h-4 w-4" />
                  Video Post
                </div>
              </SelectItem>
              <SelectItem value="live">
                <div className="flex items-center">
                  <Radio className="mr-2 h-4 w-4" />
                  Live Stream
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Textarea
            placeholder="Write something..."
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            className="min-h-20"
          />

          {(postType === 'photo' || postType === 'video') && (
            <div className="space-y-2">
              <Input
                type="file"
                ref={fileInputRef}
                accept={postType === 'photo' ? 'image/*' : 'video/*'}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                {postType === 'photo' ? 'Upload Photo' : 'Upload Video'}
              </Button>
              {mediaUrl && (
                <p className="text-sm text-muted-foreground">File uploaded successfully!</p>
              )}
            </div>
          )}

          {postType === 'live' && (
            <Input
              placeholder="Enter live stream URL (e.g., YouTube, Twitch)"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={createPost} disabled={!newPost.trim()}>
            <Send className="mr-2 h-4 w-4" />
            Post
          </Button>
        </CardFooter>
      </Card>

      {/* Posts Feed */}
      {posts.map((post) => (
        <Card key={post.id}>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={post.profiles.avatar_url} />
                <AvatarFallback>
                  {post.profiles.first_name?.charAt(0)}{post.profiles.last_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {post.profiles.first_name} {post.profiles.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(post.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center mb-2">
              {post.content_type === 'photo' && <Image className="mr-2 h-4 w-4 text-muted-foreground" />}
              {post.content_type === 'video' && <Video className="mr-2 h-4 w-4 text-muted-foreground" />}
              {post.content_type === 'live' && <Radio className="mr-2 h-4 w-4 text-red-500" />}
              {post.content_type === 'text' && <FileText className="mr-2 h-4 w-4 text-muted-foreground" />}
              <span className="text-sm text-muted-foreground capitalize">
                {post.content_type} {post.is_live ? 'Live' : ''} Post
              </span>
            </div>
            
            <p className="text-foreground">{post.content}</p>
            
            {post.image_url && (
              <img 
                src={post.image_url} 
                alt="Post image" 
                className="mt-4 rounded-lg max-w-full h-auto"
              />
            )}
            
            {post.video_url && (
              <video 
                src={post.video_url} 
                controls
                className="mt-4 rounded-lg max-w-full h-auto"
              />
            )}
            
            {post.live_stream_url && (
              <div className="mt-4">
                <div className="flex items-center mb-2">
                  <Radio className="mr-2 h-4 w-4 text-red-500 animate-pulse" />
                  <span className="text-red-500 font-medium">Live Stream</span>
                </div>
                <iframe
                  src={post.live_stream_url}
                  className="w-full h-64 rounded-lg"
                  allowFullScreen
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => reactToPost(post.id, 'like')}
                className="text-muted-foreground hover:text-primary"
              >
                <Heart className="mr-1 h-4 w-4" />
                {post.post_reactions?.filter(r => r.reaction_type === 'like').length || 0}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => reactToPost(post.id, 'dislike')}
                className="text-muted-foreground hover:text-destructive"
              >
                <ThumbsDown className="mr-1 h-4 w-4" />
                {post.post_reactions?.filter(r => r.reaction_type === 'dislike').length || 0}
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <MessageCircle className="mr-1 h-4 w-4" />
                {post.comments?.length || 0}
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Share2 className="mr-1 h-4 w-4" />
              Share
            </Button>
          </CardFooter>
        </Card>
      ))}

      {posts.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;