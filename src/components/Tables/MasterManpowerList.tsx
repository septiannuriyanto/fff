import { useEffect, useRef, useState } from 'react';
import { Manpower } from '../../types/manpower';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAdd,
  faEdit,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import ManpowerActionButton from './components/ManpowerActionButton';
import DropdownManpowerAction from './components/DropdownManpowerAction';
import Swal from 'sweetalert2';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../../db/SupabaseClient';
import {
  profileImageBaseUrl,
  uploadImageGeneral,
} from '../../services/ImageUploader';
import { getPositionFromPositionCode } from '../../functions/get_nrp';
import Loader from '../../common/Loader/Loader';
import UserIcon from '../../images/icon/user-icon.svg';

const MasterManpowerList = () => {
  const navigate = useNavigate();

  const [dataRow, setDataRow] = useState<Manpower[]>([] as Manpower[]);
  const [keyword, setKeyword] = useState<string>('');
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

  // Fetch data when component mounts or when page/keyword changes
  useEffect(() => {
    fetchManpower(currentPage, keyword);
  }, [currentPage, keyword]);

  // Reset to page 1 when search keyword changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [keyword]);

  // Pagination logic - now based on server-side total count
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleView = (id: any) => {
    navigate(`/profile/${id}`);
  };

  const handleEdit = (id: any) => {
    navigate(`/settings/${id}`);
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
    <div className="p-4">
      <Toaster />
      
      {isLoading ? (
        <Loader />
      ) : (
        <div className="">
          {/* Header Section */}
          <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <span></span>
              <Link
                to="/master/manpower/add"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary py-2.5 px-5 text-center font-medium text-white hover:bg-opacity-90"
              >
                <FontAwesomeIcon icon={faAdd} />
                Add Manpower
              </Link>
            </div>
          </div>

          {/* Filters Section */}
          <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Search Input */}
              <div className="flex-1">
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  type="search"
                  placeholder="Search by name or nickname..."
                  className="w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                />
              </div>

              {/* Section Dropdown */}
              <div className="w-full sm:w-48">
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                >
                  {sections.map((section) => (
                    <option key={section} value={section}>
                      {section === 'All' ? 'All Sections' : section}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results Info */}
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Showing {totalCount > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} - {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} results
            </div>
          </div>

          {/* Table Section */}
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-2 text-left dark:bg-meta-4">
                  <th className="px-6 py-4 font-medium text-black dark:text-white">
                    Profile
                  </th>
                  <th className="px-6 py-4 font-medium text-black dark:text-white">
                    NRP/SID
                  </th>
                  <th className="px-6 py-4 font-medium text-black dark:text-white">
                    Section
                  </th>
                  <th className="px-6 py-4 font-medium text-black dark:text-white">
                    Role
                  </th>
                  <th className="px-6 py-4 font-medium text-black dark:text-white">
                    Join Date
                  </th>
                  <th className="px-6 py-4 font-medium text-black dark:text-white">
                    Status
                  </th>
                  <th className="px-6 py-4 font-medium text-black dark:text-white text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {dataRow.length > 0 ? (
                  dataRow.map((manpower: Manpower, key: number) => (
                    <tr
                      key={key}
                      className="border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4"
                    >
                      {/* Profile Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 flex-shrink-0 rounded-full border border-stroke dark:border-strokedark overflow-hidden bg-gray-100 dark:bg-gray-700">
                            <button
                              onClick={() => handleButtonClick(manpower.nrp)}
                              className="relative h-full w-full group flex items-center justify-center"
                            >
                              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 z-10">
                                <FontAwesomeIcon
                                  icon={faEdit}
                                  className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                />
                              </div>
                              <img
                                src={manpower.image || UserIcon}
                                alt={manpower.nama}
                                className={`h-full w-full object-cover transition-all duration-300 ${!manpower.image ? 'p-3 opacity-50' : ''}`}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = UserIcon;
                                  target.className = 'h-10 w-10 opacity-50'; // Adjust size for icon fallback
                                  target.parentElement?.classList.add('bg-gray-200');
                                }}
                              />
                              <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                              />
                            </button>
                          </div>
                          <div className="flex flex-col">
                            <p className="text-sm font-medium text-black dark:text-white">
                              {manpower.nama}
                            </p>
                            {manpower.nickname && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                @{manpower.nickname}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {manpower.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* NRP/SID Column */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-black dark:text-white">
                          {manpower.nrp}
                        </p>
                        {manpower.sid_code && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {manpower.sid_code}
                          </p>
                        )}
                      </td>

                      {/* Section Column */}
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {manpower.section || '-'}
                        </span>
                      </td>

                      {/* Role Column */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-black dark:text-white">
                          {manpower.position}
                        </p>
                      </td>

                      {/* Join Date Column */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-black dark:text-white">
                          {manpower.join_date}
                        </p>
                      </td>

                      {/* Status Column */}
                      <td className="px-6 py-4">
                        <p
                          className={`inline-flex rounded-full bg-opacity-10 py-1 px-3 text-sm font-medium ${
                            manpower.status === 'Onsite'
                              ? 'bg-success text-success'
                              : manpower.status === 'Cuti'
                              ? 'bg-danger text-danger'
                              : 'bg-warning text-warning'
                          }`}
                        >
                          {manpower.status}
                        </p>
                      </td>

                      {/* Action Column */}
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <div className="hidden sm:block">
                            <ManpowerActionButton
                              rowId={manpower.nrp}
                              onView={() => handleView(manpower.nrp)}
                              onEdit={() => handleEdit(manpower.nrp)}
                              onDelete={() => handleDelete(manpower.nrp)}
                            />
                          </div>
                          <div className="sm:hidden">
                            <DropdownManpowerAction
                              rowId={manpower.nrp}
                              onView={() => handleView(manpower.nrp)}
                              onEdit={() => handleEdit(manpower.nrp)}
                              onDelete={() => handleDelete(manpower.nrp)}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <p className="text-gray-500 dark:text-gray-400">
                        No manpower found
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Section */}
          {totalPages > 1 && (
            <div className="border-t border-stroke px-6 py-4 dark:border-strokedark">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-2 rounded-md border border-stroke px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`h-9 w-9 rounded-md text-sm font-medium ${
                        currentPage === page
                          ? 'bg-primary text-white'
                          : 'border border-stroke text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-meta-4'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-2 rounded-md border border-stroke px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
                >
                  Next
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MasterManpowerList;
