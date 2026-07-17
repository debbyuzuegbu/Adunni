-- Adunni: digital ajo/esusu savings circles
-- Core schema: profiles, groups, membership, cycles, contributions

create extension if not exists "pgcrypto";

-- One row per authenticated user, mirrors auth.users
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text unique,
  wallet_balance_kobo bigint not null default 0 check (wallet_balance_kobo >= 0),
  created_at timestamptz not null default now()
);

create type group_status as enum ('draft', 'active', 'completed', 'cancelled');
create type contribution_frequency as enum ('weekly', 'monthly');

-- A savings circle ("Owanbe Fund", "Rent Support - Yaba 6", etc.)
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references profiles (id),
  contribution_amount_kobo bigint not null check (contribution_amount_kobo > 0),
  frequency contribution_frequency not null,
  member_count int not null check (member_count > 1),
  status group_status not null default 'draft',
  current_cycle int not null default 1,
  payout_order_locked boolean not null default false,
  created_at timestamptz not null default now()
);

-- Membership + each member's position in the payout rotation
create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  profile_id uuid not null references profiles (id),
  payout_position int, -- null until rotation order is locked
  joined_at timestamptz not null default now(),
  unique (group_id, profile_id),
  unique (group_id, payout_position)
);

-- One row per rotation cycle for a group (who receives the pot)
create table cycles (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  cycle_number int not null,
  recipient_member_id uuid not null references group_members (id),
  due_date date not null,
  paid_out boolean not null default false,
  created_at timestamptz not null default now(),
  unique (group_id, cycle_number)
);

create type contribution_status as enum ('pending', 'paid', 'failed');
create type payment_method as enum ('wallet', 'bank_transfer');

-- One row per member per cycle: did they pay their contribution
create table contributions (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references cycles (id) on delete cascade,
  member_id uuid not null references group_members (id),
  amount_kobo bigint not null check (amount_kobo > 0),
  method payment_method,
  status contribution_status not null default 'pending',
  paid_at timestamptz,
  unique (cycle_id, member_id)
);

create index idx_group_members_group on group_members (group_id);
create index idx_cycles_group on cycles (group_id);
create index idx_contributions_cycle on contributions (cycle_id);
create index idx_contributions_member on contributions (member_id);

-- Row Level Security
alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table cycles enable row level security;
alter table contributions enable row level security;

create policy "profiles are self-readable" on profiles
  for select using (auth.uid() = id);
create policy "profiles are self-updatable" on profiles
  for update using (auth.uid() = id);
create policy "profiles insertable by owner" on profiles
  for insert with check (auth.uid() = id);

create policy "members can read their groups" on groups
  for select using (
    exists (
      select 1 from group_members gm
      where gm.group_id = groups.id and gm.profile_id = auth.uid()
    )
  );
create policy "authenticated users can create groups" on groups
  for insert with check (auth.uid() = created_by);
create policy "group creator can update group" on groups
  for update using (auth.uid() = created_by);

create policy "members can read their group's membership" on group_members
  for select using (
    exists (
      select 1 from group_members gm2
      where gm2.group_id = group_members.group_id and gm2.profile_id = auth.uid()
    )
  );
create policy "users can join a group" on group_members
  for insert with check (auth.uid() = profile_id);

create policy "members can read their group's cycles" on cycles
  for select using (
    exists (
      select 1 from group_members gm
      where gm.group_id = cycles.group_id and gm.profile_id = auth.uid()
    )
  );

create policy "members can read their group's contributions" on contributions
  for select using (
    exists (
      select 1 from group_members gm
      join cycles c on c.group_id = gm.group_id
      where c.id = contributions.cycle_id and gm.profile_id = auth.uid()
    )
  );
create policy "members can pay their own contribution" on contributions
  for update using (
    exists (
      select 1 from group_members gm
      where gm.id = contributions.member_id and gm.profile_id = auth.uid()
    )
  );

-- Auto-create a profile row whenever a new auth user signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.phone
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
