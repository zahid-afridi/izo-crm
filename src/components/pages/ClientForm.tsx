import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Upload, X } from 'lucide-react';

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
}

export function ClientForm({ isOpen, onClose, onSuccess, editData }: ClientFormProps) {
  const [loading, setLoading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [existingLogo, setExistingLogo] = useState<string | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');

  useEffect(() => {
    if (editData) {
      setExistingLogo(editData.logoUrl || null);
      setWebsiteUrl(editData.websiteUrl || '');
    }
  }, [editData]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
      setExistingLogo(null);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setExistingLogo(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!logoFile && !existingLogo) {
      alert('Please upload a logo');
      return;
    }

    if (!websiteUrl.trim()) {
      alert('Website URL is required');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      
      formData.append('websiteUrl', websiteUrl);
      
      if (editData && existingLogo) {
        formData.append('keepExistingLogo', 'true');
      }
      
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const method = editData ? 'PUT' : 'POST';
      const url = editData ? `/api/we-work-with/${editData.id}` : '/api/we-work-with';

      console.log('Submitting partner logo:', { method, url, hasLogo: !!logoFile, websiteUrl });

      const response = await fetch(url, {
        method,
        body: formData,
      });

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Success:', result);

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error saving client:', error);
      alert(error.message || 'Failed to save client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLogoFile(null);
    setExistingLogo(null);
    setWebsiteUrl('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editData ? 'Edit' : 'Add'} Client Logo
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div>
            <Label>Company Logo *</Label>
            {existingLogo && !logoFile && (
              <div className="mb-2 relative group">
                <img src={existingLogo} alt="Logo" className="w-32 h-32 object-contain rounded border p-2 bg-white" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={removeLogo}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
            <div 
              onClick={() => logoInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Click to upload company logo</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG recommended</p>
              {logoFile && (
                <p className="text-xs text-green-600 mt-2">✓ {logoFile.name}</p>
              )}
            </div>
          </div>

          <div>
            <Label>Website URL *</Label>
            <Input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Link to company website
            </p>
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
