// components/MasterStorage/StorageGalleryFullWidth.tsx

import React, { useState } from 'react';
import { Plus, X, Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { StoragePhoto } from './storageData';
import { supabase } from '../../../../../db/SupabaseClient';

interface GalleryProps {
  galleryPhotos: StoragePhoto[];
  onAddPhotoClick: () => void;
  onPhotoDeleted?: () => void;
}

const StorageGalleryFullWidth: React.FC<GalleryProps> = ({ 
  galleryPhotos, 
  onAddPhotoClick,
  onPhotoDeleted 
}) => {
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [zoomPhotoId, setZoomPhotoId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenZoom = (url: string, id?: number) => {
    setZoomUrl(url);
    if (id) setZoomPhotoId(id);
  };

  const handleCloseZoom = () => {
    setZoomUrl(null);
    setZoomPhotoId(null);
  };

  const handleDeletePhoto = async (photoId: number, imageUrl: string) => {
    try {
      setIsDeleting(true);

      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const filePath = urlParts.slice(urlParts.indexOf('storage_fuel')).join('/');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('images')
        .remove([filePath]);

      if (storageError) {
        console.warn('Storage deletion warning:', storageError);
        // Continue with DB deletion even if storage delete fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('storage_photos')
        .delete()
        .eq('id', photoId);

      if (dbError) throw new Error(dbError.message);

      toast.success('Photo deleted successfully!');
      handleCloseZoom();
      
      if (onPhotoDeleted) {
        onPhotoDeleted();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete photo');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadPhoto = (imageUrl: string, photoName: string) => {
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `${photoName || 'photo'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Photo downloaded!');
    } catch (err) {
      toast.error('Failed to download photo');
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm mt-6">
      <div className="flex justify-between items-center mb-3 border-b pb-2">
        <h4 className="text-xl font-bold text-gray-800">
          Unit Gallery ({galleryPhotos.length} Photos)
        </h4>
        <button
          onClick={onAddPhotoClick}
          className="px-3 py-1 bg-green-500 text-white text-sm rounded-lg flex items-center hover:bg-green-600 transition-colors"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Photo
        </button>
      </div>

      {galleryPhotos.length === 0 ? (
        <div className="text-center text-gray-500 py-8 italic">
          No additional gallery photos available.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {galleryPhotos.map((photo) => (
            <div
              key={photo.id}
              className="relative group bg-gray-100 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
            >
              {/* Image */}
              <img
                src={photo.image_url || 'https://via.placeholder.com/160x160'}
                alt={photo.name || 'Gallery photo'}
                className="w-full h-40 object-cover cursor-pointer"
                onClick={() => handleOpenZoom(photo.image_url || '', photo.id)}
              />

              {/* Category Badge */}
              <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                {photo.category}
              </div>

              {/* Kondisi Badge */}
              <div
                className={`absolute top-2 right-2 text-white text-xs px-2 py-1 rounded ${
                  photo.kondisi === 'GOOD'
                    ? 'bg-green-500'
                    : photo.kondisi === 'MINOR_DAMAGE'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
              >
                {photo.kondisi}
              </div>

              {/* Info Section */}
              <div className="p-2 bg-white border-t">
                <p className="text-xs font-medium text-gray-800 truncate">{photo.name || 'Unnamed'}</p>
                {photo.remark && (
                  <p className="text-xs text-gray-500 truncate italic">{photo.remark}</p>
                )}
              </div>

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() =>
                    handleDownloadPhoto(
                      photo.image_url || '',
                      photo.name || 'photo'
                    )
                  }
                  className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleOpenZoom(photo.image_url || '', photo.id)}
                  className="p-2 bg-gray-700 hover:bg-gray-800 text-white rounded-full transition-colors"
                  title="Zoom"
                >
                  <X className="h-4 w-4 rotate-45" />
                </button>
                <button
                  onClick={() => handleDeletePhoto(photo.id || 0, photo.image_url || '')}
                  disabled={isDeleting}
                  className="p-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-full transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zoom Modal */}
      {zoomUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4"
          onClick={handleCloseZoom}
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 px-6 py-3 flex justify-between items-center">
            <div className="text-white">
              {galleryPhotos.find((p) => p.id === zoomPhotoId) && (
                <>
                  <p className="font-semibold">
                    {galleryPhotos.find((p) => p.id === zoomPhotoId)?.name || 'Photo'}
                  </p>
                  <p className="text-xs text-gray-300">
                    {galleryPhotos.find((p) => p.id === zoomPhotoId)?.remark}
                  </p>
                </>
              )}
            </div>
            <button
              className="text-white p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-75 transition-all"
              onClick={handleCloseZoom}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Image */}
          <img
            src={zoomUrl}
            alt="Zoomed Photo"
            className="max-w-full max-h-[85vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Footer Actions */}
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 px-6 py-3 flex justify-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const photo = galleryPhotos.find((p) => p.id === zoomPhotoId);
                if (photo?.image_url) {
                  handleDownloadPhoto(photo.image_url, photo.name || 'photo');
                }
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download className="h-4 w-4" /> Download
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const photo = galleryPhotos.find((p) => p.id === zoomPhotoId);
                if (photo?.id && photo?.image_url) {
                  handleDeletePhoto(photo.id, photo.image_url);
                }
              }}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageGalleryFullWidth;