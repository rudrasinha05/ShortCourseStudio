-- A verified fee now enrolls the student. Enroll applications whose fee was verified before this
-- rule, unless an administrator already declined, revoked or reviewed them. Test captures are
-- included; the app counts them as enrolled only while the site runs in test mode.
UPDATE applications
SET review_state = 'accepted', class_access = 1
WHERE payment_state IN ('paid', 'test_paid')
  AND payment_id IS NOT NULL
  AND review_state IN ('submitted', 'under_review')
  AND class_access = 0;
