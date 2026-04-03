import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Upload, X } from 'lucide-react';

interface SliderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
}

export function SliderForm({ isOpen, onClose, onSuccess, editData }: SliderFormProps) {
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonLink, setButtonLink] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState('0');
  
  // Image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  // Load edit data
  useEffect(() => {
    if (editData) {
      setTitle(editData.title || '');
      setDescription(editData.description || '');
      setButtonText(editData.buttonText || '');
      setButtonLink(editData.buttonLink || '');
      setIsActive(editData.isActive ?? true);
      setDisplayOrder(editData.displayOrder?.toString() || '0');
      setExistingImageUrl(editData.imageUrl || '');
      setImagePreview(editData.imageUrl || '');
    }
  }, [editData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setExistingImageUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate image
    if (!imagePreview && !imageFile) {
      alert('Please upload a slider image');
      return;
    }
    
    setLoading(true);

    try {
      const formData = new FormData();
      
      // Add text fields
      formData.append('title', title);
      formData.append('description', description);
      formData.append('buttonText', buttonText);
      formData.append('buttonLink', buttonLink);
      formData.append('isActive', isActive.toString());
      formData.append('displayOrder', displayOrder);
      
      // Add image file if new one selected
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const endpoint = '/api/website-sliders';
      const method = editData ? 'PUT' : 'POST';
      const url = editData ? `${endpoint}/${editData.id}` : endpoint;

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
      console.error('Error saving slider:', error);
      alert(error.message || 'Failed to save slider. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setTitle('');
    setDescription('');
    setButtonText('');
    setButtonLink('');
    setIsActive(true);
    setDisplayOrder('0');
    setImageFile(null);
    setExistingImageUrl('');
    setImagePreview('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editData ? 'Edit' : 'Add'} Homepage Slider
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Image Upload */}
          <div>
            <Label>Slider Image *</Label>
            <div className="mt-2 space-y-2">
              {imagePreview ? (
                <div>
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={removeImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="slider-image-change"
                  />
                  <label htmlFor="slider-image-change">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => document.getElementById('slider-image-change')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Change Image
                    </Button>
                  </label>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="slider-image-upload"
                  />
                  <label htmlFor="slider-image-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Click to upload slider image</p>
                    <p className="text-xs text-gray-400 mt-1">Recommended: 1920x600px, PNG or JPG</p>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <Label>Title (Heading) *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="OUR PROJECTS ARE FULLY COMPLETED IN TIME AND ON BUDGET"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description (Subtitle)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="We have the personal, experience and the right resources..."
              rows={3}
            />
          </div>

          {/* Button Settings */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm text-gray-900">Button Settings (Optional)</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Button Text</Label>
                <Input
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="SEE OUR PROJECTS"
                />
              </div>

              <div>
                <Label>Button Link</Label>
                <Input
                  value={buttonLink}
                  onChange={(e) => setButtonLink(e.target.value)}
                  placeholder="/projects"
                />
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm text-gray-900">Display Settings</h4>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-gray-500">Show this slider on website</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
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
