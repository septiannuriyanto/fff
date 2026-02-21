-- =====================================================
-- THEME PRESETS TABLE
-- =====================================================
create table if not exists public.theme_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,

  background_type text check (background_type in ('color','gradient')),
  background_value text,

  card_transparency numeric check (card_transparency between 0 and 1),
  card_outline_color text,
  card_outline_width integer check (card_outline_width between 0 and 10),

  font_family text,
  font_scale numeric check (font_scale between 0.7 and 1.5),

  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- =====================================================
-- USER THEME SETTINGS
-- =====================================================
create table if not exists public.user_theme_settings (
  user_id uuid primary key
    references auth.users(id) on delete cascade,

  -- system | custom | preset
  mode text not null default 'system'
    check (mode in ('system','custom','preset')),

  system_theme text default 'dark'
    check (system_theme in ('dark','light')),

  preset_id uuid null,

  background_type text check (background_type in ('color','gradient')),
  background_value text,

  card_transparency numeric check (card_transparency between 0 and 1),
  card_outline_color text,
  card_outline_width integer check (card_outline_width between 0 and 10),

  font_family text,
  font_scale numeric check (font_scale between 0.7 and 1.5),

  extra jsonb default '{}'::jsonb,

  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- FK preset
alter table public.user_theme_settings
drop constraint if exists fk_preset;

alter table public.user_theme_settings
add constraint fk_preset
foreign key (preset_id)
references public.theme_presets(id)
on delete set null;

create index if not exists idx_user_theme_preset
on public.user_theme_settings(preset_id);

-- =====================================================
-- AUTO UPDATED_AT
-- =====================================================
create or replace function public.set_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_theme_updated
on public.user_theme_settings;

create trigger trg_user_theme_updated
before update on public.user_theme_settings
for each row
execute function public.set_timestamp();

-- =====================================================
-- RPC SAVE THEME
-- =====================================================
create or replace function public.rpc_save_theme(
  p_mode text,
  p_data jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_preset uuid;
begin

  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_mode not in ('system','custom','preset') then
    raise exception 'Invalid mode';
  end if;

  -- ensure row exists
  insert into public.user_theme_settings(user_id)
  values (v_user)
  on conflict do nothing;

  -- ================= SYSTEM MODE =================
  if p_mode = 'system' then

    update public.user_theme_settings
    set
      mode = 'system',
      preset_id = null,
      background_type = null,
      background_value = null,
      card_transparency = null,
      card_outline_color = null,
      card_outline_width = null,
      font_family = null,
      font_scale = null
    where user_id = v_user;

  -- ================= PRESET MODE =================
  elsif p_mode = 'preset' then

    v_preset := (p_data->>'preset_id')::uuid;

    if v_preset is null then
      raise exception 'preset_id required';
    end if;

    update public.user_theme_settings
    set
      mode = 'preset',
      preset_id = v_preset
    where user_id = v_user;

  -- ================= CUSTOM MODE =================
  elsif p_mode = 'custom' then

    update public.user_theme_settings
    set
      mode = 'custom',
      preset_id = null,
      background_type = p_data->>'background_type',
      background_value = p_data->>'background_value',
      card_transparency = (p_data->>'card_transparency')::numeric,
      card_outline_color = p_data->>'card_outline_color',
      card_outline_width = (p_data->>'card_outline_width')::int,
      font_family = p_data->>'font_family',
      font_scale = (p_data->>'font_scale')::numeric
    where user_id = v_user;

  end if;

end;
$$;

-- =====================================================
-- RLS
-- =====================================================
alter table public.user_theme_settings enable row level security;
alter table public.theme_presets enable row level security;

-- user theme
create policy "select own theme"
on public.user_theme_settings
for select using (auth.uid() = user_id);

create policy "insert own theme"
on public.user_theme_settings
for insert with check (auth.uid() = user_id);

create policy "update own theme"
on public.user_theme_settings
for update using (auth.uid() = user_id);

create policy "delete own theme"
on public.user_theme_settings
for delete using (auth.uid() = user_id);

-- preset read only
create policy "read presets"
on public.theme_presets
for select using (true);

create policy "no insert preset"
on public.theme_presets
for insert with check (false);

create policy "no update preset"
on public.theme_presets
for update using (false);

create policy "no delete preset"
on public.theme_presets
for delete using (false);
