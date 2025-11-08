import { DatabaseUtils } from '../utils/DatabaseUtils';
import { getLogger } from '../utils/Logger';
import { PostService } from '../services/PostService';
import { PostRepository } from '../repositories/PostRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { UserRepository } from '../repositories/UserRepository';
import { FileRepository } from '../repositories/FileRepository';
import { TagRepository } from '../repositories/TagRepository';
import { CreatePublicationData } from '../interfaces';
import { PostLikeRepository } from '../repositories/PostLikeRepository';
import { PostCommentRepository } from '../repositories/PostCommentRepository';

const logger = getLogger('SeedPublications');

// Sample publication data
const samplePublications = [
  { title: 'AU Green', description: 'Africa Union Green Initiative', categoryKeywords: ['nature', 'green'] },
  { title: 'AU at UNGA 80', description: 'African Union participation at UN General Assembly', categoryKeywords: ['flags', 'diplomacy'] },
  { title: 'Africa Leaders', description: 'Leadership insights from African leaders', categoryKeywords: ['people', 'leadership'] },
  { title: 'Tools', description: 'Essential tools for development', categoryKeywords: ['tools', 'technology'] },
  { title: 'Ebola', description: 'Health information about Ebola virus', categoryKeywords: ['health', 'medical'] },
  { title: 'Happy Teachers Day', description: 'Celebrating educators across Africa', categoryKeywords: ['education', 'celebration'] },
  { title: 'Digital Media Hub', description: 'Comprehensive guide to digital media management', categoryKeywords: ['technology', 'media'] },
  { title: 'Cholera Response', description: 'Public health response strategies', categoryKeywords: ['health', 'emergency'] },
  { title: 'Conference Planning', description: 'Best practices for organizing conferences', categoryKeywords: ['business', 'events'] },
  { title: 'Rapid Response', description: 'Emergency response protocols', categoryKeywords: ['emergency', 'health'] },
  { title: 'Management Guidelines', description: 'Effective management strategies', categoryKeywords: ['business', 'management'] },
  { title: 'Abstracts Collection', description: 'Collection of research abstracts', categoryKeywords: ['research', 'academic'] },
  { title: 'Head of State Briefing', description: 'Executive briefings and updates', categoryKeywords: ['politics', 'leadership'] },
  { title: 'Coffee Production', description: 'African coffee industry insights', categoryKeywords: ['agriculture', 'economy'] },
  { title: 'CAF Initiatives', description: 'Central African Federation programs', categoryKeywords: ['politics', 'cooperation'] },
  { title: 'Zambia Response', description: 'Zambia emergency response measures', categoryKeywords: ['emergency', 'health'] },
  { title: 'Manuscript Guidelines', description: 'Guidelines for manuscript preparation', categoryKeywords: ['research', 'academic'] },
  { title: 'Health Protocols', description: 'Public health protocols and procedures', categoryKeywords: ['health', 'medical'] },
  { title: 'Media Strategy', description: 'Strategic media communication guide', categoryKeywords: ['media', 'communication'] },
  { title: 'Research Methodology', description: 'Research methods and approaches', categoryKeywords: ['research', 'academic'] },
  { title: 'Economic Development', description: 'Economic development strategies', categoryKeywords: ['economy', 'development'] },
  { title: 'Public Relations', description: 'Public relations best practices', categoryKeywords: ['communication', 'media'] },
  { title: 'Event Management', description: 'Professional event management guide', categoryKeywords: ['events', 'business'] },
  { title: 'Data Analysis', description: 'Data analysis techniques and tools', categoryKeywords: ['technology', 'research'] },
  { title: 'Policy Framework', description: 'Policy development frameworks', categoryKeywords: ['politics', 'governance'] },
  { title: 'Resource Management', description: 'Effective resource management strategies', categoryKeywords: ['management', 'business'] },
  { title: 'Technology Integration', description: 'Integrating technology in organizations', categoryKeywords: ['technology', 'business'] },
  { title: 'Health Education', description: 'Health education programs and materials', categoryKeywords: ['health', 'education'] },
  { title: 'Cultural Heritage', description: 'Preserving African cultural heritage', categoryKeywords: ['culture', 'heritage'] },
  { title: 'Sustainable Development', description: 'Sustainable development goals and initiatives', categoryKeywords: ['environment', 'development'] },
];

// Unsplash categories for better image matching
const unsplashKeywords = [
  'africa', 'nature', 'people', 'business', 'technology', 'health', 'education',
  'culture', 'landscape', 'urban', 'rural', 'agriculture', 'industry', 'science',
  'research', 'government', 'politics', 'community', 'development', 'environment'
];

