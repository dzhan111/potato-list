import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AddItemForm from '../components/AddItemForm';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { BucketListItem } from '../types';

const HomePage: React.FC = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: items, isLoading, error, refetch } = useQuery<BucketListItem[]>({
    queryKey: ['bucketListItems'],
    queryFn: async () => {
      console.log('Fetching bucket list items...');
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
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching items:', error);
        throw error;
      }
      
      console.log('Fetched items:', data);
      return data || [];
    },
  });

  const handleAddClick = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setShowAddForm(true);
  };

  console.log('Current state:', { items, isLoading, error });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-xl">Loading bucket list items...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-xl text-red-500">
          Error loading items: {(error as Error).message}
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Bucket List</h1>
        <button
          onClick={handleAddClick}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          {user ? 'Add New Item' : 'Sign In to Add Item'}
        </button>
      </div>

      {items?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600 text-lg">No bucket list items yet. Be the first to add one!</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items?.map((item) => (
            <Link
              key={item.id}
              to={`/item/${item.id}`}
              className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
            >
              <h2 className="text-xl font-semibold mb-2">{item.title}</h2>
              <p className="text-gray-600 mb-4">{item.description}</p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                {item.completions && item.completions.length > 0 ? (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Completed by:</p>
                    <div className="flex items-center space-x-2">
                      {item.completions.slice(0, 3).map((completion) => (
                        <div key={completion.id} className="flex items-center">
                          <img
                            src={completion.profiles?.avatar_url || 'https://via.placeholder.com/40'}
                            alt={`${completion.profiles?.username || 'User'}'s avatar`}
                            className="w-8 h-8 rounded-full border-2 border-white"
                            title={completion.profiles?.username || 'Anonymous'}
                          />
                        </div>
                      ))}
                      {item.completions.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                          +{item.completions.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Be the first to complete this!</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {showAddForm && (
        <AddItemForm
          onClose={() => {
            setShowAddForm(false);
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default HomePage; 