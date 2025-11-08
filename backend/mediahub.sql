-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 08, 2025 at 11:21 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `file_manager`
--

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `cover_image` varchar(191) DEFAULT NULL,
  `show_on_menu` tinyint(1) NOT NULL DEFAULT 1,
  `menu_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `cover_image`, `show_on_menu`, `menu_order`, `created_at`, `updated_at`) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Videos', 'videos', NULL, NULL, 1, 0, '2025-11-03 19:32:40.387', '2025-11-03 19:32:40.387'),
('550e8400-e29b-41d4-a716-446655440002', 'Audios', 'audios', NULL, NULL, 1, 0, '2025-11-03 19:32:40.393', '2025-11-03 19:32:40.393'),
('550e8400-e29b-41d4-a716-446655440003', 'Photos', 'photos', NULL, NULL, 1, 0, '2025-11-03 19:32:40.401', '2025-11-03 19:32:40.401'),
('550e8400-e29b-41d4-a716-446655440004', 'Infographics', 'infographics', NULL, NULL, 1, 0, '2025-11-03 19:32:40.406', '2025-11-03 19:32:40.406'),
('550e8400-e29b-41d4-a716-446655440005', 'Documents', 'documents', NULL, NULL, 1, 0, '2025-11-03 19:32:40.413', '2025-11-03 19:32:40.413'),
('550e8400-e29b-41d4-a716-446655440006', 'Other', 'other', NULL, NULL, 1, 0, '2025-11-03 19:32:40.418', '2025-11-03 19:32:40.418');

-- --------------------------------------------------------

--
-- Table structure for table `category_subcategories`
--

CREATE TABLE `category_subcategories` (
  `id` varchar(191) NOT NULL,
  `category_id` varchar(191) NOT NULL,
  `subcategory_id` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `files`
--

CREATE TABLE `files` (
  `id` varchar(191) NOT NULL,
  `filename` varchar(191) NOT NULL,
  `original_name` varchar(191) NOT NULL,
  `file_path` varchar(191) NOT NULL,
  `thumbnail_path` varchar(191) DEFAULT NULL,
  `file_size` bigint(20) NOT NULL,
  `mime_type` varchar(191) NOT NULL,
  `folder_id` varchar(191) DEFAULT NULL,
  `user_id` varchar(191) DEFAULT NULL,
  `access_type` varchar(191) DEFAULT 'private',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `files`
--

INSERT INTO `files` (`id`, `filename`, `original_name`, `file_path`, `thumbnail_path`, `file_size`, `mime_type`, `folder_id`, `user_id`, `access_type`, `created_at`, `updated_at`) VALUES
('5c5d368c-0933-4a40-a37f-cd807f703036', '17d1c5ef-9cce-4baa-9717-bbade272f01a.png', 'screencapture-demo-beetube-me-pro-light-elementor-2025-11-04-08_40_07.png', 'uploads\\55fca0f8-cf37-4968-8f05-b4b560cae0c9\\17d1c5ef-9cce-4baa-9717-bbade272f01a.png', 'thumbnails\\thumb_17d1c5ef-9cce-4baa-9717-bbade272f01a.png', 4279004, 'image/png', '0dea9fe1-91af-4600-a1f2-103fa1461e6f', '20000000-0000-0000-0000-000000000001', 'shared', '2025-11-08 03:30:54.558', '2025-11-08 04:10:01.209'),
('6755be60-c18d-400a-b49d-f783342ccbe3', 'ed5a2af9-6ed8-4439-9372-4af6aee58aaa.mp4', 'WhatsApp Video 2025-09-20 at 10.48.58 AM.mp4', 'uploads\\55fca0f8-cf37-4968-8f05-b4b560cae0c9\\ed5a2af9-6ed8-4439-9372-4af6aee58aaa.mp4', '', 8026635, 'video/mp4', '851f53a9-fb14-4743-832d-ac1121272026', '20000000-0000-0000-0000-000000000001', 'public', '2025-11-08 03:32:59.021', '2025-11-08 04:09:55.279'),
('86cec2e5-14e0-42ca-b173-304c5386c35b', 'd7597aaf-0b83-414d-849b-74755e12f5a5.png', 'mediaby.png', 'uploads\\0dea9fe1-91af-4600-a1f2-103fa1461e6f\\d7597aaf-0b83-414d-849b-74755e12f5a5.png', 'thumbnails\\thumb_d7597aaf-0b83-414d-849b-74755e12f5a5.png', 2627139, 'image/png', '0dea9fe1-91af-4600-a1f2-103fa1461e6f', '20000000-0000-0000-0000-000000000001', 'public', '2025-11-08 04:10:42.048', '2025-11-08 04:51:15.570'),
('d91bebb8-d1b8-4d94-bd26-1cda7ed41213', 'b9be9250-d6f5-4797-8ec7-676db808255c.jpg', 'avatar.jpg', 'uploads\\b9be9250-d6f5-4797-8ec7-676db808255c.jpg', 'thumbnails\\thumb_b9be9250-d6f5-4797-8ec7-676db808255c.jpg', 73199, 'image/jpeg', NULL, '1685f335-0fc5-44bc-bd7b-e2e6a4252325', 'private', '2025-11-08 05:23:44.123', '2025-11-08 05:23:44.123'),
('de62db0c-37e2-4e76-b78b-8f0be8baf0a3', '7c09523c-905f-4db8-bb9f-ba1d17025ce9.jpg', 'dg.jpg', 'uploads\\b29ccd31-a57a-4c1f-a2e2-e613dad4018d\\7c09523c-905f-4db8-bb9f-ba1d17025ce9.jpg', 'thumbnails\\thumb_7c09523c-905f-4db8-bb9f-ba1d17025ce9.jpg', 125279, 'image/jpeg', 'b29ccd31-a57a-4c1f-a2e2-e613dad4018d', '3b9c6704-4157-433a-ae83-83a595f4a00b', 'private', '2025-11-08 07:01:55.813', '2025-11-08 07:01:55.813');

-- --------------------------------------------------------

--
-- Table structure for table `file_shares`
--

CREATE TABLE `file_shares` (
  `id` varchar(191) NOT NULL,
  `file_id` varchar(191) NOT NULL,
  `shared_with_user_id` varchar(191) DEFAULT NULL,
  `access_level` varchar(191) DEFAULT 'read',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `file_shares`
--

INSERT INTO `file_shares` (`id`, `file_id`, `shared_with_user_id`, `access_level`, `created_at`) VALUES
('0d6a7a74-8d73-4d78-889b-bd1f678b26e7', '5c5d368c-0933-4a40-a37f-cd807f703036', '30000000-0000-0000-0000-000000000002', 'read', '2025-11-08 04:10:23.469');

-- --------------------------------------------------------

--
-- Table structure for table `folders`
--

CREATE TABLE `folders` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `parent_id` varchar(191) DEFAULT NULL,
  `user_id` varchar(191) DEFAULT NULL,
  `access_type` varchar(191) DEFAULT 'private',
  `is_public` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `folders`
--

INSERT INTO `folders` (`id`, `name`, `parent_id`, `user_id`, `access_type`, `is_public`, `created_at`, `updated_at`) VALUES
('0dea9fe1-91af-4600-a1f2-103fa1461e6f', 'Images', '8b89976b-33c1-4ada-a5a9-8e67a91e6c33', NULL, 'public', 1, '2025-11-03 19:32:40.435', '2025-11-03 19:32:40.435'),
('143cfb1f-53b0-46ac-8d09-c65a03af7017', 'Audios', '8b89976b-33c1-4ada-a5a9-8e67a91e6c33', NULL, 'public', 1, '2025-11-03 19:32:40.446', '2025-11-03 19:32:40.446'),
('1c2d40ec-a71f-4d28-9677-64409d90522e', 'Documents', '8b89976b-33c1-4ada-a5a9-8e67a91e6c33', NULL, 'public', 1, '2025-11-03 19:32:40.451', '2025-11-03 19:32:40.451'),
('2d26d81f-42a6-4a58-8204-860c09a72a21', 'Audios', '0dea9fe1-91af-4600-a1f2-103fa1461e6f', NULL, 'public', 1, '2025-11-08 08:20:21.000', '2025-11-08 08:20:21.000'),
('73c8db9f-1eb0-4500-8e33-03bb573cd53c', 'Documents', '0dea9fe1-91af-4600-a1f2-103fa1461e6f', NULL, 'public', 1, '2025-11-08 08:20:21.000', '2025-11-08 08:20:21.000'),
('7d8a993d-a319-467d-a620-72195018001f', 'Images', '0dea9fe1-91af-4600-a1f2-103fa1461e6f', NULL, 'public', 1, '2025-11-08 08:20:21.000', '2025-11-08 08:20:21.000'),
('851f53a9-fb14-4743-832d-ac1121272026', 'Videos', '8b89976b-33c1-4ada-a5a9-8e67a91e6c33', NULL, 'public', 1, '2025-11-03 19:32:40.440', '2025-11-03 19:32:40.440'),
('8b89976b-33c1-4ada-a5a9-8e67a91e6c33', 'Public', NULL, NULL, 'public', 1, '2025-11-03 19:32:40.424', '2025-11-03 19:32:40.424'),
('b29ccd31-a57a-4c1f-a2e2-e613dad4018d', 'Henry', NULL, '3b9c6704-4157-433a-ae83-83a595f4a00b', 'private', 0, '2025-11-08 07:01:40.518', '2025-11-08 07:01:40.518'),
('c4ce6174-af38-4caa-a627-bccfa7aebdba', 'Videos', '0dea9fe1-91af-4600-a1f2-103fa1461e6f', NULL, 'public', 1, '2025-11-08 08:20:21.000', '2025-11-08 08:20:21.000');

-- --------------------------------------------------------

--
-- Table structure for table `folder_shares`
--

CREATE TABLE `folder_shares` (
  `id` varchar(191) NOT NULL,
  `folder_id` varchar(191) NOT NULL,
  `shared_with_user_id` varchar(191) DEFAULT NULL,
  `access_level` varchar(191) DEFAULT 'write',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `nav_links`
--

CREATE TABLE `nav_links` (
  `id` varchar(191) NOT NULL,
  `label` varchar(191) NOT NULL,
  `url` varchar(191) DEFAULT NULL,
  `route` varchar(191) DEFAULT NULL,
  `external` tinyint(1) NOT NULL DEFAULT 0,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `name`, `slug`, `description`, `created_at`, `updated_at`) VALUES
('10000000-0000-0000-0000-000000000001', 'Manage Users', 'users:manage', 'Manage Users permission', '2025-11-03 19:32:39.835', '2025-11-03 19:32:39.835'),
('10000000-0000-0000-0000-000000000002', 'Manage Roles', 'roles:manage', 'Manage Roles permission', '2025-11-03 19:32:39.846', '2025-11-03 19:32:39.846'),
('10000000-0000-0000-0000-000000000003', 'Create Posts', 'posts:create', 'Create Posts permission', '2025-11-03 19:32:39.851', '2025-11-03 19:32:39.851'),
('10000000-0000-0000-0000-000000000004', 'Edit Posts', 'posts:edit', 'Edit Posts permission', '2025-11-03 19:32:39.854', '2025-11-03 19:32:39.854'),
('10000000-0000-0000-0000-000000000005', 'Delete Posts', 'posts:delete', 'Delete Posts permission', '2025-11-03 19:32:39.858', '2025-11-03 19:32:39.858'),
('10000000-0000-0000-0000-000000000006', 'Approve Posts', 'posts:approve', 'Approve Posts permission', '2025-11-03 19:32:39.863', '2025-11-03 19:32:39.863'),
('10000000-0000-0000-0000-000000000007', 'Manage Categories', 'categories:manage', 'Manage Categories permission', '2025-11-03 19:32:39.867', '2025-11-03 19:32:39.867'),
('10000000-0000-0000-0000-000000000008', 'Manage Files', 'files:manage', 'Manage Files permission', '2025-11-03 19:32:39.872', '2025-11-03 19:32:39.872');

-- --------------------------------------------------------

--
-- Table structure for table `posts`
--

CREATE TABLE `posts` (
  `id` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `meta_title` varchar(191) DEFAULT NULL,
  `cover_image` varchar(191) DEFAULT NULL,
  `category_id` varchar(191) NOT NULL,
  `creator_id` varchar(191) NOT NULL,
  `approved_by` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `publication_date` datetime(3) DEFAULT NULL,
  `has_comments` tinyint(1) NOT NULL DEFAULT 1,
  `views` int(11) NOT NULL DEFAULT 0,
  `unique_hits` int(11) NOT NULL DEFAULT 0,
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `is_leaderboard` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `meta_description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `posts`
--

