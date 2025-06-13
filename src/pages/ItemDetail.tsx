import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CompleteItemForm from '../components/CompleteItemForm';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { BucketListItem } from '../types';

const DEFAULT_AVATAR = 'https://t3.ftcdn.net/jpg/03/46/83/96/240_F_346839683_6nAPzbhpSkIpb8pmAwufkC7c5eD7wYws.jpg';

const ItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCompleteForm, setShowCompleteForm] = useState(false);

  const { data: item, isLoading, error, refetch } = useQuery<BucketListItem>({
    queryKey: ['bucketListItem', id],
    queryFn: async () => {
      console.log('Fetching item details for ID:', id);
      const { data, error } = await supabase
        .from('bucket_list_items')
        .select(`
          *,
          completions (
            id,
            photo_url,
            completed_at,
            profiles (
              id,
              username,
              avatar_url
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching item:', error);
        throw error;
      }

      // Get the creator's profile
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', data.created_by)
        .single();

      return {
        ...data,
        creator: creatorProfile
      };
    },
  });

  const handleComplete = () => {
    setShowCompleteForm(false);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-xl">Loading item details...</div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-xl text-red-500">
          Error loading item: {(error as Error)?.message || 'Item not found'}
        </div>
      </div>
    );
  }

  const hasCompleted = item.completions?.some(
    completion => completion.profiles?.id === user?.id
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header with title and complete button */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{item.title}</h1>
            {item.creator && (
              <div className="flex items-center space-x-2">
                {item.creator.avatar_url ? (
                  <img
                    src={item.creator.avatar_url}
                    alt={item.creator.username}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <img
                    src={DEFAULT_AVATAR}
                    alt={item.creator.username}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-sm text-gray-600">Created by {item.creator.username || 'Anonymous'}</span>
              </div>
            )}
          </div>
          {user && (
            <button
              onClick={() => setShowCompleteForm(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
            >
              Complete This Item
            </button>
          )}
        </div>

        {/* Description */}
        <div className="p-6 border-b border-gray-200">
          <p className="text-gray-700 whitespace-pre-wrap">{item.description}</p>
        </div>

        {/* Completions */}
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Completions</h2>
          {item.completions && item.completions.length > 0 ? (
            <div className="grid grid-cols-4 gap-4">
              {item.completions.map((completion) => (
                <div key={completion.id} className="relative group">
                  <img
                    src={completion.photo_url}
                    alt="Completion"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-center p-2">
                      <div className="flex items-center justify-center space-x-2 mb-1">
                        <img
                          src={completion.profiles?.avatar_url || DEFAULT_AVATAR}
                          alt={`${completion.profiles?.username || 'Anonymous'}'s avatar`}
                          className="w-6 h-6 rounded-full"
                        />
                        <p className="text-sm font-medium">
                          {completion.profiles?.username || 'Anonymous'}
                        </p>
                      </div>
                      <p className="text-xs">
                        {new Date(completion.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No completions yet. Be the first to complete this item!</p>
          )}
        </div>
      </div>

      {/* Complete Item Form Modal */}
      {showCompleteForm && id && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Complete Item</h2>
            <CompleteItemForm
              itemId={id}
              onComplete={() => {
                setShowCompleteForm(false);
                refetch();
              }}
              onClose={() => setShowCompleteForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemDetail; 