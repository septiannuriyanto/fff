import { useEffect, useRef, useState } from 'react';
import { Manpower } from '../../../../types/manpower';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTheme } from '../../../../contexts/ThemeContext';
import {
  faAdd,
  faEdit,
  faChevronLeft,
  faChevronRight,
  faAward,
} from '@fortawesome/free-solid-svg-icons';
import DropdownManpowerAction from '../../../../components/Tables/components/DropdownManpowerAction';
import Swal from 'sweetalert2';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../../../../db/SupabaseClient';
import {
  profileImageBaseUrl,
  uploadImageGeneral,
} from '../../../../services/ImageUploader';
import { getPositionFromPositionCode } from '../../../../functions/get_nrp';
import UserIcon from '../../../../images/icon/user-icon.svg';
import { useAuth } from '../../../Authentication/AuthContext';
import { SUPERVISOR } from '../../../../store/roles';

interface MasterManpowerListProps {
  onViewCompetency?: (nrp: string) => void;
}

const MasterManpowerList = ({ onViewCompetency }: MasterManpowerListProps) => {
  const { currentUser } = useAuth();
  const { activeTheme } = useTheme();
  const isDark = activeTheme.baseTheme === 'dark';
  const cardBg = activeTheme.container.color;
  const cardBorder = activeTheme.container.borderColor;
  const cardText = activeTheme.container.textColor;
  const headerBg = isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.03)';
  const rowHover = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)';

  const [dataRow, setDataRow] = useState<(Manpower & { competencyCount?: number })[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('FAO');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sections, setSections] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchManpower = async (page: number = 1, searchKeyword: string = '') => {
    setIsLoading(true);
    try {
      // Calculate range for pagination
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      // Build query
      let query = supabase
        .from('manpower')
        .select('*', { count: 'exact' })
        .eq('section', 'FAO');

      // Add search filter if keyword exists
      if (searchKeyword.trim() !== '') {
        query = query.or(`nama.ilike.%${searchKeyword}%,nickname.ilike.%${searchKeyword}%`);
      }

      // Add ordering and pagination
      const { data, error, count } = await query
        .order('position')
        .order('nama')
        .range(from, to);

      if (error) {
        console.error(error.message);
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      // Set total count for pagination
      setTotalCount(count || 0);

      // Fetch Competency Counts for displayed manpower
      const nrps = data.map(m => m.nrp);
      let competencyCounts: Record<string, number> = {};
      
      if (nrps.length > 0) {
        const { data: compData } = await supabase
          .from('v_competency_status')
          .select('nrp')
          .in('nrp', nrps)
          .eq('active', true);
          
        if (compData) {
          competencyCounts = compData.reduce((acc: any, curr: any) => {
            acc[curr.nrp] = (acc[curr.nrp] || 0) + 1;
            return acc;
          }, {});
        }
      }

      const updatedData = await Promise.all(
        data.map(async (item) => {
          let positionName = '';
          try {
            positionName = await getPositionFromPositionCode(item.position);
          } catch (err) {
            console.error(`Error getting position for ${item.nrp}:`, err);
            positionName = 'Unknown';
          }

          return {
            ...item,
            status: 'Onsite',
            nama: item.nama
              .toLowerCase()
              .split(' ')
              .map((word: any) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' '),
            // Construct image URL directly without checking if file exists
            // The image component will handle missing images gracefully
            image: item.photo_url || `${profileImageBaseUrl}/${item.nrp}`,
            position: positionName,
            competencyCount: competencyCounts[item.nrp] || 0,
          };
        }),
      );

      // Since we're only fetching FAO, sections will just be FAO
      setSections(['FAO']);

      setDataRow(updatedData);
    } catch (err) {
      console.error('Error fetching manpower:', err);
      toast.error('Failed to load manpower data');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input shifts to keyword with debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setKeyword(searchInput);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchInput]);

  // Fetch data when keyword or page changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      fetchManpower(1, keyword);
    }
  }, [keyword]);

  useEffect(() => {
    fetchManpower(currentPage, keyword);
  }, [currentPage]);

  // Pagination logic - now based on server-side total count
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleView = (id: any) => {
    window.open(`/profile/${id}`, '_blank');
  };

  const handleEdit = (id: any) => {
    window.open(`/profile/${id}/edit`, '_blank');
  };

  const handleDelete = (id: any) => {
    Swal.fire({
      title: 'Remove Manpower?',
      text: 'Tindakan ini tidak dapat dibatalkan!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'OK',
    }).then((result) => {
      if (result.isConfirmed) {
        const updatedRows = dataRow.filter((row) => row.nrp !== id);
        setDataRow(updatedRows);
        toast.success('Manpower Removed');
      }
    });
  };

  // Check if user can edit profile
  const canEditProfile = (nrp: string) => {
    const isSupervisor = currentUser && currentUser.role && SUPERVISOR.includes(currentUser.role);
    const isOwner = currentUser?.nrp === nrp;
    return isSupervisor || isOwner;
  };

  const handleUploadProfileImage = async (e: any, file: File) => {
    const uploadstatus = await uploadImageGeneral(
      file,
      'images',
      `profile/${e}`,
    );
    if (uploadstatus) {
      const timestamp = new Date().getTime();
      const imageUrl = `${profileImageBaseUrl}/${e}?t=${timestamp}`;
      const newDataRow = dataRow.map((row) =>
        row.nrp === e ? { ...row, image: imageUrl } : row,
      );
      setDataRow(newDataRow);
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const id = e.target.getAttribute('data-id');
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleUploadProfileImage(id, file);
    }
  };

  const handleButtonClick = (id: string) => {
    fileInputRef.current?.click();
    fileInputRef.current?.setAttribute('data-id', id);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="p-4 min-h-[400px]">
      <Toaster />
      
      <div className="flex flex-col gap-6">
        {/* Header & Filters Section - Always Visible */}
        <div className="rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
          {/* Header */}
          <div className="px-6 py-4" style={{ borderBottom: `1px solid ${cardBorder}`, backgroundColor: headerBg }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold" style={{ color: cardText }}>Manpower Resources</h2>
              <Link
                to="/master/manpower/add"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 px-6 text-center font-bold text-white hover:bg-opacity-90 transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <FontAwesomeIcon icon={faAdd} />
                Add Manpower
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Search Input */}
              <div className="flex-1 relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  type="search"
                  placeholder="Search by name, nickname or NRP..."
                  className="w-full rounded-xl border border-stroke bg-transparent pl-10 pr-4 py-3 text-black outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary transition-all"
                />
              </div>

              {/* Section Dropdown */}
              <div className="w-full sm:w-56">
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full rounded-xl border border-stroke bg-transparent px-4 py-3 text-black outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary transition-all appearance-none cursor-pointer"
                >
                  {sections.map((section) => (
                    <option key={section} value={section}>
                      {section === 'All' ? 'All Sections' : `Section ${section}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results Info */}
            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                Showing <span className="text-black dark:text-white font-bold">{totalCount > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}</span> - <span className="text-black dark:text-white font-bold">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of <span className="text-black dark:text-white font-bold">{totalCount}</span> manpower entries
              </p>
            </div>
          </div>
        </div>

        {/* Table Content Section with Blur Overlay */}
        <div className="relative rounded-2xl shadow-sm" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-20 backdrop-blur-[3px] bg-white/40 dark:bg-black/20 flex flex-col items-center justify-center transition-all duration-300">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 bg-primary/10 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <p className="text-sm font-bold text-primary animate-pulse">Updating list...</p>
              </div>
            </div>
          )}

          {/* Table Section */}
          <div className={`overflow-x-auto min-h-[350px] transition-all duration-300 ${isLoading ? 'opacity-60 grayscale-[0.3]' : 'opacity-100'}`}>
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left" style={{ backgroundColor: headerBg }}>
                  {['Profile Info', 'Identity', 'Assignment', 'Role / Position'].map(h => (
                    <th key={h} className="px-6 py-4 font-bold text-xs uppercase tracking-wider" style={{ borderBottom: `1px solid ${cardBorder}`, color: cardText }}>{h}</th>
                  ))}
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center" style={{ borderBottom: `1px solid ${cardBorder}`, color: cardText }}>Competencies</th>
                  {['Join date', 'Status'].map(h => (
                    <th key={h} className="px-6 py-4 font-bold text-xs uppercase tracking-wider" style={{ borderBottom: `1px solid ${cardBorder}`, color: cardText }}>{h}</th>
                  ))}
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center" style={{ borderBottom: `1px solid ${cardBorder}`, color: cardText }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {dataRow.length > 0 ? (
                  dataRow.map((manpower: Manpower & { competencyCount?: number }, key: number) => (
                    <tr
                      key={key}
                      className="transition-colors"
                      style={{ borderBottom: `1px solid ${cardBorder}` }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = rowHover)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Profile Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 flex-shrink-0 rounded-2xl border-2 border-white dark:border-strokedark shadow-sm overflow-hidden bg-slate-100 dark:bg-gray-700 relative group">
                            <button
                              onClick={() => handleButtonClick(manpower.nrp)}
                              className="w-full h-full"
                            >
                              <div className="absolute inset-0 flex items-center justify-center bg-primary/60 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                                <FontAwesomeIcon icon={faEdit} className="text-white text-lg" />
                              </div>
                              <img
                                src={manpower.image || UserIcon}
                                alt={manpower.nama}
                                className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-110 ${!manpower.image ? 'p-2.5 opacity-40' : ''}`}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = UserIcon;
                                  target.className = 'h-10 w-10 opacity-40 mx-auto';
                                  target.parentElement?.classList.add('bg-slate-200');
                                }}
                              />
                            </button>
                          </div>
                          <div className="flex flex-col">
                            <button
                              onClick={() => handleView(manpower.nrp)}
                              className="text-sm font-bold leading-tight hover:text-primary transition-colors text-left group/name" style={{ color: cardText }}
                            >
                              {manpower.nama}
                              <div className="h-0.5 w-0 bg-primary group-hover/name:w-full transition-all duration-300"></div>
                            </button>
                            {manpower.nickname && (
                              <p className="text-xs font-semibold text-primary">
                                @{manpower.nickname}
                              </p>
                            )}
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {manpower.email || 'No email provided'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* NRP/SID Column */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-bold text-black dark:text-white">
                            {manpower.nrp}
                          </p>
                          {manpower.sid_code && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-meta-4 rounded-md w-fit">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">SID: {manpower.sid_code}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Section Column */}
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-lg bg-blue-50 dark:bg-blue-900/20 px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30">
                          {manpower.section || '-'}
                        </span>
                      </td>

                      {/* Role Column */}
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-black dark:text-white leading-tight">
                          {manpower.position}
                        </p>
                      </td>

                      {/* Competencies Column */}
                      <td className="px-6 py-4 text-center">
                        {manpower.competencyCount ? (
                          <button 
                            onClick={() => onViewCompetency && onViewCompetency(manpower.nrp)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 text-xs font-black text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-800/30 hover:bg-orange-600 hover:text-white transition-all shadow-sm active:scale-95 group"
                          >
                            <FontAwesomeIcon icon={faAward} className="text-orange-500 group-hover:text-white" />
                            {manpower.competencyCount}
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs font-bold">NONE</span>
                        )}
                      </td>

                      {/* Join Date Column */}
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {manpower.join_date || '-'}
                        </p>
                      </td>

                      {/* Status Column */}
                      <td className="px-6 py-4">
                        <div
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                            manpower.status === 'Onsite'
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                              : manpower.status === 'Cuti'
                              ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full animate-pulse ${
                            manpower.status === 'Onsite' ? 'bg-emerald-500' : manpower.status === 'Cuti' ? 'bg-rose-500' : 'bg-amber-500'
                          }`}></div>
                          {manpower.status}
                        </div>
                      </td>

                      {/* Action Column */}
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <DropdownManpowerAction
                            rowId={manpower.nrp}
                            onView={() => handleView(manpower.nrp)}
                            onEdit={() => handleEdit(manpower.nrp)}
                            onDelete={() => handleDelete(manpower.nrp)}
                            showEdit={canEditProfile(manpower.nrp)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-meta-4 rounded-full flex items-center justify-center">
                           <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                           </svg>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-bold">
                          No manpower found matching your criteria.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Section */}
          {totalPages > 1 && (
            <div className="px-6 py-5" style={{ borderTop: `1px solid ${cardBorder}`, backgroundColor: headerBg }}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all" style={{ border: `1px solid ${cardBorder}`, color: cardText }}
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                  Prev
                </button>

                <div className="flex items-center gap-2 overflow-x-auto max-w-[200px] sm:max-w-none no-scrollbar">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      disabled={isLoading}
                      className={`h-10 w-10 flex-shrink-0 rounded-xl text-sm font-black transition-all ${
                        currentPage === page
                          ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110'
                          : 'bg-white dark:bg-meta-4 border border-stroke dark:border-strokedark text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white hover:shadow-md'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isLoading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all" style={{ border: `1px solid ${cardBorder}`, color: cardText }}
                >
                  Next
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Hidden inputs for file upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />
      </div>
    </div>
  );
};

export default MasterManpowerList;
