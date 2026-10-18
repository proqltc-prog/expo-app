-- WEEK-84: stijlen-check gelijk trekken met de stijl-check (ook klassiek en aziatisch)
alter table recepten drop constraint recepten_stijlen_geldig;
alter table recepten add constraint recepten_stijlen_geldig check (
  stijlen <@ array['klassiek','italiaans','aziatisch','mexicaans','mediterraan','thais','japans','koreaans','frans','belgisch','indiaas','chinees','hartig','zoet']::text[]
);
