'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, Save, X, Lock, Eye, EyeOff } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/utils/apiClient';
import { showError, showSuccess } from '@/utils/errorHandler';
import { getImageUrl } from '@/utils/fileUtils';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ProfileSettingsProps {
  heading?: string;
  description?: string;
  containerClassName?: string;
  cardClassName?: string;
}

export default function ProfileSettings({
  heading,
  description,
  containerClassName = '',
  cardClassName = 'bg-white rounded-lg shadow-md p-6 md:p-8',
}: ProfileSettingsProps) {
  const { user, checkAuth } = useAuth();
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

  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  // Load user data
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setAvatar(user.avatar || null);
      setPhone(user.phone || '');
      setJobTitle(user.jobTitle || '');
      setOrganization(user.organization || '');
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

  const onCropComplete = useCallback((_: CropArea, croppedPixels: CropArea) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (source: string, pixelCrop: CropArea): Promise<string> => {
    const image = await createImage(source);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

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
      const croppedImageUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
      setAvatar(croppedImageUrl);
      setShowCropModal(false);
      setImageSrc(null);
    } catch (error) {
      console.error('Error cropping image:', error);
      showError('Failed to crop image');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      showError('New password must be at least 8 characters long');
      return;
    }

    try {
      setChangingPassword(true);
      const response = await apiClient.changePassword({
        currentPassword,
        newPassword
      });

      if (response.success) {
        showSuccess('Password changed successfully');
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showError(response.error?.message || 'Failed to change password');
      }
    } catch (error: any) {
      showError(error?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      let avatarUrl = avatar;
      if (avatar && avatar.startsWith('blob:')) {
        const response = await fetch(avatar);
        const blob = await response.blob();
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
        const uploadResponse = await apiClient.uploadFile(file);
        if (uploadResponse.success && uploadResponse.data?.file) {
          avatarUrl = uploadResponse.data.file.filePath || uploadResponse.data.file.path;
        }
      }

      const response = await apiClient.updateProfile({
        firstName,
        lastName,
        email,
        avatar: avatarUrl || undefined,
        phone,
        jobTitle,
        organization,
        bio,
      });

      if (response.success) {
        showSuccess('Profile updated successfully');
        await checkAuth();
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
    <>
      <div className={containerClassName}>
        {heading && (
          <h1 className="text-3xl font-bold text-au-grey-text mb-6">
            {heading}
          </h1>
        )}
        {description && (
          <p className="text-sm text-au-grey-text/70 mb-6">
            {description}
          </p>
        )}

        <div className={cardClassName}>
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

          <div className="flex justify-end gap-4">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-6 py-2 border border-gray-300 text-au-grey-text rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Change Password
            </button>
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

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-au-corporate-green/10 flex items-center justify-center text-au-corporate-green">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-au-grey-text">Change Password</h2>
                  <p className="text-sm text-au-grey-text/60">Secure your account</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={changingPassword}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-au-grey-text mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent transition-all outline-none"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-au-grey-text mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent transition-all outline-none"
                    placeholder="Min. 8 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-au-grey-text mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent transition-all outline-none"
                    placeholder="Repeat new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={changingPassword}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-au-grey-text rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex-1 px-4 py-2.5 bg-au-corporate-green text-white rounded-lg hover:bg-au-green transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {changingPassword ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  onClick={handleCropComplete}
                  className="px-5 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-green transition-colors"
                >
                  Apply
                </button>
                <button
                  onClick={() => {
                    setShowCropModal(false);
                    setImageSrc(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

