import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { StoragePhoto } from './storageData';
import PlaceholderImage from '../../../../../images/icon/gallery.png';
import { supabase } from '../../../../../db/SupabaseClient';

interface MainPhotoProps {
  unitId: string;
  onAddPhotoClick: () => void;
  onSuccessUpload: () => void;
}

const PLACEHOLDER_URL = PlaceholderImage;

const StorageMainPhoto: React.FC<MainPhotoProps> = ({ unitId, onAddPhotoClick }) => {
  const [primaryPhoto, setPrimaryPhoto] = useState<StoragePhoto | null>(null);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  /** 🔹 Fetch primary photo */
  const fetchPrimaryPhoto = async () => {
    if (!unitId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('storage_photos')
      .select('*')
      .eq('unit_id', unitId)
      .eq('is_primary', true)
    .single(); // <-- pakai maybeSingle, supaya null kalau belum ada

    if (error && error.code !== 'PGRST116') {
      toast.error('Failed to fetch main photo: ' + error.message);
    } else {
     console.log('Fetched primary photo:', data);
      setPrimaryPhoto(data || null);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchPrimaryPhoto();
  }, [unitId]);

  /** 🔹 Zoom control */
  const handleOpenZoom = (url: string) => setZoomUrl(url);
  const handleCloseZoom = () => setZoomUrl(null);

  /** 🔹 Delete photo */
  const handleDeletePhoto = async () => {
    if (!primaryPhoto?.id || !primaryPhoto?.image_url) return;
    setIsDeleting(true);

    try {
      // Extract filename from image_url
      const imageUrl = new URL(primaryPhoto.image_url);
      const path = decodeURIComponent(imageUrl.pathname.split('/storage_photos/')[1]);

      // Delete from Supabase storage bucket "storage_photos"
      const { error: storageError } = await supabase.storage
        .from('storage_photos')
        .remove([path]);

      if (storageError) {
        console.warn('Storage deletion warning:', storageError.message);
      }

      // Delete from DB
      const { error: dbError } = await supabase
        .from('storage_photos')
        .delete()
        .eq('id', primaryPhoto.id);

      if (dbError) throw dbError;

      toast.success('Main photo deleted successfully!');
      
      setPrimaryPhoto(null);
      handleCloseZoom();
    } catch (err: any) {
      toast.error('Failed to delete photo: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  /** 🔹 Download photo */
  const handleDownloadPhoto = () => {
    if (!primaryPhoto?.image_url) return;
    const link = document.createElement('a');
    link.href = primaryPhoto.image_url;
    link.download = `${primaryPhoto.name || 'main_photo'}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Photo downloaded!');
  };

  return (
    <div className="border rounded-lg p-3 bg-gray-50 h-full flex flex-col">
      <div className="flex justify-between items-center mb-2 border-b pb-2">
        <h4 className="text-md font-semibold text-gray-700">Primary Photo</h4>
        <button
          onClick={onAddPhotoClick}
          className="p-1 rounded-full text-blue-600 hover:bg-blue-100 transition-colors"
          title="Add/Change Main Photo"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Foto Utama */}
      <div
        className={`flex-grow relative overflow-hidden rounded-lg shadow-md group ${
          primaryPhoto ? 'cursor-pointer' : ''
        }`}
        onClick={() =>
          primaryPhoto?.image_url && handleOpenZoom(primaryPhoto.image_url)
        }
        title={primaryPhoto ? 'Click to Zoom' : "Click '+' to Upload"}
      >
        <img
          src={primaryPhoto?.image_url || PLACEHOLDER_URL}
          alt={primaryPhoto?.name || 'Unit MAIN Photo'}
          className={`w-full h-full transition-transform duration-300 ${
            primaryPhoto
              ? 'object-cover group-hover:scale-105'
              : 'object-contain scale-75 p-6 bg-gray-50'
          }`}
        />

        {primaryPhoto && (
          <>
            <div className="absolute bottom-0 left-0 bg-blue-600 text-white text-xs p-1.5 rounded-tr-lg font-semibold">
              MAIN - {primaryPhoto.unit_id || 'Unnamed'}
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadPhoto();
                }}
                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenZoom(primaryPhoto.image_url!);
                }}
                className="p-2 bg-gray-700 hover:bg-gray-800 text-white rounded-full transition-colors"
                title="Zoom"
              >
                <X className="h-4 w-4 rotate-45" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePhoto();
                }}
                disabled={isDeleting}
                className="p-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-full transition-colors"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>

      

      {/* Zoom Modal */}
      {zoomUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4"
          onClick={handleCloseZoom}
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 px-6 py-3 flex justify-between items-center">
            <div className="text-white">
              <p className="font-semibold">{primaryPhoto?.name || 'Main Photo'}</p>
              {primaryPhoto?.remark && (
                <p className="text-xs text-gray-300">{primaryPhoto.remark}</p>
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
            alt="Zoomed Main Photo"
            className="max-w-full max-h-[85vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Footer Actions */}
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 px-6 py-3 flex justify-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadPhoto();
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download className="h-4 w-4" /> Download
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeletePhoto();
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

export default StorageMainPhoto;
