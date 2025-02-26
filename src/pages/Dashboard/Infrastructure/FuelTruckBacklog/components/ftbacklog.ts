export type FTBacklog = {
    req_id:string;
    created_at:Date;
    report_by:string;
    unit_id:string;
    area:string;
    problem:string;
    description:string;
    image_url:string;
    isclosed:boolean;
    closed_by:string;
    closed_date:Date;
}