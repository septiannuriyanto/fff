import React, { useEffect, useState } from 'react';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import PanelTemplate from '../../../PanelTemplate';
import L from 'leaflet';
import { LotoRecord } from './LotoRecord';
import { supabase } from '../../../../db/SupabaseClient';
import PanelContainer from '../../../PanelContainer';

// Fix default marker icon (Leaflet bug in React)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const UnitLocationMapper = () => {
  const [records, setRecords] = useState<LotoRecord[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const FitBounds = ({ records }: { records: LotoRecord[] }) => {
    const map = useMap();

    useEffect(() => {
      if (records.length === 0) return;

      const bounds = L.latLngBounds(
        records.map((r) => [Number(r.latitude), Number(r.longitude)]),
      );

      map.fitBounds(bounds, { padding: [40, 40] });
    }, [records, map]);

    return null;
  };

  useEffect(() => {
    const loadData = async () => {
      const { data, error } = await supabase.from('loto_records').select(`
        id,
        code_number,
        latitude,
        longitude,
        photo_path,
        thumbnail_url,
        timestamp_taken
      `);

      if (error) {
        console.error(error);
        return;
      }

      

      setRecords(data);
    };

    loadData();
  }, []);

  return (
    <PanelContainer title="Refueling Location Mapping">
      <div style={{ height: '600px', width: '100%' }}>
        <MapContainer
          center={[-2.5, 117]} // contoh tengah Indonesia
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution="© OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds records={records} />

          {records.map((record) => (
            
            <Marker
              key={record.id}
              position={[Number(record.latitude), Number(record.longitude)]}
            >
              <Popup>
                <div style={{ maxWidth: 200 }}>
                  <strong>Unit:</strong> {record.code_number}
                  <br />
                  {
                  
                  record.thumbnail_url && (
                    <img
                      src={record.thumbnail_url}
                      alt="thumbnail"
                      style={{
                        width: '100%',
                        marginTop: 8,
                        cursor: 'pointer',
                        borderRadius: 6,
                      }}
                      onClick={(e) => {
              

                        e.stopPropagation(); // ⬅️ INI KUNCI
                        setSelectedPhoto(record.photo_path);
                      }}
                    />
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Modal zoom photo */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999,
          }}
        >
          <img
            src={selectedPhoto}
            alt="zoom"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: 12,
            }}
          />
        </div>
      )}
    </PanelContainer>
  );
};

export default UnitLocationMapper;
