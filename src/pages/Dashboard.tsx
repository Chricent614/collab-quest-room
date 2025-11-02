import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, MessageCircle, Share2, ThumbsDown, Send, Image, Video, Radio, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface Post {
  id: string;
  author_id: string;
  content: string;
  content_type: string;
  image_url?: string;
  video_url?: string;
  is_live: boolean;
  live_stream_url?: string;
  created_at: string;
  profiles: {
    id: string;
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
    author_id: string;
    created_at: string;
    profiles: {
      id: string;
      first_name: string;
      last_name: string;
      avatar_url?: string;
    };
  }>;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<'text' | 'photo' | 'video' | 'live'>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPosts();
    fetchCurrentUserProfile();
  }, []);

  const fetchCurrentUserProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      
      if (data) {
        setCurrentUserProfileId(data.id);
      }
    } catch (error) {
      console.error('Error fetching current user profile:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (id, first_name, last_name, avatar_url),
          post_reactions (reaction_type, user_id),
          comments (
            id,
            content,
            author_id,
            created_at,
            profiles (id, first_name, last_name, avatar_url)
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
    if (!currentUserProfileId) return;

    try {
      // Optimistically update UI
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id !== postId) return post;

        const existingReaction = post.post_reactions.find(r => r.user_id === currentUserProfileId);
        let newReactions = [...post.post_reactions];

        if (existingReaction) {
          if (existingReaction.reaction_type === reactionType) {
            // Remove reaction
            newReactions = newReactions.filter(r => r.user_id !== currentUserProfileId);
          } else {
            // Update reaction
            newReactions = newReactions.map(r => 
              r.user_id === currentUserProfileId 
                ? { ...r, reaction_type: reactionType }
                : r
            );
          }
        } else {
          // Add new reaction
          newReactions.push({ reaction_type: reactionType, user_id: currentUserProfileId });
        }

        return { ...post, post_reactions: newReactions };
      }));

      // Check if user already reacted
      const { data: existingReaction } = await supabase
        .from('post_reactions')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', currentUserProfileId)
        .maybeSingle();

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
            user_id: currentUserProfileId,
            reaction_type: reactionType
          });
      }
    } catch (error) {
      console.error('Error reacting to post:', error);
      fetchPosts(); // Revert to actual state on error
    }
  };

  const addComment = async (postId: string) => {
    const content = commentText[postId]?.trim();
    if (!content || !currentUserProfileId) return;

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: currentUserProfileId,
          content
        });

      if (error) throw error;

      setCommentText({ ...commentText, [postId]: '' });
      fetchPosts();
      toast({
        title: "Success",
        description: "Comment added!"
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      });
    }
  };

  const toggleComments = (postId: string) => {
    setShowComments({ ...showComments, [postId]: !showComments[postId] });
  };

  const getUserReaction = (post: Post, reactionType: 'like' | 'dislike') => {
    return post.post_reactions.some(r => r.user_id === currentUserProfileId && r.reaction_type === reactionType);
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
              <Avatar 
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate(`/profile/${post.profiles.id}`)}
              >
                <AvatarImage src={post.profiles.avatar_url} />
                <AvatarFallback>
                  {post.profiles.first_name?.charAt(0)}{post.profiles.last_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p 
                  className="font-medium cursor-pointer hover:underline"
                  onClick={() => navigate(`/profile/${post.profiles.id}`)}
                >
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
          <CardFooter className="flex-col items-stretch">
            <div className="flex justify-between mb-4">
              <div className="flex space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => reactToPost(post.id, 'like')}
                  className={getUserReaction(post, 'like') 
                    ? "text-red-500 hover:text-red-600" 
                    : "text-muted-foreground hover:text-red-500"}
                >
                  <Heart className={`mr-1 h-4 w-4 ${getUserReaction(post, 'like') ? 'fill-red-500' : ''}`} />
                  {post.post_reactions?.filter(r => r.reaction_type === 'like').length || 0}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => reactToPost(post.id, 'dislike')}
                  className={getUserReaction(post, 'dislike') 
                    ? "text-blue-500 hover:text-blue-600" 
                    : "text-muted-foreground hover:text-blue-500"}
                >
                  <ThumbsDown className={`mr-1 h-4 w-4 ${getUserReaction(post, 'dislike') ? 'fill-blue-500' : ''}`} />
                  {post.post_reactions?.filter(r => r.reaction_type === 'dislike').length || 0}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => toggleComments(post.id)}
                >
                  <MessageCircle className="mr-1 h-4 w-4" />
                  {post.comments?.length || 0}
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Share2 className="mr-1 h-4 w-4" />
                Share
              </Button>
            </div>

            {showComments[post.id] && (
              <div className="space-y-4">
                <Separator />
                
                {/* Comments List */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar 
                        className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate(`/profile/${comment.profiles.id}`)}
                      >
                        <AvatarImage src={comment.profiles.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {comment.profiles.first_name?.charAt(0)}{comment.profiles.last_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg p-3">
                          <p 
                            className="font-medium text-sm cursor-pointer hover:underline mb-1"
                            onClick={() => navigate(`/profile/${comment.profiles.id}`)}
                          >
                            {comment.profiles.first_name} {comment.profiles.last_name}
                          </p>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-3">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {post.comments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
                  )}
                </div>

                {/* Add Comment */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Write a comment..."
                    value={commentText[post.id] || ''}
                    onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addComment(post.id);
                      }
                    }}
                  />
                  <Button 
                    size="sm"
                    onClick={() => addComment(post.id)}
                    disabled={!commentText[post.id]?.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
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