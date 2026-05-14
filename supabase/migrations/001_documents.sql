-- Jasign MVP: documents table + optional RLS note
-- Run in Supabase SQL Editor (or via CLI migrations if you use them).

create extension if not exists "pgcrypto";

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  pdf_url text not null,
  signer_name text not null,
  signer_email text not null,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'signed', 'expired')),
  signed_pdf_url text,
  created_at timestamptz not null default now()
);

create index if not exists documents_token_idx on public.documents (token);
create index if not exists documents_status_idx on public.documents (status);

comment on table public.documents is 'E-sign MVP: one row per signature request.';

-- Storage (create in Dashboard → Storage):
-- Bucket: documents (public) — original PDFs
-- Bucket: signed (public) — signed PDFs
--
-- If you use public buckets, store full object public URLs in pdf_url / signed_pdf_url.
-- For production, prefer private buckets + short-lived signed URLs and RLS policies.
