create table public.user_theme_settings (
  creator_id uuid not null,
  id uuid not null default gen_random_uuid (),
  theme_blueprint jsonb null default '{}'::jsonb,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint user_theme_settings_pkey primary key (id),
  constraint user_theme_settings_creator_id_fkey foreign KEY (creator_id) references manpower (user_id)
) TABLESPACE pg_default;

create index IF not exists idx_user_theme_preset on public.user_theme_settings using btree (id) TABLESPACE pg_default;

create trigger trg_user_theme_updated BEFORE
update on user_theme_settings for EACH row
execute FUNCTION set_timestamp ();
