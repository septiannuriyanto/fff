import { Manpower } from '../../../../../types/manpower';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBriefcase, faCalendarAlt, faIdCard, faFileContract } from '@fortawesome/free-solid-svg-icons';

interface GeneralInfoTabProps {
  profileData: Manpower | undefined;
}

const GeneralInfoTab = ({ profileData }: GeneralInfoTabProps) => {
  if (!profileData) return <div>Loading...</div>;

  // Helper to format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Helper to check expiry
  const checkExpiry = (dateString?: string) => {
    if (!dateString) return { text: '-', color: 'text-black dark:text-white' };
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `${formatDate(dateString)} (Expired)`, color: 'text-danger' };
    if (diffDays <= 30) return { text: `${formatDate(dateString)} (Expiring in ${diffDays} days)`, color: 'text-warning' };
    return { text: formatDate(dateString), color: 'text-success' };
  };

  const sidExpiry = checkExpiry((profileData as any).sid_expired);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Position Card */}
      <div className="rounded-2xl border border-white/40 bg-white/40 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-black/40 hover:scale-[1.02] transition-transform duration-300">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary backdrop-blur-sm">
            <FontAwesomeIcon icon={faBriefcase} />
          </div>
          <h4 className="font-semibold text-black dark:text-white">Position</h4>
        </div>
        <p className="text-sm font-medium ml-13 text-slate-700 dark:text-slate-300">{profileData.position || '-'}</p>
      </div>

      {/* SID Code Card */}
      <div className="rounded-2xl border border-white/40 bg-white/40 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-black/40 hover:scale-[1.02] transition-transform duration-300">
        <div className="flex items-center gap-3 mb-3">
           <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/20 text-secondary backdrop-blur-sm">
            <FontAwesomeIcon icon={faIdCard} />
          </div>
          <h4 className="font-semibold text-black dark:text-white">SID Code</h4>
        </div>
        <div className="ml-13">
          <p className="text-sm font-bold text-black dark:text-white mb-1">{profileData.sid_code || '-'}</p>
          {(profileData as any).sid_expired && (
             <p className={`text-xs ${sidExpiry.color}`}>Expires: {sidExpiry.text}</p>
          )}
        </div>
      </div>

      {/* Contract Date Card */}
      <div className="rounded-2xl border border-white/40 bg-white/40 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-black/40 hover:scale-[1.02] transition-transform duration-300">
        <div className="flex items-center gap-3 mb-3">
           <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20 text-success backdrop-blur-sm">
            <FontAwesomeIcon icon={faFileContract} />
          </div>
          <h4 className="font-semibold text-black dark:text-white">Contract Date</h4>
        </div>
        <p className="text-sm font-medium ml-13 text-slate-700 dark:text-slate-300">{formatDate(profileData.contract_date)}</p>
      </div>

       {/* Join Date / Other Info */}
       <div className="rounded-2xl border border-white/40 bg-white/40 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-black/40 hover:scale-[1.02] transition-transform duration-300">
        <div className="flex items-center gap-3 mb-3">
           <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/20 text-warning backdrop-blur-sm">
            <FontAwesomeIcon icon={faCalendarAlt} />
          </div>
          <h4 className="font-semibold text-black dark:text-white">Join Date</h4>
        </div>
        <p className="text-sm font-medium ml-13 text-slate-700 dark:text-slate-300">{formatDate(profileData.join_date)}</p>
      </div>
      
      {/* Biography - Full Width */}
      <div className="md:col-span-2 rounded-3xl border border-white/40 bg-white/40 p-8 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-black/40">
        <h4 className="mb-4 text-xl font-bold text-black dark:text-white flex items-center gap-2">
            <span className="w-1 h-6 rounded-full bg-primary block"></span>
            Biography
        </h4>
        <p className="font-medium text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {profileData.biography || 'No biography available.'}
        </p>
      </div>
    </div>
  );
};

export default GeneralInfoTab;
