import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface CompleteItemFormProps {
  itemId: string;
  onComplete: () => void;
  onClose: () => void;
}

const CompleteItemForm: React.FC<CompleteItemFormProps> = ({ itemId, onComplete, onClose }) => {
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const uploadPhoto = async () => {
    if (!photo || !user) return null;

    const fileExt = photo.name.split('.').pop();
    const fileName = `profile-pictures/${user.id}/${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, photo);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to complete an item');
      return;
    }
    if (!photo) {
      setError('Please select a photo');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Upload the photo
      const photoUrl = await uploadPhoto();
      if (!photoUrl) throw new Error('Failed to upload photo');

      // Create the completion record
      const { error: completionError } = await supabase
        .from('completions')
        .insert({
          bucket_list_item_id: itemId,
          user_id: user.id,
          photo_url: photoUrl,
        });

      if (completionError) throw completionError;

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Complete Item</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="photo" className="block text-sm font-medium text-gray-700 mb-2">
              Upload Completion Photo
            </label>
            <input
              id="photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Completing...' : 'Complete Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompleteItemForm; 