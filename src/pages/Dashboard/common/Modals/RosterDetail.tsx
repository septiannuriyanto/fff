import { useState, useEffect } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { FaCalendarAlt, FaUserTie, FaTruck, FaCloudUploadAlt, FaEye, FaTrash } from 'react-icons/fa';
import DropZone from '../../../../components/DropZones/DropZone';
import Loader from '../../../../common/Loader/Loader';

interface RosterRecord {
  id: number;
  year: number;
  month: number;
  type: 'operator' | 'fuelman';
  image_url: string;
}

const RosterDetail = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [rosters, setRosters] = useState<RosterRecord[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const fetchRosters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rosters')
        .select('*')
        .eq('year', year)
        .eq('month', month);

      if (error) throw error;
      setRosters(data || []);
    } catch (err: any) {
      console.error('Fetch error:', err);
      toast.error('Failed to load rosters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRosters();
  }, [year, month]);

  const handleUpload = async (file: File, type: 'operator' | 'fuelman') => {
    setUploading(type);
    const loadingToast = toast.loading(`Uploading ${type} roster...`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const uploadUrl = `${import.meta.env.VITE_WORKER_URL}/upload/roster`;
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-Year': year.toString(),
          'X-Month': month.toString(),
          'X-Roster-Type': type,
        },
        body: file,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Upload failed');
      }

      const result = await response.json();
      const photoUrl = (result.url && result.url.startsWith('http'))
        ? result.url
        : `${import.meta.env.VITE_WORKER_URL}/images/rosters/${result.key}`;

      // Save to Supabase
      const { error: upsertError } = await supabase
        .from('rosters')
        .upsert({
          year,
          month,
          type,
          image_url: photoUrl,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'year,month,type' });

      if (upsertError) throw upsertError;

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} roster uploaded!`, { id: loadingToast });
      fetchRosters();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Upload failed', { id: loadingToast });
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (rosterId: number) => {
    if (!confirm('Are you sure you want to delete this roster record?')) return;

    try {
      const { error } = await supabase
        .from('rosters')
        .delete()
        .eq('id', rosterId);

      if (error) throw error;
      toast.success('Roster record removed');
      fetchRosters();
    } catch (err: any) {
      toast.error('Failed to delete record');
    }
  };

  const getRoster = (type: 'operator' | 'fuelman') => rosters.find(r => r.type === type);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-boxdark rounded-2xl overflow-hidden">
      <Toaster />
      
      {/* Search Header */}
      <div className="p-6 border-b border-stroke dark:border-strokedark bg-gray-50 dark:bg-meta-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white flex items-center gap-3">
            <FaCalendarAlt className="text-primary" />
            Roster Details
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage monthly crew rosters</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark py-2 px-4 outline-none focus:border-primary transition"
          >
            {months.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark py-2 px-4 outline-none focus:border-primary transition"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Operator Roster */}
            <RosterCard 
              type="operator"
              title="Operator Roster"
              icon={<FaUserTie className="text-blue-500" />}
              data={getRoster('operator')}
              onUpload={(file) => handleUpload(file, 'operator')}
              onDelete={handleDelete}
              uploading={uploading === 'operator'}
              onZoom={setZoomedImage}
            />

            {/* Fuelman Roster */}
            <RosterCard 
              type="fuelman"
              title="Fuelman Roster"
              icon={<FaTruck className="text-orange-500" />}
              data={getRoster('fuelman')}
              onUpload={(file) => handleUpload(file, 'fuelman')}
              onDelete={handleDelete}
              uploading={uploading === 'fuelman'}
              onZoom={setZoomedImage}
            />
          </div>
        )}
      </div>

      {zoomedImage && (
        <ImageZoomModal 
          imageUrl={zoomedImage} 
          onClose={() => setZoomedImage(null)} 
        />
      )}
    </div>
  );
};

interface RosterCardProps {
  type: 'operator' | 'fuelman';
  title: string;
  icon: React.ReactNode;
  data?: RosterRecord;
  onUpload: (file: File) => void;
  onDelete: (id: number) => void;
  uploading: boolean;
  onZoom: (url: string) => void;
}

const RosterCard = ({ type, title, icon, data, onUpload, onDelete, uploading, onZoom }: RosterCardProps) => {
  return (
    <div className="bg-white dark:bg-meta-4 rounded-2xl border border-stroke dark:border-strokedark shadow-sm overflow-hidden flex flex-col min-h-[400px]">
      <div className="p-4 border-b border-stroke dark:border-strokedark flex items-center justify-between bg-gray-50 dark:bg-boxdark">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white dark:bg-meta-4 rounded-lg shadow-sm">
            {icon}
          </div>
          <h3 className="font-bold text-black dark:text-white">{title}</h3>
        </div>
        {data && (
          <button 
            onClick={() => onDelete(data.id)}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
            title="Delete Record"
          >
            <FaTrash size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 p-4 flex flex-col">
        {uploading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
            <p className="text-sm font-medium animate-pulse">Uploading Roster...</p>
          </div>
        ) : data ? (
          <div 
            className="flex-1 flex flex-col group relative overflow-hidden rounded-xl border border-stroke dark:border-strokedark cursor-zoom-in"
            onClick={() => onZoom(data.image_url)}
          >
            <img 
              src={data.image_url} 
              alt={title}
              className="absolute inset-0 w-full h-full object-contain bg-gray-100 dark:bg-black/20"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
              <div 
                className="p-3 bg-white text-black rounded-full shadow-lg hover:scale-110 transition"
              >
                <FaEye size={20} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <DropZone 
              id={`${type}-upload`}
              title={`Drop ${type} roster image here`}
              onFileUpload={onUpload}
            />
            <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-3">
              <FaCloudUploadAlt className="text-primary mt-1 shrink-0" />
              <div className="text-xs text-slate-600 dark:text-slate-400">
                <p className="font-bold text-primary mb-1">Requirements:</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Accepted formats: PNG, JPG, JPEG</li>
                  <li>Clear resolution recommended</li>
                  <li>Maximum file size: 5MB</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RosterDetail;

interface ZoomModalProps {
  imageUrl: string;
  onClose: () => void;
}

const ImageZoomModal = ({ imageUrl, onClose }: ZoomModalProps) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md cursor-none"
      onClick={onClose}
    >
      {/* Horizontal Line - Mouse Crosshair */}
      <div 
        className="fixed left-0 right-0 h-[1.5px] bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)] pointer-events-none z-[100]"
        style={{ top: mousePos.y }}
      />
      {/* Vertical Line - Mouse Crosshair */}
      <div 
        className="fixed top-0 bottom-0 w-[1.5px] bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)] pointer-events-none z-[100]"
        style={{ left: mousePos.x }}
      />
      
      {/* Close hint */}
      <div className="fixed top-4 right-6 text-white/40 text-xs font-mono tracking-widest uppercase z-[101]">
        Click to Exit
      </div>

      <div className="relative max-w-[98vw] max-h-[98vh] flex items-center justify-center p-4">
        <img 
          src={imageUrl} 
          alt="Zoomed Roster" 
          className="max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-white/20"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};
