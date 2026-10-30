-- Owner-approved free signup is distinct from payment and database entitlement.
-- Existing values and their enum order are retained; no row updates are performed.
ALTER TABLE `live_october_tickets`
  MODIFY COLUMN `source` enum('database_live','plus','friends','standalone','open_registration') NOT NULL;
