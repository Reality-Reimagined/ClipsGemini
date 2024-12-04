import React, { useState } from 'react';
import { PaperAirplaneIcon, PhotoIcon, CalendarIcon } from '@heroicons/react/24/outline';
import EmojiPicker from 'emoji-picker-react';

function PostComposer() {
  const [post, setPost] = useState({
    content: '',
    media: [],
    platforms: {
      twitter: true,
      facebook: false,
      instagram: false,
      linkedin: false
    }
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleContentChange = (e) => {
    setPost({ ...post, content: e.target.value });
  };

  const handlePlatformToggle = (platform) => {
    setPost({
      ...post,
      platforms: {
        ...post.platforms,
        [platform]: !post.platforms[platform]
      }
    });
  };

  const handleMediaUpload = (e) => {
    const files = Array.from(e.target.files);
    setPost({ ...post, media: [...post.media, ...files] });
  };

  const handleEmojiSelect = (emojiData) => {
    setPost({
      ...post,
      content: post.content + emojiData.emoji
    });
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <textarea
          value={post.content}
          onChange={handleContentChange}
          placeholder="What's on your mind?"
          className="w-full h-32 p-4 border rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
        <div className="absolute bottom-2 right-2 flex space-x-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
          >
            😊
          </button>
        </div>
        {showEmojiPicker && (
          <div className="absolute bottom-12 right-0">
            <EmojiPicker onEmojiClick={handleEmojiSelect} />
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleMediaUpload}
            className="hidden"
          />
          <PhotoIcon className="h-6 w-6 text-gray-500" />
          <span className="text-sm text-gray-600">Add Media</span>
        </label>

        <button className="flex items-center space-x-2 text-gray-500 hover:text-gray-700">
          <CalendarIcon className="h-6 w-6" />
          <span className="text-sm">Schedule</span>
        </button>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex space-x-4">
          {Object.entries(post.platforms).map(([platform, enabled]) => (
            <button
              key={platform}
              onClick={() => handlePlatformToggle(platform)}
              className={`px-3 py-1 rounded-full text-sm ${
                enabled
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </button>
          ))}
        </div>

        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-indigo-700"
        >
          <PaperAirplaneIcon className="h-5 w-5" />
          <span>Post Now</span>
        </button>
      </div>
    </div>
  );
}

export default PostComposer;