export const schemaSql = `
create table if not exists daily_snapshots (
  snapshot_date text not null,
  slug text not null,
  name text not null,
  icon text,
  source_rank integer,
  revenue_total real not null,
  revenue_last_30_days real,
  growth_30d real,
  created_at text not null default current_timestamp,
  primary key (snapshot_date, slug)
);

create table if not exists startup_details (
  slug text primary key,
  description text,
  target_audience text,
  on_sale integer,
  asking_price text,
  tech_stack_json text,
  updated_at text not null
);

create table if not exists leaderboard_runs (
  snapshot_date text primary key,
  leaderboard_json text not null,
  playback_json text not null,
  created_at text not null
);
`;
