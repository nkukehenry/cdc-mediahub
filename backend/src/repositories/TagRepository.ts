import { ITagRepository, TagEntity, TagWithUsage } from '../interfaces';
import { DatabaseUtils } from '../utils/DatabaseUtils';
import { getLogger } from '../utils/Logger';

export class TagRepository implements ITagRepository {
  private logger = getLogger('TagRepository');

  async findAll(): Promise<TagEntity[]> {
    const rows = await DatabaseUtils.findMany<any>(
      'SELECT * FROM tags ORDER BY name ASC'
    );
    return rows.map(row => this.mapToTagEntity(row));
  }

  async findAllWithUsage(): Promise<TagWithUsage[]> {
    const rows = await DatabaseUtils.findMany<any>(
      `SELECT t.*, COUNT(pt.post_id) AS usage_count
       FROM tags t
       LEFT JOIN post_tags pt ON pt.tag_id = t.id
       GROUP BY t.id
       ORDER BY usage_count DESC, t.name ASC`
    );
    return rows.map(row => ({
      ...this.mapToTagEntity(row),
      usageCount: Number(row.usage_count) || 0,
    }));
  }

  async findByNames(names: string[]): Promise<TagEntity[]> {
    const normalized = this.normalizeNames(names);
    if (normalized.length === 0) {
      return [];
    }

    const slugs = normalized.map(n => n.slug);
    const placeholders = slugs.map(() => '?').join(', ');
    const rows = await DatabaseUtils.findMany<any>(
      `SELECT * FROM tags WHERE slug IN (${placeholders})`,
      slugs
    );

    return rows.map(row => this.mapToTagEntity(row));
  }

  async findByPost(postId: string): Promise<TagEntity[]> {
    const rows = await DatabaseUtils.findMany<any>(
      `SELECT t.*
       FROM tags t
       INNER JOIN post_tags pt ON pt.tag_id = t.id
       WHERE pt.post_id = ?
       ORDER BY t.name ASC`,
      [postId]
    );
    return rows.map(row => this.mapToTagEntity(row));
  }

  async findOrCreate(names: string[]): Promise<TagEntity[]> {
    const normalized = this.normalizeNames(names);
    if (normalized.length === 0) {
      return [];
    }

    const existing = await this.findByNames(normalized.map(n => n.name));
    const existingBySlug = new Map(existing.map(tag => [tag.slug, tag]));

    const tags: TagEntity[] = [...existing];
    for (const { name, slug } of normalized) {
      if (existingBySlug.has(slug)) {
        continue;
      }

      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();

      await DatabaseUtils.executeQuery(
        `INSERT INTO tags (id, name, slug, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [id, name, slug, now, now]
      );

      const created: TagEntity = {
        id,
        name,
        slug,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      };

      tags.push(created);
      existingBySlug.set(slug, created);
    }

    // Ensure consistent ordering
    return tags.sort((a, b) => a.name.localeCompare(b.name));
  }

  async assignTagsToPost(postId: string, tagIds: string[]): Promise<void> {
    await DatabaseUtils.executeQuery('DELETE FROM post_tags WHERE post_id = ?', [postId]);

    if (!tagIds || tagIds.length === 0) {
      return;
    }

    for (const tagId of tagIds) {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();
      await DatabaseUtils.executeQuery(
        `INSERT INTO post_tags (id, post_id, tag_id, created_at)
         VALUES (?, ?, ?, ?)`,
        [id, postId, tagId, now]
      );
    }
  }

  private normalizeNames(names: string[]): Array<{ name: string; slug: string }> {
    const unique = new Map<string, { name: string; slug: string }>();

    names
      .map(name => name?.trim())
      .filter((name): name is string => Boolean(name && name.length > 0))
      .forEach(name => {
        const slug = this.generateSlug(name);
        if (!unique.has(slug)) {
          unique.set(slug, { name, slug });
        }
      });

    return Array.from(unique.values());
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  }

  private mapToTagEntity(row: any): TagEntity {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
