// components/MasterStorage/StorageGridView.tsx

import React, { useMemo, useCallback } from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ValueFormatterParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { dateFormatter, StorageData } from './components/storageData';
import { DeleteIcon, EditIcon } from 'lucide-react';

interface GridViewProps {
  rowData: StorageData[];
  onEdit: (unit: StorageData) => void;
  onDelete: (unit: StorageData) => void;
}

const StorageGridView: React.FC<GridViewProps> = ({ rowData, onEdit, onDelete }) => {
  const { activeTheme } = useTheme();
  
  // Custom Cell Renderer untuk Actions
  const actionCellRenderer = useCallback((params: any) => {
    return (
      <div className="flex gap-2 items-center h-full">
        <div onClick={() => onEdit(params.data)}><EditIcon /></div>
        <div onClick={() => onDelete(params.data)}><DeleteIcon /></div>
      </div>
    );
  }, [onEdit, onDelete]);

  // Definisi Kolom
  const columnDefs: ColDef<StorageData>[] = useMemo(() => [
    { headerName: 'Actions', field: 'actions', cellRenderer: actionCellRenderer, width: 100, pinned: 'left', filter: false, sortable: false, resizable: false },
    { headerName: 'ID', field: 'id', width: 80, type: 'numericColumn', filter: true, sortable: true },
    { headerName: 'WH ID', field: 'warehouse_id', width: 120, pinned: 'left' },
    { headerName: 'Unit ID', field: 'unit_id', width: 120, pinned: 'left' },
    { headerName: 'Type', field: 'type', width: 100, filter: true },
    { headerName: 'Status', field: 'status', width: 100, filter: true, cellStyle: (params) => params.value === 'ACTIVE' ? { backgroundColor: '#d1fae5' } : params.value === 'OUT' ? { backgroundColor: '#fee2e2' } : null },
    { headerName: 'Max Cap (L)', field: 'max_capacity', width: 120, type: 'numericColumn', valueFormatter: p => p.value !== null ? p.value.toFixed(0) : '-' },
    { headerName: 'Manufacturer', field: 'manufacturer', width: 150 },
    { headerName: 'Call. Date', field: 'callibration_date', width: 120, valueFormatter: p => dateFormatter(p.value) },
    { headerName: 'Exp. Date', field: 'expired_date', width: 120, valueFormatter: p => dateFormatter(p.value) },
    { headerName: 'Seal Number', field: 'fm_seal_number', width: 150, valueFormatter: p => p.value ? p.value.join(', ') : '-', filter: true},
  ], [actionCellRenderer]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  return (
    <div 
      className="ag-theme-alpine" 
      style={{ 
        height: 600, 
        width: '100%',
        backgroundColor: activeTheme.grid.backgroundColor !== 'default' ? activeTheme.grid.backgroundColor : undefined,
        '--ag-background-color': activeTheme.grid.backgroundColor !== 'default' ? 'transparent' : undefined,
        '--ag-header-background-color': activeTheme.grid.backgroundColor !== 'default' ? 'rgba(255,255,255,0.05)' : undefined,
        '--ag-foreground-color': activeTheme.baseTheme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : undefined,
        '--ag-header-foreground-color': activeTheme.baseTheme === 'dark' ? '#FFFFFF' : undefined,
        '--ag-secondary-foreground-color': activeTheme.baseTheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : undefined,
      } as React.CSSProperties}
    >
      <AgGridReact<StorageData>
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowHeight={35}
        animateRows={true}
        pagination={true}
        paginationPageSize={20}
      />
    </div>
  );
};

export default StorageGridView;