-- Extend challenge end_date by 4 weeks
-- Challenge: b97dffd0-237c-40f0-8857-939044f54562
-- Run on production after merge

UPDATE challenges
SET end_date = end_date + INTERVAL '4 weeks'
WHERE id = 'b97dffd0-237c-40f0-8857-939044f54562';
