import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { AskQuestionModal } from '../modals/AskQuestionModal';
import { CreateProjectModal } from '../modals/CreateProjectModal';
import { JoinProjectModal } from '../modals/JoinProjectModal';

export const Layout: React.FC = () => {
  const [askModalOpen, setAskModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        onOpenAskModal={() => setAskModalOpen(true)}
        onOpenCreateModal={() => setCreateModalOpen(true)}
        onOpenJoinModal={() => setJoinModalOpen(true)}
      />

      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto max-w-6xl">
          <Outlet context={{ refreshTrigger, triggerRefresh: () => setRefreshTrigger((prev) => prev + 1) }} />
        </main>
      </div>

      <AskQuestionModal
        isOpen={askModalOpen}
        onClose={() => setAskModalOpen(false)}
        onQuestionAsked={() => setRefreshTrigger((prev) => prev + 1)}
      />

      <CreateProjectModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      <JoinProjectModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
      />
    </div>
  );
};
