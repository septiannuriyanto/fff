// components/MasterStorage/StorageOverviewView.tsx

import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../../../db/SupabaseClient';
import {
  StorageData,
  StoragePhoto,
  EditIcon,
  DeleteIcon,
  dateFormatter,
} from './components/storageData';
import StorageMainPhoto from './components/StorageMainPhoto';
import StorageGalleryFullWidth from './components/StorageGalleryFullWidth';
import PhotoUploadModal from './components/PhotoUploadModal';
import { handleSavePhotoLogic } from './components/constants';
import UpdateSKOModal from './components/UpdateSKOModal';

interface OverviewViewProps {
  rowData: StorageData[];
  photosData?: Record<string, StoragePhoto[]>;
  viewMode: 'list' | 'overview';
  onEdit: (unit: StorageData) => void;
  onDelete: (unit: StorageData) => void;
  onRefreshPhotos?: () => void;
}

// --- Sub-Component: List Card ---
const ListCard: React.FC<{
  unit: StorageData;
  onEdit: (unit: StorageData) => void;
  onDelete: (unit: StorageData) => void;
}> = React.memo(({ unit, onEdit, onDelete }) => (
  <div className="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-gray-800 truncate">
        {unit.warehouse_id} - {unit.unit_id || 'N/A'}
      </p>
      <p
        className={`text-xs ${
          unit.status === 'ACTIVE' ? 'text-green-600' : 'text-orange-600'
        }`}
      >
        {unit.type} / {unit.status}
      </p>
    </div>
    <div className="flex gap-2 ml-4">
      <button
        onClick={() => onEdit(unit)}
        className="p-1 hover:bg-blue-100 rounded transition-colors"
        title="Edit"
      >
        <EditIcon />
      </button>
      <button
        onClick={() => onDelete(unit)}
        className="p-1 hover:bg-red-100 rounded transition-colors"
        title="Delete"
      >
        <DeleteIcon />
      </button>
    </div>
  </div>
));

