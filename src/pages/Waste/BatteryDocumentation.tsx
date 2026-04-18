import React, { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TbCheck, TbChevronDown, TbChevronUp, TbEdit, TbEye, TbPlus, TbPrinter, TbTrash, TbX } from 'react-icons/tb';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import ThemedPanelContainer from '../../common/ThemedComponents/ThemedPanelContainer';
import { hexToRgba, useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../db/SupabaseClient';
import { useAuth } from '../Authentication/AuthContext';
import { OIL_ROLES } from '../../store/roles';
import { sendTelegramMessageViaEdgeFunction } from '../../services/TelegramSender';

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'resubmitted';

interface BatteryDocumentationRow {
  id: string;
  docNo: string;
  createDate: string;
  createdBy: string;
  qtyEa: number;
  qtyAmp: number;
  planLoadingDate: string | null;
  bassNumber: string;
  approvalStatus: ApprovalStatus;
  approvedByName: string | null;
  rejectedByName: string | null;
  processedAt: string | null;
  remarks: string | null;
}

interface BatteryDocumentationItemRow {
  id: string;
  lineNo: number;
  bassReferenceNumber: string;
  classificationN: number;
  ampere: number;
  photoUrl: string;
  notes: string | null;
}

const ITEMS_PER_PAGE = 50;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const BatteryDocumentation: React.FC = () => {
  const { activeTheme } = useTheme();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [rows, setRows] = useState<BatteryDocumentationRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectionRemark, setRejectionRemark] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState<'all' | 'pending'>('pending');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [detailsByReportId, setDetailsByReportId] = useState<Record<string, BatteryDocumentationItemRow[]>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [photoViewer, setPhotoViewer] = useState<{
    reportId: string;
    activeIndex: number;
  } | null>(null);
  const [photoZoomLevel, setPhotoZoomLevel] = useState<1 | 2 | 3>(1);
  const [photoTransformOrigin, setPhotoTransformOrigin] = useState('50% 50%');
  const [photoPan, setPhotoPan] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const photoDragStartRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const didPhotoDragRef = useRef(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const canApprove = Number(currentUser?.position) === 12;
  const canDelete = currentUser?.role && OIL_ROLES.includes(currentUser.role);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [searchTerm, navigate, location.pathname]);

  // Handle Escape key for Rejection Modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRejectModalOpen) {
        setIsRejectModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isRejectModalOpen]);

  const fetchReports = useCallback(
    async (options?: { background?: boolean; search?: string }) => {
      const isBackground = Boolean(options?.background) && rows.length > 0;
      const searchToUse = options?.search ?? appliedSearch;
      const statusFilter = filterType === 'pending' ? ['pending', 'resubmitted'] : null;

      try {
        if (isBackground) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const { data, error } = await supabase.rpc('rpc_get_battery_documentation_reports', {
          p_page: currentPage,
          p_page_size: ITEMS_PER_PAGE,
          p_search: searchToUse || null,
          p_status_filter: statusFilter,
        });

        if (error) throw error;

        const mappedRows: BatteryDocumentationRow[] = (data || []).map((item: any) => ({
          id: item.id,
          docNo: item.doc_no,
          createDate: item.create_date,
          createdBy: item.created_by_name || item.created_by_nrp,
          qtyEa: Number(item.qty_ea || 0),
          qtyAmp: Number(item.qty_amp || 0),
          planLoadingDate: item.plan_loading_date,
          bassNumber: item.bass_numbers,
          approvalStatus: item.approval_status,
          approvedByName: item.approved_by_name,
          rejectedByName: item.rejected_by_name,
          processedAt: item.processed_at,
          remarks: item.remarks,
        }));

        setRows(mappedRows);
        setTotalCount(Number(data?.[0]?.total_count || 0));
      } catch (error: any) {
        console.error('Failed to fetch battery reports:', error);
        toast.error(error.message || 'Failed to fetch battery documentation reports.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentPage, rows.length, appliedSearch, filterType],
  );

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    if ((location.state as { shouldRefresh?: boolean } | null)?.shouldRefresh) {
      fetchReports({ background: true });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [fetchReports, location.pathname, location.state, navigate]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setAppliedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, filterType]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const buttonTheme = activeTheme.button.primary;
  const secondaryButtonTheme = activeTheme.button.secondary;
  const primaryColor = activeTheme.ui.primaryColor;
  const borderColor = activeTheme.container.borderColor;
  const textColor = activeTheme.container.textColor;
  const subtleBg = hexToRgba(primaryColor, 0.08) ?? 'rgba(59, 130, 246, 0.08)';
  const tableHeaderBg =
    hexToRgba(activeTheme.container.borderColor, activeTheme.baseTheme === 'dark' ? 0.24 : 0.12) ??
    'rgba(148, 163, 184, 0.12)';
  const rowHoverBg =
    hexToRgba(primaryColor, activeTheme.baseTheme === 'dark' ? 0.12 : 0.06) ??
    'rgba(59, 130, 246, 0.06)';
  const detailPanelBg =
    hexToRgba(activeTheme.container.borderColor, activeTheme.baseTheme === 'dark' ? 0.12 : 0.05) ??
    'rgba(148, 163, 184, 0.05)';

  const handleAddEntry = () => {
    navigate('/waste/battery-documentation/add');
  };

  const fetchReportItems = useCallback(async (reportId: string) => {
    try {
      setLoadingDetailId(reportId);
      const { data, error } = await supabase.rpc('rpc_get_battery_documentation_report_items', {
        p_report_id: reportId,
      });

      if (error) throw error;

      const mappedItems: BatteryDocumentationItemRow[] = (data || []).map((item: any) => ({
        id: item.id,
        lineNo: Number(item.line_no || 0),
        bassReferenceNumber: item.bass_reference_number || '-',
        classificationN: Number(item.classification_n || 0),
        ampere: Number(item.ampere || 0),
        photoUrl: item.photo_url || '',
        notes: item.notes || null,
      }));

      setDetailsByReportId((prev) => ({ ...prev, [reportId]: mappedItems }));
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to fetch report detail.');
    } finally {
      setLoadingDetailId(null);
    }
  }, []);

  const handleToggleRow = async (reportId: string) => {
    if (expandedReportId === reportId) {
      setExpandedReportId(null);
      return;
    }

    setExpandedReportId(reportId);
    if (!detailsByReportId[reportId]) {
      await fetchReportItems(reportId);
    }
  };

  const handleDelete = (id: string) => {
    const targetRow = rows.find((row) => row.id === id);
    if (!targetRow) return;

    const confirmed = window.confirm(`Delete entry ${targetRow.docNo}?`);
    if (!confirmed) return;

    (async () => {
      try {
        setProcessingId(id);
        const { error } = await supabase.rpc('rpc_delete_battery_documentation_report', {
          p_report_id: id,
        });

        if (error) throw error;

        toast.success('Report deleted.');
        fetchReports();
      } catch (error: any) {
        console.error('Error deleting report:', error);
        toast.error('Failed to delete report: ' + error.message);
      } finally {
        setProcessingId(null);
      }
    })();
  };

  const handlePrint = (id: string) => {
    toast.success('Opening print view...');
    window.open(`/waste/battery-documentation/print/${id}`, '_blank');
  };

  const openPhotoViewer = (reportId: string, activeIndex: number) => {
    setPhotoViewer({ reportId, activeIndex });
    setPhotoZoomLevel(1);
    setPhotoTransformOrigin('50% 50%');
    setPhotoPan({ x: 0, y: 0 });
  };

  const closePhotoViewer = () => {
    setPhotoViewer(null);
    setPhotoZoomLevel(1);
    setPhotoTransformOrigin('50% 50%');
    setPhotoPan({ x: 0, y: 0 });
    setIsDraggingPhoto(false);
    photoDragStartRef.current = null;
    didPhotoDragRef.current = false;
  };

  const handlePhotoZoomCycle = (event: MouseEvent<HTMLImageElement>) => {
    if (didPhotoDragRef.current) {
      didPhotoDragRef.current = false;
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const originX = `${Math.max(0, Math.min(100, (offsetX / rect.width) * 100))}%`;
    const originY = `${Math.max(0, Math.min(100, (offsetY / rect.height) * 100))}%`;
    const nextZoomLevel = photoZoomLevel === 1 ? 2 : photoZoomLevel === 2 ? 3 : 1;

    if (nextZoomLevel === 1) {
      setPhotoTransformOrigin('50% 50%');
      setPhotoPan({ x: 0, y: 0 });
    } else {
      setPhotoTransformOrigin(`${originX} ${originY}`);
    }

    setPhotoZoomLevel(nextZoomLevel);
  };

  const handlePhotoMouseDown = (event: MouseEvent<HTMLImageElement>) => {
    if (photoZoomLevel === 1) return;

    event.preventDefault();
    setIsDraggingPhoto(true);
    photoDragStartRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: photoPan.x,
      originY: photoPan.y,
    };
    didPhotoDragRef.current = false;
  };

  const handleApproval = async (id: string, status: ApprovalStatus, remarks?: string) => {
    // Determine auto-remark for approval
    let finalRemarks = remarks;
    if (status === 'approved') {
      const confirmed = window.confirm(`Are you sure you want to approve this report?`);
      if (!confirmed) return;

      const now = new Date();
      const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '/');
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      finalRemarks = `APPROVED by ${currentUser?.nrp} at ${dateStr} ${timeStr}`;
    }

    try {
      if (!currentUser?.nrp) {
        toast.error('User not authenticated');
        return;
      }

      setProcessingId(id);
      const { error } = await supabase.rpc('rpc_set_battery_documentation_approval', {
        p_report_id: id,
        p_status: status,
        p_actor_nrp: currentUser.nrp,
        p_remarks: finalRemarks || null,
      });

      if (error) throw error;

      // Send Telegram Notification (Edge)
      try {
        const targetRow = rows.find(r => r.id === id);
        const emoji = status === 'approved' ? '✅' : '❌';
        const message = `${emoji} *BATTERY DOCUMENTATION ${status.toUpperCase()}*\n\n` +
          `*Doc No:* ${targetRow?.docNo || '-'}\n` +
          `*Status:* ${status}\n` +
          `*Processed By:* ${(currentUser as any)?.nama || currentUser?.nrp}\n` +
          `*Remark:* ${finalRemarks || '-'}\n\n` +
          `_Please check system for details._`;
        
        await sendTelegramMessageViaEdgeFunction('60', message);
      } catch (err) {
        console.error('Failed to send approval notification:', err);
      }

      toast.success(`Report ${status} successfully`);
      fetchReports();
    } catch (error: any) {
      console.error(`Error ${status} report:`, error);
      toast.error(`Failed to ${status} report: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenRejectModal = (id: string) => {
    setRejectTargetId(id);
    setRejectionRemark('');
    setIsRejectModalOpen(true);
  };

  const submitRejection = async () => {
    if (!rejectTargetId || !rejectionRemark.trim()) {
      toast.error('Please provide a remark for rejection');
      return;
    }

    try {
      setIsSubmittingReject(true);
      const now = new Date();
      const formattedDate = now.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      });
      const formattedTime = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      
      const userName = (currentUser as any)?.nama || currentUser?.nrp;
      const remarkString = `REJECTED by ${userName} at ${formattedDate} ${formattedTime} with remark : "${rejectionRemark}"`;
      
      await handleApproval(rejectTargetId, 'rejected', remarkString);
      setIsRejectModalOpen(false);
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const renderStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span
            className="inline-flex min-w-[90px] items-center justify-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.16)',
              color: '#16a34a',
              border: '1px solid rgba(34, 197, 94, 0.28)',
            }}
          >
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span
            className="inline-flex min-w-[90px] items-center justify-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.14)',
              color: '#dc2626',
              border: '1px solid rgba(239, 68, 68, 0.26)',
            }}
          >
            Rejected
          </span>
        );
      case 'resubmitted':
        return (
          <span
            className="inline-flex min-w-[90px] items-center justify-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: 'rgba(249, 115, 22, 0.12)',
              color: '#ea580c',
              border: '1px solid rgba(249, 115, 22, 0.24)',
            }}
          >
            Resubmitted
          </span>
        );
      default:
        return (
          <span
            className="inline-flex min-w-[90px] items-center justify-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: 'rgba(234, 179, 8, 0.12)',
              color: '#ca8a04',
              border: '1px solid rgba(234, 179, 8, 0.24)',
            }}
          >
            Submitted
          </span>
        );
    }
  };

  const renderApprovalCell = (row: BatteryDocumentationRow) => {
    // Only show "Processed" if the status is explicitly approved or rejected
    if (row.approvalStatus === 'approved' || row.approvalStatus === 'rejected') {
      return <span className="text-xs opacity-50" style={{ color: textColor }}>Processed</span>;
    }

    if (!canApprove) {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold opacity-60"
          style={{ color: textColor }}
        >
          No Access
        </span>
      );
    }

    return (
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          disabled={processingId === row.id}
          title="Approve"
          onClick={() => handleApproval(row.id, 'approved')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
          style={{
            borderColor: 'rgba(34, 197, 94, 0.28)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            color: '#16a34a',
          }}
        >
          {processingId === row.id ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600/30 border-t-green-600" />
          ) : (
            <TbCheck size={16} />
          )}
        </button>
        <button
          type="button"
          disabled={processingId === row.id}
          title="Reject"
          onClick={() => handleOpenRejectModal(row.id)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
          style={{
            borderColor: 'rgba(239, 68, 68, 0.26)',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            color: '#dc2626',
          }}
        >
          <TbX size={16} />
        </button>
      </div>
    );
  };

  const pageStart = totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

  const reportDetailLabel = useMemo(
    () => (canApprove ? 'Detail laporan dan approval aktif.' : 'Detail laporan tetap bisa dilihat, approval dibatasi untuk position 12.'),
    [canApprove],
  );
  const viewerPhotos = photoViewer ? detailsByReportId[photoViewer.reportId] || [] : [];
  const activeViewerPhoto =
    photoViewer && viewerPhotos.length > 0 ? viewerPhotos[photoViewer.activeIndex] : null;

  useEffect(() => {
    if (!photoViewer) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPhotoViewer(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [photoViewer]);

  useEffect(() => {
    if (!isDraggingPhoto) return;

    const handleMouseMove = (event: globalThis.MouseEvent) => {
      const dragStart = photoDragStartRef.current;
      if (!dragStart) return;

      const deltaX = event.clientX - dragStart.startX;
      const deltaY = event.clientY - dragStart.startY;

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        didPhotoDragRef.current = true;
      }

      setPhotoPan({
        x: dragStart.originX + deltaX,
        y: dragStart.originY + deltaY,
      });
    };

    const handleMouseUp = () => {
      setIsDraggingPhoto(false);
      photoDragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPhoto]);

  return (
    <ThemedPanelContainer
      title="Battery Documentation"
      actions={
        <button
          type="button"
          onClick={handleAddEntry}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
          style={{
            backgroundColor: buttonTheme.color,
            color: buttonTheme.textColor,
            borderRadius: buttonTheme.borderRadius,
            border: `${buttonTheme.borderWidth} ${buttonTheme.border} ${buttonTheme.borderColor}`,
            boxShadow: buttonTheme.shadow,
          }}
        >
          <TbPlus size={18} />
          Add Entry
        </button>
      }
    >
      <div className="space-y-4">
        <div
          className="flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          style={{
            borderColor,
            backgroundColor: subtleBg,
          }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: textColor }}>
              Battery documentation list
            </p>
            <p className="text-xs opacity-70" style={{ color: textColor }}>
              {reportDetailLabel}
            </p>
          </div>
          <div className="text-sm font-medium" style={{ color: textColor }}>
            Total Entries: <span className="font-bold">{totalCount}</span>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div 
            className="inline-flex items-center rounded-xl p-1"
            style={{ backgroundColor: activeTheme.baseTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
          >
            <button
              onClick={() => setFilterType('pending')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                filterType === 'pending' ? 'shadow-sm' : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                backgroundColor: filterType === 'pending' ? activeTheme.container.color : 'transparent',
                color: filterType === 'pending' ? primaryColor : textColor,
              }}
            >
              <TbCheck size={14} className={filterType === 'pending' ? 'opacity-100' : 'opacity-0'} />
              Pending Only
            </button>
            <button
              onClick={() => setFilterType('all')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                filterType === 'all' ? 'shadow-sm' : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                backgroundColor: filterType === 'all' ? activeTheme.container.color : 'transparent',
                color: filterType === 'all' ? primaryColor : textColor,
              }}
            >
              <TbCheck size={14} className={filterType === 'all' ? 'opacity-100' : 'opacity-0'} />
              All Records
            </button>
          </div>
        </div>

        <div className="relative">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 transition-colors group-focus-within:text-primary"
            style={{ color: hexToRgba(textColor, 0.4) }}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search BASS #, qty ampere, plan date... (Press '/' to focus)"
            className="w-full rounded-2xl border bg-transparent py-3.5 pl-11 pr-12 text-sm font-medium outline-none transition-all focus:ring-4"
            style={{
              borderColor,
              color: textColor,
              backgroundColor: activeTheme.container.color,
              boxShadow: activeTheme.baseTheme === 'dark' ? '0 4px 20px -5px rgba(0,0,0,0.5)' : '0 4px 20px -5px rgba(0,0,0,0.1)',
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 flex items-center pr-4 transition-transform hover:scale-110 active:scale-95"
              style={{ color: hexToRgba(textColor, 0.4) }}
            >
              <TbX size={20} />
            </button>
          )}
        </div>

        {isRefreshing && (
          <div
            className="rounded-xl border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
            style={{
              borderColor: hexToRgba(primaryColor, 0.2),
              backgroundColor: hexToRgba(primaryColor, 0.08),
              color: primaryColor,
            }}
          >
            Refreshing latest data...
          </div>
        )}

        <div
          className="overflow-hidden rounded-2xl border"
          style={{
            borderColor,
            boxShadow: activeTheme.card.shadow,
          }}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr style={{ backgroundColor: tableHeaderBg }}>
                  {[
                    'No',
                    'ID',
                    'Create Date',
                    'Created By',
                    'Qty (ea)',
                    'Qty (Amp)',
                    'Plan Loading Date',
                    'BASS #',
                    'Status',
                    'Action',
                    ...(canApprove ? ['Approval'] : []),
                  ].map((header) => (
                    <th
                      key={header}
                      className="whitespace-nowrap border-b px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em]"
                      style={{ borderColor, color: textColor }}
                    >
                      {header}
                    </th>
                  ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isExpanded = expandedReportId === row.id;
              const details = detailsByReportId[row.id] || [];

              return (
                <React.Fragment key={row.id}>
                  <tr
                    className="cursor-pointer transition-colors duration-200"
                    style={{
                      borderBottom: isExpanded ? 'none' : `1px solid ${borderColor}`,
                    }}
                    onClick={() => handleToggleRow(row.id)}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.backgroundColor = rowHoverBg;
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium" style={{ color: textColor }}>
                      {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold" style={{ color: textColor }}>
                      {row.docNo}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3" style={{ color: textColor }}>
                      {formatDate(row.createDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3" style={{ color: textColor }}>
                      {row.createdBy}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3" style={{ color: textColor }}>
                      {row.qtyEa}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3" style={{ color: textColor }}>
                      {row.qtyAmp}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3" style={{ color: textColor }}>
                      {row.planLoadingDate ? formatDate(row.planLoadingDate) : '-'}
                    </td>
                    <td className="max-w-[240px] px-4 py-3" style={{ color: textColor }}>
                      <div className="truncate" title={row.bassNumber}>
                        {row.bassNumber}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center" onClick={(event) => event.stopPropagation()}>
                      {renderStatusBadge(row.approvalStatus)}
                    </td>
                    <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title={isExpanded ? 'Hide detail' : 'View detail'}
                          onClick={() => handleToggleRow(row.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200 hover:-translate-y-0.5"
                          style={{
                            borderColor,
                            backgroundColor: hexToRgba(primaryColor, 0.1),
                            color: primaryColor,
                          }}
                        >
                          {isExpanded ? <TbChevronUp size={18} /> : <TbEye size={18} />}
                        </button>
                        {canDelete && row.approvalStatus === 'rejected' && (
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => navigate(`/waste/battery-documentation/edit/${row.id}`)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200 hover:-translate-y-0.5"
                            style={{
                              borderColor,
                              backgroundColor: hexToRgba(primaryColor, 0.1),
                              color: primaryColor,
                            }}
                          >
                            <TbEdit size={18} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => handleDelete(row.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200 hover:-translate-y-0.5"
                            style={{
                              borderColor,
                              backgroundColor: hexToRgba('#ef4444', 0.12),
                              color: '#dc2626',
                            }}
                          >
                            <TbTrash size={18} />
                          </button>
                        )}
                        {row.approvalStatus === 'approved' && (
                          <button
                            type="button"
                            title="Print"
                            onClick={() => handlePrint(row.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200 hover:-translate-y-0.5"
                            style={{
                              borderColor,
                              backgroundColor: hexToRgba('#6366f1', 0.12),
                              color: '#4f46e5',
                            }}
                          >
                            <TbPrinter size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                    {canApprove && (
                      <td className="whitespace-nowrap px-4 py-3 text-center" onClick={(event) => event.stopPropagation()}>
                        {renderApprovalCell(row)}
                      </td>
                    )}
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td
                        colSpan={canApprove ? 11 : 10}
                        className="border-b px-4 pb-4 pt-0"
                        style={{
                          borderColor,
                          backgroundColor: detailPanelBg,
                        }}
                      >
                            <div
                              className="rounded-2xl border p-4"
                              style={{
                                borderColor,
                                backgroundColor: activeTheme.container.color,
                              }}
                            >
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold" style={{ color: textColor }}>
                                    Detail Laporan {row.docNo}
                                  </p>
                                  <p className="text-xs opacity-70" style={{ color: textColor }}>
                                    Klik row utama atau tombol view untuk buka/tutup detail.
                                  </p>
                                </div>
                                <div
                                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                                  style={{
                                    backgroundColor: hexToRgba(primaryColor, 0.08),
                                    color: primaryColor,
                                    border: `1px solid ${hexToRgba(primaryColor, 0.16)}`,
                                  }}
                                >
                                  <TbChevronDown size={14} />
                                  {row.qtyEa} item
                                </div>
                              </div>

                              {(row.approvalStatus === 'approved' || row.approvalStatus === 'rejected' || row.remarks) && (
                                <div
                                  className="mb-4 rounded-xl border p-4"
                                  style={{
                                    backgroundColor: hexToRgba(row.approvalStatus === 'approved' ? '#22c55e' : (row.approvalStatus === 'rejected' ? '#ef4444' : primaryColor), 0.05),
                                    borderColor: hexToRgba(row.approvalStatus === 'approved' ? '#22c55e' : (row.approvalStatus === 'rejected' ? '#ef4444' : primaryColor), 0.15),
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="flex h-10 w-10 items-center justify-center rounded-full"
                                        style={{
                                          backgroundColor: row.approvalStatus === 'approved' ? '#22c55e' : (row.approvalStatus === 'rejected' ? '#ef4444' : primaryColor),
                                          color: '#fff',
                                        }}
                                      >
                                        {row.approvalStatus === 'approved' ? <TbCheck size={20} /> : (row.approvalStatus === 'rejected' ? <TbX size={20} /> : <TbEye size={20} />)}
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold" style={{ color: textColor }}>
                                          {row.approvalStatus === 'approved' ? 'Approved by' : (row.approvalStatus === 'rejected' ? 'Rejected by' : 'Processed Status')}{' '}
                                          <span className="text-primary">
                                            {row.approvalStatus === 'approved' ? row.approvedByName : (row.approvalStatus === 'rejected' ? row.rejectedByName : '-')}
                                          </span>
                                        </p>
                                        <p className="text-xs opacity-70" style={{ color: textColor }}>
                                          {row.processedAt ? `Processed on ${formatDate(row.processedAt)}` : 'Approval pending'}
                                        </p>
                                      </div>
                                    </div>
                                    <div
                                      className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                                      style={{
                                        backgroundColor: hexToRgba(row.approvalStatus === 'approved' ? '#22c55e' : (row.approvalStatus === 'rejected' ? '#ef4444' : primaryColor), 0.1),
                                        color: row.approvalStatus === 'approved' ? '#16a34a' : (row.approvalStatus === 'rejected' ? '#dc2626' : primaryColor),
                                      }}
                                    >
                                      {row.approvalStatus}
                                    </div>
                                  </div>

                                  {row.remarks && (
                                    <div 
                                      className="mt-4 rounded-xl border-l-4 p-3 shadow-sm"
                                      style={{ 
                                        backgroundColor: activeTheme.baseTheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                        borderColor: row.approvalStatus === 'rejected' ? '#ef4444' : primaryColor,
                                      }}
                                    >
                                      <p className="text-sm italic" style={{ color: textColor }}>
                                        {row.remarks}
                                      </p>
                                      {canDelete && row.approvalStatus === 'rejected' && (
                                        <button
                                          type="button"
                                          onClick={() => navigate(`/waste/battery-documentation/edit/${row.id}`)}
                                          className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all hover:scale-[1.02]"
                                          style={{
                                            backgroundColor: hexToRgba(primaryColor, 0.1),
                                            borderColor: hexToRgba(primaryColor, 0.2),
                                            color: primaryColor,
                                          }}
                                        >
                                          <TbEdit size={14} />
                                          Follow up
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {loadingDetailId === row.id ? (
                                <div className="py-6 text-center text-sm opacity-70" style={{ color: textColor }}>
                                  Loading report detail...
                                </div>
                              ) : details.length === 0 ? (
                                <div className="py-6 text-center text-sm opacity-70" style={{ color: textColor }}>
                                  Tidak ada detail item untuk laporan ini.
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="min-w-full border-collapse text-sm">
                                    <thead>
                                      <tr style={{ backgroundColor: tableHeaderBg }}>
                                        {['Line', 'Photo', 'BASS Reference', 'N', 'Ampere', 'Catatan'].map((header) => (
                                          <th
                                            key={header}
                                            className="whitespace-nowrap border-b px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em]"
                                            style={{ borderColor, color: textColor }}
                                          >
                                            {header}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {details.map((detail) => (
                                        <tr key={detail.id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                                          <td className="whitespace-nowrap px-4 py-3 font-medium" style={{ color: textColor }}>
                                            {detail.lineNo}
                                          </td>
                                          <td className="px-4 py-3">
                                            {detail.photoUrl ? (
                                              <button
                                                type="button"
                                                onClick={() => openPhotoViewer(row.id, details.findIndex((item) => item.id === detail.id))}
                                                className="inline-flex overflow-hidden rounded-xl border transition-transform duration-200 hover:scale-[1.03]"
                                                style={{
                                                  borderColor: hexToRgba(primaryColor, 0.2),
                                                }}
                                              >
                                                <img
                                                  src={detail.photoUrl}
                                                  alt={detail.bassReferenceNumber}
                                                  className="h-14 w-14 rounded-xl object-cover"
                                                />
                                              </button>
                                            ) : (
                                              <span style={{ color: textColor }}>-</span>
                                            )}
                                          </td>
                                          <td className="whitespace-nowrap px-4 py-3 font-semibold" style={{ color: textColor }}>
                                            {detail.bassReferenceNumber}
                                          </td>
                                          <td className="whitespace-nowrap px-4 py-3" style={{ color: textColor }}>
                                            N{detail.classificationN}
                                          </td>
                                          <td className="whitespace-nowrap px-4 py-3" style={{ color: textColor }}>
                                            {detail.ampere} Amp
                                          </td>
                                          <td className="px-4 py-3" style={{ color: textColor }}>
                                            {detail.notes || '-'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            {!isLoading && rows.length === 0 && (
              <div className="px-4 py-8 text-center text-sm opacity-70" style={{ color: textColor }}>
                No battery documentation reports found.
              </div>
            )}
            {isLoading && (
              <div className="px-4 py-8 text-center text-sm opacity-70" style={{ color: textColor }}>
                Loading reports...
              </div>
            )}
          </div>

          <div
            className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor, backgroundColor: subtleBg }}
          >
            <p className="text-sm" style={{ color: textColor }}>
              Showing {pageStart}-{pageEnd} of {totalCount} entries
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  backgroundColor: secondaryButtonTheme.color,
                  color: secondaryButtonTheme.textColor,
                  borderRadius: secondaryButtonTheme.borderRadius,
                  border: `${secondaryButtonTheme.borderWidth} ${secondaryButtonTheme.border} ${secondaryButtonTheme.borderColor}`,
                }}
              >
                Previous
              </button>

              <div
                className="rounded-lg px-3 py-2 text-sm font-semibold"
                style={{
                  color: textColor,
                  backgroundColor: hexToRgba(primaryColor, 0.1),
                  border: `1px solid ${hexToRgba(primaryColor, 0.18)}`,
                }}
              >
                Page {currentPage} / {totalPages}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  backgroundColor: secondaryButtonTheme.color,
                  color: secondaryButtonTheme.textColor,
                  borderRadius: secondaryButtonTheme.borderRadius,
                  border: `${secondaryButtonTheme.borderWidth} ${secondaryButtonTheme.border} ${secondaryButtonTheme.borderColor}`,
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {photoViewer && activeViewerPhoto && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{
            background:
              activeTheme.baseTheme === 'dark'
                ? 'radial-gradient(circle at top, rgba(148,163,184,0.1) 0%, rgba(15,23,42,0.66) 48%, rgba(2,6,23,0.8) 100%)'
                : 'radial-gradient(circle at top, rgba(255,255,255,0.34) 0%, rgba(226,232,240,0.42) 30%, rgba(15,23,42,0.24) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={closePhotoViewer}
        >
          <div
            className="h-[88vh] w-[min(1120px,92vw)] overflow-hidden rounded-[28px] border"
            style={{
              borderColor: hexToRgba('#ffffff', activeTheme.baseTheme === 'dark' ? 0.14 : 0.42) ?? borderColor,
              background:
                activeTheme.baseTheme === 'dark'
                  ? 'linear-gradient(180deg, rgba(15,23,42,0.48) 0%, rgba(15,23,42,0.34) 100%)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.24) 100%)',
              boxShadow:
                activeTheme.baseTheme === 'dark'
                  ? '0 24px 80px rgba(2, 6, 23, 0.45)'
                  : '0 24px 80px rgba(15, 23, 42, 0.16)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: textColor }}>
                  {activeViewerPhoto.bassReferenceNumber}
                </p>
                <p className="text-xs opacity-70" style={{ color: textColor }}>
                  N{activeViewerPhoto.classificationN} • {activeViewerPhoto.ampere} Amp
                </p>
              </div>
              <button
                type="button"
                onClick={closePhotoViewer}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border"
                style={{
                  borderColor: hexToRgba('#ffffff', activeTheme.baseTheme === 'dark' ? 0.12 : 0.4) ?? borderColor,
                  backgroundColor:
                    hexToRgba(activeTheme.baseTheme === 'dark' ? '#0f172a' : '#ffffff', activeTheme.baseTheme === 'dark' ? 0.34 : 0.36) ??
                    hexToRgba(primaryColor, 0.08),
                  color: textColor,
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                }}
              >
                <TbX size={18} />
              </button>
            </div>

            <div className="flex h-[calc(88vh-73px)] flex-col px-5 py-5">
              <div
                className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[24px]"
                style={{
                  background:
                    activeTheme.baseTheme === 'dark'
                      ? 'linear-gradient(180deg, rgba(30,41,59,0.32) 0%, rgba(15,23,42,0.16) 100%)'
                      : 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(241,245,249,0.12) 100%)',
                  border: `1px solid ${hexToRgba('#ffffff', activeTheme.baseTheme === 'dark' ? 0.08 : 0.28)}`,
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                }}
              >
                <img
                  src={activeViewerPhoto.photoUrl}
                  alt={activeViewerPhoto.bassReferenceNumber}
                  onMouseDown={handlePhotoMouseDown}
                  onClick={handlePhotoZoomCycle}
                  className="max-h-[65vh] w-full object-contain transition-transform duration-300"
                  style={{
                    transform: `translate(${photoPan.x}px, ${photoPan.y}px) scale(${photoZoomLevel})`,
                    transformOrigin: photoTransformOrigin,
                    cursor: photoZoomLevel === 1 ? 'zoom-in' : isDraggingPhoto ? 'grabbing' : 'grab',
                    userSelect: 'none',
                  }}
                  draggable={false}
                />
              </div>

              <div className="mt-4 shrink-0 overflow-x-auto">
                <div className="flex min-w-max items-center gap-3 pb-1">
                  {viewerPhotos.map((photo, index) => {
                    const isActive = photoViewer.activeIndex === index;
                    return (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => {
                          setPhotoViewer((prev) => (prev ? { ...prev, activeIndex: index } : prev));
                          setPhotoZoomLevel(1);
                          setPhotoTransformOrigin('50% 50%');
                          setPhotoPan({ x: 0, y: 0 });
                          setIsDraggingPhoto(false);
                          photoDragStartRef.current = null;
                          didPhotoDragRef.current = false;
                        }}
                        className="relative shrink-0 overflow-hidden rounded-2xl border transition-all duration-200"
                        style={{
                          borderColor:
                            isActive
                              ? primaryColor
                              : hexToRgba('#ffffff', activeTheme.baseTheme === 'dark' ? 0.08 : 0.26) ?? borderColor,
                          boxShadow: isActive ? `0 0 0 2px ${hexToRgba(primaryColor, 0.18)}` : 'none',
                          opacity: isActive ? 1 : 0.82,
                          backgroundColor:
                            hexToRgba(activeTheme.baseTheme === 'dark' ? '#0f172a' : '#ffffff', activeTheme.baseTheme === 'dark' ? 0.28 : 0.22) ??
                            'transparent',
                        }}
                      >
                        <img
                          src={photo.photoUrl}
                          alt={photo.bassReferenceNumber}
                          className="h-16 w-16 object-cover"
                        />
                        <div
                          className="absolute bottom-0 left-0 right-0 px-2 py-1 text-left text-[10px] font-semibold"
                          style={{
                            background: 'linear-gradient(180deg, rgba(15,23,42,0.02) 0%, rgba(15,23,42,0.82) 100%)',
                            color: '#fff',
                          }}
                        >
                          {photo.lineNo}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeViewerPhoto.notes && (
                <div
                  className="mt-4 shrink-0 rounded-2xl border px-4 py-3 text-sm"
                  style={{
                    borderColor: hexToRgba('#ffffff', activeTheme.baseTheme === 'dark' ? 0.08 : 0.24) ?? borderColor,
                    background:
                      activeTheme.baseTheme === 'dark'
                        ? 'linear-gradient(180deg, rgba(30,41,59,0.42) 0%, rgba(15,23,42,0.24) 100%)'
                        : 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(241,245,249,0.18) 100%)',
                    color: textColor,
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                  }}
                >
                  {activeViewerPhoto.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {isRejectModalOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setIsRejectModalOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden"
            style={{
              backgroundColor: activeTheme.container.color,
              borderColor,
            }}
          >
            <div className="p-6 border-b" style={{ borderColor }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
                    <TbX size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: textColor }}>
                      Reject Report
                    </h3>
                    <p className="text-sm opacity-70" style={{ color: textColor }}>
                      Provide a reason for rejecting this report.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="rounded-xl p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: textColor }}
                >
                  <TbX size={20} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <label 
                className="mb-2 block text-xs font-bold uppercase tracking-wider opacity-60" 
                style={{ color: textColor }}
              >
                Rejection Remark
              </label>
              <textarea
                autoFocus
                value={rejectionRemark}
                onChange={(e) => setRejectionRemark(e.target.value)}
                placeholder="Enter the reason for rejection..."
                className="h-32 w-full rounded-2xl border bg-transparent p-4 text-sm outline-none transition-all focus:ring-4"
                style={{
                  borderColor,
                  color: textColor,
                  backgroundColor: activeTheme.baseTheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                }}
              />
              <p className="mt-2 text-[10px] opacity-50 italic" style={{ color: textColor }}>
                Format: REJECTED by {(currentUser as any)?.nama || 'You'} at [Date] [Time] with remark: "[Your Remark]"
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t" style={{ borderColor, backgroundColor: activeTheme.baseTheme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="rounded-2xl px-6 py-2.5 text-sm font-bold transition-all hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: textColor }}
              >
                Cancel
              </button>
              <button
                onClick={submitRejection}
                disabled={isSubmittingReject || !rejectionRemark.trim()}
                className="flex items-center gap-2 rounded-2xl bg-red-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:-translate-y-0.5 hover:bg-red-700 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {isSubmittingReject ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Processing...
                  </>
                ) : (
                  'Reject Report'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </ThemedPanelContainer>
  );
};

export default BatteryDocumentation;
