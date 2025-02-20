import React, { useState } from 'react';
import { motion } from 'framer-motion';
import TeacherManagement from './admin/TeacherManagement';
import StudentManagement from './admin/StudentManagement';
import SubjectManagement from './admin/SubjectManagement';
import AttendanceReports from './admin/AttendanceReports';
import Settings from './admin/Settings';
import LogoutButton from './common/LogoutButton';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('students');
  const adminData = JSON.parse(sessionStorage.getItem('adminData') || '{}');

  const tabs = [
    { id: 'students', name: 'Students', icon: '👨‍🎓' },
    { id: 'teachers', name: 'Teachers', icon: '👥' },
    { id: 'subjects', name: 'Subjects', icon: '📚' },
    { id: 'attendance', name: 'Attendance', icon: '📊' },
    { id: 'settings', name: 'Settings', icon: '⚙️' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'students':
        return <StudentManagement />;
      case 'teachers':
        return <TeacherManagement />;
      case 'subjects':
        return <SubjectManagement />;
      case 'attendance':
        return <AttendanceReports />;
      case 'settings':
        return <Settings />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
            Admin Dashboard
          </h1>
          <div className="flex items-center gap-6">
            <span className="text-gray-600">Welcome, {adminData.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-white min-h-[calc(100vh-80px)] shadow-lg">
          <nav className="mt-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full px-8 py-4 flex items-center space-x-4 text-xl font-semibold transition-all
                  ${activeTab === tab.id 
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 border-r-4 border-blue-600' 
                    : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <span className="text-2xl">{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-12">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 