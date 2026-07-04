ALTER TABLE `singles` MODIFY COLUMN `religiosity` enum('secular','traditional','religious','orthodox','datlash');--> statement-breakpoint
ALTER TABLE `singles` ADD `shomerShabbat` boolean;