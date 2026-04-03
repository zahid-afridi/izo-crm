import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Calendar, User, Tag, Globe, Star, Home } from 'lucide-react';

interface BlogViewProps {
  isOpen: boolean;
  onClose: () => void;
  blog: any;
}

export function BlogView({ isOpen, onClose, blog }: BlogViewProps) {
  if (!blog) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{blog.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Meta Information */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Author</p>
                <p className="text-sm font-medium">{blog.author}</p>
              </div>
            </div>
            
            {blog.category && (
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Category</p>
                  <Badge variant="outline">{blog.category.name}</Badge>
                </div>
              </div>
            )}
            
            {blog.publishedAt && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Published Date</p>
                  <p className="text-sm font-medium">
                    {new Date(blog.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <div className="flex gap-2 mt-1">
                  {blog.publishOnWebsite && (
                    <Badge variant="default" className="text-xs">Published</Badge>
                  )}
                  {blog.featured && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="w-3 h-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                  {blog.showOnHomepage && (
                    <Badge variant="outline" className="text-xs">
                      <Home className="w-3 h-3 mr-1" />
                      Homepage
                    </Badge>
                  )}
                  {!blog.publishOnWebsite && (
                    <Badge variant="secondary" className="text-xs">Draft</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Featured Image */}
          {blog.featuredImage && (
            <div>
              <h4 className="text-sm font-medium mb-2">Featured Image</h4>
              <img 
                src={blog.featuredImage} 
                alt={blog.title}
                className="w-full h-64 object-cover rounded-lg border"
              />
            </div>
          )}

          {/* Content */}
          <div>
            <h4 className="text-sm font-medium mb-2">Content</h4>
            <div className="prose max-w-none p-4 bg-gray-50 rounded-lg">
              <div className="whitespace-pre-wrap text-sm text-gray-700">
                {blog.content}
              </div>
            </div>
          </div>

          {/* Tags */}
          {blog.tags && blog.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {blog.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Additional Images */}
          {blog.images && blog.images.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Additional Images ({blog.images.length})</h4>
              <div className="grid grid-cols-3 gap-4">
                {blog.images.map((image: string, index: number) => (
                  <img 
                    key={index}
                    src={image} 
                    alt={`Image ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                ))}
              </div>
            </div>
          )}

          {/* SEO Information */}
          {(blog.metaTitle || blog.metaDescription) && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">SEO Information</h4>
              <div className="space-y-3">
                {blog.metaTitle && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Meta Title</p>
                    <p className="text-sm text-gray-700 p-2 bg-gray-50 rounded">{blog.metaTitle}</p>
                  </div>
                )}
                {blog.metaDescription && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Meta Description</p>
                    <p className="text-sm text-gray-700 p-2 bg-gray-50 rounded">{blog.metaDescription}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="border-t pt-4 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Created: {new Date(blog.createdAt).toLocaleString()}</span>
              <span>Updated: {new Date(blog.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
