'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/utils/apiClient';
import { showError, showSuccess } from '@/utils/errorHandler';
import { Camera, Save, X } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getImageUrl } from '@/utils/fileUtils';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ProfilePage() {
  const { user, checkAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  
  // Image cropping states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user data
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setAvatar(user.avatar || null);
      // Load additional fields if they exist (will be added to backend)
      // @ts-ignore - temporary for new fields
      setPhone(user.phone || '');
      // @ts-ignore
      setJobTitle(user.jobTitle || '');
      // @ts-ignore
      setOrganization(user.organization || '');
      // @ts-ignore
      setBio(user.bio || '');
    }
  }, [user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setImageSrc(reader.result as string);
          setShowCropModal(true);
        };
        reader.readAsDataURL(file);
      } else {
        showError('Please select an image file');
      }
    }
  };

  const onCropComplete = useCallback((croppedArea: CropArea, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: CropArea
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set canvas size to match the cropped area
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Draw the cropped portion of the image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        const fileUrl = URL.createObjectURL(blob);
        resolve(fileUrl);
      }, 'image/jpeg', 0.9);
    });
  };

  const handleCropComplete = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      setLoading(true);
      const croppedImageUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
      setAvatar(croppedImageUrl);
      setShowCropModal(false);
      setImageSrc(null);
    } catch (error) {
      console.error('Error cropping image:', error);
      showError('Failed to crop image');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Upload avatar if changed
      let avatarUrl = avatar;
      if (avatar && avatar.startsWith('blob:')) {
        // Convert blob URL to File
        const response = await fetch(avatar);
        const blob = await response.blob();
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
        
        // Upload file
        const uploadResponse = await apiClient.uploadFile(file);
        if (uploadResponse.success && uploadResponse.data?.file) {
          avatarUrl = uploadResponse.data.file.filePath || uploadResponse.data.file.path;
        }
      }

      // Update profile
      const response = await apiClient.updateProfile({
        firstName,
        lastName,
        email,
        avatar: avatarUrl,
        phone,
        jobTitle,
        organization,
        bio,
      });

      if (response.success) {
        showSuccess('Profile updated successfully');
        await checkAuth(); // Refresh user data
      } else {
        showError(response.error?.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      showError(error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-au-grey-text mb-8">Profile Settings</h1>

        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          {/* Avatar Section */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-au-grey-text mb-4">
              Profile Picture
            </label>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                  {avatar ? (
                    <img
                      src={avatar.startsWith('blob:') ? avatar : getImageUrl(avatar)}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          `${firstName} ${lastName}`.trim() || 'User'
                        )}&size=128&background=348F41&color=fff`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-au-corporate-green flex items-center justify-center text-white text-4xl font-bold">
                      {(firstName?.[0] || lastName?.[0] || email?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-au-corporate-green text-white rounded-full flex items-center justify-center shadow-lg hover:bg-au-green transition-colors"
                  title="Change photo"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1">
                <p className="text-sm text-au-grey-text/70 mb-2">
                  Click the camera icon to upload a new profile picture. Recommended size: 400x400px
                </p>
                {avatar && (
                  <button
                    onClick={() => {
                      setAvatar(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-sm text-au-red hover:text-au-red/80 transition-colors"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-au-grey-text mb-2">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-au-grey-text mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-au-grey-text mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-au-grey-text mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
                placeholder="+1234567890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-au-grey-text mb-2">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
                placeholder="e.g., Software Engineer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-au-grey-text mb-2">
                Organization
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
                placeholder="e.g., Africa CDC"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-au-grey-text mb-2">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {showCropModal && imageSrc && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-au-grey-text">Crop Profile Picture</h2>
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setImageSrc(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative" style={{ height: '400px', background: '#333' }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex-1 mr-4">
                <label className="block text-sm font-medium text-au-grey-text mb-2">
                  Zoom
                </label>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCropModal(false);
                    setImageSrc(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-au-grey-text hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropComplete}
                  disabled={loading}
                  className="px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Apply Crop'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

