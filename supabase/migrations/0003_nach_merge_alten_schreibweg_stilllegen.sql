-- ERST NACH DEM MERGE AUSFUEHREN (die alte Produktionsversion nutzt diese Funktion noch).
-- Alter Schreibweg mit gekoppelter Einwilligung wird stillgelegt; geo_leads bleibt als Archiv, nur fuer Admins lesbar.
revoke execute on function public.geo_lead_einfuegen(text,text,text,text,int,text,text,boolean) from anon, authenticated, public;
