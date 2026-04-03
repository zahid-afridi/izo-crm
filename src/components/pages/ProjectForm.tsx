import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Upload, X, File as FileIcon } from 'lucide-react';

interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
}

export function ProjectForm({ isOpen, onClose, onSuccess, editData }: ProjectFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // Refs for file inputs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [client, setClient] = useState('');
  const [location, setLocation] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [duration, setDuration] = useState('');
  const [publishOnWebsite, setPublishOnWebsite] = useState(true);
  const [featured, setFeatured] = useState(false);
  
  // Files
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>(['']);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<any[]>([]);

  // Load edit data
  useEffect(() => {
    if (editData) {
      setTitle(editData.title || '');
      setDescription(editData.description || '');
      setClient(editData.client || '');
      setLocation(editData.location || '');
      setCompletionDate(editData.completionDate ? new Date(editData.completionDate).toISOString().split('T')[0] : '');
      setDuration(editData.duration || '');
      setPublishOnWebsite(editData.publishOnWebsite ?? true);
      setFeatured(editData.featured ?? false);
      setVideoUrls(editData.videos?.length > 0 ? editData.videos : ['']);
      setExistingImages(editData.images || []);
      setExistingDocuments(editData.documents || []);
    }
  }, [editData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...newFiles]);
      e.target.value = '';
    }
  };

  const removeImageFile = (index: number) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setDocumentFiles(prev => [...prev, ...newFiles]);
      e.target.value = '';
    }
  };

  const removeDocumentFile = (index: number) => {
    setDocumentFiles(documentFiles.filter((_, i) => i !== index));
  };

  const removeExistingDocument = (index: number) => {
    setExistingDocuments(existingDocuments.filter((_, i) => i !== index));
  };

  const addVideoUrl = () => {
    setVideoUrls([...videoUrls, '']);
  };

  const updateVideoUrl = (index: number, value: string) => {
    const updated = [...videoUrls];
    updated[index] = value;
    setVideoUrls(updated);
  };

  const removeVideoUrl = (index: number) => {
    setVideoUrls(videoUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const newErrors: { [key: string]: string } = {};
    
    if (!title.trim()) {
      newErrors.title = 'Project title is required';
    }
    
    if (!completionDate.trim()) {
      newErrors.completionDate = 'Completion date is required';
    }
    
    if (!duration.trim()) {
      newErrors.duration = 'Duration is required';
    }
    
    const totalImages = existingImages.length + imageFiles.length;
    if (totalImages === 0) {
      newErrors.images = 'At least one image is required';
    }
    
    setErrors(newErrors);
    
    // If there are errors, don't submit
    if (Object.keys(newErrors).length > 0) {
      return;
    }
    
    setLoading(true);

    try {
      const formData = new FormData();
      
      // Add text fields
      formData.append('title', title);
      formData.append('description', description);
      formData.append('client', client);
      formData.append('location', location);
      formData.append('completionDate', completionDate);
      formData.append('duration', duration);
      formData.append('publishOnWebsite', publishOnWebsite.toString());
      formData.append('featured', featured.toString());
      
      // Add existing images as JSON (for updates)
      if (editData && existingImages.length > 0) {
        formData.append('existingImages', JSON.stringify(existingImages));
      }
      
      // Add new image files
      imageFiles.forEach(file => {
        formData.append('images', file);
      });
      
      // Add video URLs
      videoUrls.filter(url => url.trim()).forEach(url => {
        formData.append('videos', url);
      });
      
      // Add documents as JSON
      const allDocuments = [
        ...existingDocuments,
        ...documentFiles.map(file => ({
          title: file.name,
          url: URL.createObjectURL(file) // In real app, upload to server first
        }))
      ];
      if (allDocuments.length > 0) {
        formData.append('documents', JSON.stringify(allDocuments));
      }

      const method = editData ? 'PUT' : 'POST';
      const url = editData ? `/api/projects/${editData.id}` : '/api/projects';

      const response = await fetch(url, {
        method,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error saving project:', error);
      alert(error.message || 'Failed to save project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setTitle('');
    setDescription('');
    setClient('');
    setLocation('');
    setCompletionDate('');
    setDuration('');
    setPublishOnWebsite(true);
    setFeatured(false);
    setImageFiles([]);
    setExistingImages([]);
    setVideoUrls(['']);
    setDocumentFiles([]);
    setExistingDocuments([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editData ? 'Edit' : 'Add'} Project
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label>Project Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter project title"
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the project, scope of work, challenges, and solutions"
                rows={4}
              />
            </div>
          </div>

          {/* Project Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Client Name</Label>
              <Input
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Client or company name"
              />
            </div>

            <div>
              <Label>Location</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Completion Date *</Label>
              <Input
                type="date"
                value={completionDate}
                onChange={(e) => {
                  setCompletionDate(e.target.value);
                  if (errors.completionDate) {
                    setErrors(prev => ({ ...prev, completionDate: '' }));
                  }
                }}
              />
              {errors.completionDate && (
                <p className="text-red-500 text-sm mt-1">{errors.completionDate}</p>
              )}
            </div>

            <div>
              <Label>Duration *</Label>
              <Input
                value={duration}
                onChange={(e) => {
                  setDuration(e.target.value);
                  if (errors.duration) {
                    setErrors(prev => ({ ...prev, duration: '' }));
                  }
                }}
                placeholder="e.g., 3 months, 6 weeks"
              />
              {errors.duration && (
                <p className="text-red-500 text-sm mt-1">{errors.duration}</p>
              )}
            </div>
          </div>

          {/* Images - Multiple Upload Support */}
          <div>
            <Label>Project Images (Upload multiple from device) *</Label>
            
            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Existing Images:</p>
                <div className="grid grid-cols-3 gap-2">
                  {existingImages.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={`Image ${idx + 1}`} className="w-full h-24 object-cover rounded border" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => removeExistingImage(idx)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
              <div 
                onClick={() => imageInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors ${
                  errors.images ? 'border-red-500 bg-red-50' : ''
                }`}
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload multiple images</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB each</p>
              </div>
              {errors.images && (
                <p className="text-red-500 text-sm mt-1">{errors.images}</p>
              )}
              {imageFiles.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">{imageFiles.length} new file(s) selected:</p>
                  <div className="space-y-1">
                    {imageFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        <span>• {file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => removeImageFile(idx)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Videos */}
          <div>
            <Label>Video URLs (YouTube, Vimeo, etc.)</Label>
            <div className="space-y-2">
              {videoUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={url}
                    onChange={(e) => updateVideoUrl(index, e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  {videoUrls.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeVideoUrl(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addVideoUrl}>
                + Add Another Video URL
              </Button>
            </div>
          </div>

          {/* Documents */}
          <div>
            <Label>Project Documents (Upload multiple from device)</Label>
            
            {/* Existing Documents */}
            {existingDocuments.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Existing Documents:</p>
                <div className="space-y-2">
                  {existingDocuments.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded bg-gray-50">
                      <div className="flex items-center gap-2">
                        <FileIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{doc.title}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeExistingDocument(idx)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <input
                ref={documentInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                multiple
                onChange={handleDocumentChange}
                className="hidden"
              />
              <div 
                onClick={() => documentInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <FileIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload multiple documents</p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX up to 10MB each</p>
              </div>
              {documentFiles.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">{documentFiles.length} new file(s) selected:</p>
                  <div className="space-y-1">
                    {documentFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        <span>• {file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => removeDocumentFile(idx)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Website Settings */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm text-gray-900">Website Settings</h4>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Publish on Website</Label>
                <p className="text-xs text-gray-500">Make this project visible on the website</p>
              </div>
              <Switch checked={publishOnWebsite} onCheckedChange={setPublishOnWebsite} />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Featured Project</Label>
                <p className="text-xs text-gray-500">Show prominently on homepage</p>
              </div>
              <Switch checked={featured} onCheckedChange={setFeatured} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : editData ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
