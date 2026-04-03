import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Package, 
  DollarSign, 
  Tag, 
  Box, 
  BarChart3, 
  Globe, 
  ShoppingCart,
  Image as ImageIcon,
  Video,
  FileText,
  Calendar,
  ExternalLink,
  X
} from 'lucide-react';

interface ProductServiceViewProps {
  type: 'product' | 'service';
  data: any;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductServiceView({ type, data, isOpen, onClose }: ProductServiceViewProps) {
  if (!data || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white w-full h-full max-w-none flex flex-col">
        {/* Header */}
        <div className="border-b px-8 py-6 flex-shrink-0 bg-white flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            {type === 'product' ? 'Product Details' : 'Service Details'}
          </h1>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition-all"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 p-8 max-w-7xl mx-auto">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              {/* Header Info */}
              <div className="border-b pb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-4 break-words line-clamp-3">{data.title}</h2>
                <div className="flex flex-wrap gap-2">
                  {(data.subcategory || data.category) && (
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      {data.subcategory
                        ? `${data.subcategory.category.name} → ${data.subcategory.name}`
                        : data.category?.name}
                    </Badge>
                  )}
                  {data.status && (
                    <Badge 
                      variant={data.status === 'active' ? 'default' : 'secondary'}
                      className="text-sm px-3 py-1"
                    >
                      {data.status}
                    </Badge>
                  )}
                  {data.publishOnWebsite && (
                    <Badge className="text-sm bg-green-100 text-green-700 px-3 py-1">
                      <Globe className="w-3 h-3 mr-1" />
                      Published
                    </Badge>
                  )}
                  {data.enableOnlineSales && (
                    <Badge className="text-sm bg-blue-100 text-blue-700 px-3 py-1">
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      Online Sales
                    </Badge>
                  )}
                </div>
              </div>

              {/* Description */}
              {data.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                  <p className="text-gray-600 whitespace-pre-wrap leading-relaxed text-base">{data.description}</p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                {data.price && (
                  <div className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                      <DollarSign className="w-5 h-5" />
                      <span className="text-sm font-medium">Price</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {data.documents?.currency || 'EUR'} {data.price}
                    </p>
                  </div>
                )}

                {type === 'product' && data.sku && (
                  <div className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                      <Tag className="w-5 h-5" />
                      <span className="text-sm font-medium">SKU</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{data.sku}</p>
                  </div>
                )}

                {type === 'product' && data.documents?.upc && (
                  <div className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                      <Package className="w-5 h-5" />
                      <span className="text-sm font-medium">UPC</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{data.documents.upc}</p>
                  </div>
                )}

                {type === 'product' && data.unit && (
                  <div className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                      <Box className="w-5 h-5" />
                      <span className="text-sm font-medium">Unit</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{data.unit}</p>
                  </div>
                )}

                {type === 'product' && data.stock !== undefined && (
                  <div className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                      <BarChart3 className="w-5 h-5" />
                      <span className="text-sm font-medium">Stock</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{data.stock}</p>
                  </div>
                )}

                <div className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Calendar className="w-5 h-5" />
                    <span className="text-sm font-medium">Created</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(data.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Calendar className="w-5 h-5" />
                    <span className="text-sm font-medium">Updated</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(data.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* SEO Information */}
              {(data.metaTitle || data.metaDescription) && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO Information</h3>
                  <div className="space-y-4">
                    {data.metaTitle && (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Meta Title</p>
                        <p className="text-sm text-gray-900">{data.metaTitle}</p>
                      </div>
                    )}
                    {data.metaDescription && (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Meta Description</p>
                        <p className="text-sm text-gray-900">{data.metaDescription}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN - Media */}
            <div className="lg:col-span-2 space-y-6">
              {/* Images */}
              {data.images && data.images.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon className="w-6 h-6 text-gray-700" />
                    <h3 className="text-lg font-semibold text-gray-900">Images ({data.images.length})</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {data.images.map((image: string, index: number) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors">
                          <img
                            src={image}
                            alt={`${data.title} - Image ${index + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                        <a
                          href={image}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Button size="icon" variant="secondary" className="h-8 w-8 shadow-lg">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos */}
              {data.videos && data.videos.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Video className="w-6 h-6 text-gray-700" />
                    <h3 className="text-lg font-semibold text-gray-900">Videos ({data.videos.length})</h3>
                  </div>
                  <div className="space-y-3">
                    {data.videos.map((video: string, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Video className="w-6 h-6 text-red-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">Video {index + 1}</p>
                            <p className="text-xs text-gray-500 truncate">{video}</p>
                          </div>
                        </div>
                        <a
                          href={video}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" variant="outline" className="flex-shrink-0">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {data.documents?.files && Array.isArray(data.documents.files) && data.documents.files.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-6 h-6 text-gray-700" />
                    <h3 className="text-lg font-semibold text-gray-900">Documents ({data.documents.files.length})</h3>
                  </div>
                  <div className="space-y-3">
                    {data.documents.files.map((doc: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{doc.title || `Document ${index + 1}`}</p>
                            {doc.url && (
                              <p className="text-xs text-gray-500 truncate">{doc.url}</p>
                            )}
                          </div>
                        </div>
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="outline" className="flex-shrink-0">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open
                            </Button>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Media Message */}
              {(!data.images || data.images.length === 0) && 
               (!data.videos || data.videos.length === 0) && 
               (!data.documents?.files || data.documents.files.length === 0) && (
                <div className="text-center py-16 border-2 border-dashed rounded-lg bg-gray-50">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 text-lg">No media files attached</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-6 px-8 pb-6 border-t flex-shrink-0 bg-gray-50">
        </div>
      </div>
    </div>
  );
}
