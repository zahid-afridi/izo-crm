import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { X, Package } from 'lucide-react';

interface AddToHomepageDialogProps {
  type: 'product' | 'service' | 'project' | 'blog' | 'video';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddToHomepageDialog({ type, isOpen, onClose, onSuccess }: AddToHomepageDialogProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen, type]);

  const loadItems = async () => {
    setLoadingItems(true);
    try {
      let endpoint = '';
      if (type === 'product') endpoint = '/api/products';
      else if (type === 'service') endpoint = '/api/services';
      else if (type === 'project') endpoint = '/api/projects';
      else if (type === 'blog') endpoint = '/api/blogs';
      else if (type === 'video') endpoint = '/api/videos';
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      let itemsList = [];
      if (type === 'product') itemsList = data.products;
      else if (type === 'service') itemsList = data.services;
      else if (type === 'project') itemsList = data.projects;
      else if (type === 'blog') itemsList = data.blogs;
      else if (type === 'video') itemsList = data.videos;
      
      setItems(itemsList || []);
    } catch (error) {
      console.error(`Error loading ${type}s:`, error);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleAddItem = (itemId: string) => {
    if (!selectedItems.includes(itemId)) {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter(id => id !== itemId));
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      alert(`Please select at least one ${type}`);
      return;
    }

    setLoading(true);

    try {
      let endpoint = '';
      let idKey = '';
      
      if (type === 'product') {
        endpoint = '/api/homepage-products';
        idKey = 'productId';
      } else if (type === 'service') {
        endpoint = '/api/homepage-services';
        idKey = 'serviceId';
      } else if (type === 'project') {
        endpoint = '/api/homepage-projects';
        idKey = 'projectId';
      } else if (type === 'blog') {
        endpoint = '/api/homepage-blogs';
        idKey = 'blogId';
      } else if (type === 'video') {
        endpoint = '/api/homepage-videos';
        idKey = 'videoId';
      }

      // Add each selected item
      const promises = selectedItems.map((itemId, index) =>
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            [idKey]: itemId,
            displayOrder: index,
          }),
        })
      );

      const results = await Promise.all(promises);
      
      // Check if any failed
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        const errors = await Promise.all(failed.map(r => r.json()));
        console.error('Some items failed to add:', errors);
        alert(`${failed.length} ${type}(s) could not be added (may already be on homepage)`);
      }

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error(`Error adding ${type}s to homepage:`, error);
      alert(`Failed to add ${type}s to homepage. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedItems([]);
    onClose();
  };



  const getItemDetails = (itemId: string) => {
    return items.find(i => i.id === itemId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Add {type === 'product' ? 'Products' : type === 'service' ? 'Services' : 'Projects'} to Homepage
          </DialogTitle>
          <p className="text-sm text-gray-500">
            Select items from the list below to display on your homepage
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Available Items Grid */}
          <div>
            <Label className="text-base mb-3 block">
              Available {type === 'product' ? 'Products' : type === 'service' ? 'Services' : 'Projects'}
            </Label>
            {loadingItems ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No {type}s found
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto border rounded-lg p-4">
                {items.map((item) => {
                  const isSelected = selectedItems.includes(item.id);
                  const imageUrl = item.images && item.images.length > 0 ? item.images[0] : null;
                  
                  return (
                    <div
                      key={item.id}
                      onClick={() => !isSelected && handleAddItem(item.id)}
                      className={`flex gap-3 p-3 border rounded-lg cursor-pointer transition-all overflow-hidden ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300 opacity-50 cursor-not-allowed'
                          : 'hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      {/* Image */}
                      <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border">
                        {imageUrl ? (
                          <img 
                            src={imageUrl} 
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <h4 className="text-sm font-medium text-gray-900 truncate mb-2">
                          {item.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1 mb-1">
                          {type !== 'project' && item.subcategory && (
                            <Badge variant="outline" className="text-xs max-w-full">
                              <span className="truncate">
                                {item.subcategory.category.name}
                              </span>
                            </Badge>
                          )}
                          {type === 'project' && item.location && (
                            <span className="text-xs text-gray-600 truncate">{item.location}</span>
                          )}
                          {item.price && (
                            <span className="text-xs text-gray-600 font-medium">${item.price}</span>
                          )}
                        </div>
                        {isSelected && (
                          <Badge className="text-xs bg-blue-600 mt-1">Selected</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <div>
              <Label className="text-base mb-3 block">
                Selected Items ({selectedItems.length}) - Homepage Order
              </Label>
              <div className="space-y-2 border rounded-lg p-4 bg-gray-50">
                {selectedItems.map((itemId, index) => {
                  const item = getItemDetails(itemId);
                  if (!item) return null;
                  
                  const imageUrl = item.images && item.images.length > 0 ? item.images[0] : null;
                  
                  return (
                    <div
                      key={itemId}
                      className="flex items-center gap-3 p-3 bg-white border rounded-lg"
                    >
                      {/* Order Badge */}
                      <Badge variant="default" className="flex-shrink-0">
                        #{index + 1}
                      </Badge>
                      
                      {/* Image */}
                      <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border">
                        {imageUrl ? (
                          <img 
                            src={imageUrl} 
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-medium text-gray-900 truncate mb-1">{item.title}</p>
                        <div className="flex flex-wrap items-center gap-1">
                          {type !== 'project' && item.subcategory && (
                            <Badge variant="outline" className="text-xs max-w-full">
                              <span className="truncate">
                                {item.subcategory.category.name}
                              </span>
                            </Badge>
                          )}
                          {type === 'project' && item.location && (
                            <span className="text-xs text-gray-500 truncate">{item.location}</span>
                          )}
                          {item.price && (
                            <span className="text-xs text-gray-500 font-medium">${item.price}</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Remove Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(itemId)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Items will appear on the homepage in this order
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || selectedItems.length === 0}>
            {loading ? 'Adding...' : `Add ${selectedItems.length} ${type}(s) to Homepage`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
