import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Upload, Eye, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

interface PeerReview {
  id: string;
  submission_title: string;
  submission_content: string;
  submission_file_url: string;
  review_content: string;
  rating: number;
  status: string;
  group_id: string;
  submitted_by: string;
  reviewed_by: string;
  created_at: string;
  updated_at: string;
}

interface Group {
  id: string;
  name: string;
}

const PeerReview = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<PeerReview[]>([]);
  const [mySubmissions, setMySubmissions] = useState<PeerReview[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; submission: PeerReview | null }>({
    open: false,
    submission: null
  });
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    group_id: '',
    file: null as File | null
  });
  const [reviewData, setReviewData] = useState({
    content: '',
    rating: 0
  });

  useEffect(() => {
    if (user) {
      fetchSubmissions();
      fetchMySubmissions();
      fetchGroups();
    }
  }, [user]);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('peer_reviews')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive"
      });
    }
  };

  const fetchMySubmissions = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('peer_reviews')
        .select('*')
        .eq('submitted_by', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMySubmissions(data || []);
    } catch (error) {
      console.error('Error fetching my submissions:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const submitForReview = async () => {
    if (!formData.title || !formData.group_id) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      let fileUrl = null;
      
      // Upload file if provided
      if (formData.file) {
        const fileExt = formData.file.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('group-files')
          .upload(fileName, formData.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('group-files')
          .getPublicUrl(fileName);

        fileUrl = publicUrl;
      }

      const { error } = await supabase
        .from('peer_reviews')
        .insert({
          submission_title: formData.title,
          submission_content: formData.content,
          submission_file_url: fileUrl,
          group_id: formData.group_id,
          submitted_by: profile.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Submission uploaded for peer review!"
      });

      setFormData({ title: '', content: '', group_id: '', file: null });
      setIsDialogOpen(false);
      fetchSubmissions();
      fetchMySubmissions();
    } catch (error) {
      console.error('Error submitting for review:', error);
      toast({
        title: "Error",
        description: "Failed to submit for review",
        variant: "destructive"
      });
    }
  };

  const submitReview = async () => {
    if (!reviewData.content || reviewData.rating === 0) {
      toast({
        title: "Error",
        description: "Please provide a review and rating",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile || !reviewDialog.submission) return;

      const { error } = await supabase
        .from('peer_reviews')
        .update({
          review_content: reviewData.content,
          rating: reviewData.rating,
          reviewed_by: profile.id,
          status: 'completed'
        })
        .eq('id', reviewDialog.submission.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Review submitted successfully!"
      });

      setReviewData({ content: '', rating: 0 });
      setReviewDialog({ open: false, submission: null });
      fetchSubmissions();
      fetchMySubmissions();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'completed' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
  };

  const renderStars = (rating: number, onRate?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} ${onRate ? 'cursor-pointer' : ''}`}
            onClick={() => onRate?.(star)}
          />
        ))}
      </div>
    );
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Peer Review</h1>
          <p className="text-muted-foreground">Submit work for review and review others' submissions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Submit for Review
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>Submit Work for Peer Review</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Assignment or project title"
                />
              </div>
              <div>
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Your work content or description"
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="group">Group *</Label>
                <Select value={formData.group_id} onValueChange={(value) => setFormData({ ...formData, group_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="file">Attachment (optional)</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                  className="mt-2"
                />
              </div>
              <Button onClick={submitForReview} className="w-full">
                Submit for Review
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="available" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available">Available to Review</TabsTrigger>
          <TabsTrigger value="my-submissions">My Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {submissions.map((submission) => (
              <Card key={submission.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-2">{submission.submission_title}</CardTitle>
                    <Badge variant="secondary" className={getStatusColor(submission.status)}>
                      {submission.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {submission.submission_content}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Group submission</span>
                    <span>Pending review</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setReviewDialog({ open: true, submission })}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Review
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {submissions.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">No submissions available for review</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="my-submissions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {mySubmissions.map((submission) => (
              <Card key={submission.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-2">{submission.submission_title}</CardTitle>
                    <Badge variant="secondary" className={getStatusColor(submission.status)}>
                      {submission.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {submission.submission_content}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>My submission</span>
                    {submission.status === 'completed' && submission.rating && (
                      <div className="flex items-center gap-2">
                        {renderStars(submission.rating)}
                        <span>({submission.rating}/5)</span>
                      </div>
                    )}
                  </div>

                  {submission.status === 'completed' && submission.review_content && (
                    <div className="border-t pt-3">
                      <p className="text-sm font-medium">Review:</p>
                      <p className="text-sm text-muted-foreground">{submission.review_content}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {mySubmissions.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">You haven't submitted anything for review yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onOpenChange={(open) => setReviewDialog({ open, submission: null })}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
          </DialogHeader>
          {reviewDialog.submission && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">{reviewDialog.submission.submission_title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {reviewDialog.submission.submission_content}
                </p>
              </div>
              
              <div>
                <Label>Rating *</Label>
                <div className="mt-2">
                  {renderStars(reviewData.rating, (rating) => setReviewData({ ...reviewData, rating }))}
                </div>
              </div>

              <div>
                <Label htmlFor="review">Review Comments *</Label>
                <Textarea
                  id="review"
                  value={reviewData.content}
                  onChange={(e) => setReviewData({ ...reviewData, content: e.target.value })}
                  placeholder="Provide constructive feedback..."
                  rows={4}
                />
              </div>

              <Button onClick={submitReview} className="w-full">
                Submit Review
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PeerReview;