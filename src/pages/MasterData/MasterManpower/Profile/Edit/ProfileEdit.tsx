import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../../../db/SupabaseClient';
import { useAuth } from '../../../../Authentication/AuthContext';
import { SUPERVISOR } from '../../../../../store/roles';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCamera, faCheck, faTimes, faEdit } from '@fortawesome/free-solid-svg-icons';
import { uploadImageGeneralGetUrl } from '../../../../../services/ImageUploader';
import UserIcon from '../../../../../images/icon/user-icon.svg';
import Loader from '../../../../../common/Loader/Loader';

interface ManpowerData {
  nrp: string;
  nama: string;
  sid_code: string | null;
  sid_expired: string | null;
  contract_date: string | null;
  position: number | null;
  email: string | null;
  off_day: number | null;
  join_date: string | null;
  active_date: string | null;
  no_hp: string | null;
  photo_url: string | null;
  nickname: string | null;
  phone_num: string | null;
  odos_flag: boolean;
  section: string | null;
  bg_photo_url: string | null;
  active: boolean;
  registered: boolean;
  biography: string | null;
  official_photo_url: string | null;
  portrait_photo_url: string | null;
}

const ProfileEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [manpowerData, setManpowerData] = useState<ManpowerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<any>('');
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);

  // Check authorization
  const isSupervisor = currentUser && currentUser.role && SUPERVISOR.includes(currentUser.role);
  const isOwner = currentUser?.nrp === id;
  const isAuthorized = isSupervisor || isOwner;

  useEffect(() => {
    if (!isAuthorized) {
      toast.error('You are not authorized to edit this profile');
      navigate(`/profile/${id}`);
      return;
    }
    fetchManpowerData();
  }, [id, isAuthorized]);

  const fetchManpowerData = async () => {
    try {
      const { data, error } = await supabase
        .from('manpower')
        .select('*')
        .eq('nrp', id)
        .single();

      if (error) throw error;
      setManpowerData(data);
    } catch (error) {
      console.error('Error fetching manpower data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldEdit = (fieldName: string, currentValue: any) => {
    setEditingField(fieldName);
    setTempValue(currentValue || '');
  };

  const handleFieldSave = async (fieldName: string) => {
    if (!manpowerData) return;

    try {
      const { error } = await supabase
        .from('manpower')
        .update({ [fieldName]: tempValue })
        .eq('nrp', id);

      if (error) throw error;

      setManpowerData({ ...manpowerData, [fieldName]: tempValue });
      setEditingField(null);
      toast.success(`${fieldName} updated successfully`);
    } catch (error) {
      console.error('Error updating field:', error);
      toast.error(`Failed to update ${fieldName}`);
    }
  };

  const handleFieldCancel = () => {
    setEditingField(null);
    setTempValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent, fieldName: string) => {
    if (e.key === 'Enter') {
      handleFieldSave(fieldName);
    } else if (e.key === 'Escape') {
      handleFieldCancel();
    }
  };

  const handlePhotoUpload = async (photoType: 'photo_url' | 'official_photo_url' | 'portrait_photo_url', file: File) => {
    if (!manpowerData) return;

    setUploadingPhoto(photoType);
    try {
      const path = `${photoType.replace('_url', '')}/${id}`;
      // Use the utility that uploads and returns the public URL directly
      const imageUrl = await uploadImageGeneralGetUrl(file, 'images', path);

      if (imageUrl) {
        // Add timestamp to force image refresh in UI
        const urlWithTimestamp = `${imageUrl}?t=${new Date().getTime()}`;

        const { error } = await supabase
          .from('manpower')
          .update({ [photoType]: imageUrl }) // Save clean URL to DB
          .eq('nrp', id);

        if (error) throw error;

        setManpowerData({ ...manpowerData, [photoType]: urlWithTimestamp }); // Use timestamped URL for state
        toast.success('Photo updated successfully');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(null);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!manpowerData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-500">Profile not found</p>
      </div>
    );
  }

  const renderEditableField = (
    label: string,
    fieldName: keyof ManpowerData,
    type: 'text' | 'email' | 'date' | 'number' | 'textarea' | 'checkbox' = 'text'
  ) => {
    const value = manpowerData[fieldName];
    const isEditing = editingField === fieldName;

    if (type === 'checkbox') {
      return (
        <div className="backdrop-blur-md bg-white/30 dark:bg-black/20 border border-white/40 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={value as boolean}
                onChange={async (e) => {
                  const newValue = e.target.checked;
                  try {
                    const { error } = await supabase
                      .from('manpower')
                      .update({ [fieldName]: newValue })
                      .eq('nrp', id);

                    if (error) throw error;

                    setManpowerData({ ...manpowerData, [fieldName]: newValue });
                    toast.success(`${label} updated`);
                  } catch (error) {
                    toast.error(`Failed to update ${label}`);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      );
    }

    return (
      <div className="backdrop-blur-md bg-white/30 dark:bg-black/20 border border-white/40 rounded-2xl p-4 shadow-xl">
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
          {label}
        </label>
        {isEditing ? (
          <div className="flex items-center gap-2">
            {type === 'textarea' ? (
              <textarea
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleFieldSave(fieldName);
                  } else if (e.key === 'Escape') {
                    handleFieldCancel();
                  }
                }}
                className="flex-1 px-3 py-2 rounded-xl border border-white/50 bg-white/50 dark:bg-black/30 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                rows={3}
                autoFocus
              />
            ) : (
              <input
                type={type}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, fieldName)}
                className="flex-1 px-3 py-2 rounded-xl border border-white/50 bg-white/50 dark:bg-black/30 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
            )}
            <button
              onClick={() => handleFieldSave(fieldName)}
              className="p-2 rounded-xl bg-green-500/80 hover:bg-green-500 text-white transition-all"
            >
              <FontAwesomeIcon icon={faCheck} />
            </button>
            <button
              onClick={handleFieldCancel}
              className="p-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white transition-all"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between group">
            <span className="text-slate-900 dark:text-white">
              {value !== null && value !== undefined && value !== '' ? String(value) : '-'}
            </span>
            <button
              onClick={() => handleFieldEdit(fieldName, value)}
              className="opacity-0 group-hover:opacity-100 p-2 rounded-xl bg-primary/80 hover:bg-primary text-white transition-all"
            >
              <FontAwesomeIcon icon={faEdit} className="text-xs" />
            </button>
          </div>
        )}
        {type === 'textarea' && isEditing && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Press Ctrl+Enter to save, Esc to cancel
          </p>
        )}
      </div>
    );
  };

  const renderPhotoUpload = (
    label: string,
    photoType: 'photo_url' | 'official_photo_url' | 'portrait_photo_url',
    description: string
  ) => {
    const photoUrl = manpowerData[photoType];
    const isUploading = uploadingPhoto === photoType;

    return (
      <div className="backdrop-blur-md bg-white/30 dark:bg-black/20 border border-white/40 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{label}</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">{description}</p>
        
        <div className="relative group">
          <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={label}
                className={`w-full h-full ${photoType === 'photo_url' ? 'object-cover' : 'object-contain'}`}
                onError={(e) => {
                  e.currentTarget.src = UserIcon;
                }}
              />
            ) : (
              <img src={UserIcon} alt="No photo" className="w-1/2 h-1/2 opacity-30" />
            )}
            
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
              </div>
            )}
          </div>

          <label className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-all cursor-pointer rounded-2xl">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <FontAwesomeIcon icon={faCamera} className="text-white text-3xl" />
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handlePhotoUpload(photoType, e.target.files[0]);
                }
              }}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <button
          onClick={() => navigate(`/profile/${id}`)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 dark:bg-black/30 backdrop-blur-md border border-white/40 text-slate-700 dark:text-slate-200 hover:bg-white/70 dark:hover:bg-black/40 transition-all shadow-lg"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to Profile
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Title */}
        <div className="backdrop-blur-xl bg-white/40 dark:bg-black/30 border border-white/50 rounded-3xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Edit Profile</h1>
          <p className="text-slate-600 dark:text-slate-300">
            {manpowerData.nama} ({manpowerData.nrp})
          </p>
        </div>

        {/* Photos Section */}
        <div className="backdrop-blur-xl bg-white/40 dark:bg-black/30 border border-white/50 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Photos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {renderPhotoUpload('Profile Photo', 'photo_url', 'Main profile photo displayed in lists and cards')}
            {renderPhotoUpload('Official Photo', 'official_photo_url', 'Official company photo for formal documents')}
            {renderPhotoUpload('Portrait Photo', 'portrait_photo_url', 'Portrait photo for competency card')}
          </div>
        </div>

        {/* Personal Information Section */}
        <div className="backdrop-blur-xl bg-white/40 dark:bg-black/30 border border-white/50 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderEditableField('Full Name', 'nama')}
            {renderEditableField('Nickname', 'nickname')}
            {renderEditableField('Email', 'email', 'email')}
            {renderEditableField('Phone Number', 'no_hp')}
            {renderEditableField('Alternative Phone', 'phone_num')}
            {renderEditableField('Biography', 'biography', 'textarea')}
          </div>
        </div>

        {/* Employment Information Section */}
        <div className="backdrop-blur-xl bg-white/40 dark:bg-black/30 border border-white/50 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Employment Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderEditableField('NRP', 'nrp')}
            {renderEditableField('Section', 'section')}
            {renderEditableField('Position Code', 'position', 'number')}
            {renderEditableField('Join Date', 'join_date', 'date')}
            {renderEditableField('Active Date', 'active_date', 'date')}
            {renderEditableField('Contract Date', 'contract_date', 'date')}
            {renderEditableField('Off Day', 'off_day', 'number')}
          </div>
        </div>

        {/* SID Information Section */}
        <div className="backdrop-blur-xl bg-white/40 dark:bg-black/30 border border-white/50 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">SID Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderEditableField('SID Code', 'sid_code')}
            {renderEditableField('SID Expired Date', 'sid_expired', 'date')}
          </div>
        </div>

        {/* Status Flags Section */}
        <div className="backdrop-blur-xl bg-white/40 dark:bg-black/30 border border-white/50 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Status Flags</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderEditableField('Active', 'active', 'checkbox')}
            {renderEditableField('Registered', 'registered', 'checkbox')}
            {renderEditableField('ODOS Flag', 'odos_flag', 'checkbox')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileEdit;