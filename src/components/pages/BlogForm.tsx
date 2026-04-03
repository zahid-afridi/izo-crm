import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Upload, X } from 'lucide-react';

interface BlogFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
  categories: any[];
}

export function BlogForm({ isOpen, onClose, onSuccess, editData, categories = [] }: BlogFormProps) {
  const [loading, setLoading] = useState(false);
  
  const featuredImageInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [publishOnWebsite, setPublishOnWebsite] = useState(false);
  const [showOnHomepage, setShowOnHomepage] = useState(false);
  const [publishedAt, setPublishedAt] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null);
  const [existingFeaturedImage, setExistingFeaturedImage] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>(['']);

  useEffect(() => {
    if (editData) {
      setTitle(editData.title || '');
      setContent(editData.content || '');
      setAuthor(editData.author || '');
      setCategoryId(editData.categoryId || '');
      setPublishOnWebsite(editData.publishOnWebsite ?? false);
      setPublishedAt(editData.publishedAt ? new Date(editData.publishedAt).toISOString().split('T')[0] : '');
      setMetaTitle(editData.metaTitle || '');
      setMetaDescription(editData.metaDescription || '');
      setExistingFeaturedImage(editData.featuredImage || null);
      setExistingImages(editData.images || []);
      setTags(editData.tags?.length > 0 ? editData.tags : ['']);
      
      // Fetch homepage status from the database
      fetchHomepageStatus(editData.id);
    }
  }, [editData]);

  const fetchHomepageStatus = async (blogId: string) => {
    try {
      const response = await fetch(`/api/homepage-blogs?blogId=${blogId}`);
      if (response.ok) {
        const data = await response.json();
        // If the blog exists in homepageBlogs, set showOnHomepage to true
        const isOnHomepage = data.homepageBlogs && data.homepageBlogs.length > 0;
        setShowOnHomepage(isOnHomepage);
      }
    } catch (error) {
      console.error('Error fetching homepage status:', error);
      // Fall back to the editData value
      setShowOnHomepage(editData?.showOnHomepage ?? false);
    }
  };

  const handleFeaturedImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFeaturedImageFile(e.target.files[0]);
      setExistingFeaturedImage(null);
    }
  };

  const removeFeaturedImage = () => {
    setFeaturedImageFile(null);
    setExistingFeaturedImage(null);
    if (featuredImageInputRef.current) {
      featuredImageInputRef.current.value = '';
    }
  };

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

  const addTag = () => {
    setTags([...tags, '']);
  };

  const updateTag = (index: number, value: string) => {
    const updated = [...tags];
    updated[index] = value;
    setTags(updated);
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      
      formData.append('title', title);
      formData.append('content', content);
      formData.append('author', author);
      formData.append('categoryId', categoryId);
      formData.append('publishOnWebsite', publishOnWebsite.toString());
      formData.append('showOnHomepage', showOnHomepage.toString());
      formData.append('publishedAt', publishedAt);
      formData.append('metaTitle', metaTitle);
      formData.append('metaDescription', metaDescription);
      
      if (editData && existingFeaturedImage) {
        formData.append('keepExistingFeaturedImage', 'true');
      }
      
      if (featuredImageFile) {
        formData.append('featuredImage', featuredImageFile);
      }
      
      if (editData && existingImages.length > 0) {
        formData.append('existingImages', JSON.stringify(existingImages));
      }
      
      imageFiles.forEach(file => {
        formData.append('images', file);
      });
      
      tags.filter(t => t.trim()).forEach(tag => {
        formData.append('tags', tag);
      });

      const method = editData ? 'PUT' : 'POST';
      const url = editData ? `/api/blogs/${editData.id}` : '/api/blogs';

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
      console.error('Error saving blog:', error);
      alert(error.message || 'Failed to save blog. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setAuthor('');
    setCategoryId('');
    setPublishOnWebsite(false);
    setShowOnHomepage(false);
    setPublishedAt('');
    setMetaTitle('');
    setMetaDescription('');
    setFeaturedImageFile(null);
    setExistingFeaturedImage(null);
    setImageFiles([]);
    setExistingImages([]);
    setTags(['']);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editData ? 'Edit' : 'Add'} Blog Post
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter blog title"
              required
            />
          </div>

          <div>
            <Label>Content *</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your blog content here..."
              rows={8}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Author *</Label>
              <Input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author name"
                required
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select value={categoryId || 'none'} onValueChange={(val) => setCategoryId(val === 'none' ? '' : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="none">No Category</SelectItem>
                  {categories && categories.length > 0 ? (
                    categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-gray-500">No categories available</div>
                  )}
                </SelectContent>
              </Select>
              {categories && categories.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">Create categories first in the Categories tab</p>
              )}
            </div>
          </div>

          <div>
            <Label>Additional Images</Label>
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
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Click to upload multiple images</p>
            </div>
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

          <div>
            <Label>Tags</Label>
            <div className="space-y-2">
              {tags.map((tag, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={tag}
                    onChange={(e) => updateTag(index, e.target.value)}
                    placeholder="Enter tag"
                  />
                  {tags.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeTag(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                + Add Tag
              </Button>
            </div>
          </div>

          <div>
            <Label>Published Date</Label>
            <Input
              type="date"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
            />
          </div>

          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-medium">SEO Settings</h4>
            <div>
              <Label>Meta Title</Label>
              <Input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="SEO title"
              />
            </div>
            <div>
              <Label>Meta Description</Label>
              <Textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="SEO description"
                rows={2}
              />
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm font-medium">Website Settings</h4>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Publish on Website</Label>
                <p className="text-xs text-gray-500">Make this blog visible on the website</p>
              </div>
              <Switch checked={publishOnWebsite} onCheckedChange={setPublishOnWebsite} />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Show on Homepage</Label>
                <p className="text-xs text-gray-500">Display in recent blogs section</p>
              </div>
              <Switch checked={showOnHomepage} onCheckedChange={setShowOnHomepage} />
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
