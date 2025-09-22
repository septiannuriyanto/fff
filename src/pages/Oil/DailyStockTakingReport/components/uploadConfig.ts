export interface UploadConfig {
  sheetMapping: { [key: string]: string }; // key Excel -> value target field
  type: 'SOH_SAP' | 'SOH_TACTYS' | 'FAILED_POSTING';
}
