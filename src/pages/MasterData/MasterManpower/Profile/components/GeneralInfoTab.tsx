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
      <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FontAwesomeIcon icon={faBriefcase} />
          </div>
          <h4 className="font-semibold text-black dark:text-white">Position</h4>
        </div>
        <p className="text-sm font-medium ml-13">{profileData.position || '-'}</p>
      </div>

      {/* SID Code Card */}
      <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center gap-3 mb-3">
           <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-secondary">
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
      <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center gap-3 mb-3">
           <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
            <FontAwesomeIcon icon={faFileContract} />
          </div>
          <h4 className="font-semibold text-black dark:text-white">Contract Date</h4>
        </div>
        <p className="text-sm font-medium ml-13">{formatDate(profileData.contract_date)}</p>
      </div>

       {/* Join Date / Other Info */}
       <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center gap-3 mb-3">
           <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10 text-warning">
            <FontAwesomeIcon icon={faCalendarAlt} />
          </div>
          <h4 className="font-semibold text-black dark:text-white">Join Date</h4>
        </div>
        <p className="text-sm font-medium ml-13">{formatDate(profileData.join_date)}</p>
      </div>
      
      {/* Biography - Full Width */}
      <div className="md:col-span-2 rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h4 className="mb-4 text-xl font-semibold text-black dark:text-white">Biography</h4>
        <p className="font-medium text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {profileData.biography || 'No biography available.'}
        </p>
      </div>
    </div>
  );
};

export default GeneralInfoTab;
