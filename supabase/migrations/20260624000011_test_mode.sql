-- Test Mode: global switch + per-entity test flag.

create table if not exists app_settings (
  id         int primary key default 1 check (id = 1),
  test_mode  boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into app_settings (id, test_mode) values (1, false)
  on conflict (id) do nothing;

alter table startups     add column if not exists is_test boolean not null default false;
alter table accelerators add column if not exists is_test boolean not null default false;
alter table evaluators   add column if not exists is_test boolean not null default false;
alter table investors    add column if not exists is_test boolean not null default false;
alter table competitions add column if not exists is_test boolean not null default false;
