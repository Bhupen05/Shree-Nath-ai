import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Calendar, Wallet, AlertCircle, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { Outlet } from 'react-router-dom';

export default function App() {
  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      
      <main className="ml-64 flex-1 flex flex-col h-screen overflow-y-auto">
        <Header />
        <Outlet/>
      </main>
    </div>
  );
}
