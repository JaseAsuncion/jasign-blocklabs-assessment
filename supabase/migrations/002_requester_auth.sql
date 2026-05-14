-- Link documents to the authenticated requester (Supabase Auth).
-- Run in Supabase SQL Editor after 001_documents.sql.

alter table public.documents
  add column if not exists requester_id uuid references auth.users (id) on delete set null;

create index if not exists documents_requester_id_idx on public.documents (requester_id);

comment on column public.documents.requester_id is 'User who created the signature request (nullable for legacy rows).';
