'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { apiClient } from '@/utils/apiClient';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Save, Loader2, Image as ImageIcon, X } from 'lucide-react';
import FilePickerModal from '@/components/FilePickerModal';
import { FileWithUrls } from '@/types/fileManager';
import { getImageUrl, PLACEHOLDER_IMAGE_PATH } from '@/utils/fileUtils';

interface SettingsData extends Record<string, any> {
  site?: {
    name?: string;
    description?: string;
    tagline?: string;
    url?: string;
  };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    postalCode?: string;
  };
  social?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
  logo?: string;
  favicon?: string;
  showLiveEventsOnHome?: boolean;
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { handleError, showSuccess } = useErrorHandler();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({});
  
  // Logo and Favicon file objects and existing paths
  const [logoFile, setLogoFile] = useState<FileWithUrls | null>(null);
  const [faviconFile, setFaviconFile] = useState<FileWithUrls | null>(null);
  const [existingLogo, setExistingLogo] = useState<string | null>(null);
  const [existingFavicon, setExistingFavicon] = useState<string | null>(null);
  
  // Logo and Favicon picker states
  const [showLogoPicker, setShowLogoPicker] = useState(false);
  const [showFaviconPicker, setShowFaviconPicker] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAllSettings();
      if (response.success && response.data) {
        const loadedSettings = (response.data.settings || {}) as SettingsData;
        const showLiveEventsOnHome = Boolean(loadedSettings.showLiveEventsOnHome ?? false);
        setSettings({
          ...loadedSettings,
          showLiveEventsOnHome,
        });
        
        // Store existing logo and favicon paths if they exist
        if (loadedSettings.logo) {
          setExistingLogo(loadedSettings.logo);
        }
        if (loadedSettings.favicon) {
          setExistingFavicon(loadedSettings.favicon);
        }
      }
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Prepare settings to save
      const settingsToSave: SettingsData = { ...settings };
      
      // Use filePath from selected files, or keep existing paths
      if (logoFile) {
        settingsToSave.logo = logoFile.filePath;
      } else if (!logoFile && !existingLogo) {
        // If logoFile was removed and no existing logo, remove it
        settingsToSave.logo = undefined;
      } else {
        // Keep existing logo if no new one selected
        settingsToSave.logo = existingLogo || undefined;
      }
      
      if (faviconFile) {
        settingsToSave.favicon = faviconFile.filePath;
      } else if (!faviconFile && !existingFavicon) {
        // If faviconFile was removed and no existing favicon, remove it
        settingsToSave.favicon = undefined;
      } else {
        // Keep existing favicon if no new one selected
        settingsToSave.favicon = existingFavicon || undefined;
      }
      
      const response = await apiClient.updateSettings(settingsToSave);
      if (response.success) {
        showSuccess(t('settings.saved'));
        // Update existing paths after successful save
        if (logoFile) {
          setExistingLogo(logoFile.filePath);
          setLogoFile(null); // Clear the selected file after save
        }
        if (faviconFile) {
          setExistingFavicon(faviconFile.filePath);
          setFaviconFile(null); // Clear the selected file after save
        }
      } else {
        handleError(new Error(t('settings.saveError')));
      }
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (section: keyof SettingsData, key: string, value: any) => {
    setSettings(prev => {
      const currentSection = prev[section];
      const sectionValue = currentSection && typeof currentSection === 'object' ? currentSection : {};
      return {
        ...prev,
        [section]: {
          ...sectionValue,
          [key]: value,
        },
      };
    });
  };

  const handleToggleShowLiveEvents = (checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      showLiveEventsOnHome: checked,
    }));
  };

  const handleLogoSelect = (files: FileWithUrls[]) => {
    if (files.length > 0) {
      setLogoFile(files[0]);
    } else {
      setLogoFile(null);
    }
    setShowLogoPicker(false);
  };

  const handleFaviconSelect = (files: FileWithUrls[]) => {
    if (files.length > 0) {
      setFaviconFile(files[0]);
    } else {
      setFaviconFile(null);
    }
    setShowFaviconPicker(false);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setExistingLogo(null);
    setSettings(prev => {
      const { logo, ...rest } = prev;
      return rest;
    });
  };

  const handleRemoveFavicon = () => {
    setFaviconFile(null);
    setExistingFavicon(null);
    setSettings(prev => {
      const { favicon, ...rest } = prev;
      return rest;
    });
  };

  if (loading) {
    return (
      <div className="w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-au-corporate-green" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-au-grey-text">{t('settings.title')}</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('settings.saving')}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {t('settings.save')}
            </>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {/* Site Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-au-grey-text mb-4">{t('settings.siteInformation')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.siteName')}
              </label>
              <input
                type="text"
                value={settings.site?.name || ''}
                onChange={(e) => updateSetting('site', 'name', e.target.value)}
                placeholder={t('settings.enterSiteName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.siteUrl')}
              </label>
              <input
                type="url"
                value={settings.site?.url || ''}
                onChange={(e) => updateSetting('site', 'url', e.target.value)}
                placeholder={t('settings.enterSiteUrl')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.siteDescription')}
              </label>
              <textarea
                value={settings.site?.description || ''}
                onChange={(e) => updateSetting('site', 'description', e.target.value)}
                placeholder={t('settings.enterSiteDescription')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.siteTagline')}
              </label>
              <input
                type="text"
                value={settings.site?.tagline || ''}
                onChange={(e) => updateSetting('site', 'tagline', e.target.value)}
                placeholder={t('settings.enterSiteTagline')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* SEO Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-au-grey-text mb-4">{t('settings.seoSettings')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.metaTitle')}
              </label>
              <input
                type="text"
                value={settings.seo?.metaTitle || ''}
                onChange={(e) => updateSetting('seo', 'metaTitle', e.target.value)}
                placeholder={t('settings.enterMetaTitle')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.metaDescription')}
              </label>
              <textarea
                value={settings.seo?.metaDescription || ''}
                onChange={(e) => updateSetting('seo', 'metaDescription', e.target.value)}
                placeholder={t('settings.enterMetaDescription')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.metaKeywords')}
              </label>
              <input
                type="text"
                value={settings.seo?.metaKeywords || ''}
                onChange={(e) => updateSetting('seo', 'metaKeywords', e.target.value)}
                placeholder={t('settings.enterMetaKeywords')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-au-grey-text mb-4">{t('settings.contactInformation')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.contactEmail')}
              </label>
              <input
                type="email"
                value={settings.contact?.email || ''}
                onChange={(e) => updateSetting('contact', 'email', e.target.value)}
                placeholder={t('settings.enterContactEmail')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.contactPhone')}
              </label>
              <input
                type="tel"
                value={settings.contact?.phone || ''}
                onChange={(e) => updateSetting('contact', 'phone', e.target.value)}
                placeholder={t('settings.enterContactPhone')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.contactAddress')}
              </label>
              <input
                type="text"
                value={settings.contact?.address || ''}
                onChange={(e) => updateSetting('contact', 'address', e.target.value)}
                placeholder={t('settings.enterContactAddress')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.contactCity')}
              </label>
              <input
                type="text"
                value={settings.contact?.city || ''}
                onChange={(e) => updateSetting('contact', 'city', e.target.value)}
                placeholder={t('settings.enterContactCity')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.contactCountry')}
              </label>
              <input
                type="text"
                value={settings.contact?.country || ''}
                onChange={(e) => updateSetting('contact', 'country', e.target.value)}
                placeholder={t('settings.enterContactCountry')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.contactPostalCode')}
              </label>
              <input
                type="text"
                value={settings.contact?.postalCode || ''}
                onChange={(e) => updateSetting('contact', 'postalCode', e.target.value)}
                placeholder={t('settings.enterContactPostalCode')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-au-grey-text mb-4">{t('settings.socialLinks')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.facebookUrl')}
              </label>
              <input
                type="url"
                value={settings.social?.facebook || ''}
                onChange={(e) => updateSetting('social', 'facebook', e.target.value)}
                placeholder={t('settings.enterFacebookUrl')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.twitterUrl')}
              </label>
              <input
                type="url"
                value={settings.social?.twitter || ''}
                onChange={(e) => updateSetting('social', 'twitter', e.target.value)}
                placeholder={t('settings.enterTwitterUrl')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.instagramUrl')}
              </label>
              <input
                type="url"
                value={settings.social?.instagram || ''}
                onChange={(e) => updateSetting('social', 'instagram', e.target.value)}
                placeholder={t('settings.enterInstagramUrl')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.linkedinUrl')}
              </label>
              <input
                type="url"
                value={settings.social?.linkedin || ''}
                onChange={(e) => updateSetting('social', 'linkedin', e.target.value)}
                placeholder={t('settings.enterLinkedinUrl')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.youtubeUrl')}
              </label>
              <input
                type="url"
                value={settings.social?.youtube || ''}
                onChange={(e) => updateSetting('social', 'youtube', e.target.value)}
                placeholder={t('settings.enterYoutubeUrl')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-au-grey-text mb-4">{t('settings.featureToggles')}</h2>
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-gray-700">{t('settings.showLiveEventsOnHome')}</p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={Boolean(settings.showLiveEventsOnHome)}
                onChange={(e) => handleToggleShowLiveEvents(e.target.checked)}
                disabled={saving}
              />
              <div className="relative w-11 h-6 bg-gray-200 rounded-full transition-colors peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-au-corporate-green peer-checked:bg-au-corporate-green">
                <span className="absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-5" />
              </div>
            </label>
          </div>
        </div>

        {/* Logo & Favicon */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-au-grey-text mb-4">{t('settings.logoAndFavicon')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.logo')}
              </label>
              <div className="flex items-center gap-4">
                {logoFile || existingLogo ? (
                  <div className="relative">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
                      <img
                        key={logoFile?.id || existingLogo || 'logo-preview'}
                        src={logoFile
                          ? (logoFile.filePath
                              ? getImageUrl(logoFile.filePath)
                              : (logoFile.downloadUrl && !logoFile.downloadUrl.includes('unsplash')
                                  ? logoFile.downloadUrl
                                  : (logoFile.thumbnailUrl && !logoFile.thumbnailUrl.includes('unsplash')
                                      ? logoFile.thumbnailUrl
                                      : getImageUrl(PLACEHOLDER_IMAGE_PATH))))
                          : getImageUrl(existingLogo || '')
                        }
                        alt="Logo"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.src.includes(PLACEHOLDER_IMAGE_PATH)) {
                            target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
                          }
                        }}
                      />
                    </div>
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="h-20 w-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <button
                  onClick={() => setShowLogoPicker(true)}
                  className="px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors"
                >
                  {t('settings.selectLogo')}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.favicon')}
              </label>
              <div className="flex items-center gap-4">
                {faviconFile || existingFavicon ? (
                  <div className="relative">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
                      <img
                        key={faviconFile?.id || existingFavicon || 'favicon-preview'}
                        src={faviconFile
                          ? (faviconFile.filePath
                              ? getImageUrl(faviconFile.filePath)
                              : (faviconFile.downloadUrl && !faviconFile.downloadUrl.includes('unsplash')
                                  ? faviconFile.downloadUrl
                                  : (faviconFile.thumbnailUrl && !faviconFile.thumbnailUrl.includes('unsplash')
                                      ? faviconFile.thumbnailUrl
                                      : getImageUrl(PLACEHOLDER_IMAGE_PATH))))
                          : getImageUrl(existingFavicon || '')
                        }
                        alt="Favicon"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.src.includes(PLACEHOLDER_IMAGE_PATH)) {
                            target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
                          }
                        }}
                      />
                    </div>
                    <button
                      onClick={handleRemoveFavicon}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <button
                  onClick={() => setShowFaviconPicker(true)}
                  className="px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors"
                >
                  {t('settings.selectFavicon')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Picker Modals */}
      <FilePickerModal
        isOpen={showLogoPicker}
        onClose={() => setShowLogoPicker(false)}
        onSelectFiles={handleLogoSelect}
        selectedFiles={logoFile ? [logoFile] : []}
        title={t('settings.selectLogo')}
        multiple={false}
        filterMimeTypes={['image/*']}
      />

      <FilePickerModal
        isOpen={showFaviconPicker}
        onClose={() => setShowFaviconPicker(false)}
        onSelectFiles={handleFaviconSelect}
        selectedFiles={faviconFile ? [faviconFile] : []}
        title={t('settings.selectFavicon')}
        multiple={false}
        filterMimeTypes={['image/*']}
      />
    </div>
  );
}
