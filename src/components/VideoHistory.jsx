import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../stores/authStore';
import InfiniteScroll from 'react-infinite-scroll-component';
import ClipResults from './ClipResults';
import { format } from 'date-fns';

function VideoHistory() {
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuthStore();
  const PAGE_SIZE = 10;

  const fetchHistory = async () => {
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('video_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const newData = data.filter(item => 
        !history.some(existingItem => existingItem.id === item.id)
      );

      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      }

      setHistory(prev => [...prev, ...newData]);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg p-8">
      <h2 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-emerald-500">
        Usage History
      </h2>
      
      <InfiniteScroll
        dataLength={history.length}
        next={fetchHistory}
        hasMore={hasMore}
        loader={<div className="text-center py-4">
          <div className="animate-pulse text-purple-500">Loading...</div>
        </div>}
        endMessage={<div className="text-center py-4 text-emerald-600 font-medium">You've reached the end!</div>}
      >
        <div className="space-y-6">
          {history.map((item) => (
            <div key={item.id} 
                 className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl 
                          transition-all duration-300 border border-purple-100">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <p className="text-base font-medium text-purple-800">
                    {format(new Date(item.created_at), 'PPpp')}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                      {item.subscription_tier}
                    </span>
                  </div>
                </div>
              </div>
              
              <ClipResults 
                clips={item.clips} 
                highlights={item.highlights_url}
                showDownload={true}
              />
            </div>
          ))}
        </div>
      </InfiniteScroll>
    </div>
  );
}

export default VideoHistory; 