import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Completion } from '../types';

const DEFAULT_AVATAR = 'https://t3.ftcdn.net/jpg/03/46/83/96/240_F_346839683_6nAPzbhpSkIpb8pmAwufkC7c5eD7wYws.jpg';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: completions, isLoading: completionsLoading } = useQuery<Completion[]>({
    queryKey: ['userCompletions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('completions')
        .select(`
          *,
          bucket_list_items (
            id,
            title,
            description
          )
        `)
        .eq('user_id', user?.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile || !user) return null;

    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `profile-pictures/${user.id}/${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      let avatarUrl = profile?.avatar_url;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: username || profile?.username,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id);

      if (error) throw error;
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  if (profileLoading || completionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-xl">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start space-x-6">
          <div className="flex-shrink-0">
            <img
              src={profile?.avatar_url || DEFAULT_AVATAR}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover"
            />
            {isEditing && (
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="mt-2 text-sm"
              />
            )}
          </div>

          <div className="flex-1">
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username || profile?.username || ''}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <h1 className="text-2xl font-bold">{profile?.username || 'Anonymous'}</h1>
                <p className="text-gray-600 mt-1">{user?.email}</p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="mt-4 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Completed Items</h2>
          {completions && completions.length > 0 ? (
            <div className="grid gap-4">
              {completions.map((completion) => (
                <Link
                  key={completion.id}
                  to={`/item/${completion.bucket_list_item_id}`}
                  className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-4 p-4">
                    <div className="relative">
                      <img
                        src={completion.photo_url}
                        alt="Completion"
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-8 h-8 text-white opacity-0 hover:opacity-100 transition-opacity duration-200"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">{completion.bucket_list_items?.title}</h3>
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500">
                        Completed on {new Date(completion.completed_at).toLocaleDateString()}
                      </p>
                      {completion.bucket_list_items?.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {completion.bucket_list_items.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No completed items yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile; 