import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import PostComposer from '../components/social/PostComposer';
import PostScheduler from '../components/social/PostScheduler';
import SocialAnalytics from '../components/social/SocialAnalytics';
import AccountManager from '../components/social/AccountManager';

function SocialDashboard() {
  const [selectedTab, setSelectedTab] = useState(0);

  const tabs = [
    { name: 'Compose', component: <PostComposer /> },
    { name: 'Schedule', component: <PostScheduler /> },
    { name: 'Analytics', component: <SocialAnalytics /> },
    { name: 'Accounts', component: <AccountManager /> }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
          <Tab.List className="flex p-1 space-x-1 bg-indigo-100 rounded-t-lg">
            {tabs.map((tab) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  `w-full py-2.5 text-sm font-medium leading-5 rounded-lg
                  ${selected
                    ? 'bg-white text-indigo-700 shadow'
                    : 'text-indigo-600 hover:bg-white/[0.12] hover:text-indigo-800'
                  }`
                }
              >
                {tab.name}
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels className="p-6">
            {tabs.map((tab, idx) => (
              <Tab.Panel
                key={idx}
                className={`rounded-xl focus:outline-none`}
              >
                {tab.component}
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
}

export default SocialDashboard;