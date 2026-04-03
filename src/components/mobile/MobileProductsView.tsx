import { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Eye,
  ChevronRight,
  Package,
  Globe,
  ShoppingBag,
  Image as ImageIcon,
  FileText,
  Video,
  X,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';

// Mock products data
const mockProducts = [
  {
    id: 1,
    name: 'PVC Membrane Premium',
    category: 'Waterproofing',
    sku: 'IZO-WP-001',
    unit: 'm²',
    price: 15.50,
    stock: 1250,
    publishedOnWebsite: true,
    sellOnline: true,
    status: 'active',
    photos: 3,
    documents: 2,
    videos: 1,
  },
  {
    id: 2,
    name: 'Bitumen Primer',
    category: 'Primers',
    sku: 'IZO-PR-002',
    unit: 'L',
    price: 8.75,
    stock: 450,
    publishedOnWebsite: true,
    sellOnline: false,
    status: 'active',
    photos: 2,
    documents: 1,
    videos: 0,
  },
  {
    id: 3,
    name: 'Geotextile 300g',
    category: 'Protection',
    sku: 'IZO-PT-003',
    unit: 'm²',
    price: 3.25,
    stock: 2100,
    publishedOnWebsite: false,
    sellOnline: false,
    status: 'active',
    photos: 1,
    documents: 1,
    videos: 0,
  },
  {
    id: 4,
    name: 'TPO Membrane System',
    category: 'Waterproofing',
    sku: 'IZO-WP-004',
    unit: 'm²',
    price: 18.90,
    stock: 850,
    publishedOnWebsite: true,
    sellOnline: true,
    status: 'active',
    photos: 4,
    documents: 3,
    videos: 2,
  },
  {
    id: 5,
    name: 'Adhesive Pro 500',
    category: 'Adhesives',
    sku: 'IZO-AD-005',
    unit: 'kg',
    price: 12.50,
    stock: 320,
    publishedOnWebsite: true,
    sellOnline: false,
    status: 'disabled',
    photos: 2,
    documents: 1,
    videos: 0,
  },
];

export function MobileProductsView() {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showExportCatalog, setShowExportCatalog] = useState(false);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Product form states
  const [publishOnWebsite, setPublishOnWebsite] = useState(true);
  const [enableOnlineSales, setEnableOnlineSales] = useState(false);
  const [includePricing, setIncludePricing] = useState(true);
  const [exportFormat, setExportFormat] = useState('pdf');
  
  const filteredProducts = mockProducts.filter(product => {
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4 pb-24">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-8 h-8 text-blue-600" />
            <Badge variant="outline" className="text-xs">+8</Badge>
          </div>
          <p className="text-2xl text-gray-900">156</p>
          <p className="text-xs text-gray-600">Total Products</p>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <Globe className="w-8 h-8 text-green-600" />
            <Badge variant="outline" className="text-xs">+3</Badge>
          </div>
          <p className="text-2xl text-gray-900">142</p>
          <p className="text-xs text-gray-600">Published</p>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={() => setShowAddProduct(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setShowExportCatalog(true)}
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilterSheet(true)}
        >
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Category Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {['all', 'Waterproofing', 'Primers', 'Protection', 'Adhesives'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
              categoryFilter === cat
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200'
            }`}
          >
            {cat === 'all' ? 'All' : cat}
          </button>
        ))}
      </div>

      {/* Products List */}
      <div className="space-y-3">
        {filteredProducts.map((product) => (
          <Card
            key={product.id}
            className="p-4 active:bg-gray-50"
            onClick={() => {
              setSelectedProduct(product);
              setShowProductDetail(true);
            }}
          >
            <div className="flex gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-sm text-gray-900 truncate">{product.name}</h3>
                  <Badge
                    variant={product.status === 'active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {product.status}
                  </Badge>
                </div>
                
                <p className="text-xs text-gray-500 mb-2">{product.sku} • {product.category}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-900">€{product.price.toFixed(2)}</span>
                    <span className="text-xs text-gray-500">{product.stock} {product.unit}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {product.publishedOnWebsite && (
                      <Globe className="w-4 h-4 text-green-600" />
                    )}
                    {product.sellOnline && (
                      <ShoppingBag className="w-4 h-4 text-blue-600" />
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Create a new product with website visibility settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label>Product Name</Label>
              <Input placeholder="Enter product name" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>SKU</Label>
                <Input placeholder="IZO-XXX-000" />
              </div>
              <div>
                <Label>Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="waterproofing">Waterproofing</SelectItem>
                    <SelectItem value="primers">Primers</SelectItem>
                    <SelectItem value="protection">Protection</SelectItem>
                    <SelectItem value="adhesives">Adhesives</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price (€)</Label>
                <Input type="number" step="0.01" placeholder="0.00" />
              </div>
              <div>
                <Label>Stock</Label>
                <Input type="number" placeholder="0" />
              </div>
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Product description" rows={3} />
            </div>
            
            {/* Website Visibility */}
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">Publish on Website</p>
                  <p className="text-xs text-gray-500">Visible on izogrup.al</p>
                </div>
                <Switch
                  checked={publishOnWebsite}
                  onCheckedChange={setPublishOnWebsite}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">Enable Online Sales</p>
                  <p className="text-xs text-gray-500">Add to cart & purchase</p>
                </div>
                <Switch
                  checked={enableOnlineSales}
                  onCheckedChange={setEnableOnlineSales}
                />
              </div>
            </div>
            
            {/* Media Upload */}
            <div>
              <Label>Photos</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <ImageIcon className="w-8 h-8 mx-auto text-gray-400 mb-1" />
                <p className="text-xs text-gray-600">Tap to upload photos</p>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddProduct(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  alert('Product added successfully!');
                  setShowAddProduct(false);
                }}
              >
                Add Product
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Catalog Dialog */}
      <Dialog open={showExportCatalog} onOpenChange={setShowExportCatalog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Product Catalog</DialogTitle>
            <DialogDescription>
              Generate catalog with pricing options
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label>Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF - Professional Catalog</SelectItem>
                  <SelectItem value="excel">Excel - Spreadsheet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Categories</Label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="waterproofing">Waterproofing</SelectItem>
                  <SelectItem value="primers">Primers</SelectItem>
                  <SelectItem value="protection">Protection</SelectItem>
                  <SelectItem value="adhesives">Adhesives</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">Include Pricing</p>
                  <p className="text-xs text-gray-500">Show prices in catalog</p>
                </div>
                <Switch
                  checked={includePricing}
                  onCheckedChange={setIncludePricing}
                />
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-900 mb-1">Export Summary</p>
              <div className="space-y-1 text-xs text-blue-700">
                <p>• Format: <span className="font-medium">{exportFormat.toUpperCase()}</span></p>
                <p>• Pricing: <span className="font-medium">{includePricing ? 'Included' : 'Excluded'}</span></p>
                <p>• Products: <span className="font-medium">{filteredProducts.length}</span></p>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowExportCatalog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  alert(`Exporting ${exportFormat.toUpperCase()} ${includePricing ? 'with' : 'without'} pricing`);
                  setShowExportCatalog(false);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Detail Dialog */}
      {selectedProduct && (
        <Dialog open={showProductDetail} onOpenChange={setShowProductDetail}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Product Details</DialogTitle>
              <DialogDescription>
                {selectedProduct.sku}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {/* Product Image */}
              <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <Package className="w-16 h-16 text-gray-400" />
              </div>
              
              {/* Product Info */}
              <div>
                <h3 className="text-lg text-gray-900 mb-2">{selectedProduct.name}</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Category</p>
                    <p className="text-gray-900">{selectedProduct.category}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">SKU</p>
                    <p className="text-gray-900">{selectedProduct.sku}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Price</p>
                    <p className="text-gray-900">€{selectedProduct.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Stock</p>
                    <p className="text-gray-900">{selectedProduct.stock} {selectedProduct.unit}</p>
                  </div>
                </div>
              </div>
              
              {/* Media Count */}
              <div className="border rounded-lg p-3">
                <p className="text-sm text-gray-900 mb-2">Media Files</p>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">{selectedProduct.photos} Photos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">{selectedProduct.documents} Docs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">{selectedProduct.videos} Videos</span>
                  </div>
                </div>
              </div>
              
              {/* Website Status */}
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className={`w-4 h-4 ${selectedProduct.publishedOnWebsite ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="text-sm text-gray-900">Published on Website</span>
                  </div>
                  <Badge variant={selectedProduct.publishedOnWebsite ? 'default' : 'secondary'}>
                    {selectedProduct.publishedOnWebsite ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className={`w-4 h-4 ${selectedProduct.sellOnline ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="text-sm text-gray-900">Sell Online</span>
                  </div>
                  <Badge variant={selectedProduct.sellOnline ? 'default' : 'secondary'}>
                    {selectedProduct.sellOnline ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowProductDetail(false)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    alert('Edit product functionality');
                    setShowProductDetail(false);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Filter Bottom Sheet */}
      <Dialog open={showFilterSheet} onOpenChange={setShowFilterSheet}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Products</DialogTitle>
            <DialogDescription>
              Filter by category and status
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Waterproofing">Waterproofing</SelectItem>
                  <SelectItem value="Primers">Primers</SelectItem>
                  <SelectItem value="Protection">Protection</SelectItem>
                  <SelectItem value="Adhesives">Adhesives</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Status</Label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button
              className="w-full"
              onClick={() => setShowFilterSheet(false)}
            >
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
