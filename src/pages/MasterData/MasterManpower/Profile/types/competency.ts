export interface Competency {
    competency_id: number;
    competency_name: string;
    status: 'valid' | 'expired' | 'soon_expired';
    expired_date: string | null;
}