// components/MasterStorage/StorageGalleryPanel.tsx

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, X } from 'lucide-react'; // Ganti Plus dengan ikon +
import PhotoUploadModal from './PhotoUploadModal';
import { StoragePhoto } from './storageData';
import { supabase } from '../../../../../db/SupabaseClient';

interface GalleryPanelProps {
  unitId: string;
}

const StorageGalleryPanel: React.FC<GalleryPanelProps> = ({ unitId }) => {
  const [photos, setPhotos] = useState<StoragePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const fetchPhotos = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('storage_photos')
      .select('*')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch photos: ' + error.message);
    } else {
      setPhotos(data || []);
    }
    setLoading(false);
  }, [unitId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleSavePhoto = async (photoData: StoragePhoto) => {
    // Logika upload foto aktual (misalnya, ke Supabase Storage) akan di luar ini.
    // Di sini kita hanya menyimpan metadata ke tabel storage_photos.
    
    const { error } = await supabase.from('storage_photos').insert({
        ...photoData,
        unit_id: unitId
    });

    if (error) {
        toast.error('Failed to save photo details: ' + error.message);
    } else {
        toast.success('Photo details saved successfully!');
        setIsModalOpen(false);
        fetchPhotos();
    }
  };

  const handleOpenZoom = (url: string, index: number) => {
    setZoomUrl(url);
    setCurrentPhotoIndex(index);
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
    setZoomUrl(photos[(currentPhotoIndex + 1) % photos.length].image_url);
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
    setZoomUrl(photos[(currentPhotoIndex - 1 + photos.length) % photos.length].image_url);
  };
  
  const currentMainPhoto = photos.length > 0 ? photos[currentPhotoIndex] : null;

  return (
    <div className="border rounded-lg p-3 bg-gray-50 relative">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-md font-semibold text-gray-700">Foto Fisik ({photos.length})</h4>
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-1 rounded-full text-blue-600 hover:bg-blue-100 transition-colors"
          title="Add New Photo"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="text-center text-sm text-gray-400 py-6">Loading photos...</div>
      ) : photos.length === 0 ? (
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
        >
          <Plus className="h-6 w-6 mb-1" />
          Add Photo
        </button>
      ) : (
        <>
          {/* Foto Utama & Zoom */}
          <div 
            className="w-full h-48 mb-3 relative overflow-hidden rounded-lg cursor-pointer shadow-md"
            onClick={() => currentMainPhoto?.image_url && handleOpenZoom(currentMainPhoto.image_url, currentPhotoIndex)}
            title="Click to Zoom"
          >
            <img 
              src={currentMainPhoto?.image_url || 'https://via.placeholder.com/400x300?text=No+Photo'}
              alt={currentMainPhoto?.name || 'Unit Photo'}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
            {currentMainPhoto && (
                <div className="absolute bottom-0 left-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-tr-lg">
                    {currentMainPhoto.name} ({currentMainPhoto.category})
                </div>
            )}
          </div>
          
          {/* Carousel Thumbnail */}
          <div className="flex space-x-2 overflow-x-auto pb-1">
            {photos.map((photo, index) => (
              <img 
                key={photo.id}
                src={photo.image_url || 'https://via.placeholder.com/50x50'}
                alt={photo.name || 'thumb'}
                className={`h-12 w-12 object-cover rounded border-2 transition-all cursor-pointer ${
                  index === currentPhotoIndex ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => handleOpenZoom(photo.image_url || 'https://via.placeholder.com/50x50', index)}
              />
            ))}
          </div>
        </>
      )}

      {/* Photo Upload Modal */}
      <PhotoUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePhoto}
        unitId={unitId}
      />

      {/* Zoom Modal (Full Screen) */}
      {zoomUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4" onClick={() => setZoomUrl(null)}>
          <button 
            className="absolute top-4 right-4 text-white p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-75 z-50"
            onClick={() => setZoomUrl(null)}
          >
            <X className="h-6 w-6" />
          </button>
          
          <img 
            src={zoomUrl} 
            alt="Zoomed Photo" 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()} // Stop propagation agar klik tidak menutup modal
          />
          
          {/* Navigation Arrows */}
          {photos.length > 1 && (
            <>
              <button 
                className="absolute left-4 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75"
                onClick={handlePrevPhoto}
              >
                &#10094;
              </button>
              <button 
                className="absolute right-4 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75"
                onClick={handleNextPhoto}
              >
                &#10095;
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StorageGalleryPanel;