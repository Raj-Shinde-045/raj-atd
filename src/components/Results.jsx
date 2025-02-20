import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import universityLogo from '../assets/img/DESPU_logo1.jpg';

const exportStudentList = async (students, type) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString();
  const timeStr = now.toLocaleTimeString();
  const timestamp = `${dateStr.replace(/\//g, '')}_${timeStr.replace(/:/g, '')}`;
  const fileName = `${type.toLowerCase()}_attendance_${timestamp}.pdf`;

  // Create PDF document
  const doc = new jsPDF();

  // Add logo and header on first page before table
  // Add logo
  const logoWidth = 25; // mm
  const logoHeight = (logoWidth * 2150) / 2488; // maintain aspect ratio
  doc.addImage(universityLogo, 'JPEG', 15, 10, logoWidth, logoHeight);

  // Add header text with improved formatting
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('DESPU UNIVERSITY', doc.internal.pageSize.width/2, 20, { align: 'center' });
  doc.setFontSize(16);
  doc.text('SCHOOL OF ENGINEERING AND TECHNOLOGY', doc.internal.pageSize.width/2, 30, { align: 'center' });
  doc.setFontSize(14);
  doc.text(`${type.toUpperCase()} STUDENTS LIST`, doc.internal.pageSize.width/2, 40, { align: 'center' });
  
  // Add more details
  doc.setFontSize(12);
  const teacherData = JSON.parse(sessionStorage.getItem('teacherData') || '{}');
  doc.text(`Subject: ${teacherData.name}`, doc.internal.pageSize.width/2, 50, { align: 'center' });
  doc.text(`Date: ${dateStr}    Time: ${timeStr}`, doc.internal.pageSize.width/2, 60, { align: 'center' });
  
  // Add attendance summary
  const presentCount = students.filter(s => s.status === 'present').length;
  const totalCount = students.length;
  const attendancePercentage = Math.round((presentCount / totalCount) * 100);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Total Students: ${totalCount}    Present: ${presentCount}    Absent: ${totalCount - presentCount}    Attendance: ${attendancePercentage}%`, 
    doc.internal.pageSize.width/2, 70, { align: 'center' });

  // Create table headers with improved formatting
  const headers = [['Sr. No.', 'Roll No.', 'Name', 'Status']];

  // Create table data
  const data = students.map((student, index) => [
    (index + 1).toString(),
    student.rollNo.replace(/[^\d]/g, ''),
    student.name,
    student.status === 'present' ? 'P' : 'A'
  ]);

  // Add table with improved styling
  doc.autoTable({
    head: headers,
    body: data,
    startY: 75,
    theme: 'grid',
    margin: { left: 20, right: 20 },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.1
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 30 },
      2: { cellWidth: 100 },
      3: { cellWidth: 20 }
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    didDrawPage: function(data) {
      // Add footer on each page
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        data.settings.margin.left,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        `Generated on ${dateStr} at ${timeStr}`,
        doc.internal.pageSize.width - data.settings.margin.right,
        doc.internal.pageSize.height - 10,
        { align: 'right' }
      );
      
      // Reset top margin for pages after first page
      if (data.pageNumber > 1) {
        data.settings.startY = 20;
      }
    }
  });

  // Instead of saving directly, get the PDF as blob
  const pdfBlob = doc.output('blob');
  
  // Instead of saving to Firebase, return the PDF as a data URL
  const dataUrl = doc.output('dataurlstring');
  return { fileName, dataUrl };
};

// Add styles for hover effects
const hoverStyles = `
  .student-card {
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .student-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
  .student-card.edit-mode {
    cursor: pointer;
  }
  .student-card.edit-mode:hover {
    transform: translateY(-2px) scale(1.01);
    box-shadow: 0 6px 8px rgba(0,0,0,0.15);
  }
`;

const Results = ({ attendanceData, onBack }) => {
  // Add styles to document
  React.useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = hoverStyles;
    document.head.appendChild(styleSheet);
    return () => styleSheet.remove();
  }, []);

  const [isEditMode, setIsEditMode] = useState(false);
  const [students, setStudents] = useState(attendanceData);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'rollNo', direction: 'asc' });
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [emailList, setEmailList] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);

  // Filter students based on search query
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.rollNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortConfig.key === 'rollNo') {
      const aNum = parseInt(a.rollNo.replace(/[^\d]/g, ''));
      const bNum = parseInt(b.rollNo.replace(/[^\d]/g, ''));
      return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
    } else {
      const aVal = a[sortConfig.key].toLowerCase();
      const bVal = b[sortConfig.key].toLowerCase();
      return sortConfig.direction === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
  });

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getStats = () => {
    const presentCount = students.filter(student => student.status === 'present').length;
    const totalCount = students.length;
    const absentCount = totalCount - presentCount;
    return {
      presentCount,
      absentCount,
      totalCount,
      presentPercentage: Math.round((presentCount / totalCount) * 100)
    };
  };

  const handleStatusToggle = (student) => {
    if (!isEditMode) return;

    const newStatus = student.status === 'present' ? 'absent' : 'present';
    setStudents(prevStudents => {
      const updatedStudents = prevStudents.map(s => {
        if (s.id === student.id && s.rollNo === student.rollNo) {
          return { ...s, status: newStatus };
        }
        return s;
      });
      // Show saved message
      setShowSavedMessage(true);
      setTimeout(() => setShowSavedMessage(false), 2000);
      return updatedStudents;
    });
  };

  const stats = getStats();

  const handleExportPresent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const presentStudents = students.filter(student => student.status === 'present');
      const result = await exportStudentList(presentStudents, 'Present');
      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = result.fileName;
      link.click();
    } catch (error) {
      setError('Failed to generate PDF. Please try again.');
      console.error('Export error:', error);
    }
    setIsLoading(false);
  };

  const handleExportAbsent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const absentStudents = students.filter(student => student.status === 'absent');
      const result = await exportStudentList(absentStudents, 'Absent');
      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = result.fileName;
      link.click();
    } catch (error) {
      setError('Failed to generate PDF. Please try again.');
      console.error('Export error:', error);
    }
    setIsLoading(false);
  };

  const handleExportComplete = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await exportStudentList(students, 'Complete');
      // Create a temporary download link
      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = result.fileName;
      link.click();
    } catch (error) {
      setError('Failed to generate PDF. Please try again.');
      console.error('Export error:', error);
    }
    setIsLoading(false);
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleEmailShare = async () => {
    if (!emailList.trim()) {
      setError('Please enter at least one email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First trigger the download
      const result = await exportStudentList(students, 'Complete');
      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = result.fileName;
      link.click();

      // Get the current date and time for the email
      const now = new Date();
      const dateStr = now.toLocaleDateString();
      const timeStr = now.toLocaleTimeString();
      
      // Get teacher data
      const teacherData = JSON.parse(sessionStorage.getItem('teacherData') || '{}');
      
      // Create email content
      const subject = encodeURIComponent(`Attendance Report - ${teacherData.name} - ${dateStr}`);
      const body = encodeURIComponent(
        `Dear Recipient,\n\n` +
        `Please find attached the attendance report for ${teacherData.name} taken on ${dateStr} at ${timeStr}.\n\n` +
        `Attendance Summary:\n` +
        `- Total Students: ${stats.totalCount}\n` +
        `- Present: ${stats.presentCount}\n` +
        `- Absent: ${stats.absentCount}\n` +
        `- Attendance Rate: ${stats.presentPercentage}%\n\n` +
        `Note: The attendance report PDF has been downloaded to your computer. Please attach it manually to this email.\n\n` +
        `Best regards,\n${teacherData.name}`
      );

      // Create Gmail-specific mailto link
      const emails = emailList.split(',').map(email => email.trim());
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${emails.join(',')}&su=${subject}&body=${body}`;
      
      // Open Gmail in a new tab
      window.open(gmailUrl, '_blank');
      
      setShareSuccess(true);
      setTimeout(() => {
        setShareSuccess(false);
        setShowShareModal(false);
      }, 2000);
    } catch (error) {
      setError('Failed to generate PDF. Please try again.');
      console.error('Share error:', error);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8 md:p-12">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto relative mb-12">
        <div className="flex justify-between items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back</span>
          </button>

          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Edit Mode Toggle */}
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                isEditMode
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isEditMode ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                )}
              </svg>
              {isEditMode ? 'Save Changes' : 'Edit Mode'}
            </button>
          </div>
        </div>

        {/* Saved Message */}
        <AnimatePresence>
          {showSavedMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-16 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg"
            >
              Changes saved successfully!
            </motion.div>
          )}
        </AnimatePresence>

        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text text-center mt-4">
          Attendance Results
        </h1>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-6 md:col-span-3"
        >
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500">
            <h3 className="text-lg font-medium text-gray-500">Total Students</h3>
            <p className="text-4xl font-bold text-gray-900 mt-2">{stats.totalCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500">
            <h3 className="text-lg font-medium text-gray-500">Present</h3>
            <p className="text-4xl font-bold text-gray-900 mt-2">{stats.presentCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-red-500">
            <h3 className="text-lg font-medium text-gray-500">Absent</h3>
            <p className="text-4xl font-bold text-gray-900 mt-2">{stats.absentCount}</p>
          </div>
        </motion.div>
      </div>

      {/* Progress Circle */}
      <div className="flex justify-center mb-16">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative w-64 h-64 md:w-80 md:h-80 bg-white rounded-full shadow-xl p-4"
        >
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="8"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="8"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: stats.presentPercentage / 100 }}
              transition={{ duration: 2, ease: "easeOut" }}
              transform="rotate(-90 50 50)"
              strokeDasharray="283"
              strokeDashoffset="0"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6">
                  <animate attributeName="stopColor" values="#3B82F6; #8B5CF6; #3B82F6" dur="4s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="#8B5CF6">
                  <animate attributeName="stopColor" values="#8B5CF6; #3B82F6; #8B5CF6" dur="4s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text"
              >
                {stats.presentPercentage}%
              </motion.span>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-xl md:text-2xl text-gray-600 mt-2"
              >
                Attendance Rate
              </motion.p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Sort Controls */}
      <div className="max-w-7xl mx-auto mb-6 flex gap-4">
        <button
          onClick={() => handleSort('rollNo')}
          className={`px-4 py-2 rounded-lg ${
            sortConfig.key === 'rollNo' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Sort by Roll No {sortConfig.key === 'rollNo' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </button>
        <button
          onClick={() => handleSort('name')}
          className={`px-4 py-2 rounded-lg ${
            sortConfig.key === 'name' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Sort by Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </button>
      </div>

      {/* Student Lists */}
      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* Present Students */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-green-600">Present Students</h2>
                <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  {stats.presentCount} Students
                </span>
              </div>
              <div className="overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-4 space-y-3">
                {sortedStudents
                  .filter(student => student.status === 'present')
                  .map((student, index) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleStatusToggle(student)}
                      className={`p-4 rounded-xl bg-green-50 border border-green-100 flex items-center justify-between group student-card ${
                        isEditMode ? 'edit-mode' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-medium">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 group-hover:text-green-700 transition-colors">
                            {student.name}
                          </h3>
                          <p className="text-sm text-gray-500">Roll No: {student.rollNo.replace(/[^\d]/g, '')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        <span className="text-green-700 font-medium">Present</span>
                        {isEditMode && (
                          <div className="ml-2 p-1 rounded-full bg-gray-100">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m-8 4H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
              </div>
              <div className="mt-6">
                <button
                  onClick={handleExportPresent}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Present List
                </button>
              </div>
            </motion.div>

            {/* Absent Students */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-red-600">Absent Students</h2>
                <span className="px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                  {stats.absentCount} Students
                </span>
              </div>
              <div className="overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-4 space-y-3">
                {sortedStudents
                  .filter(student => student.status === 'absent')
                  .map((student, index) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleStatusToggle(student)}
                      className={`p-4 rounded-xl bg-red-50 border border-red-100 flex items-center justify-between group student-card ${
                        isEditMode ? 'edit-mode' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center text-red-700 font-medium">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 group-hover:text-red-700 transition-colors">
                            {student.name}
                          </h3>
                          <p className="text-sm text-gray-500">Roll No: {student.rollNo.replace(/[^\d]/g, '')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                        <span className="text-red-700 font-medium">Absent</span>
                        {isEditMode && (
                          <div className="ml-2 p-1 rounded-full bg-gray-100">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m-8 4H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
              </div>
              <div className="mt-6">
                <button
                  onClick={handleExportAbsent}
                  className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl shadow-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Absent List
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Generate Complete Attendance List Button and Share Section */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 text-center"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleExportComplete}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-xl font-bold group"
            >
              <svg className="w-6 h-6 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </button>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl shadow-xl hover:from-green-600 hover:to-teal-700 transition-all duration-200 text-xl font-bold group"
            >
              <svg className="w-6 h-6 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>
        </div>
      </motion.div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-8 rounded-2xl shadow-2xl max-w-lg w-full mx-4"
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Share Attendance Report</h3>
            <p className="text-gray-600 mb-4">Enter email addresses (comma-separated) to share the attendance report:</p>
            
            <textarea
              value={emailList}
              onChange={(e) => setEmailList(e.target.value)}
              placeholder="e.g., hod@example.com, admin@example.com"
              className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEmailShare}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Share
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Success Message */}
      <AnimatePresence>
        {shareSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50"
          >
            Opening email client...
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-center mt-4">Generating PDF...</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};

export default Results;
