import React, { useEffect } from 'react';
import { AgGridReact, AgGridReactProps } from 'ag-grid-react';
import { useTheme } from '../../contexts/ThemeContext';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

// Custom CSS for AG Grid pagination responsive
const agGridMobileStyle = `
  .ag-theme-quartz {
    --ag-background-color: transparent !important;
    --ag-header-background-color: transparent !important;
    --ag-odd-row-background-color: transparent !important;
    --ag-control-panel-background-color: transparent !important;
    --ag-row-hover-color: rgba(255, 255, 255, 0.05) !important;
  }
  @media (max-width: 600px) {
    .ag-theme-quartz .ag-paging-panel {
      font-size: 12px;
      padding: 4px 2px;
      flex-wrap: wrap;
      gap: 4px;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      width: 100% !important;
      text-align: center !important;
    }
    .ag-theme-quartz .ag-paging-page-size, 
    .ag-theme-quartz .ag-paging-row-summary-panel {
      display: none !important;
    }
    .ag-theme-quartz .ag-paging-button {
      min-width: 24px;
      height: 24px;
      font-size: 12px;
      padding: 0 4px;
    }
  }
`;

export interface ThemedGridProps<TData = any> extends AgGridReactProps<TData> {
  gridClass?: string;
  useGridFilter?: boolean;
}

const ThemedGrid = React.forwardRef<AgGridReact, ThemedGridProps<any>>(
  ({ gridClass = '', useGridFilter = false, defaultColDef, ...props }, ref) => {
    const { activeTheme } = useTheme();

    // Inject custom style for AG Grid mobile pagination
    useEffect(() => {
      if (typeof window !== 'undefined') {
        let styleTag = document.getElementById('agGridMobileStyle');
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = 'agGridMobileStyle';
          styleTag.innerHTML = agGridMobileStyle;
          document.head.appendChild(styleTag);
        }
      }
    }, []);

    return (
      <div className="flex-1 flex flex-col w-full h-full shadow-sm relative">
          <style>{`
              .fff-themed-grid {
                  --ag-header-background-color: ${activeTheme.grid.headerColor || 'transparent'} !important;
                  --ag-header-foreground-color: ${activeTheme.grid.headerTextColor || 'inherit'} !important;
              }
              .fff-themed-grid .ag-root-wrapper,
              .fff-themed-grid .ag-root,
              .fff-themed-grid .ag-root-wrapper-body {
                  border-radius: 16px !important;
                  overflow: hidden !important;
              }
              .fff-themed-grid .ag-header,
              .fff-themed-grid .ag-header-row,
              .fff-themed-grid .ag-header-cell {
                  background-color: var(--ag-header-background-color) !important;
              }
              .fff-themed-grid .ag-header {
                  border-bottom: 2px solid ${activeTheme.grid.borderColor || 'transparent'} !important;
              }
              .fff-themed-grid .ag-paging-panel,
              .fff-themed-grid .ag-paging-page-size,
              .fff-themed-grid .ag-select-list,
              .fff-themed-grid .ag-select,
              .fff-themed-grid .ag-paging-button,
              .fff-themed-grid .ag-paging-panel * {
                  color: var(--ag-secondary-foreground-color) !important;
              }
              .fff-themed-grid .ag-select-list {
                  background-color: ${activeTheme.container.color} !important;
              }
              .ag-theme-quartz .ag-popup {
                  --ag-background-color: ${activeTheme.container.color} !important;
                  --ag-foreground-color: ${activeTheme.grid.secondaryTextColor || activeTheme.container.textColor} !important;
              }
              .ag-theme-quartz .ag-menu,
              .ag-theme-quartz .ag-popup .ag-select-list,
              .ag-theme-quartz .ag-popup .ag-filter-wrapper,
              .ag-theme-quartz .ag-popup .ag-filter-toolpanel {
                  background-color: ${activeTheme.container.color} !important;
                  border: 1px solid ${activeTheme.grid.borderColor || activeTheme.container.borderColor} !important;
              }
              .ag-theme-quartz .ag-popup * {
                  color: ${activeTheme.grid.secondaryTextColor || activeTheme.container.textColor} !important;
              }
              .fff-themed-grid .ag-cell {
                  border-right: var(--ag-column-border-width, 0px) var(--ag-column-border-style, solid) var(--ag-column-border-color, transparent) !important;
              }
          `}</style>
          <div className={`ag-theme-quartz fff-themed-grid flex flex-col h-full w-full ${gridClass}`} style={{ 
              backgroundColor: 'transparent',
              '--ag-background-color': 'transparent',
              '--ag-foreground-color': activeTheme.grid.primaryTextColor || activeTheme.container.textColor,
              '--ag-header-foreground-color': activeTheme.grid.headerTextColor || activeTheme.container.textColor,
              '--ag-secondary-foreground-color': activeTheme.grid.secondaryTextColor || activeTheme.container.textColor,
              '--ag-data-color': activeTheme.grid.primaryTextColor || activeTheme.container.textColor,
              '--ag-border-color': activeTheme.grid.borderColor || activeTheme.container.borderColor,
              '--ag-header-background-color': activeTheme.grid.headerColor || 'transparent',
              '--ag-row-hover-color': (activeTheme.grid.borderColor || activeTheme.container.borderColor) + '1A',
              '--ag-selected-row-background-color': (activeTheme.grid.borderColor || activeTheme.container.borderColor) + '33',
              '--ag-header-height': activeTheme.grid.headerHeight || '36px',
              '--ag-header-cell-hover-background-color': activeTheme.grid.headerHoverColor || 'rgba(0,0,0,0.03)',
              '--ag-header-cell-moving-background-color': activeTheme.grid.headerMovingColor || 'rgba(0,0,0,0.06)',
              '--ag-wrapper-border-color': activeTheme.grid.showWrapperBorder !== false ? (activeTheme.grid.borderColor || activeTheme.container.borderColor) : 'transparent',
              '--ag-header-row-border-color': activeTheme.grid.showHeaderRowBorder !== false ? (activeTheme.grid.borderColor || activeTheme.container.borderColor) : 'transparent',
              '--ag-row-border-style': activeTheme.grid.rowBorderStyle || 'solid',
              '--ag-row-border-width': activeTheme.grid.rowBorderWidth || '1px',
              '--ag-row-border-color': activeTheme.grid.rowBorderColor || activeTheme.grid.borderColor || activeTheme.container.borderColor,
              '--ag-column-border-style': activeTheme.grid.columnBorderStyle || 'solid',
              '--ag-column-border-width': activeTheme.grid.columnBorderWidth || '0px',
              '--ag-column-border-color': activeTheme.grid.columnBorderColor || activeTheme.grid.borderColor || activeTheme.container.borderColor,
              '--ag-header-column-separator-display': activeTheme.grid.columnBorderWidth !== '0px' ? 'block' : 'none',
              '--ag-header-column-separator-color': activeTheme.grid.columnBorderColor || activeTheme.grid.borderColor || activeTheme.container.borderColor,
              '--ag-header-column-separator-width': activeTheme.grid.columnBorderWidth || '1px',
              '--ag-border-radius': '16px',
          } as any}>
              <AgGridReact 
                  ref={ref}
                  defaultColDef={{
                      flex: 1, 
                      minWidth: 100, 
                      filter: useGridFilter,
                      ...defaultColDef 
                  }}
                  {...props} 
              />
          </div>
      </div>
    );
  }
);

export default ThemedGrid;