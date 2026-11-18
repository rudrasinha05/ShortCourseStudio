-- Remove only the four manually verified dummy applications from the pre-launch checks.
-- Foreign keys cascade to related billing, notes, support, and learning rows.
DELETE FROM applications
WHERE id IN ('SCS-1F3FE63695C74ED3B607', 'SCS-20C70B75F7AC45028DF4', 'SCS-34CCBBA648A145968160', 'SCS-C992920362A24A3B8F74')
  AND slug = 'c-by-horesh-sir'
  AND batch = 'batch-1'
  AND payment_state = 'unpaid'
  AND review_state = 'submitted'
  AND class_access = 0
  AND order_id IS NULL
  AND payment_id IS NULL
  AND student_user_id IS NULL
  AND submitted_by_user_id IS NULL;
