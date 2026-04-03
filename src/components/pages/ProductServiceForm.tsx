import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Upload, X, File as FileIcon, Loader2 } from 'lucide-react';

interface ProductServiceFormProps {
  type: 'product' | 'service';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
  userRole?: string; // Add userRole prop
}

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

export function ProductServiceForm({ type, isOpen, onClose, onSuccess, editData, userRole }: ProductServiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');

  // Refs for file inputs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [sku, setSku] = useState('');
  const [upc, setUpc] = useState('');
  const [unit, setUnit] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [stock, setStock] = useState('');
  const [status, setStatus] = useState('active');
  const [publishOnWebsite, setPublishOnWebsite] = useState(userRole === 'offer_manager' ? false : true);
  const [enableOnlineSales, setEnableOnlineSales] = useState(false);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // Files
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>(['']);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<any[]>([]);

  // Validation errors
  const [errors, setErrors] = useState<{
    title?: string;
    category?: string;
    images?: string;
  }>({});

  // Add debounced name validation
  const [isCheckingName, setIsCheckingName] = useState(false);

  // Debounced function to check name uniqueness
  const checkNameUniqueness = async (name: string) => {
    if (!name.trim() || name === editData?.title) return;
    
    setIsCheckingName(true);
    try {
      const endpoint = type === 'product' ? '/api/products' : '/api/services';
      const response = await fetch(`${endpoint}?checkName=${encodeURIComponent(name)}`);
      const data = await response.json();
      
      if (data.exists) {
        setErrors(prev => ({ 
          ...prev, 
          title: `A ${type} with this name already exists` 
        }));
      } else {
        setErrors(prev => ({ 
          ...prev, 
          title: undefined 
        }));
      }
    } catch (error) {
      console.error('Error checking name uniqueness:', error);
    } finally {
      setIsCheckingName(false);
    }
  };

  // Debounce the name check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title.trim() && title !== editData?.title) {
        checkNameUniqueness(title);
      } else if (title === editData?.title) {
        // Clear any existing error if we're back to the original name
        setErrors(prev => ({ 
          ...prev, 
          title: undefined 
        }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [title, type, editData?.title]);

  // Load categories and subcategories
  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen, type]);

  // Load edit data
  useEffect(() => {
    if (editData) {
      setTitle(editData.title || '');
      setDescription(editData.description || '');
      setPrice(editData.price?.toString() || '');
      setSku(editData.sku || '');
      setUpc(editData.documents?.upc || '');
      setUnit(editData.unit || '');
      setCurrency(editData.documents?.currency || 'EUR');
      setStock(editData.stock?.toString() || '');
      setStatus(editData.status || 'active');
      setSelectedSubcategory(editData.subcategoryId || '');

      // Set category from subcategory or direct category (when no subcategory)
      if (editData.subcategory?.category?.id) {
        setSelectedCategory(editData.subcategory.category.id);
      } else if (editData.category?.id) {
        setSelectedCategory(editData.category.id);
      }

      setPublishOnWebsite(editData.publishOnWebsite ?? true);
      setEnableOnlineSales(editData.enableOnlineSales ?? false);
      setMetaTitle(editData.metaTitle || '');
      setMetaDescription(editData.metaDescription || '');
      setVideoUrls(editData.videos?.length > 0 ? editData.videos : ['']);
      setExistingImages(editData.images || []);
      // documents can be { files: [...] } or array - extract files for display
      const docs = editData.documents;
      setExistingDocuments(docs?.files || (Array.isArray(docs) ? docs : []));
    }
  }, [editData]);

  // Set category based on subcategory or direct category when subcategories are loaded
  useEffect(() => {
    if (editData && subcategories.length > 0) {
      // First try to get category from the subcategory object (if available)
      if (editData.subcategory?.category?.id) {
        setSelectedCategory(editData.subcategory.category.id);
      }
      // Direct category (product with main category but no subcategory)
      else if (editData.category?.id) {
        setSelectedCategory(editData.category.id);
      }
      // Fallback: find category by subcategoryId
      else if (editData.subcategoryId) {
        const subcategory = subcategories.find(sub => sub.id === editData.subcategoryId);
        if (subcategory) {
          setSelectedCategory(subcategory.categoryId);
        }
      }
    }
  }, [editData, subcategories]);

  // Auto-disable publish when status changes to inactive (for products and services)
  useEffect(() => {
    if (status === 'inactive' && publishOnWebsite) {
      setPublishOnWebsite(false);
    }
  }, [status, publishOnWebsite]);

  const loadCategories = async () => {
    try {
      const categoryType = type === 'product' ? 'product-categories' : 'service-categories';
      const subcategoryType = type === 'product' ? 'product-subcategories' : 'service-subcategories';

      const [catRes, subRes] = await Promise.all([
        fetch(`/api/categories/${categoryType}`),
        fetch(`/api/categories/${subcategoryType}`)
      ]);

      const catData = await catRes.json();
      const subData = await subRes.json();

      setCategories(catData.categories || []);
      setSubcategories(subData.subcategories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Handle category change and reset subcategory
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(''); // Reset subcategory when category changes
    if (categoryId) {
      setErrors(prev => ({ ...prev, category: undefined }));
    }
  };

  // Get filtered subcategories based on selected category
  const getFilteredSubcategories = () => {
    if (!selectedCategory) return [];
    return subcategories.filter(sub => sub.categoryId === selectedCategory);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Image change triggered', e.target.files);
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      console.log('New files:', newFiles);
      setImageFiles(prev => {
        const updated = [...prev, ...newFiles];
        console.log('Updated image files:', updated);
        return updated;
      });
      // Reset input so user can select the same file again or add more
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
    console.log('Document change triggered', e.target.files);
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      console.log('New document files:', newFiles);
      setDocumentFiles(prev => {
        const updated = [...prev, ...newFiles];
        console.log('Updated document files:', updated);
        return updated;
      });
      // Reset input so user can select the same file again or add more
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

    // Don't submit if name validation is in progress
    if (isCheckingName) {
      return;
    }

    // Validate required fields
    const newErrors: typeof errors = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!selectedCategory) {
      newErrors.category = 'Main category is required';
    }

    if (!price || parseFloat(price) <= 0) {
      alert('Price is required and must be greater than 0');
      return;
    }

    const totalImages = imageFiles.length + existingImages.length;
    if (totalImages === 0) {
      newErrors.images = 'At least one image is required';
    }

    // Check if there are existing validation errors (like duplicate name)
    if (errors.title && !newErrors.title) {
      newErrors.title = errors.title;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const formData = new FormData();

      // Add text fields
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('subcategoryId', selectedSubcategory || ''); // Allow empty subcategory
      formData.append('categoryId', selectedCategory || ''); // Send main category ID
      formData.append('publishOnWebsite', publishOnWebsite.toString());
      formData.append('enableOnlineSales', enableOnlineSales.toString());
      formData.append('metaTitle', metaTitle);
      formData.append('metaDescription', metaDescription);

      // Product-specific fields
      if (type === 'product') {
        formData.append('sku', sku);
        formData.append('upc', upc);
        formData.append('unit', unit);
        formData.append('currency', currency);
        formData.append('stock', stock);
        formData.append('status', status);
      }

      // Service-specific fields
      if (type === 'service') {
        formData.append('status', status);
      }

      // Add image files
      imageFiles.forEach(file => {
        formData.append('images', file);
      });

      // When editing, send remaining existing images (after user deletions) so API can update
      if (editData) {
        formData.append('existingImages', JSON.stringify(existingImages));
      }

      // When editing, send remaining existing documents (after user deletions) so API can update
      if (editData) {
        const baseDocs = editData?.documents && typeof editData.documents === 'object' && !Array.isArray(editData.documents) ? editData.documents : {};
        const documentsPayload = type === 'product'
          ? { ...baseDocs, files: existingDocuments, currency, upc }
          : { ...baseDocs, files: existingDocuments };
        formData.append('existingDocuments', JSON.stringify(documentsPayload));
      }

      // Add video URLs
      videoUrls.filter(url => url.trim()).forEach(url => {
        formData.append('videos', url);
      });

      // Add document files directly (will be uploaded on backend)
      documentFiles.forEach(file => {
        formData.append('documents', file);
      });

      const endpoint = type === 'product' ? '/api/products' : '/api/services';
      const method = editData ? 'PUT' : 'POST';
      const url = editData ? `${endpoint}/${editData.id}` : endpoint;

      const response = await fetch(url, {
        method,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Handle specific validation errors
        if (error.error === 'A product with this name already exists' || 
            error.error === 'A service with this name already exists') {
          setErrors({ title: error.error });
          return;
        }
        
        throw new Error(error.error || 'Failed to save');
      }

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error saving:', error);
      alert(error.message || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setTitle('');
    setDescription('');
    setPrice('');
    setSku('');
    setUpc('');
    setUnit('');
    setCurrency('EUR');
    setStock('');
    setStatus('active');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setPublishOnWebsite(userRole === 'offer_manager' ? false : true);
    setEnableOnlineSales(false);
    setMetaTitle('');
    setMetaDescription('');
    setImageFiles([]);
    setExistingImages([]);
    setVideoUrls(['']);
    setDocumentFiles([]);
    setExistingDocuments([]);
    setErrors({});
    onClose();
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editData ? 'Edit' : 'Add'} {type === 'product' ? 'Product' : 'Service'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <div className="relative">
                <Input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (e.target.value.trim()) {
                      setErrors(prev => ({ ...prev, title: undefined }));
                    }
                  }}
                  placeholder={`Enter ${type} Name`}
                  className={errors.title ? 'border-red-500 pr-10' : 'pr-10'}
                />
                {isCheckingName && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description"
                rows={4}
              />
            </div>
          </div>

          {/* Category & Pricing */}
          <div className="space-y-4">
            {/* Main Category - Required */}
            <div>
              <Label>Main Category *</Label>
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select main category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-red-500 mt-1">{errors.category}</p>
              )}
            </div>

            {/* Subcategory - Optional, depends on main category */}
            <div>
              <Label>Subcategory (Optional)</Label>
              <Select
                value={selectedSubcategory || 'none'}
                onValueChange={(value) => setSelectedSubcategory(value === 'none' ? '' : value)}
                disabled={!selectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedCategory ? "Select subcategory (optional)" : "Select main category first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No subcategory</SelectItem>
                  {getFilteredSubcategories().map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price & Currency */}
            <div>
              <Label>Price & Currency *</Label>
              <div className="flex gap-2">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="flex-1"
                  required
                />
              </div>
            </div>
          </div>

          {/* Product-specific fields */}
          {type === 'product' && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>SKU</Label>
                  <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="PROD-001"
                  />
                </div>

                <div>
                  <Label>UPC</Label>
                  <Input
                    value={upc}
                    onChange={(e) => setUpc(e.target.value)}
                    placeholder="123456789012"
                  />
                </div>

                <div>
                  <Label>Unit of Measurement</Label>
                  <Select value={unit || 'none'} onValueChange={(value) => setUnit(value === 'none' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No unit</SelectItem>
                      {/* Weight Units */}
                      <SelectItem value="kg">Kilogram (kg)</SelectItem>
                      <SelectItem value="g">Gram (g)</SelectItem>
                      <SelectItem value="lb">Pound (lb)</SelectItem>
                      <SelectItem value="ton">Ton</SelectItem>

                      {/* Length Units */}
                      <SelectItem value="m">Meter (m)</SelectItem>
                      <SelectItem value="cm">Centimeter (cm)</SelectItem>
                      <SelectItem value="mm">Millimeter (mm)</SelectItem>
                      <SelectItem value="ft">Foot (ft)</SelectItem>
                      <SelectItem value="in">Inch (in)</SelectItem>

                      {/* Area Units */}
                      <SelectItem value="m²">Square Meter (m²)</SelectItem>
                      <SelectItem value="ft²">Square Foot (ft²)</SelectItem>

                      {/* Volume Units */}
                      <SelectItem value="l">Liter (l)</SelectItem>
                      <SelectItem value="ml">Milliliter (ml)</SelectItem>

                      {/* Count */}
                      <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Stock Quantity</Label>
                  <Input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Service-specific fields */}
          {type === 'service' && (
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Images */}
          <div>
            <Label>Images (Upload multiple from device) *</Label>

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
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors ${errors.images ? 'border-red-500 bg-red-50' : ''}`}
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload multiple images</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB each</p>
              </div>
              {errors.images && (
                <p className="text-sm text-red-500 mt-1">{errors.images}</p>
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
            <Label>Documents (Upload multiple from device)</Label>

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

          {/* Website Settings - Hidden for offer_manager */}
          {userRole !== 'offer_manager' && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="text-sm text-gray-900">Website Settings</h4>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label>Publish on Website</Label>
                <Switch 
                  checked={publishOnWebsite} 
                  onCheckedChange={setPublishOnWebsite}
                  disabled={status === 'inactive'}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label>Enable Online Sales (Add to Cart)</Label>
                <Switch checked={enableOnlineSales} onCheckedChange={setEnableOnlineSales} />
              </div>
            </div>
          )}

          {/* SEO */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm text-gray-900">SEO Settings</h4>

            <div>
              <Label>Meta Title</Label>
              <Input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="SEO title for search engines"
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || isCheckingName}>
              {loading ? 'Saving...' : isCheckingName ? 'Validating...' : editData ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
