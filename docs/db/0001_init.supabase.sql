-- Timetable v1 — 기반 스키마
-- 실행: Supabase 대시보드 → SQL Editor 에 붙여넣고 Run
-- 접근은 전부 서버(service role)를 경유한다. RLS는 켜되 정책을 만들지 않아 anon 키로는 아무것도 읽히지 않는다.

create extension if not exists pgcrypto;

-- ── 스페이스 (v1에서는 1개 고정) ─────────────────────────────
create table if not exists spaces (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  created_at timestamptz not null default now()
);

insert into spaces (id, slug, name)
values ('00000000-0000-4000-8000-000000000001', 'default', '우리 모임')
on conflict (id) do nothing;

-- ── 멤버 (개인정보 없음: 표시명 + PIN 해시) ──────────────────
create table if not exists members (
  id              uuid primary key default gen_random_uuid(),
  space_id        uuid not null references spaces(id) on delete cascade,
  display_name    text not null,
  pin_hash        text not null,
  role            text not null default 'member' check (role in ('admin','member')),
  color           text not null default 'indigo',
  session_version int  not null default 1,
  is_active       boolean not null default true,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  unique (space_id, display_name)
);
create index if not exists members_space_idx on members (space_id, is_active);

-- ── 고정 일정(학기 시간표) — 가입 시 1회 등록, 계정에 계속 남는다 ──
create table if not exists member_schedules (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references spaces(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  label      text not null default '내 시간표',
  source     text not null default 'image' check (source in ('image','manual')),
  -- uploaded : 이미지 등록 완료, 아직 분석 전 (v1 종료 지점)
  -- parsed   : VLM 분석 완료 (v2)
  -- manual   : 직접 입력
  status     text not null default 'uploaded' check (status in ('uploaded','parsed','manual')),
  image_path text,                    -- Storage 경로. 분석 기능 도입 후에는 폐기 예정
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists member_schedules_member_idx on member_schedules (member_id, is_active);

-- ── 분석 결과가 들어갈 자리 (v1에서는 비어 있음) ───────────────
create table if not exists member_schedule_blocks (
  id          uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references member_schedules(id) on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6),   -- 0=월 … 6=일
  start_min   int not null check (start_min between 0 and 1440),   -- 자정 기준 분
  end_min     int not null check (end_min   between 0 and 1440),
  title       text,
  confidence  text not null default 'high' check (confidence in ('high','low')),
  check (start_min < end_min)
);
create index if not exists schedule_blocks_idx on member_schedule_blocks (schedule_id, weekday);

-- ── PIN 무차별 대입 방지 ────────────────────────────────────
create table if not exists login_attempts (
  space_id     uuid not null references spaces(id) on delete cascade,
  display_name text not null,
  fail_count   int not null default 0,
  locked_until timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (space_id, display_name)
);

-- ── RLS: 전면 차단 (service role만 통과) ────────────────────
alter table spaces                 enable row level security;
alter table members                enable row level security;
alter table member_schedules       enable row level security;
alter table member_schedule_blocks enable row level security;
alter table login_attempts         enable row level security;

-- ── 비공개 스토리지 버킷 ────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('timetables', 'timetables', false)
on conflict (id) do nothing;
