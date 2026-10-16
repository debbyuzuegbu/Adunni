create type wallet_transaction_kind as enum ('top_up', 'contribution', 'payout');

create table wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  kind wallet_transaction_kind not null,
  amount_kobo bigint not null,
  balance_after_kobo bigint not null,
  reference text not null,
  description text not null,
  group_id uuid references groups (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_wallet_transactions_profile on wallet_transactions (profile_id, created_at desc);

alter table wallet_transactions enable row level security;

create policy "users can read their own wallet transactions" on wallet_transactions
  for select using (auth.uid() = profile_id);

alter table contributions add column reference text;

drop policy "members can pay their own contribution" on contributions;

create function public.guard_profile_wallet()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated' and new.wallet_balance_kobo <> old.wallet_balance_kobo then
    raise exception 'Wallet balance can''t be changed directly';
  end if;
  return new;
end;
$$;

create trigger guard_profile_wallet
  before update on profiles
  for each row execute function public.guard_profile_wallet();

create function public.mock_reference(prefix text)
returns text
language sql
volatile
as $$
  select prefix || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 10))
$$;

create function public.mock_top_up_wallet(amount_kobo bigint)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  p profiles;
begin
  if amount_kobo <= 0 then
    raise exception 'Enter an amount greater than zero';
  end if;
  if amount_kobo > 100000000 then
    raise exception 'Test top-ups are limited to ₦1,000,000 at a time';
  end if;

  update profiles
  set wallet_balance_kobo = wallet_balance_kobo + amount_kobo
  where id = auth.uid()
  returning * into p;

  insert into wallet_transactions (profile_id, kind, amount_kobo, balance_after_kobo, reference, description)
  values (p.id, 'top_up', amount_kobo, p.wallet_balance_kobo, public.mock_reference('TOP'), 'Wallet top-up (test)');

  return p;
end;
$$;

create function public.mock_pay_contribution(target_contribution uuid, pay_method payment_method)
returns contributions
language plpgsql
security definer
set search_path = public
as $$
declare
  c contributions;
  m group_members;
  cyc cycles;
  g groups;
  p profiles;
  ref text;
begin
  select * into c from contributions where id = target_contribution for update;
  if c.id is null then
    raise exception 'Contribution not found';
  end if;

  select * into m from group_members where id = c.member_id;
  if m.profile_id <> auth.uid() then
    raise exception 'You can only pay your own contribution';
  end if;
  if c.status = 'paid' then
    raise exception 'This contribution is already paid';
  end if;

  select * into cyc from cycles where id = c.cycle_id;
  select * into g from groups where id = cyc.group_id;
  if g.status <> 'active' or cyc.paid_out then
    raise exception 'This cycle is closed';
  end if;
  if cyc.cycle_number > g.current_cycle then
    raise exception 'This contribution isn''t due yet';
  end if;

  ref := public.mock_reference('ADN');

  if pay_method = 'wallet' then
    select * into p from profiles where id = auth.uid() for update;
    if p.wallet_balance_kobo < c.amount_kobo then
      raise exception 'Not enough money in your wallet. Top up and try again.';
    end if;

    update profiles
    set wallet_balance_kobo = wallet_balance_kobo - c.amount_kobo
    where id = auth.uid()
    returning * into p;

    insert into wallet_transactions (profile_id, kind, amount_kobo, balance_after_kobo, reference, description, group_id)
    values (p.id, 'contribution', -c.amount_kobo, p.wallet_balance_kobo, ref,
            g.name || ' · cycle ' || cyc.cycle_number, g.id);
  end if;

  update contributions
  set status = 'paid', method = pay_method, paid_at = now(), reference = ref
  where id = target_contribution
  returning * into c;

  return c;
end;
$$;

create or replace function public.complete_current_cycle(target_group uuid)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  g groups;
  cyc cycles;
  recipient_profile uuid;
  pot bigint;
  p profiles;
begin
  g := public.require_group_creator(target_group);
  if g.status <> 'active' then
    raise exception 'This circle isn''t active';
  end if;

  select * into cyc from cycles
  where group_id = target_group and cycle_number = g.current_cycle
  for update;

  select coalesce(sum(amount_kobo), 0) into pot
  from contributions where cycle_id = cyc.id and status = 'paid';

  if pot > 0 then
    select profile_id into recipient_profile from group_members where id = cyc.recipient_member_id;

    update profiles
    set wallet_balance_kobo = wallet_balance_kobo + pot
    where id = recipient_profile
    returning * into p;

    insert into wallet_transactions (profile_id, kind, amount_kobo, balance_after_kobo, reference, description, group_id)
    values (p.id, 'payout', pot, p.wallet_balance_kobo, public.mock_reference('PAY'),
            g.name || ' · cycle ' || cyc.cycle_number || ' payout', g.id);
  end if;

  update cycles set paid_out = true where id = cyc.id;

  if g.current_cycle >= g.member_count then
    update groups set status = 'completed' where id = target_group returning * into g;
  else
    update groups set current_cycle = current_cycle + 1 where id = target_group returning * into g;
  end if;

  return g;
end;
$$;

grant execute on function public.mock_top_up_wallet(bigint) to authenticated;
grant execute on function public.mock_pay_contribution(uuid, payment_method) to authenticated;
