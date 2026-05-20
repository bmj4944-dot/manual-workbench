-- Quick verification queries — run after seed.sql to confirm row counts.
-- Expected counts in comments. Adjust as schema grows.

select 'profiles'              as tbl, count(*) as n from profiles            -- 8 (5 users + 3 teams)
union all
select 'documents',                    count(*)      from documents           -- 35 (4 chapter + 10 section + 21 item)
union all
select 'document_content',             count(*)      from document_content    -- 6 (3 full + 3 PDF)
union all
select 'comments',                     count(*)      from comments            -- 4
union all
select 'must_read_documents',          count(*)      from must_read_documents -- 3
union all
select 'whats_new',                    count(*)      from whats_new           -- 4
union all
select 'page_stats',                   count(*)      from page_stats          -- 9
union all
select 'verifications',                count(*)      from verifications       -- 10
union all
select 'cases',                        count(*)      from cases               -- 4
union all
select 'case_transcript_lines',        count(*)      from case_transcript_lines -- 21
union all
select 'case_lessons',                 count(*)      from case_lessons        -- 12
union all
select 'onboarding_tasks',             count(*)      from onboarding_tasks    -- 7
union all
select 'onboarding_questions',         count(*)      from onboarding_questions -- 5
union all
select 'document_versions',            count(*)      from document_versions   -- 3
union all
select 'compliance_records',           count(*)      from compliance_records  -- 9
order by tbl;

-- Sanity: documents tree integrity
select type, count(*) from documents group by type order by type;
-- expected: chapter=4, section=10, item=21

-- Sanity: first chapter children
select id, label, type, sort_order
from documents
where parent_id = 'ch1'
order by sort_order;
