import { useEffect, useState } from 'react';
import UserIcon from '../../../../images/icon/user-icon.svg';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../../../db/SupabaseClient';
import toast from 'react-hot-toast';
import { Manpower } from '../../../../types/manpower';
import { getFileFromUrl, profileImageBaseUrl, uploadImageGeneralGetUrl } from '../../../../services/ImageUploader';
import { getPositionFromPositionCode } from '../../../../functions/get_nrp';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faTimes, faUser, faAward, faTrophy, faFileAlt, faCamera, faExpand } from '@fortawesome/free-solid-svg-icons';
import DropdownProfileEdit from '../../../../components/Dropdowns/DropdownProfileEdit';
import { useAuth } from '../../../Authentication/AuthContext';
import { SUPERVISOR } from '../../../../store/roles';

// Tab Components
import GeneralInfoTab from './components/GeneralInfoTab';
import ProfileCompetencyTab from './components/ProfileCompetencyTab';
import AchievementTab from './components/AchievementTab';
import DocumentsTab from './components/DocumentsTab';

const Profile = () => {
  const { currentUser } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  
  const isOwner = currentUser?.nrp === id;
  const isSupervisor = currentUser && currentUser.role && SUPERVISOR.includes(currentUser.role);
  const isAuthorized = isOwner || isSupervisor;

  const [profileData, setProfileData] = useState<Manpower>();
  const [isCoverMaximized, setIsCoverMaximized] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'competency' | 'achievement' | 'documents'>('general');
  const [showProfileZoom, setShowProfileZoom] = useState(false);

  const fetchSingleProfile = async () => {
    const { data, error } = await supabase
      .from('manpower')
      .select('*')
      .eq('nrp', id);

    if (error) {
      console.error(error.message);
      toast.error(error.message);
      return;
    }

    const updatedData = await Promise.all(
      data.map(async (item) => ({
        ...item,
        status: 'Onsite',
        nama: item.nama
          .toLowerCase()
          .split(' ')
          .map((word: any) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        image: item.photo_url 
          ? item.photo_url 
          : (await getFileFromUrl(`${profileImageBaseUrl}/${item.nrp}`))
            ? `${profileImageBaseUrl}/${item.nrp}`
            : UserIcon,
        cover_image: item.bg_photo_url || null, // If null, we'll use gradient
        position: await getPositionFromPositionCode(item.position),
      })),
    );

    setProfileData(updatedData[0] as Manpower);
  };

  useEffect(() => {
    fetchSingleProfile();
  }, [id]);

  // Handle tab parameter from URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const validTabs = ['general', 'competency', 'achievement', 'documents'];
      if (validTabs.includes(tabParam)) {
        setActiveTab(tabParam as 'general' | 'competency' | 'achievement' | 'documents');
      }
    }
  }, [searchParams]);

  const handleBack = () =>{
    window.history.back();
  }

  const triggerFileInput = (id: string) => {
    document.getElementById(id)?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === 'profile') setUploadingProfile(true);
    else setUploadingCover(true);

    const bucketName = 'images';
    const fileExt = file.name.split('.').pop();
    const fileName = type === 'profile' 
        ? `profile/${id}.${fileExt}` 
        : `profile/${id}-bg.${fileExt}`;

    try {
        const originalUrl = await uploadImageGeneralGetUrl(file, bucketName, fileName);

        if (originalUrl) {
            const timestamp = Date.now();
            const publicUrl = `${originalUrl}?t=${timestamp}`;
            const field = type === 'profile' ? 'photo_url' : 'bg_photo_url';
            
            const { error } = await supabase
                .from('manpower')
                .update({ [field]: publicUrl })
                .eq('nrp', id);

            if (error) throw error;

            toast.success(`${type === 'profile' ? 'Profile' : 'Cover'} updated successfully`);
            
            setProfileData(prev => {
                if (!prev) return undefined;
                return {
                    ...prev,
                    [type === 'profile' ? 'image' : 'cover_image']: publicUrl,
                    [type === 'profile' ? 'photo_url' : 'bg_photo_url']: publicUrl
                };
            });
        }
    } catch (error: any) {
        toast.error(`Error uploading image: ${error.message}`);
    } finally {
        if (type === 'profile') setUploadingProfile(false);
        else setUploadingCover(false);
    }
  };

  const handleDeleteImage = async (type: 'profile' | 'cover') => {
    const field = type === 'profile' ? 'photo_url' : 'bg_photo_url';
    const confirmMessage = type === 'profile' ? 'Delete profile picture?' : 'Delete cover photo?';

    if (!window.confirm(confirmMessage)) return;

    const { error } = await supabase.from('manpower').update({ [field]: null }).eq('nrp', id);

    if (error) {
        toast.error(`Error deleting ${type} image`);
    } else {
        toast.success(`${type === 'profile' ? 'Profile' : 'Cover'} image deleted`);
        if (profileData) {
            setProfileData({
                ...profileData,
                image: type === 'profile' ? UserIcon : profileData.image,
                cover_image: type === 'cover' ? undefined : profileData.cover_image
            });
            fetchSingleProfile(); 
        }
    }
  };

  // Tabs Configuration
  const tabs = [
    { id: 'general', label: 'General Info', icon: faUser },
    { id: 'competency', label: 'Competency', icon: faAward },
    { id: 'achievement', label: 'Achievement', icon: faTrophy },
    { id: 'documents', label: 'Documents', icon: faFileAlt },
  ];

  return (
    <div className="mx-auto max-w-5xl relative">
      {/* Fixed Gradient Background */}
      <div className="fixed inset-0 z-[-1] bg-gradient-to-br from-blue-50 via-slate-50 to-purple-50 dark:from-boxdark dark:via-black dark:to-boxdark opacity-80 pointer-events-none"></div>
      <div className="fixed top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400/10 via-transparent to-transparent animate-spin-slow pointer-events-none z-[-1]"></div>
      {/* Profile Header Card */}
      <div className={`relative overflow-hidden rounded-lg border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6 transition-all duration-300 min-h-[400px] flex flex-col justify-end ${isCoverMaximized ? 'fixed inset-0 z-50 rounded-none h-screen w-screen m-0' : ''}`}>
        
        {/* Cover Landscape - Full Background */}
        <div className={`absolute inset-0 z-0 h-full w-full overflow-hidden group`}>
           {/* Background: Image or Gradient */}
           {profileData?.cover_image ? (
             <img
               src={profileData.cover_image}
               alt="profile cover"
               className={`h-full w-full object-cover object-center transition-transform duration-700 ${isCoverMaximized ? '' : 'group-hover:scale-105'}`}
             />
           ) : (
             <div className="h-full w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 animate-gradient-x"></div>
           )}

           {/* Overlay Gradient for readability */}
           <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>

           {/* Back Button */}
           <div className="absolute top-4 left-4 z-20">
             <button
               onClick={handleBack}
               className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition shadow-lg"
             >
               <FontAwesomeIcon icon={faArrowLeft} />
             </button>
           </div>

           {/* Edit Cover Button - Only for authorized users */}
           {isAuthorized && (
             <div className="absolute top-4 right-4 z-20">
                <DropdownProfileEdit 
                   onUpload={() => triggerFileInput('cover')}
                   onDelete={() => handleDeleteImage('cover')}
                   onMaximize={() => setIsCoverMaximized(!isCoverMaximized)}
                   isMaximized={isCoverMaximized}
                   showDelete={!!profileData?.bg_photo_url}
                   iconColor="white"
                   className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition shadow-lg"
                />
                <input type="file" name="cover" id="cover" className="hidden" onChange={(e) => handleFileChange(e, 'cover')} />
             </div>
           )}

           {/* Loading Overlay */}
           {uploadingCover && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                 <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
              </div>
           )}
        </div>

        {/* Profile Info Overlay (Avatar & Name) */}
        <div className={`px-4 pb-6 lg:pb-8 relative z-20 w-full ${isCoverMaximized ? 'hidden' : ''}`}>
           <div className="flex flex-col md:flex-row items-center md:items-end px-4 md:px-10 gap-6">
              
              {/* Avatar */}
              <div className="relative h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-white dark:border-boxdark shadow-xl overflow-hidden bg-white group cursor-pointer" onClick={() => setShowProfileZoom(true)}>
                  <img
                    src={profileData?.image || UserIcon}
                    alt="profile"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  
                  {/* Public Zoom Indication */}
                  {!isAuthorized && (
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <FontAwesomeIcon icon={faExpand} className="text-white drop-shadow-md text-2xl" />
                    </div>
                  )}

                  {/* Upload Overlay - Only for authorized users */}
                  {isAuthorized && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => triggerFileInput('profile')}
                          className="bg-white/20 hover:bg-white/40 p-2 rounded-full text-white backdrop-blur-md transition"
                          title="Change Photo"
                        >
                           <FontAwesomeIcon icon={faCamera} />
                        </button>
                        {profileData?.photo_url && (
                          <button 
                            onClick={() => handleDeleteImage('profile')}
                            className="bg-danger/80 hover:bg-danger p-2 rounded-full text-white backdrop-blur-md transition"
                             title="Remove Photo"
                          >
                             <FontAwesomeIcon icon={faTimes} />
                          </button>
                        )}
                         <button 
                            onClick={(e) => { e.stopPropagation(); setShowProfileZoom(true); }}
                            className="bg-white/20 hover:bg-white/40 p-2 rounded-full text-white backdrop-blur-md transition"
                             title="Maximize Photo"
                          >
                             <FontAwesomeIcon icon={faExpand} />
                          </button>
                    </div>
                  )}
                  <input type="file" name="profile" id="profile" className="hidden" onClick={(e) => e.stopPropagation()} onChange={(e) => handleFileChange(e, 'profile')} />
                  
                  {uploadingProfile && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/80 dark:bg-black/50">
                       <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    </div>
                  )}
              </div>

              {/* Name & Role */}
              <div className="flex flex-col items-center md:items-start mb-2 md:mb-6 text-center md:text-left flex-1 relative z-30">
                 <div className="mt-2 md:mt-0 backdrop-blur-lg bg-white/20 dark:bg-black/20 border border-white/50 dark:border-white/10 shadow-lg rounded-2xl py-3 px-6 transform transition-all hover:scale-[1.02] duration-300">
                     <h3 className="text-2xl md:text-3xl font-bold text-black dark:text-white drop-shadow-sm tracking-tight">
                        {profileData?.nama || 'Loading...'}
                     </h3>
                     <p className="font-medium text-slate-700 dark:text-slate-200 mt-1 flex items-center justify-center md:justify-start gap-2">
                        {profileData?.position || 'Unknown Position'}
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-500"></span>
                        <span className="text-sm font-mono tracking-wide opacity-90">{profileData?.nrp}</span>
                     </p>
                 </div>
                 
                 {/* Quick Stats Row */}
                 <div className="flex items-center gap-6 mt-4">
                     {/* Placeholder stats */}
                 </div>
              </div>
           </div>
        </div>

        {/* Tab Navigation Bar - Glass Effect */}
        <div className={`border-t border-white/20 dark:border-white/10 bg-white/60 dark:bg-black/30 backdrop-blur-lg px-4 md:px-10 relative z-30 ${isCoverMaximized ? 'hidden' : ''}`}>
           <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    group relative py-4 px-2 text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-colors whitespace-nowrap
                    ${activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white'}
                  `}
                >
                   <FontAwesomeIcon icon={tab.icon} className={activeTab === tab.id ? 'text-primary' : 'text-slate-400 group-hover:text-inherit'} />
                   {tab.label}
                   {activeTab === tab.id && (
                     <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full shadow-[0_-2px_6px_rgba(59,90,246,0.3)]"></div>
                   )}
                </button>
              ))}
           </div>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className={`transition-all duration-300 ${isCoverMaximized ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
         {/* Using hidden/block for state preservation */}
         <div className={activeTab === 'general' ? 'block animate-in fade-in slide-in-from-top-4' : 'hidden'}>
            <GeneralInfoTab profileData={profileData} />
         </div>
         
         <div className={activeTab === 'competency' ? 'block animate-in fade-in slide-in-from-top-4' : 'hidden'}>
            {id ? <ProfileCompetencyTab nrp={id} /> : <div>Invalid NRP</div>}
         </div>

         <div className={activeTab === 'achievement' ? 'block animate-in fade-in slide-in-from-top-4' : 'hidden'}>
            <AchievementTab />
         </div>

         <div className={activeTab === 'documents' ? 'block animate-in fade-in slide-in-from-top-4' : 'hidden'}>
            <DocumentsTab />
         </div>
      </div>

      {/* Profile Image Lightbox */}
      {showProfileZoom && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowProfileZoom(false)}>
           <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
             <img 
               src={profileData?.image || UserIcon} 
               alt="Zoomed Profile" 
               className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
               onClick={(e) => e.stopPropagation()}
             />
             <button 
               onClick={() => setShowProfileZoom(false)}
               className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 h-10 w-10 flex items-center justify-center transition-colors backdrop-blur-md"
             >
                <FontAwesomeIcon icon={faTimes} />
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
