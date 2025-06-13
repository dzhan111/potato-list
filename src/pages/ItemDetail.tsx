import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CompleteItemForm from '../components/CompleteItemForm';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { BucketListItem } from '../types';

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

      console.log('Fetched item:', data);
      return data;
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold mb-4">{item.title}</h1>
        <p className="text-gray-600 mb-6">{item.description}</p>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Completions</h2>
          {item.completions && item.completions.length > 0 ? (
            <div className="grid gap-4">
              {item.completions.map((completion) => (
                <div key={completion.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                  <img
                    src={completion.profiles?.avatar_url || 'https://via.placeholder.com/40'}
                    alt={`${completion.profiles?.username || 'User'}'s avatar`}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{completion.profiles?.username || 'Anonymous'}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(completion.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                    <img
                      src={completion.photo_url}
                      alt="Completion photo"
                      className="mt-2 rounded-lg max-w-full h-auto"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No completions yet. Be the first to complete this item!</p>
          )}
        </div>

        {user && !hasCompleted && (
          <button
            onClick={() => setShowCompleteForm(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Complete This Item
          </button>
        )}

        {!user && (
          <button
            onClick={() => navigate('/auth')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Sign In to Complete
          </button>
        )}
      </div>

      {showCompleteForm && (
        <CompleteItemForm
          itemId={item.id}
          onComplete={handleComplete}
          onClose={() => setShowCompleteForm(false)}
        />
      )}
    </div>
  );
};

export default ItemDetail; 