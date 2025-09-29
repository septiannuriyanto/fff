import React, { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import GreaseTankIcon from '../../../../images/icon/grease-tank.png';
import LubecarIcon from '../../../../images/icon/lubcar.png';
import LubcarMountedIcon from '../../../../images/icon/lubcar-mounted.png';

interface GreaseTank {
  id: string;
  type: 'ALBIDA' | 'ALVANIA';
  status: 'NEW' | 'DC';
  number: string;
}

const initialTanks: GreaseTank[] = [
  { id: '1', type: 'ALBIDA', status: 'NEW', number: 'GT01' },
  { id: '2', type: 'ALVANIA', status: 'NEW', number: 'GT02' },
  { id: '3', type: 'ALBIDA', status: 'DC', number: 'GT03' },
];

const lubcars = [
  { id: 'LT01', name: 'LO148' },
  { id: 'LT02', name: 'LO158' },
  { id: 'LT03', name: 'LO160' },
  { id: 'LT04', name: 'LO185' },
  { id: 'LT05', name: 'LO206' },
  { id: 'LT06', name: 'LO211' },
  { id: 'LT07', name: 'LO218' },
];

const GreaseMonitoring: React.FC = () => {
  const [om1Tanks, setOm1Tanks] = useState<GreaseTank[]>(initialTanks);
  const [supplierTanks, setSupplierTanks] = useState<GreaseTank[]>([]);
  const [lubcarTanks, setLubcarTanks] = useState<
    Record<string, GreaseTank | null>
  >(() =>
    lubcars.reduce(
      (acc, l) => {
        acc[l.id] = null;
        return acc;
      },
      {} as Record<string, GreaseTank | null>,
    ),
  );

  const [hoverTarget, setHoverTarget] = useState<string | null>(null);

  const handleDrop = (
    target: string,
    tank: GreaseTank | null,
    fromLubcar?: string,
  ) => {
    if (!tank) return;

    // hapus dari semua cluster
    setOm1Tanks((prev) => prev.filter((t) => t.id !== tank.id));
    setSupplierTanks((prev) => prev.filter((t) => t.id !== tank.id));
    if (fromLubcar) {
      setLubcarTanks((prev) => ({ ...prev, [fromLubcar]: null }));
    }

    if (target === 'OM01') {
      // kalau dari lubcar → DC, kalau dari supplier → NEW
      let newStatus = tank.status;
      if (fromLubcar) {
        newStatus = 'DC';
      } else if (
        supplierTanks.find((t) => t.id === tank.id) ||
        tank.status === 'DC'
      ) {
        // asal supplier otomatis NEW
        newStatus = 'NEW';
      }
      setOm1Tanks((prev) => [...prev, { ...tank, status: newStatus }]);
      toast.success(
        `GreaseTank ${tank.number} diterima di OM01 (status ${newStatus})`,
      );
    } else if (target === 'SUPPLIER') {
      // lubcar tidak boleh langsung ke supplier
      if (fromLubcar) {
        toast.error('Tidak boleh langsung dari Lubcar ke Supplier');
        setLubcarTanks((prev) => ({ ...prev, [fromLubcar]: tank }));
      } else if (tank.status !== 'DC') {
        toast.error('Supplier hanya menerima DC');
        setOm1Tanks((prev) => [...prev, tank]);
      } else {
        setSupplierTanks((prev) => [...prev, tank]);
        toast.success(`GreaseTank ${tank.number} dikirim ke Supplier`);
      }
    } else if (target.startsWith('LT')) {
      // dilarang Supplier langsung ke Lubcar
      if (supplierTanks.find((t) => t.id === tank.id)) {
        toast.error('Tidak boleh langsung dari Supplier ke Lubcar');
        setSupplierTanks((prev) => [...prev, tank]);
      } else {
        // hanya boleh NEW
        if (tank.status !== 'NEW') {
          toast.error('OM01 hanya boleh menyuplai NEW ke Lubcar');
          setOm1Tanks((prev) => [...prev, tank]);
        } else {
          setLubcarTanks((prev) => ({ ...prev, [target]: tank }));
          toast.success(`GreaseTank ${tank.number} dipasang ke ${target}`);
        }
      }
    }
  };

  const renderTank = (tank: GreaseTank) => (
    <div
      key={tank.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('tank', JSON.stringify(tank));
        e.dataTransfer.setData('fromLubcar', '');
      }}
      className="cursor-move text-center w-16"
    >
      <img
        src={GreaseTankIcon}
        className={`h-10 mx-auto ${
          tank.status === 'DC' ? 'opacity-50 hue-rotate-180' : ''
        }`}
      />
      <div className="text-xs bg-gray-200 rounded-full px-1 mt-1">
        {tank.number}
      </div>
    </div>
  );

  return (
    <>
      <div className=" rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
                Grease Monitoring - Pama BRCG
              </h2>

              <div className="main-content  w-full">
                <div className="p-4">
                  {/* Supplier */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setHoverTarget('SUPPLIER');
                    }}
                    onDragLeave={() => setHoverTarget(null)}
                    onDrop={(e) => {
                      const t = JSON.parse(e.dataTransfer.getData('tank'));
                      const fromLubcar = e.dataTransfer.getData('fromLubcar');
                      handleDrop('SUPPLIER', t, fromLubcar || undefined);
                      setHoverTarget(null);
                    }}
                    className={`border-2 border-dashed rounded-xl p-4 mb-4 transition-colors ${
                      hoverTarget === 'SUPPLIER' ? 'bg-green-100' : ''
                    }`}
                  >
                    <p className="font-semibold mb-2">Supplier (menerima DC)</p>
                    <div className="flex gap-2 flex-wrap">
                      {supplierTanks.map(renderTank)}
                    </div>
                  </div>
                  {/* OM01 */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setHoverTarget('OM01');
                    }}
                    onDragLeave={() => setHoverTarget(null)}
                    onDrop={(e) => {
                      const t = JSON.parse(e.dataTransfer.getData('tank'));
                      const fromLubcar = e.dataTransfer.getData('fromLubcar');
                      handleDrop('OM01', t, fromLubcar || undefined);
                      setHoverTarget(null);
                    }}
                    className={`border-2 border-dashed rounded-xl p-4 mb-4 transition-colors ${
                      hoverTarget === 'OM01' ? 'bg-green-100' : ''
                    }`}
                  >
                    <p className="font-semibold mb-2">OM01 (Oil Storage)</p>
                    <div className="flex gap-2 flex-wrap">
                      {om1Tanks.map(renderTank)}
                    </div>
                  </div>

                  {/* Lubcar */}
                  <div className="grid grid-cols-4 gap-4">
                    {lubcars.map((lc) => {
                      const tank = lubcarTanks[lc.id];
                      const hasTank = !!tank;
                      const iconSrc = hasTank ? LubcarMountedIcon : LubecarIcon;

                      return (
                        <div
                          key={lc.id}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setHoverTarget(lc.id);
                          }}
                          onDragLeave={() => setHoverTarget(null)}
                          onDrop={(e) => {
                            const t = JSON.parse(
                              e.dataTransfer.getData('tank'),
                            );
                            const fromLubcar =
                              e.dataTransfer.getData('fromLubcar');
                            handleDrop(lc.id, t, fromLubcar || undefined);
                            setHoverTarget(null);
                          }}
                          className={`border rounded p-3 text-center transition-colors ${
                            hoverTarget === lc.id ? 'bg-green-100' : ''
                          }`}
                        >
                          <img
                            src={iconSrc}
                            className="mx-auto h-10"
                            draggable={hasTank}
                            onDragStart={(e) => {
                              if (tank) {
                                e.dataTransfer.setData(
                                  'tank',
                                  JSON.stringify({ ...tank, status: 'DC' }),
                                );
                                e.dataTransfer.setData('fromLubcar', lc.id);
                              }
                            }}
                          />
                          <div className="text-xs bg-gray-200 rounded-full px-1 mt-1">
                            {lc.id} / {lc.name}
                          </div>
                          {hasTank && (
                            <div className="text-xs text-gray-600 mt-1">
                              GT: {tank?.number}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GreaseMonitoring;
