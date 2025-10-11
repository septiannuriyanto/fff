import toast from "react-hot-toast";
import { supabase } from "../../../../../db/SupabaseClient";
import { StoragePhoto } from "./storageData";

// constants.ts
export const PHOTO_CATEGORIES = [  
  { value: 'CABIN', label: 'Cabin' },
  { value: 'CHASSIS', label: 'Chassis' },
  { value: 'ATTACHMENT', label: 'Attachment' },
  { value: 'TANK', label: 'Tank' },
  { value: 'SMARTREF', label: 'Smart Refueling' },
  { value: 'SAFETY', label: 'Safety Devices' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'DOCUMENT', label: 'Document' },
];



export const handleSavePhotoLogic = async (
  photoData: StoragePhoto,
  isMain: boolean,
  unitId: string,
  onFetchComplete: () => void
) => {
  try {
    if (isMain) {
      // Unset previous MAIN photo
      const { error: unsetError } = await supabase
        .from('storage_photos')
        .update({ category: 'CABIN', component: 'CABIN' })
        .eq('unit_id', unitId)
        .eq('category', 'MAIN');

      if (unsetError) throw new Error('Failed to unset old MAIN photo: ' + unsetError.message);
    }

    const dataToInsert = {
      ...photoData,
      unit_id: unitId,
      category: isMain ? 'MAIN' : photoData.category,
      component: isMain ? 'MAIN' : photoData.component,
    };

    const { error: insertError } = await supabase.from('storage_photos').insert(dataToInsert);
    if (insertError) throw new Error('Failed to save photo details: ' + insertError.message);

    toast.success('Photo details saved successfully!');
    onFetchComplete();
  } catch (err: any) {
    toast.error(err.message || 'An error occurred while saving the photo.');
  }
};