import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Upload, File, Search, Download, BookOpen, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Resource {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  tags: string[];
  group_id: string;
  uploaded_by: string;
  created_at: string;
  uploader: {
    first_name: string;
    last_name: string;
  };
  group: {
    name: string;
  };
}

interface Group {
  id: string;
  name: string;
}

const Resources = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    group_id: '',
    tags: '',
    file: null as File | null
  });

  useEffect(() => {
    if (user) {
      fetchMyGroups();
      fetchResources();
    }
  }, [user]);

  const fetchMyGroups = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('group_members')
        .select(`
          groups(id, name)
        `)
        .eq('user_id', profile.id);

      if (error) throw error;

      const groups = data?.map(item => item.groups).filter(Boolean) || [];
      setMyGroups(groups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchResources = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      // Get resources from groups the user is a member of
      // First get user's group IDs
      const { data: userGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', profile.id);

      const groupIds = userGroups?.map(item => item.group_id) || [];

      if (groupIds.length === 0) {
        setResources([]);
        return;
      }

      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related data separately to avoid foreign key issues
      const resourcesWithData = await Promise.all(
        (data || []).map(async (resource) => {
          const [uploaderResult, groupResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', resource.uploaded_by)
              .single(),
            supabase
              .from('groups')
              .select('name')
              .eq('id', resource.group_id)
              .single()
          ]);

          return {
            ...resource,
            uploader: uploaderResult.data || { first_name: '', last_name: '' },
            group: groupResult.data || { name: '' }
          };
        })
      );

      setResources(resourcesWithData);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadResource = async () => {
    if (!newResource.file || !newResource.title || !newResource.group_id) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Upload file to storage
      const fileExt = newResource.file.name.split('.').pop();
      const fileName = `${newResource.group_id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(fileName, newResource.file);

      if (uploadError) throw uploadError;

      // Get file URL
      const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(fileName);

      // Save resource record
      const { error } = await supabase
        .from('resources')
        .insert({
          title: newResource.title,
          description: newResource.description,
          file_url: publicUrl,
          file_type: newResource.file.type,
          tags: newResource.tags ? newResource.tags.split(',').map(tag => tag.trim()) : [],
          group_id: newResource.group_id,
          uploaded_by: profile.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Resource uploaded successfully!"
      });

      setShowUploadDialog(false);
      setNewResource({
        title: '',
        description: '',
        group_id: '',
        tags: '',
        file: null
      });
      fetchResources();
    } catch (error) {
      console.error('Error uploading resource:', error);
      toast({
        title: "Error",
        description: "Failed to upload resource",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesGroup = selectedGroup === 'all' || resource.group_id === selectedGroup;
    
    return matchesSearch && matchesGroup;
  });

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('video')) return '🎥';
    if (fileType.includes('audio')) return '🎵';
    if (fileType.includes('text') || fileType.includes('document')) return '📝';
    return '📁';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resource Library</h1>
          <p className="text-muted-foreground">Share and access study materials with your groups</p>
        </div>
        
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Resource
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload New Resource</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newResource.title}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  placeholder="Resource title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newResource.description}
                  onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                  placeholder="Describe this resource..."
                />
              </div>
              <div>
                <Label htmlFor="group">Group</Label>
                <Select
                  value={newResource.group_id}
                  onValueChange={(value) => setNewResource({ ...newResource, group_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {myGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={newResource.tags}
                  onChange={(e) => setNewResource({ ...newResource, tags: e.target.value })}
                  placeholder="math, calculus, study guide"
                />
              </div>
              <div>
                <Label htmlFor="file">File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => setNewResource({ ...newResource, file: e.target.files?.[0] || null })}
                />
              </div>
              <Button onClick={uploadResource} disabled={uploading} className="w-full">
                {uploading ? "Uploading..." : "Upload Resource"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {myGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map((resource) => (
          <Card key={resource.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="text-2xl">{getFileIcon(resource.file_type)}</span>
                <span className="truncate">{resource.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                {resource.description}
              </p>
              
              {resource.tags && resource.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {resource.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {resource.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{resource.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              <div className="space-y-2 text-xs text-muted-foreground mb-3">
                <div className="flex items-center">
                  <BookOpen className="mr-1 h-3 w-3" />
                  {resource.group?.name}
                </div>
                <div className="flex items-center">
                  <User className="mr-1 h-3 w-3" />
                  {resource.uploader?.first_name} {resource.uploader?.last_name}
                </div>
                <div className="flex items-center">
                  <Clock className="mr-1 h-3 w-3" />
                  {formatDistanceToNow(new Date(resource.created_at), { addSuffix: true })}
                </div>
              </div>

              <Button
                onClick={async () => {
                  try {
                    // Parse bucket and file path from Supabase public URL
                    const { pathname } = new URL(resource.file_url);
                    const match = pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);

                    if (!match) {
                      throw new Error('Invalid storage URL format');
                    }

                    const [, bucket, filePath] = match;

                    // Download via Supabase Storage API (preserves binary integrity)
                    const { data, error } = await supabase.storage
                      .from(bucket)
                      .download(filePath);

                    if (error || !data) throw error || new Error('No data returned');

                    // Determine a good filename
                    const fileNameFromPath = filePath.split('/').pop() || 'downloaded-file';
                    const safeTitle = (resource.title || 'download').replace(/[^a-z0-9-_ ]/gi, '_');
                    const extFromPath = fileNameFromPath.includes('.') ? fileNameFromPath.split('.').pop() : undefined;
                    const extFromType = resource.file_type?.includes('/') ? resource.file_type.split('/')[1] : undefined;
                    const extension = extFromPath || extFromType || 'file';
                    const finalFileName = safeTitle.endsWith(`.${extension}`)
                      ? safeTitle
                      : `${safeTitle}.${extension}`;

                    // Trigger download
                    const url = window.URL.createObjectURL(data);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = finalFileName;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);

                    toast({
                      title: 'Success',
                      description: 'File downloaded successfully!'
                    });
                  } catch (error) {
                    console.error('Download error:', error);

                    // Fallback: try direct URL download (works for public buckets)
                    try {
                      const a = document.createElement('a');
                      a.href = resource.file_url;
                      a.target = '_blank';
                      a.rel = 'noopener noreferrer';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    } catch {}

                    toast({
                      title: 'Error',
                      description: 'Failed to download file. Please try again.',
                      variant: 'destructive'
                    });
                  }
                }}
                className="w-full"
                size="sm"
              >
                <Download className="mr-2 h-3 w-3" />
                Download
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredResources.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <File className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No resources found</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedGroup !== 'all' 
                ? 'Try adjusting your search or filters.' 
                : 'Start building your resource library by uploading study materials!'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Resources;