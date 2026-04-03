import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Image as ImageIcon,
  Video,
  FileText,
  ExternalLink
} from 'lucide-react';

interface ProjectViewProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
}

export function ProjectView({ isOpen, onClose, project }: ProjectViewProps) {
  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{project.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {project.publishOnWebsite && (
              <Badge className="bg-green-100 text-green-700">Published</Badge>
            )}
            {project.featured && (
              <Badge className="bg-yellow-100 text-yellow-700">Featured</Badge>
            )}
          </div>

          {/* Project Details Grid */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            {project.client && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Client</p>
                  <p className="text-sm text-gray-900">{project.client}</p>
                </div>
              </div>
            )}

            {project.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="text-sm text-gray-900">{project.location}</p>
                </div>
              </div>
            )}

            {project.completionDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Completion Date</p>
                  <p className="text-sm text-gray-900">
                    {new Date(project.completionDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            {project.duration && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="text-sm text-gray-900">{project.duration}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {project.description && (
            <div>
              <h4 className="text-sm text-gray-900 mb-2">Description</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{project.description}</p>
            </div>
          )}

          {/* Images */}
          {project.images && project.images.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="w-4 h-4 text-gray-500" />
                <h4 className="text-sm text-gray-900">Project Images ({project.images.length})</h4>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {project.images.map((url: string, idx: number) => (
                  <div key={idx} className="relative group">
                    <img 
                      src={url} 
                      alt={`Project ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={() => window.open(url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {project.videos && project.videos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Video className="w-4 h-4 text-gray-500" />
                <h4 className="text-sm text-gray-900">Videos ({project.videos.length})</h4>
              </div>
              <div className="space-y-2">
                {project.videos.map((url: string, idx: number) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Video className="w-4 h-4 text-brand-600" />
                    <span className="text-sm text-gray-700 flex-1 truncate">{url}</span>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {project.documents && project.documents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-gray-500" />
                <h4 className="text-sm text-gray-900">Documents ({project.documents.length})</h4>
              </div>
              <div className="space-y-2">
                {project.documents.map((doc: any, idx: number) => (
                  <a
                    key={idx}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700 flex-1">{doc.title}</span>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="border-t pt-4 text-xs text-gray-500">
            <p>Created: {new Date(project.createdAt).toLocaleString()}</p>
            <p>Updated: {new Date(project.updatedAt).toLocaleString()}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
