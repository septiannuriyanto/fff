create table public.loto_records (
  id uuid not null default gen_random_uuid (),
  code_number text not null,
  photo_path text not null,
  timestamp_taken timestamp with time zone not null default now(),
  latitude double precision not null,
  longitude double precision not null,
  session_id text null,
  thumbnail_url text null,
  constraint loto_records_pkey primary key (id),
  constraint loto_records_session_id_fkey foreign KEY (session_id) references loto_sessions (session_code) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_loto_records_code_number on public.loto_records using btree (code_number) TABLESPACE pg_default;

create index IF not exists idx_loto_records_timestamp on public.loto_records using btree (timestamp_taken) TABLESPACE pg_default;