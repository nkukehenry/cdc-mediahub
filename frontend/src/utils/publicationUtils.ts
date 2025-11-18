import { Publication } from '@/store/publicationsSlice';

const AUDIO_KEYWORDS = ['audio', 'sound', 'music', 'podcast', 'radio'];

export const isAudioPublication = (publication: Publication): boolean => {
  const categoryName = publication.category?.name?.toLowerCase() || '';
  const categorySlug = publication.category?.slug?.toLowerCase() || '';

  const matchesCategory = AUDIO_KEYWORDS.some(
    keyword => categoryName.includes(keyword) || categorySlug.includes(keyword)
  );

  const hasAudioAttachment =
    publication.attachments?.some(att => att.mimeType?.toLowerCase().startsWith('audio/')) || false;

  return matchesCategory || hasAudioAttachment;
};