async function fetchUnsplashImage(keywords: string[]): Promise<string> {
  try {
    // Use Unsplash Source API (free, no auth required)
    // Random image with keywords
    const keyword = keywords[Math.floor(Math.random() * keywords.length)] || 'africa';
    const width = 800;
    const height = 600;
    
    // Unsplash Source API format: https://source.unsplash.com/{width}x{height}/?{keyword}
    // This will redirect to a random image matching the keyword
    const imageUrl = `https://source.unsplash.com/${width}x${height}/?${keyword}`;
    
    // We'll store the URL directly since we can't download and save files in seeding
    // The frontend will fetch from this URL
    return imageUrl;
  } catch (error) {
    logger.warn('Failed to generate Unsplash image URL', error as Error);
    // Fallback to placeholder
    return `https://source.unsplash.com/800x600/?${keywords[0] || 'africa'}`;
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getRandomDate(daysAgo: number = 90): Date {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * daysAgo);
  const date = new Date(now);
  date.setDate(date.getDate() - randomDays);
  return date;
}

export async function seedPublications(count: number = 30): Promise<void> {
  try {
    logger.info(`Starting to seed ${count} publications...`);

    // Initialize repositories
    const categoryRepository = new CategoryRepository();
    const userRepository = new UserRepository();
    const fileRepository = new FileRepository();
    const postRepository = new PostRepository();
    const tagRepository = new TagRepository();
    const postService = new PostService(
      postRepository,
      categoryRepository,
      userRepository,
      fileRepository,
      tagRepository,
      new PostLikeRepository(),
      new PostCommentRepository()
    );

    // Get all categories
    const categories = await categoryRepository.findAll();
    if (categories.length === 0) {
      logger.error('No categories found. Please seed categories first.');
      return;
    }
    logger.info(`Found ${categories.length} categories`);

    // Get all users (for creators)
    const users = await userRepository.findAll();
    if (users.length === 0) {
      logger.error('No users found. Please seed users first.');
      return;
    }
    logger.info(`Found ${users.length} users`);

    // Get publications to create
    const publicationsToCreate = samplePublications.slice(0, Math.min(count, samplePublications.length));
    
    // Check how many publications already exist
    const existingCount = await DatabaseUtils.findMany<any>('SELECT COUNT(*) as count FROM posts', []);
    const currentCount = existingCount[0]?.count || 0;
    
    if (currentCount >= count) {
      logger.info(`Already have ${currentCount} publications. Skipping seeding.`);
      return;
    }

    const publicationsNeeded = Math.min(count - currentCount, publicationsToCreate.length);
    logger.info(`Creating ${publicationsNeeded} publications...`);

    let created = 0;
    let featuredCount = 0;
    let leaderboardCount = 0;

    for (let i = 0; i < publicationsNeeded; i++) {
      const pubData = publicationsToCreate[i];
      
      // Random category
      const category = categories[Math.floor(Math.random() * categories.length)];
      
      // Random creator
      const creator = users[Math.floor(Math.random() * users.length)];
      
      // Generate slug
      let slug = generateSlug(pubData.title);
      
      // Check if slug exists and make it unique
      const existing = await postRepository.findBySlug(slug);
      if (existing) {
        slug = `${slug}-${Date.now()}-${i}`;
      }

      // Fetch Unsplash image
      const coverImage = await fetchUnsplashImage(pubData.categoryKeywords);
      
      // Random status (mostly approved for public display)
      const statuses: Array<'approved' | 'pending' | 'draft'> = ['approved', 'approved', 'approved', 'pending', 'draft'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      // Random featured/leaderboard (some publications)
      const isFeatured = featuredCount < 5 && Math.random() > 0.7;
      const isLeaderboard = leaderboardCount < 5 && Math.random() > 0.7 && !isFeatured;
      
      if (isFeatured) featuredCount++;
      if (isLeaderboard) leaderboardCount++;

      // Random publication date (within last 90 days)
      const publicationDate = getRandomDate(90);

      const publicationData: CreatePublicationData = {
        title: pubData.title,
        slug,
        description: pubData.description,
        metaTitle: `${pubData.title} - Africa CDC`,
        metaDescription: pubData.description,
        coverImage,
        categoryId: category.id,
        creatorId: creator.id,
        status,
        publicationDate: publicationDate,
        hasComments: Math.random() > 0.3, // 70% have comments enabled
        isFeatured,
        isLeaderboard,
      };

      try {
        await postService.createPublication(publicationData);
        created++;
        logger.info(`Created publication: ${pubData.title} (${created}/${publicationsNeeded})`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.error(`Failed to create publication: ${pubData.title}`, error as Error);
      }
    }

    logger.info(`Successfully seeded ${created} publications`);
  } catch (error) {
    logger.error('Failed to seed publications', error as Error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const count = parseInt(process.argv[2] || '30', 10);
  seedPublications(count)
    .then(() => {
      logger.info('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed', error);
      process.exit(1);
    });
}

