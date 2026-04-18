import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import supabase from '@/lib/supabaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Upload, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ContentUpload = ({ creatorId, onUploadSuccess }) => {
  const { currentUser } = useAuth();
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds 20MB limit. This cat is too chonky!');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error('Please select a cat photo or video to upload');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds 20MB limit');
      return;
    }
    if (!currentUser || currentUser.id !== creatorId) {
      toast.error('You can only upload to your own profile');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((p) => (p >= 90 ? 90 : p + 10));
    }, 100);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not signed in');

      const { uploadUrl, publicUrl } = await apiServerClient.post(
        '/uploads/sign',
        { contentType: file.type, size: file.size },
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error(`Storage upload failed (${putRes.status})`);

      const { error: insertErr } = await supabase
        .from('content')
        .insert({
          creator_id: creatorId,
          file_url: publicUrl,
          caption: caption || null,
        });
      if (insertErr) throw insertErr;

      clearInterval(progressInterval);
      setUploadProgress(100);
      toast.success('Content uploaded successfully! Your cat is now famous.');
      setFile(null);
      setCaption('');
      setPreview(null);
      setUploadProgress(0);
      onUploadSuccess?.();
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Upload failed:', err);
      toast.error('Upload failed. This cat is camera shy.');
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setUploadProgress(0);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4">Upload Cat Content</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          {!preview ? (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center justify-center py-6">
                <Upload className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload cat photos or videos
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, GIF, WEBP, MP4, or WEBM (max 20MB)
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                onChange={handleFileChange}
              />
            </label>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                  {file?.type?.startsWith('video/') ? (
                    <video src={preview} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  )}
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={clearFile}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{file?.name}</span>
                <span>{formatFileSize(file?.size || 0)}</span>
              </div>

              {file && file.size > MAX_FILE_SIZE && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">
                    File size exceeds 20MB limit. Please select a smaller file.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {loading && uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium mb-2 block">Caption</label>
          <Textarea
            placeholder="Add a caption for your cat content..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            className="text-gray-900 placeholder:text-gray-500"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={!file || loading || (file && file.size > MAX_FILE_SIZE)}
        >
          {loading ? 'Uploading...' : 'Upload Content'}
        </Button>
      </form>
    </Card>
  );
};

export default ContentUpload;
