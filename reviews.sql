create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id text not null,
  rating integer not null check (rating between 1 and 5),
  reviewer_name text not null default 'Cliente',
  comment text not null,
  approved boolean not null default false
);

alter table public.reviews enable row level security;

drop policy if exists "public insert reviews" on public.reviews;
create policy "public insert reviews" on public.reviews for insert to anon
with check (rating between 1 and 5 and length(trim(comment)) between 5 and 500 and length(trim(reviewer_name)) between 1 and 80);

drop policy if exists "public read approved reviews" on public.reviews;
create policy "public read approved reviews" on public.reviews for select to anon using (approved = true);

drop policy if exists "authenticated manage reviews" on public.reviews;
drop policy if exists "Solo cuenta autorizada administra reseñas" on public.reviews;
create policy "Solo cuenta autorizada administra reseñas" on public.reviews for all to authenticated
using (auth.uid() = '8539051d-525a-4c5c-ab9b-a7fff207df7c'::uuid)
with check (auth.uid() = '8539051d-525a-4c5c-ab9b-a7fff207df7c'::uuid);

create index if not exists reviews_product_idx on public.reviews(product_id);
create index if not exists reviews_approved_idx on public.reviews(approved, created_at desc);
