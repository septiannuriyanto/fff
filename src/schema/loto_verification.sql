create table public.loto_verification (
  id text not null, -- Stores 'ND' document number
  no_logsheet text not null,
  issued_date date null,
  shift smallint null,
  warehouse_code text null,
  cn_unit text null,
  "EGI" text null,
  equip_class text null,
  hm bigint null,
  qty numeric null,
  refueling_start timestamp with time zone null,
  refueling_end timestamp with time zone null,
  is_included boolean null,
  session_code text null,
  constraint loto_verification_pkey primary key (id),
  constraint loto_verification_warehouse_code_fkey foreign KEY (warehouse_code) references storage (warehouse_id)
) TABLESPACE pg_default;