// --- Sub-Component: Overview Card ---
const OverviewCard: React.FC<{
  unit: StorageData;
  photos: StoragePhoto[];
  onEdit: (unit: StorageData) => void;
  onDelete: (unit: StorageData) => void;
  onRefreshPhotos?: () => void;
}> = React.memo(
  ({ unit, photos, onEdit, onDelete, onRefreshPhotos }) => {
    const unitId = unit.unit_id;
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [isMainPhoto, setIsMainPhoto] = useState(false);
    const [showSKOModal, setShowSKOModal] = useState(false);
    const [zoomUrl, setZoomUrl] = useState<string | null>(null);

    if (!unitId) return null;

    const primaryPhoto = useMemo(
      () => photos.find((p) => p.category === 'MAIN') || null,
      [photos]
    );
    const galleryPhotos = useMemo(
      () => photos.filter((p) => p.category !== 'MAIN'),
      [photos]
    );

    const isCalibrationExpired = unit.expired_date
      ? new Date(unit.expired_date) < new Date()
      : false;

    const isSKOExpired = unit.sko && unit.sko.length > 0
      ? unit.sko.some(s => s.expired_date && new Date(s.expired_date) < new Date())
      : false;

    const handleDeleteUnit = async () => { 
        try {
            setIsDeleting(true);
            const { error: photosError } = await supabase.from('storage_photos').delete().eq('unit_id', unitId);
            if (photosError) throw new Error(photosError.message);
            const { error: unitError } = await supabase.from('storage').delete().eq('unit_id', unitId);
            if (unitError) throw new Error(unitError.message);
            toast.success(`Unit ${unitId} deleted successfully!`);
            setShowDeleteModal(false);
            onDelete(unit); 
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete unit');
        } finally {
            setIsDeleting(false);
        }
    };
    
    // REVISI: Placeholder diubah ke proporsi potret
    const DOC_PLACEHOLDER = 'https://via.placeholder.com/80x110?text=View+Doc';
    
    return (
      <>
        <div className="border border-gray-200 rounded-lg shadow-md p-5 mb-4 bg-white hover:shadow-lg transition-shadow">
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-3 mb-3">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-800">
                {unitId} <span className="text-sm text-gray-500">({unit.warehouse_id})</span>
              </h3>
              <div className="flex gap-2 mt-1">
                {isCalibrationExpired && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-semibold">
                    Calibration Expired
                  </span>
                )}
                {isSKOExpired && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-semibold">
                    SKO Expired
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onEdit(unit)} className="p-2 hover:bg-blue-100 rounded transition-colors" title="Edit unit"><EditIcon /></button>
              <button onClick={() => setShowDeleteModal(true)} className="p-2 hover:bg-red-100 rounded transition-colors" title="Delete unit"><DeleteIcon /></button>
            </div>
          </div>

          {/* Main Content - 2 Columns (Main Photo & Details) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Kolom 1: Foto utama (tetap sama) */}
            <div>
              <StorageMainPhoto
                onSuccessUpload={()=>onRefreshPhotos}
                unitId={unit.unit_id!}
                onAddPhotoClick={() => {
                  setIsMainPhoto(true);
                  setShowPhotoModal(true);
                }}
              />
            </div>

            {/* Kolom 2: Legal & Technical Details */}
            <div className="space-y-4">
              {/* Legal Section - SKO & Calibration */}
              <div
                className={`p-4 rounded-lg border-2 ${
                  isCalibrationExpired || isSKOExpired
                    ? 'bg-red-50 border-red-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <h4 className="text-md font-semibold mb-3 flex items-center justify-between">
                  <span>⚖️ Legal & Compliance</span>
                  <button
                    onClick={() => setShowSKOModal(true)}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                    title="Update SKO and other legal documents"
                  >
                    Update SKO
                  </button>
                </h4>
                
                {/* INI ADALAH BAGIAN UTAMA LEGAL SECTION */}
                <div className="space-y-4 text-sm">
                  
                  {/* SKO Section */}
                  <div className="pb-3">
                    <span className="font-semibold text-gray-700 block mb-1">
                      SKO (Operating License)
                    </span>
                    {unit.sko && unit.sko.length > 0 ? (
                      <div className="space-y-3">
                        {unit.sko.map((license, idx) => {
                          const skoExpired = license.expired_date ? new Date(license.expired_date) < new Date() : false;
                          
                          // Deteksi apakah URL dokumen adalah gambar
                          const isImageUrl = license.document_url && (license.document_url.endsWith('.png') || license.document_url.endsWith('.jpg') || license.document_url.endsWith('.jpeg'));

                          return (
                            // GRID 2 KOLOM UNTUK SETIAP DETAIL LISENSI
                            <div
                                key={idx}
                                // REVISI: Menggunakan minmax untuk fleksibilitas lebar kolom kiri
                                className={`grid grid-cols-[minmax(80px,100px)_1fr] gap-3 p-2 rounded border ${skoExpired ? 'bg-red-100 border-red-300' : 'bg-white border-gray-200'}`}
                            >
                                {/* KOLOM KIRI: Tautan Dokumen/Gambar (Potret) */}
                                <div className="h-full flex flex-col items-center">
                                    
                                    {license.document_url ? (
                                        // Wrapper tautan untuk dokumen/gambar
                                        <a 
                                            href={license.document_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            // REVISI: Kelas CSS untuk Potret (seperti ID Card)
                                            className="block w-[70px] h-[100px] sm:w-[80px] sm:h-[110px] overflow-hidden rounded-md shadow-sm transition-shadow hover:shadow-lg mx-auto" 
                                            title={isImageUrl ? "Click to Zoom/View" : "View Document"}
                                            onClick={(e) => { 
                                                // Jika gambar, cegah default dan tampilkan modal zoom
                                                if (isImageUrl) {
                                                    e.preventDefault();
                                                    setZoomUrl(license.document_url);
                                                }
                                            }}
                                        >
                                            <img 
                                                src={isImageUrl ? license.document_url : DOC_PLACEHOLDER} 
                                                alt="SKO Document" 
                                                className={`w-full h-full ${isImageUrl ? 'object-cover' : 'object-contain'}`}
                                            />
                                        </a>
                                    ) : (
                                        // REVISI: Kelas CSS untuk Placeholder Potret
                                        <div className="w-[70px] h-[100px] sm:w-[80px] sm:h-[110px] border border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center bg-gray-50 text-center mx-auto">
                                            <span className="text-gray-500 text-[10px] leading-tight px-1">No Document</span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* KOLOM KANAN: Detail Lisensi */}
                                <div className="border-l pl-3">
                                    <p className="font-medium">{license.sko_code || 'N/A'}</p>
                                    <p className={`text-xs ${skoExpired ? 'text-red-700 font-semibold' : 'text-gray-600'}`}>
                                        Issued: {dateFormatter(license.issued_date) || '-'}
                                    </p>
                                    <p className={`text-xs ${skoExpired ? 'text-red-700 font-semibold' : 'text-gray-600'}`}>
                                        Expires: {dateFormatter(license.expired_date) || '-'}
                                        {skoExpired && (<span className="ml-2 inline-block bg-red-500 text-white px-1.5 py-0.5 rounded text-xs font-bold">EXPIRED</span>)}
                                    </p>
                                </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">No SKO records</p>
                    )}
                  </div>

                  {/* Calibration Section */}
                  <div className="border-t pt-3">
                    <span className="font-semibold text-gray-700 block mb-1">
                      Calibration
                    </span>
                    <div className="space-y-1">
                        <p className={`text-xs ${isCalibrationExpired ? 'text-red-700 font-semibold' : 'text-gray-600'}`}>
                          Calibrated: {dateFormatter(unit.callibration_date) || '-'}
                        </p>
                        <p className={`text-xs ${isCalibrationExpired ? 'text-red-700 font-semibold' : 'text-gray-600'}`}>
                          Expires: {dateFormatter(unit.expired_date) || '-'}
                          {isCalibrationExpired && (<span className="ml-2 inline-block bg-red-500 text-white px-1.5 py-0.5 rounded text-xs font-bold">EXPIRED</span>)}
                        </p>
                      
                    </div>
                  </div>

                

                </div>
              </div>

              {/* Technical Section (REVISI TATA LETAK 2 KOLOM) */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span>⚙️</span> Technical Specifications
                </h4>
                 {/* REVISI: Menggunakan grid 2 kolom di sini */}
                 <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                        <span className="font-semibold text-gray-600">Type:</span>
                        <p className="text-gray-800">{unit.type || '-'}</p>
                    </div>
                    <div>
                        <span className="font-semibold text-gray-600">Capacity:</span>
                        <p className="text-gray-800">{(unit.max_capacity ?? 0).toLocaleString()} L</p>
                    </div>
                    <div>
                        <span className="font-semibold text-gray-600">Manufacturer:</span>
                        <p className="text-gray-800">{unit.manufacturer || '-'}</p>
                    </div>
                    <div>
                        <span className="font-semibold text-gray-600">FM Seal Numbers:</span>
                        <p className="text-gray-800">
                        {unit.fm_seal_number?.join(', ') || '-'}
                        </p>
                    </div>
                    <div>
                        <span className="font-semibold text-gray-600">Filter ID:</span>
                        <p className="text-gray-800">{unit.filter_id || '-'}</p>
                    </div>
                    <div>
                        <span className="font-semibold text-gray-600">Filter Config:</span>
                        <p className="text-gray-800">{unit.filter_config || '-'}</p>
                    </div>
                    {/* Notes menggunakan col-span-2 agar mengambil lebar penuh di baris terakhir */}
                    {unit.notes && (
                        <div className="col-span-2"> 
                        <span className="font-semibold text-gray-600">Notes:</span>
                        <p className="text-gray-800 text-xs italic">{unit.notes}</p>
                        </div>
                    )}
                 </div>
              </div>

            </div>
          </div>

          {/* Gallery (tetap sama) */}
          <StorageGalleryFullWidth
            galleryPhotos={galleryPhotos}
            onAddPhotoClick={() => {
              setIsMainPhoto(false);
              setShowPhotoModal(true);
            }}
            onPhotoDeleted={onRefreshPhotos}
          />
        </div>

        {/* Delete Confirmation Modal (tetap sama) */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Unit?</h3>
                <p className="text-gray-600 mb-2">
                  Are you sure you want to delete unit{' '}
                  <span className="font-semibold">{unitId}</span>?
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  This action will also delete all associated photos and cannot
                  be undone.
                </p>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteUnit}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Photo Upload Modal (tetap sama) */}
        {showPhotoModal && (
          <PhotoUploadModal
            isOpen={showPhotoModal}
            onClose={() => setShowPhotoModal(false)}
            onSave={(photoData) =>
              handleSavePhotoLogic(photoData, isMainPhoto, unitId, () => {
                setShowPhotoModal(false);
                if (onRefreshPhotos) onRefreshPhotos();
              })
            }
            unitId={unitId}
          />
        )}

        {/* Update SKO Modal (tetap sama) */}
        {showSKOModal && (
          <UpdateSKOModal
            isOpen={showSKOModal}
            onClose={() => setShowSKOModal(false)}
            unitId={unitId}
            onSuccess={onRefreshPhotos || (() => {})}
          />
        )}
        
        {/* Zoom Modal untuk document_url yang berupa Gambar */}
        {zoomUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4" onClick={() => setZoomUrl(null)}>
            <button 
              className="absolute top-4 right-4 text-white p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-75 z-50"
              onClick={() => setZoomUrl(null)}
            >
              &times;
            </button>
            <img 
              src={zoomUrl} 
              alt="Zoomed Document" 
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        )}
      </>
    );
  }
);

// --- Main View Component (tetap sama) ---
const StorageOverviewView: React.FC<OverviewViewProps> = ({
  rowData,
  photosData,
  viewMode,
  onEdit,
  onDelete,
  onRefreshPhotos,
}) => {
  const safePhotosData = photosData ?? {};

  if (viewMode === 'list') {
    return (
      <div className="bg-white border rounded-lg divide-y">
        {rowData.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No storage units found.
          </div>
        ) : (
          rowData.map((unit) => (
            <ListCard
              key={unit.id}
              unit={unit}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {rowData.length === 0 ? (
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg text-center text-blue-700">
          No storage units available. Create one to get started.
        </div>
      ) : (
        rowData.map((unit) => {
          const unitId = unit.unit_id;

          if (!unitId) {
            return (
              <div
                key={unit.id}
                className="p-4 bg-red-50 border border-red-400 rounded-lg text-red-700 flex items-start gap-2"
              >
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="font-semibold">Missing Unit ID</p>
                  <p className="text-sm">
                    Record {unit.id} cannot be displayed without a unit ID.
                  </p>
                </div>
              </div>
            );
          }

          const currentUnitPhotos = safePhotosData[unitId] ?? [];

          return (
            <OverviewCard
              key={unit.id}
              unit={unit}
              photos={currentUnitPhotos}
              onEdit={onEdit}
              onDelete={onDelete}
              onRefreshPhotos={onRefreshPhotos}
            />
          );
        })
      )}
    </div>
  );
};

export default StorageOverviewView;