-- Preserve wishes and related memories when removed from the active list.
alter table public.wishes
  add column latitude double precision,
  add column longitude double precision,
  add column deleted_at timestamptz,
  add constraint wishes_coordinates_valid check (
    (latitude is null and longitude is null) or
    (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180)
  );
-- Existing member-only SELECT/UPDATE policies and grants apply to these columns.
