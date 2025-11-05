import { NavLinkRepository } from '../repositories/NavLinkRepository';
import { getLogger } from '../utils/Logger';
import { CreateNavLinkData } from '../interfaces';

const logger = getLogger('SeedNavLinks');

// Navigation links to seed - matching the current frontend utility bar
const navLinksToSeed: CreateNavLinkData[] = [
  { label: 'Info', url: undefined, route: '/info', external: false, order: 1, isActive: true },
  { label: 'Sitemap', url: undefined, route: '/sitemap', external: false, order: 2, isActive: true },
  { label: 'Live Events', url: undefined, route: '/live-events', external: false, order: 3, isActive: true },
  { label: 'News', url: undefined, route: '/news', external: false, order: 4, isActive: true },
  { label: 'Knowledge Portal', url: undefined, route: '/knowledge-portal', external: false, order: 5, isActive: true },
  { label: 'Tutorials', url: undefined, route: '/tutorials', external: false, order: 6, isActive: true },
  { label: 'FAQs', url: undefined, route: '/faqs', external: false, order: 7, isActive: true },
  { label: 'Help', url: undefined, route: '/help', external: false, order: 8, isActive: true },
  { label: 'Contact Us', url: undefined, route: '/contact', external: false, order: 9, isActive: true },
];

export async function seedNavLinks(): Promise<void> {
  try {
    logger.info('Starting to seed navigation links...');

    const navLinkRepository = new NavLinkRepository();

    // Check if nav links already exist
    const existingLinks = await navLinkRepository.findAll();
    if (existingLinks.length >= navLinksToSeed.length) {
      logger.info(`Already ${existingLinks.length} nav links exist. Skipping seeding.`);
      return;
    }

    // Filter out links that already exist by checking label
    const existingLabels = new Set(existingLinks.map(link => link.label.toLowerCase()));
    const linksToCreate = navLinksToSeed.filter(
      link => !existingLabels.has(link.label.toLowerCase())
    );

    if (linksToCreate.length === 0) {
      logger.info('All navigation links already exist. Skipping seeding.');
      return;
    }

    let created = 0;
    for (const linkData of linksToCreate) {
      try {
        await navLinkRepository.create(linkData);
        created++;
        logger.info(`Created nav link: ${linkData.label} (${created}/${linksToCreate.length})`);
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.error(`Failed to create nav link: ${linkData.label}`, error as Error);
      }
    }

    logger.info(`Successfully seeded ${created} navigation links`);
  } catch (error) {
    logger.error('Failed to seed navigation links', error as Error);
    throw error;
  }
}

if (require.main === module) {
  seedNavLinks()
    .then(() => {
      logger.info('Nav links seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Nav links seeding failed', error);
      process.exit(1);
    });
}

