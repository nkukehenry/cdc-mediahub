-- Adjust folder and related tables to use VARCHAR(191) for UUID columns

ALTER TABLE folders
  MODIFY id VARCHAR(191) NOT NULL,
  MODIFY parent_id VARCHAR(191) NULL,
  MODIFY user_id VARCHAR(191) NULL;

ALTER TABLE files
  MODIFY id VARCHAR(191) NOT NULL,
  MODIFY folder_id VARCHAR(191) NULL,
  MODIFY user_id VARCHAR(191) NULL;

ALTER TABLE folder_shares
  MODIFY id VARCHAR(191) NOT NULL,
  MODIFY folder_id VARCHAR(191) NOT NULL,
  MODIFY shared_with_user_id VARCHAR(191) NULL;

ALTER TABLE file_shares
  MODIFY id VARCHAR(191) NOT NULL,
  MODIFY file_id VARCHAR(191) NOT NULL,
  MODIFY shared_with_user_id VARCHAR(191) NULL;

ALTER TABLE post_attachments
  MODIFY file_id VARCHAR(191) NOT NULL;