INSERT INTO `posts` (`id`, `title`, `slug`, `description`, `meta_title`, `cover_image`, `category_id`, `creator_id`, `approved_by`, `status`, `publication_date`, `has_comments`, `views`, `unique_hits`, `is_featured`, `is_leaderboard`, `created_at`, `updated_at`, `meta_description`) VALUES
('040551e5-143b-4aa4-ad6c-3f468d54a88f', 'Go start', 'go-start', 'Best heavens', 'Go start', 'uploads/55fca0f8-cf37-4968-8f05-b4b560cae0c9/17d1c5ef-9cce-4baa-9717-bbade272f01a.png', '550e8400-e29b-41d4-a716-446655440006', '3b9c6704-4157-433a-ae83-83a595f4a00b', '20000000-0000-0000-0000-000000000001', 'pending', NULL, 1, 2, 2, 0, 0, '2025-11-08 06:56:39.624', '2025-11-08 07:55:28.576', NULL),
('16a412ae-ef6a-4f28-b692-d48fe5b8f906', 'Africa Leaders', 'africa-leaders-1762546099829-2', 'Leadership insights from African leaders', 'Africa Leaders - Africa CDC', 'https://source.unsplash.com/800x600/?people', '550e8400-e29b-41d4-a716-446655440003', '30000000-0000-0000-0000-000000000001', NULL, 'approved', '2025-11-02 20:08:19.829', 1, 0, 0, 1, 1, '2025-11-07 20:08:19.832', '2025-11-08 03:05:41.241', NULL),
('19cb8032-d907-41f2-bbca-d5337737af35', 'best all', 'best-all', 'Best all', 'best all', 'uploads/55fca0f8-cf37-4968-8f05-b4b560cae0c9/17d1c5ef-9cce-4baa-9717-bbade272f01a.png', '550e8400-e29b-41d4-a716-446655440001', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'pending', '2025-11-19 00:00:00.000', 1, 0, 0, 0, 0, '2025-11-08 03:52:57.768', '2025-11-08 07:55:50.516', NULL),
('1c0c3670-668a-4b19-8372-83cbf612b139', 'Ebola', 'ebola', 'Health information about Ebola virus', 'Ebola - Africa CDC', 'https://source.unsplash.com/800x600/?health', '550e8400-e29b-41d4-a716-446655440003', '30000000-0000-0000-0000-000000000002', NULL, 'approved', '2025-10-21 19:58:59.299', 1, 0, 0, 0, 0, '2025-11-07 19:58:59.304', '2025-11-07 19:58:59.304', NULL),
('21c0bb77-3a1d-4967-9db1-b8c6c1ab8e68', 'Research Methodology', 'research-methodology', 'Research methods and approaches', 'Research Methodology - Africa CDC', 'https://source.unsplash.com/800x600/?research', '550e8400-e29b-41d4-a716-446655440004', '30000000-0000-0000-0000-000000000002', NULL, 'approved', '2025-10-14 19:59:00.685', 0, 0, 0, 0, 1, '2025-11-07 19:59:00.688', '2025-11-08 03:15:02.332', NULL),
('258aae24-815a-40a4-91e4-aee48c58c4a1', 'Public Relations', 'public-relations', 'Public relations best practices', 'Public Relations - Africa CDC', 'https://source.unsplash.com/800x600/?communication', '550e8400-e29b-41d4-a716-446655440005', '20000000-0000-0000-0000-000000000001', NULL, 'approved', '2025-08-14 19:59:00.951', 1, 0, 0, 0, 1, '2025-11-07 19:59:00.954', '2025-11-08 03:14:58.164', NULL),
('3b63391b-da3e-4202-9c9e-cd52a4168f64', 'AU at UNGA 80', 'au-at-unga-80-1762571116305-1', 'African Union participation at UN General Assembly', 'AU at UNGA 80 - Africa CDC', 'https://source.unsplash.com/800x600/?diplomacy', '550e8400-e29b-41d4-a716-446655440004', '20000000-0000-0000-0000-000000000001', NULL, 'pending', '2025-09-29 03:05:16.305', 0, 0, 0, 0, 1, '2025-11-08 03:05:16.309', '2025-11-08 03:05:16.309', NULL),
('4892ff9b-51bf-43e2-9adc-fcc060c9950d', 'Data Analysis', 'data-analysis', 'Data analysis techniques and tools', 'Data Analysis - Africa CDC', 'https://source.unsplash.com/800x600/?research', '550e8400-e29b-41d4-a716-446655440005', '30000000-0000-0000-0000-000000000001', NULL, 'draft', '2025-10-24 19:59:01.195', 0, 0, 0, 0, 0, '2025-11-07 19:59:01.198', '2025-11-07 19:59:01.198', NULL),
('4e0a78bf-7db1-47e0-8b08-ff62dc33b54b', 'Tools', 'tools-1762546099949-3', 'Essential tools for development', 'Tools - Africa CDC', 'https://source.unsplash.com/800x600/?tools', '550e8400-e29b-41d4-a716-446655440003', '30000000-0000-0000-0000-000000000002', NULL, 'draft', '2025-08-15 20:08:19.949', 1, 0, 0, 0, 0, '2025-11-07 20:08:19.954', '2025-11-07 20:08:19.954', NULL),
('5223e337-b2f5-47c1-be12-e1e99478c3d1', 'Africa Leaders', 'africa-leaders', 'Leadership insights from African leaders', 'Africa Leaders - Africa CDC', 'https://source.unsplash.com/800x600/?leadership', '550e8400-e29b-41d4-a716-446655440004', '30000000-0000-0000-0000-000000000001', NULL, 'approved', '2025-10-14 19:58:59.051', 1, 0, 0, 1, 0, '2025-11-07 19:58:59.055', '2025-11-07 19:58:59.055', NULL),
('53af427f-b691-4fec-bdce-b1f5ab008b3d', 'Zambia Response', 'zambia-response', 'Zambia emergency response measures', 'Zambia Response - Africa CDC', 'https://source.unsplash.com/800x600/?health', '550e8400-e29b-41d4-a716-446655440003', '20000000-0000-0000-0000-000000000001', NULL, 'draft', '2025-11-05 19:59:00.314', 1, 0, 0, 0, 0, '2025-11-07 19:59:00.318', '2025-11-07 19:59:00.318', NULL),
('5eb2872f-8d2a-4f97-8b23-471f0071bb89', 'Best things every', 'best-things-every', 'Best thing ever', 'Best things every', 'uploads/55fca0f8-cf37-4968-8f05-b4b560cae0c9/17d1c5ef-9cce-4baa-9717-bbade272f01a.png', '550e8400-e29b-41d4-a716-446655440001', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'approved', NULL, 1, 0, 0, 1, 1, '2025-11-08 03:37:26.858', '2025-11-08 03:37:41.677', NULL),
('604324d6-b298-4501-a09c-602d6ba384c3', 'Economic Development', 'economic-development', 'Economic development strategies', 'Economic Development - Africa CDC', 'https://source.unsplash.com/800x600/?economy', '550e8400-e29b-41d4-a716-446655440005', '30000000-0000-0000-0000-000000000001', NULL, 'draft', '2025-09-25 19:59:00.813', 1, 0, 0, 0, 0, '2025-11-07 19:59:00.816', '2025-11-07 19:59:00.816', NULL),
('719a0821-4bb6-4ef9-a874-54286e11c1d8', 'Cholera Response', 'cholera-response-1762546100320-7', 'Public health response strategies', 'Cholera Response - Africa CDC', 'https://source.unsplash.com/800x600/?health', '550e8400-e29b-41d4-a716-446655440006', '30000000-0000-0000-0000-000000000002', NULL, 'pending', '2025-10-04 20:08:20.320', 1, 0, 0, 0, 1, '2025-11-07 20:08:20.324', '2025-11-07 20:08:20.324', NULL),
('7d6f5976-598a-423c-a219-ed6bff177ac8', 'Coffee Production', 'coffee-production', 'African coffee industry insights', 'Coffee Production - Africa CDC', 'https://source.unsplash.com/800x600/?agriculture', '550e8400-e29b-41d4-a716-446655440005', '20000000-0000-0000-0000-000000000001', NULL, 'approved', '2025-09-23 19:59:00.086', 1, 0, 0, 1, 0, '2025-11-07 19:59:00.088', '2025-11-07 19:59:00.088', NULL),
('8c49a06c-54e8-49fb-a19a-ab858579cb02', 'Manuscript Guidelines', 'manuscript-guidelines', 'Guidelines for manuscript preparation', 'Manuscript Guidelines - Africa CDC', 'https://source.unsplash.com/800x600/?research', '550e8400-e29b-41d4-a716-446655440005', '30000000-0000-0000-0000-000000000001', NULL, 'draft', '2025-08-24 19:59:00.435', 1, 0, 0, 0, 0, '2025-11-07 19:59:00.438', '2025-11-07 19:59:00.438', NULL),
('9144d7af-128c-4b0f-9753-8c16862142d6', 'Event Management', 'event-management', 'Professional event management guide', 'Event Management - Africa CDC', 'https://source.unsplash.com/800x600/?events', '550e8400-e29b-41d4-a716-446655440003', '30000000-0000-0000-0000-000000000001', NULL, 'draft', '2025-10-13 19:59:01.069', 1, 0, 0, 0, 0, '2025-11-07 19:59:01.072', '2025-11-07 19:59:01.072', NULL),
('93158ba5-6644-4ae4-9e95-5c0e0a92828f', 'Technology Integration', 'technology-integration', 'Integrating technology in organizations', 'Technology Integration - Africa CDC', 'https://source.unsplash.com/800x600/?business', '550e8400-e29b-41d4-a716-446655440004', '20000000-0000-0000-0000-000000000001', NULL, 'approved', '2025-08-17 19:59:01.450', 0, 0, 0, 0, 0, '2025-11-07 19:59:01.452', '2025-11-07 19:59:01.452', NULL),
('93738bdb-ef71-49d0-8b77-96f8a41e55b8', 'AU at UNGA 80', 'au-at-unga-80', 'African Union participation at UN General Assembly', 'AU at UNGA 80 - Africa CDC', 'https://source.unsplash.com/800x600/?diplomacy', '550e8400-e29b-41d4-a716-446655440005', '30000000-0000-0000-0000-000000000002', NULL, 'pending', '2025-11-05 19:58:58.922', 1, 0, 0, 0, 0, '2025-11-07 19:58:58.924', '2025-11-07 19:58:58.924', NULL),
('9b6026aa-c14b-4762-8be6-60b2fac85932', 'Cholera Response', 'cholera-response', 'Public health response strategies', 'Cholera Response - Africa CDC', 'https://source.unsplash.com/800x600/?emergency', '550e8400-e29b-41d4-a716-446655440005', '30000000-0000-0000-0000-000000000002', NULL, 'approved', '2025-10-02 19:58:59.438', 1, 0, 0, 0, 1, '2025-11-07 19:58:59.441', '2025-11-07 19:58:59.441', NULL),
('9b7e7074-ad0a-474d-957c-004cb11e07d2', 'AU Green', 'au-green', 'Africa Union Green Initiative', 'AU Green - Africa CDC', 'https://source.unsplash.com/800x600/?green', '550e8400-e29b-41d4-a716-446655440006', '20000000-0000-0000-0000-000000000001', NULL, 'approved', '2025-10-24 20:08:19.682', 1, 0, 0, 0, 0, '2025-11-07 20:08:19.691', '2025-11-07 20:08:19.691', NULL),
('9bad617f-0f5a-41c0-97dd-bb2de0b22a73', 'Resource Management', 'resource-management', 'Effective resource management strategies', 'Resource Management - Africa CDC', 'https://source.unsplash.com/800x600/?business', '550e8400-e29b-41d4-a716-446655440004', '20000000-0000-0000-0000-000000000001', NULL, 'approved', '2025-09-24 19:59:01.329', 1, 0, 0, 0, 1, '2025-11-07 19:59:01.332', '2025-11-08 03:05:58.905', NULL),
('a1afdcb8-55cd-46f8-8d6a-0975ee029f90', 'AU Green', 'au-green-1762571116183-0', 'Africa Union Green Initiative', 'AU Green - Africa CDC', 'https://source.unsplash.com/800x600/?green', '550e8400-e29b-41d4-a716-446655440004', '30000000-0000-0000-0000-000000000001', NULL, 'pending', '2025-11-05 03:05:16.183', 1, 0, 0, 1, 0, '2025-11-08 03:05:16.185', '2025-11-08 03:05:16.185', NULL),
('b7b78679-3e69-4562-a3e5-e54e4539f44f', 'Head of State Briefing', 'head-of-state-briefing', 'Executive briefings and updates', 'Head of State Briefing - Africa CDC', 'https://source.unsplash.com/800x600/?politics', '550e8400-e29b-41d4-a716-446655440006', '20000000-0000-0000-0000-000000000001', NULL, 'pending', '2025-08-29 19:58:59.966', 1, 0, 0, 1, 0, '2025-11-07 19:58:59.970', '2025-11-07 19:58:59.970', NULL),
('ba275d47-97c9-4e46-a1ba-1b00e46e1a50', 'CAF Initiatives', 'caf-initiatives', 'Central African Federation programs', 'CAF Initiatives - Africa CDC', 'https://source.unsplash.com/800x600/?politics', '550e8400-e29b-41d4-a716-446655440006', '20000000-0000-0000-0000-000000000001', NULL, 'approved', '2025-09-03 19:59:00.197', 1, 0, 0, 1, 1, '2025-11-07 19:59:00.201', '2025-11-08 03:15:11.011', NULL),
('bd592675-8069-4fcf-90e5-5a1a838b89a8', 'Digital Media Hub', 'digital-media-hub', 'Comprehensive guide to digital media management', 'Digital Media Hub - Africa CDC', 'https://source.unsplash.com/800x600/?technology', '550e8400-e29b-41d4-a716-446655440004', '20000000-0000-0000-0000-000000000001', NULL, 'draft', '2025-10-12 20:08:20.195', 1, 0, 0, 1, 0, '2025-11-07 20:08:20.198', '2025-11-07 20:08:20.198', NULL),
('c5c3a8ea-36e4-4829-9859-256c03124c78', 'Rapid Response', 'rapid-response', 'Emergency response protocols', 'Rapid Response - Africa CDC', 'https://source.unsplash.com/800x600/?emergency', '550e8400-e29b-41d4-a716-446655440004', '20000000-0000-0000-0000-000000000001', NULL, 'approved', '2025-09-02 19:58:59.702', 1, 0, 0, 0, 0, '2025-11-07 19:58:59.705', '2025-11-07 19:58:59.705', NULL),
('c628b1b3-2ec4-4af1-a269-e66a694d7fae', 'Ebola', 'ebola-1762546100071-4', 'Health information about Ebola virus', 'Ebola - Africa CDC', 'https://source.unsplash.com/800x600/?medical', '550e8400-e29b-41d4-a716-446655440006', '30000000-0000-0000-0000-000000000001', NULL, 'draft', '2025-11-01 20:08:20.072', 1, 0, 0, 0, 0, '2025-11-07 20:08:20.076', '2025-11-07 20:08:20.076', NULL),
('d8e0e516-088e-4905-9969-1d06e9888f01', 'Sustainable Development', 'sustainable-development', 'Sustainable development goals and initiatives', 'Sustainable Development - Africa CDC', 'https://source.unsplash.com/800x600/?environment', '550e8400-e29b-41d4-a716-446655440003', '30000000-0000-0000-0000-000000000001', NULL, 'draft', '2025-11-04 19:59:01.582', 0, 0, 0, 0, 0, '2025-11-07 19:59:01.585', '2025-11-07 19:59:01.585', NULL),
('ddbbd81c-cb6e-44d3-b860-1382ca79dce8', 'Tools', 'tools', 'Essential tools for development', 'Tools - Africa CDC', 'https://source.unsplash.com/800x600/?technology', '550e8400-e29b-41d4-a716-446655440003', '20000000-0000-0000-0000-000000000001', NULL, 'approved', '2025-11-05 19:58:59.172', 1, 0, 0, 0, 1, '2025-11-07 19:58:59.176', '2025-11-07 19:58:59.176', NULL),
('e44498ad-2ffd-4c7e-a935-f8389d468e2c', 'Media Strategy', 'media-strategy', 'Strategic media communication guide', 'Media Strategy - Africa CDC', 'https://source.unsplash.com/800x600/?media', '550e8400-e29b-41d4-a716-446655440005', '30000000-0000-0000-0000-000000000002', NULL, 'approved', '2025-09-19 19:59:00.568', 0, 0, 0, 0, 1, '2025-11-07 19:59:00.570', '2025-11-08 03:15:05.692', NULL),
('f3e9ff8b-2ded-4c3a-9856-f2537361189e', 'Conference Planning', 'conference-planning', 'Best practices for organizing conferences', 'Conference Planning - Africa CDC', 'https://source.unsplash.com/800x600/?events', '550e8400-e29b-41d4-a716-446655440006', '30000000-0000-0000-0000-000000000002', NULL, 'approved', '2025-08-26 19:58:59.571', 1, 0, 0, 1, 0, '2025-11-07 19:58:59.574', '2025-11-07 19:58:59.574', NULL),
('fbdba0f5-805a-4ac5-b8f6-49ffc5c6aacc', 'Abstracts Collection', 'abstracts-collection', 'Collection of research abstracts', 'Abstracts Collection - Africa CDC', 'https://source.unsplash.com/800x600/?research', '550e8400-e29b-41d4-a716-446655440004', '30000000-0000-0000-0000-000000000002', NULL, 'approved', '2025-10-13 19:58:59.844', 1, 0, 0, 0, 1, '2025-11-07 19:58:59.846', '2025-11-07 19:58:59.846', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `post_attachments`
--

CREATE TABLE `post_attachments` (
  `id` varchar(191) NOT NULL,
  `post_id` varchar(191) NOT NULL,
  `file_id` varchar(191) NOT NULL,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `post_attachments`
--

INSERT INTO `post_attachments` (`id`, `post_id`, `file_id`, `display_order`, `created_at`) VALUES
('9bbc51ac-af11-4d3b-b274-873bf9492659', '19cb8032-d907-41f2-bbca-d5337737af35', '6755be60-c18d-400a-b49d-f783342ccbe3', 0, '2025-11-08 07:55:50.524'),
('f605a087-7fcb-4e12-a77e-211035435cc4', '5eb2872f-8d2a-4f97-8b23-471f0071bb89', '6755be60-c18d-400a-b49d-f783342ccbe3', 0, '2025-11-08 03:37:26.866'),
('ff7b29ac-189c-4ea9-9760-1cf40dbfc920', '040551e5-143b-4aa4-ad6c-3f468d54a88f', '86cec2e5-14e0-42ca-b173-304c5386c35b', 0, '2025-11-08 07:55:28.584');

-- --------------------------------------------------------

--
-- Table structure for table `post_authors`
--

CREATE TABLE `post_authors` (
  `id` varchar(191) NOT NULL,
  `post_id` varchar(191) NOT NULL,
  `author_id` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `post_subcategories`
--

CREATE TABLE `post_subcategories` (
  `id` varchar(191) NOT NULL,
  `post_id` varchar(191) NOT NULL,
  `subcategory_id` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `post_tags`
--

CREATE TABLE `post_tags` (
  `id` varchar(36) NOT NULL,
  `post_id` varchar(36) NOT NULL,
  `tag_id` varchar(36) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `post_tags`
--

INSERT INTO `post_tags` (`id`, `post_id`, `tag_id`, `created_at`) VALUES
('17172289-8ac3-4c29-bed1-5399ba7a7bab', '19cb8032-d907-41f2-bbca-d5337737af35', '7617b138-2d6a-4a9f-aa7e-14dee34c60a9', '2025-11-08 07:55:50'),
('5157b179-fc41-4f8a-a586-68b5ca1df531', '040551e5-143b-4aa4-ad6c-3f468d54a88f', 'f6fe83a1-2228-4aed-b68d-8f7412fe8518', '2025-11-08 07:55:28'),
('a46992ef-4f52-4d79-868a-e57f7c0a0a43', '19cb8032-d907-41f2-bbca-d5337737af35', 'f6fe83a1-2228-4aed-b68d-8f7412fe8518', '2025-11-08 07:55:50'),
('df7098bb-00ce-403d-a76b-8f12e50ec871', '040551e5-143b-4aa4-ad6c-3f468d54a88f', '7617b138-2d6a-4a9f-aa7e-14dee34c60a9', '2025-11-08 07:55:28');

-- --------------------------------------------------------

--
-- Table structure for table `post_views`
--

CREATE TABLE `post_views` (
  `id` varchar(191) NOT NULL,
  `post_id` varchar(191) NOT NULL,
  `user_id` varchar(191) DEFAULT NULL,
  `ip_address` varchar(191) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `viewed_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `post_views`
--

INSERT INTO `post_views` (`id`, `post_id`, `user_id`, `ip_address`, `user_agent`, `viewed_at`) VALUES
('328bb292-0d67-4293-a2ea-bf1ccfbe60d0', '040551e5-143b-4aa4-ad6c-3f468d54a88f', '3b9c6704-4157-433a-ae83-83a595f4a00b', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', '2025-11-08 06:56:51.962'),
('b47d6840-4fdd-44e4-af4c-17151063acab', '040551e5-143b-4aa4-ad6c-3f468d54a88f', '3b9c6704-4157-433a-ae83-83a595f4a00b', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', '2025-11-08 06:56:51.948');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `slug`, `description`, `created_at`, `updated_at`) VALUES
('00000000-0000-0000-0000-000000000001', 'Admin', 'admin', 'Administrator with full access', '2025-11-03 19:32:39.821', '2025-11-03 19:32:39.821'),
('00000000-0000-0000-0000-000000000002', 'Author', 'author', 'Content author with create/edit permissions', '2025-11-03 19:32:39.831', '2025-11-03 19:32:39.831'),
('46257aac-e551-48ae-ba5f-8032871fd70c', 'Editor', 'editor', NULL, '2025-11-07 08:05:27.507', '2025-11-07 08:05:27.507');

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `id` varchar(191) NOT NULL,
  `role_id` varchar(191) NOT NULL,
  `permission_id` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `role_permissions`
--

INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES
('064d4a0d-892d-4882-aae1-98c5dc807e66', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000007', '2025-11-08 03:57:44.196'),
('0ab5ba06-6e43-4fbc-a8f7-6e673326f33f', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', '2025-11-03 19:32:39.904'),
('134e1e94-64ab-4498-9085-fa9d4cc83b91', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', '2025-11-03 19:32:39.914'),
('1a35f7b7-7dcb-4fcf-b1ea-ad6ea1e5d2ec', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', '2025-11-07 07:56:59.364'),
('71f0e0d2-af6d-4aad-b6b1-d79a8114b0a8', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '2025-11-08 03:57:44.201'),
('7a28800e-62c5-4780-9b06-35dd7774298a', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', '2025-11-08 03:57:44.207'),
('825ef0f6-8b09-4a0b-b7f1-c82462b3c7ed', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '2025-11-08 03:57:44.199'),
('93cc990f-cec8-4123-9918-fd27cfeb0bc4', '46257aac-e551-48ae-ba5f-8032871fd70c', '10000000-0000-0000-0000-000000000008', '2025-11-08 03:58:04.382'),
('9c9b636c-86fe-4a73-9058-2d5ed57bf91f', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '2025-11-03 19:32:39.877'),
('ab09dd1b-00b3-4c94-8c7a-42c8e7e9cea1', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000008', '2025-11-03 19:32:39.928'),
('baeae4d6-d8fc-4b7f-979e-0a2a74298bf9', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '2025-11-03 19:32:39.884'),
('cf46bb7a-02d6-4ec3-842f-a37008b30b24', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007', '2025-11-03 19:32:39.909'),
('d063abb6-6f3e-4e98-a22b-020502846aa1', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', '2025-11-03 19:32:39.899'),
('d812ef1b-4e7f-4555-a7ac-ccc0f55a88e3', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '2025-11-03 19:32:39.889'),
('e6ac70ff-981f-4658-9fad-9913e5a5ba88', '46257aac-e551-48ae-ba5f-8032871fd70c', '10000000-0000-0000-0000-000000000003', '2025-11-07 08:05:34.948'),
('f0d92c63-91e9-489d-b789-7cc7daaf14a4', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', '2025-11-08 03:57:44.191'),
('f531f3e5-bfcd-4a74-bee4-6634ca9e2dfe', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', '2025-11-03 19:32:39.923'),
('fdef8644-961e-46e0-8a91-d20de9fb9837', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '2025-11-03 19:32:39.919');

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` varchar(36) NOT NULL,
  `key` varchar(255) NOT NULL,
  `value` text NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subcategories`
--

CREATE TABLE `subcategories` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tags`
--

CREATE TABLE `tags` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tags`
--

INSERT INTO `tags` (`id`, `name`, `slug`, `created_at`, `updated_at`) VALUES
('7617b138-2d6a-4a9f-aa7e-14dee34c60a9', 'health', 'health', '2025-11-08 07:55:28', '2025-11-08 07:55:28'),
('f6fe83a1-2228-4aed-b68d-8f7412fe8518', 'mentions', 'mentions', '2025-11-08 07:55:28', '2025-11-08 07:55:28');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(191) NOT NULL,
  `username` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password` varchar(191) NOT NULL,
  `first_name` varchar(191) DEFAULT NULL,
  `last_name` varchar(191) DEFAULT NULL,
  `avatar` varchar(191) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `language` varchar(191) NOT NULL DEFAULT 'en',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `bio` text DEFAULT NULL,
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `job_title` varchar(191) DEFAULT NULL,
  `organization` varchar(191) DEFAULT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `password_reset_token` varchar(255) DEFAULT NULL,
  `password_reset_expires` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `first_name`, `last_name`, `avatar`, `is_active`, `language`, `created_at`, `updated_at`, `bio`, `email_verified`, `job_title`, `organization`, `phone`, `last_login`, `password_reset_token`, `password_reset_expires`) VALUES
('1685f335-0fc5-44bc-bd7b-e2e6a4252325', 'henry@gmail.com', 'henry@gmail.com', '$2a$10$xnv.rBNU9ePlFz.N2KRgeeN0kpPWUSt5.J3hb/DbCkC9p6dnoIiKO', 'HENRY', 'NKUKE', 'uploads\\b9be9250-d6f5-4797-8ec7-676db808255c.jpg', 1, 'en', '2025-11-08 05:20:26.003', '2025-11-08 06:12:22.080', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL),
('20000000-0000-0000-0000-000000000001', 'admin', 'admin@example.com', '$2a$10$8IQby005Cn0ydJ/HoenuV.40uP45TCMprRGOp17mfkMHhHjfSv15S', 'Admin', 'User', NULL, 1, 'en', '2025-11-03 19:32:40.074', '2025-11-03 19:32:40.074', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL),
('30000000-0000-0000-0000-000000000001', 'testuser1', 'testuser1@example.com', '$2a$10$HcVLLoQA0UMl73gfX6qUI.V5XBBL8jwCfLxQwpZyMpAQAzrrNU7JK', 'Test', 'User One', NULL, 1, 'en', '2025-11-03 19:32:40.220', '2025-11-03 19:32:40.220', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL),
('30000000-0000-0000-0000-000000000002', 'testuser2', 'testuser2@example.com', '$2a$10$Cnen.Idfy6h9CCUm7z1Rle6wdGGYFAA9ebkvlHDyCabiuligCnzNC', 'Test', 'User Two', NULL, 1, 'en', '2025-11-03 19:32:40.366', '2025-11-03 19:32:40.366', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL),
('3b9c6704-4157-433a-ae83-83a595f4a00b', 'joe@gmail.com', 'joe@gmail.com', '$2a$10$mJGZPCThGEf5boO.3hpLNeIPZA3Jvtp/oyAhxVBGWck7cBp46W3AW', 'Joe', 'Mukisa', NULL, 1, 'en', '2025-11-08 06:41:50.289', '2025-11-08 06:41:50.289', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

CREATE TABLE `user_roles` (
  `id` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `role_id` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_roles`
--

INSERT INTO `user_roles` (`id`, `user_id`, `role_id`, `created_at`) VALUES
('124acb9e-38e1-4b45-ac9e-6d0a10dbb420', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2025-11-03 19:32:40.082'),
('217c8a40-7d87-41af-8510-7576cfbd3238', '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2025-11-03 19:32:40.226'),
('3e812e6f-5b2c-464d-80a3-2dae92fda740', '30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '2025-11-03 19:32:40.382'),
('8fb3bdc5-1eca-4915-9a3c-1e39a817230a', '3b9c6704-4157-433a-ae83-83a595f4a00b', '00000000-0000-0000-0000-000000000002', '2025-11-08 06:41:50.630'),
('b5653bc1-b37e-41cf-a01e-079a90cbabf5', '1685f335-0fc5-44bc-bd7b-e2e6a4252325', '00000000-0000-0000-0000-000000000002', '2025-11-08 05:20:26.185');

-- --------------------------------------------------------

--
-- Table structure for table `_prisma_migrations`
--

CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) NOT NULL,
  `logs` text DEFAULT NULL,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `applied_steps_count` int(10) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_prisma_migrations`
--

INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`) VALUES
('62ffe1a5-3a63-4e34-8fb2-037156389bc8', 'ee04de44721372826ef75d7e09da422c308fdd51a59ba19a90daa1b84380099c', '2025-11-03 18:55:57.850', '20251103185554_init_mysql', NULL, NULL, '2025-11-03 18:55:54.559', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `categories_name_key` (`name`),
  ADD UNIQUE KEY `categories_slug_key` (`slug`);

--
-- Indexes for table `category_subcategories`
--
ALTER TABLE `category_subcategories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `category_subcategories_category_id_subcategory_id_key` (`category_id`,`subcategory_id`),
  ADD KEY `category_subcategories_subcategory_id_fkey` (`subcategory_id`);

--
-- Indexes for table `files`
--
ALTER TABLE `files`
  ADD PRIMARY KEY (`id`),
  ADD KEY `files_folder_id_fkey` (`folder_id`),
  ADD KEY `files_user_id_fkey` (`user_id`);

--
-- Indexes for table `file_shares`
--
ALTER TABLE `file_shares`
  ADD PRIMARY KEY (`id`),
  ADD KEY `file_shares_shared_with_user_id_fkey` (`shared_with_user_id`),
  ADD KEY `file_shares_file_id_fkey` (`file_id`);

--
-- Indexes for table `folders`
--
ALTER TABLE `folders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `folders_parent_id_fkey` (`parent_id`),
  ADD KEY `folders_user_id_fkey` (`user_id`);

--
-- Indexes for table `folder_shares`
--
ALTER TABLE `folder_shares`
  ADD PRIMARY KEY (`id`),
  ADD KEY `folder_shares_shared_with_user_id_fkey` (`shared_with_user_id`),
  ADD KEY `folder_shares_folder_id_fkey` (`folder_id`);

--
-- Indexes for table `nav_links`
--
ALTER TABLE `nav_links`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `permissions_name_key` (`name`),
  ADD UNIQUE KEY `permissions_slug_key` (`slug`);

--
-- Indexes for table `posts`
--
ALTER TABLE `posts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `posts_slug_key` (`slug`),
  ADD KEY `posts_category_id_idx` (`category_id`),
  ADD KEY `posts_creator_id_idx` (`creator_id`),
  ADD KEY `posts_status_idx` (`status`),
  ADD KEY `posts_is_featured_idx` (`is_featured`),
  ADD KEY `posts_is_leaderboard_idx` (`is_leaderboard`),
  ADD KEY `posts_publication_date_idx` (`publication_date`),
  ADD KEY `posts_approved_by_fkey` (`approved_by`);

--
-- Indexes for table `post_attachments`
--
ALTER TABLE `post_attachments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `post_attachments_post_id_file_id_key` (`post_id`,`file_id`),
  ADD KEY `post_attachments_file_id_fkey` (`file_id`);

--
-- Indexes for table `post_authors`
--
ALTER TABLE `post_authors`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `post_authors_post_id_author_id_key` (`post_id`,`author_id`),
  ADD KEY `post_authors_author_id_fkey` (`author_id`);

--
-- Indexes for table `post_subcategories`
--
ALTER TABLE `post_subcategories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `post_subcategories_post_id_subcategory_id_key` (`post_id`,`subcategory_id`),
  ADD KEY `post_subcategories_subcategory_id_fkey` (`subcategory_id`);

--
-- Indexes for table `post_tags`
--
ALTER TABLE `post_tags`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_post_tag` (`post_id`,`tag_id`),
  ADD KEY `idx_post_id` (`post_id`),
  ADD KEY `idx_tag_id` (`tag_id`);

--
-- Indexes for table `post_views`
--
ALTER TABLE `post_views`
  ADD PRIMARY KEY (`id`),
  ADD KEY `post_views_post_id_idx` (`post_id`),
  ADD KEY `post_views_user_id_idx` (`user_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `roles_name_key` (`name`),
  ADD UNIQUE KEY `roles_slug_key` (`slug`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `role_permissions_role_id_permission_id_key` (`role_id`,`permission_id`),
  ADD KEY `role_permissions_permission_id_fkey` (`permission_id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `key` (`key`),
  ADD KEY `idx_key` (`key`);

--
-- Indexes for table `subcategories`
--
ALTER TABLE `subcategories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `subcategories_name_slug_key` (`name`,`slug`);

--
-- Indexes for table `tags`
--
ALTER TABLE `tags`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_tag_name` (`name`),
  ADD UNIQUE KEY `unique_tag_slug` (`slug`),
  ADD KEY `idx_tag_name` (`name`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_username_key` (`username`),
  ADD UNIQUE KEY `users_email_key` (`email`);

--
-- Indexes for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_roles_user_id_role_id_key` (`user_id`,`role_id`),
  ADD KEY `user_roles_role_id_fkey` (`role_id`);

--
-- Indexes for table `_prisma_migrations`
--
ALTER TABLE `_prisma_migrations`
  ADD PRIMARY KEY (`id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `category_subcategories`
--
ALTER TABLE `category_subcategories`
  ADD CONSTRAINT `category_subcategories_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `category_subcategories_subcategory_id_fkey` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `files`
--
ALTER TABLE `files`
  ADD CONSTRAINT `files_folder_id_fkey` FOREIGN KEY (`folder_id`) REFERENCES `folders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `files_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `file_shares`
--
ALTER TABLE `file_shares`
  ADD CONSTRAINT `file_shares_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `file_shares_shared_with_user_id_fkey` FOREIGN KEY (`shared_with_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `folders`
--
ALTER TABLE `folders`
  ADD CONSTRAINT `folders_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `folders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `folders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `folder_shares`
--
ALTER TABLE `folder_shares`
  ADD CONSTRAINT `folder_shares_folder_id_fkey` FOREIGN KEY (`folder_id`) REFERENCES `folders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `folder_shares_shared_with_user_id_fkey` FOREIGN KEY (`shared_with_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `posts`
--
ALTER TABLE `posts`
  ADD CONSTRAINT `posts_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `posts_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `posts_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `post_attachments`
--
ALTER TABLE `post_attachments`
  ADD CONSTRAINT `post_attachments_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `post_attachments_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `post_authors`
--
ALTER TABLE `post_authors`
  ADD CONSTRAINT `post_authors_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `post_authors_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `post_subcategories`
--
ALTER TABLE `post_subcategories`
  ADD CONSTRAINT `post_subcategories_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `post_subcategories_subcategory_id_fkey` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `post_tags`
--
ALTER TABLE `post_tags`
  ADD CONSTRAINT `post_tags_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `post_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `post_views`
--
ALTER TABLE `post_views`
  ADD CONSTRAINT `post_views_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `post_views_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD CONSTRAINT `user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
