create type notification_kind as enum (
  'due_soon', 'overdue', 'member_paid', 'payout_upcoming', 'payout_received', 'circle_started', 'member_joined'
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  kind notification_kind not null,
  title text not null,
  body text not null,
  group_id uuid references groups (id) on delete cascade,
  dedupe_key text,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (profile_id, dedupe_key)
);

create index idx_notifications_profile on notifications (profile_id, created_at desc);

alter table notifications enable row level security;

create policy "users can read their own notifications" on notifications
  for select using (auth.uid() = profile_id);

create policy "users can mark their own notifications read" on notifications
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

alter publication supabase_realtime add table notifications;

alter table profiles add column email_reminders boolean not null default true;

create function public.naira(kobo bigint)
returns text
language sql
immutable
as $$
  select '₦' || to_char(kobo / 100.0, 'FM999,999,999,990')
$$;

create function public.lagos_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'Africa/Lagos')::date
$$;

create function public.notify(
  target uuid, k notification_kind, t text, b text, g uuid, key text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into notifications (profile_id, kind, title, body, group_id, dedupe_key)
  values (target, k, t, b, g, key)
  on conflict (profile_id, dedupe_key) do nothing
$$;

revoke execute on function public.notify(uuid, notification_kind, text, text, uuid, text) from public, anon, authenticated;

create function public.on_contribution_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payer group_members;
  payer_name text;
  cyc cycles;
  g groups;
  recipient_profile uuid;
  msg_title text;
  msg_body text;
begin
  if old.status = 'paid' or new.status <> 'paid' then
    return new;
  end if;

  select * into payer from group_members where id = new.member_id;
  select coalesce(nullif(full_name, ''), 'A member') into payer_name from profiles where id = payer.profile_id;
  select * into cyc from cycles where id = new.cycle_id;
  select * into g from groups where id = cyc.group_id;
  select profile_id into recipient_profile from group_members where id = cyc.recipient_member_id;

  msg_title := payer_name || ' paid';
  msg_body := naira(new.amount_kobo) || ' for ' || g.name || ' · cycle ' || cyc.cycle_number;

  if g.created_by <> payer.profile_id and auth.uid() is distinct from g.created_by then
    perform notify(g.created_by, 'member_paid', msg_title, msg_body, g.id, 'paid:' || new.id);
  end if;
  if recipient_profile <> payer.profile_id and recipient_profile <> g.created_by then
    perform notify(recipient_profile, 'member_paid', msg_title, msg_body, g.id, 'paid:' || new.id);
  end if;

  return new;
end;
$$;

create trigger notify_contribution_paid
  after update on contributions
  for each row execute function public.on_contribution_paid();

create function public.on_member_joined()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g groups;
  joiner_name text;
  filled int;
begin
  select * into g from groups where id = new.group_id;
  if g.created_by = new.profile_id then
    return new;
  end if;

  select coalesce(nullif(full_name, ''), 'Someone') into joiner_name from profiles where id = new.profile_id;
  select count(*) into filled from group_members where group_id = new.group_id;

  perform notify(
    g.created_by, 'member_joined', joiner_name || ' joined ' || g.name,
    filled || ' of ' || g.member_count || ' spots filled', g.id, 'joined:' || new.id
  );
  return new;
end;
$$;

create trigger notify_member_joined
  after insert on group_members
  for each row execute function public.on_member_joined();

create function public.on_circle_started()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
begin
  if old.status <> 'draft' or new.status <> 'active' then
    return new;
  end if;

  for m in
    select gm.profile_id, c.cycle_number, c.due_date,
           (select due_date from cycles where group_id = new.id and cycle_number = 1) as first_due
    from group_members gm
    join cycles c on c.recipient_member_id = gm.id
    where gm.group_id = new.id
  loop
    perform notify(
      m.profile_id, 'circle_started', new.name || ' has started',
      'First ' || naira(new.contribution_amount_kobo) || ' due ' || to_char(m.first_due, 'FMDD Mon')
        || '. You receive the pot in cycle ' || m.cycle_number || ' (' || to_char(m.due_date, 'FMDD Mon') || ').',
      new.id, 'started:' || new.id
    );
  end loop;
  return new;
end;
$$;

create trigger notify_circle_started
  after update on groups
  for each row execute function public.on_circle_started();

create function public.on_cycle_paid_out()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g groups;
  recipient_profile uuid;
  pot bigint;
begin
  if old.paid_out or not new.paid_out then
    return new;
  end if;

  select * into g from groups where id = new.group_id;
  select profile_id into recipient_profile from group_members where id = new.recipient_member_id;
  select coalesce(sum(amount_kobo), 0) into pot from contributions where cycle_id = new.id and status = 'paid';

  perform notify(
    recipient_profile, 'payout_received', 'You received your payout',
    naira(pot) || ' from ' || g.name || ' is in your wallet.', g.id, 'received:' || new.id
  );
  return new;
end;
$$;

create trigger notify_cycle_paid_out
  after update on cycles
  for each row execute function public.on_cycle_paid_out();

create function public.generate_reminders(target uuid default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := lagos_today();
  r record;
  created int := 0;
begin
  for r in
    select c.id, c.amount_kobo, gm.profile_id, g.id as group_id, g.name, cyc.cycle_number, cyc.due_date
    from contributions c
    join cycles cyc on cyc.id = c.cycle_id
    join groups g on g.id = cyc.group_id
    join group_members gm on gm.id = c.member_id
    where g.status = 'active'
      and cyc.cycle_number = g.current_cycle
      and not cyc.paid_out
      and c.status <> 'paid'
      and cyc.due_date <= today + 1
      and (target is null or gm.profile_id = target)
  loop
    if r.due_date >= today then
      perform notify(
        r.profile_id, 'due_soon',
        'Your ' || naira(r.amount_kobo) || ' is due ' || case when r.due_date = today then 'today' else 'tomorrow' end,
        r.name || ' · cycle ' || r.cycle_number, r.group_id, 'due:' || r.id
      );
    else
      perform notify(
        r.profile_id, 'overdue', 'Your ' || naira(r.amount_kobo) || ' is overdue',
        r.name || ' · was due ' || to_char(r.due_date, 'FMDD Mon'), r.group_id, 'overdue:' || r.id
      );
    end if;
    created := created + 1;
  end loop;

  for r in
    select cyc.id, cyc.due_date, gm.profile_id, g.id as group_id, g.name,
           g.contribution_amount_kobo * g.member_count as pot
    from cycles cyc
    join groups g on g.id = cyc.group_id
    join group_members gm on gm.id = cyc.recipient_member_id
    where g.status = 'active'
      and cyc.cycle_number = g.current_cycle
      and not cyc.paid_out
      and cyc.due_date between today and today + 7
      and (target is null or gm.profile_id = target)
  loop
    perform notify(
      r.profile_id, 'payout_upcoming', 'You receive the pot this week',
      naira(r.pot) || ' from ' || r.name || ' on ' || to_char(r.due_date, 'FMDD Mon'), r.group_id, 'payout:' || r.id
    );
    created := created + 1;
  end loop;

  return created;
end;
$$;

revoke execute on function public.generate_reminders(uuid) from public, anon, authenticated;

create function public.refresh_my_reminders()
returns void
language sql
security definer
set search_path = public
as $$
  select public.generate_reminders(auth.uid())
$$;

grant execute on function public.refresh_my_reminders() to authenticated;
