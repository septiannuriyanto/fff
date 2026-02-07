export interface FTStatus {
    unit_id: string;
    status: string;
    downtime_start: Date;
    downtime_end?: Date | null;
    pelapor_bd: string;
    pelapor_rfu: string;
    activity: string;
    description: string;
}
