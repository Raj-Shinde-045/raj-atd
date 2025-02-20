import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Results from './Results';
import { getDatabase, ref, get, child } from "firebase/database";
import { app } from '../firebase';

// Flash Feedback Component
const FlashFeedback = React.memo(({ status }) => {
  if (!status) return null;
  
  const color = status === 'present' ? 'bg-green-500' : 'bg-red-500';
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.3 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`fixed inset-0 ${color} pointer-events-none z-50`}
    />
  );
});

const StudentCard = React.memo(({ student, onSwipe, style }) => {
  const [dragDirection, setDragDirection] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleButtonClick = useCallback((status) => {
    if (isAnimating) return;

    setDragDirection(status === 'present' ? 'right' : 'left');
    // Simplified animation flow - no state toggling
    onSwipe(status);
  }, [isAnimating, onSwipe]);

  const handleKeyPress = useCallback((e) => {
    if (isAnimating) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault(); // Prevent any default scrolling
      const status = e.key === 'ArrowRight' ? 'present' : 'absent';
      handleButtonClick(status);
    }
  }, [isAnimating, handleButtonClick]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return (
    <motion.div
      drag={!isAnimating ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 30 }}
      onDragEnd={(e, { offset }) => {
        const swipe = offset.x;
        if (Math.abs(swipe) > 100 && !isAnimating) {
          const status = swipe > 0 ? 'present' : 'absent';
          handleButtonClick(status);
        } else {
          setDragDirection(null);
        }
      }}
      style={{
        ...style,
        transform: dragDirection === 'right' ? 'translateX(120%)' :
                  dragDirection === 'left' ? 'translateX(-120%)' : 'none'
      }}
      onDrag={(e, { offset }) => {
        if (!isAnimating) {
          const direction = offset.x > 0 ? 'right' : offset.x < 0 ? 'left' : null;
          if (direction !== dragDirection) {
            setDragDirection(direction);
          }
        }
      }}
      className="absolute w-full h-[90vh]"
    >
      <div
        className={`w-full h-full bg-gray-50 shadow-xl transform flex
          ${dragDirection === 'right' ? 'bg-green-50 border-l-8 border-green-500' :
          dragDirection === 'left' ? 'bg-red-50 border-r-8 border-red-500' : ''}`}
        style={{
          backgroundColor: 'white',
          boxShadow: dragDirection === 'right'
            ? '0 0 30px 5px rgba(34, 197, 94, 0.4)'
            : dragDirection === 'left'
            ? '0 0 30px 5px rgba(239, 68, 68, 0.4)'
            : '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Center - Student Info */}
        <div className="flex-grow flex flex-col items-center justify-center">
          <div className="text-center">
            <h2 className="text-[10vw] lg:text-[8vw] font-bold leading-tight text-blue-600 max-w-[90%] mx-auto break-words">
              {student.name}
            </h2>
            <p className="text-6xl text-gray-700 mt-8 font-semibold">
              {student.rollNo.replace(/[^\d]/g, '')}
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        {dragDirection && (
          <div
            className={`absolute ${dragDirection === 'left' ? 'left-8' : 'right-8'} top-1/2 -translate-y-1/2
              text-[80px] font-bold ${dragDirection === 'left' ? 'text-red-500' : 'text-green-500'}`}
          >
            {dragDirection === 'left' ? '✗' : '✓'}
          </div>
        )}

        {/* Swipe Instructions */}
        <div className="absolute bottom-12 left-0 right-0 flex justify-between px-24">
          <button
            onClick={() => handleButtonClick('absent')}
            disabled={isAnimating}
            className={`text-3xl font-bold text-red-500 transition-all duration-200 hover:text-red-600
              ${dragDirection === 'left' ? 'opacity-100' : 'opacity-30'}
              ${isAnimating ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            ← ABSENT
          </button>
          <button
            onClick={() => handleButtonClick('present')}
            disabled={isAnimating}
            className={`text-3xl font-bold text-green-500 transition-all duration-200 hover:text-green-600
              ${dragDirection === 'right' ? 'opacity-100' : 'opacity-30'}
              ${isAnimating ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            PRESENT →
          </button>
        </div>
      </div>
    </motion.div>
  );
});

const AttendanceScreen = () => {
  const location = useLocation();
  const [students, setStudents] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [history, setHistory] = useState([]);
  const [flashStatus, setFlashStatus] = useState(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // Get the selected class and roll range from the location state
        const selectedClass = location.state?.selectedClass || 'classA';
        const rollRange = location.state?.rollRange;

        console.log('Fetching students for class:', selectedClass);
        console.log('Roll range:', rollRange);

        // Get reference to the database
        const database = getDatabase(app);
        const dbRef = ref(database);

        // Fetch students data from Firebase
        const snapshot = await get(child(dbRef, `students/${selectedClass}`));

        console.log('Raw data from Firebase:', snapshot.val());

        if (snapshot.exists()) {
          const rawData = snapshot.val();
          console.log('Data structure:', typeof rawData, Array.isArray(rawData));

          // Handle both array and object formats
          let classStudents = Array.isArray(rawData) ? rawData : Object.values(rawData);

          // Filter students based on range if provided
          if (rollRange && rollRange.start && rollRange.end) {
            if (location.state?.batch === 'custom') {
              // For custom range - filter by actual roll numbers
              classStudents = classStudents.filter(student => {
                const rollNo = parseInt(student.rollNo.replace(/[^\d]/g, ''));
                return rollNo >= rollRange.start && rollNo <= rollRange.end;
              });
            } else {
              // For full class - filter by serial numbers (original logic)
              classStudents = classStudents.filter(student => {
                const serialNo = parseInt(student.serialNo);
                return serialNo >= rollRange.start && serialNo <= rollRange.end;
              });
            }
          }

          // Map students with status
          classStudents = classStudents.map(student => ({
            ...student,
            status: null
          }));

          setStudents(classStudents);
        } else {
          console.log("No data available");
          setStudents([]);
        }
      } catch (error) {
        console.error("Error fetching students:", error);
        setStudents([]);
      }
    };

    fetchStudents();
  }, [location.state?.selectedClass, location.state?.rollRange]);

  const handleSwipe = (status) => {
    // Show flash feedback
    setFlashStatus(status);
    setTimeout(() => setFlashStatus(null), 200);

    setStudents((prevStudents) => {
      const newStudents = [...prevStudents];
      newStudents[currentIndex] = { ...newStudents[currentIndex], status };
      // Save to history
      setHistory(prev => [...prev, {
        students: [...prevStudents],
        currentIndex
      }]);
      return newStudents;
    });

    if (currentIndex < students.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const lastState = history[history.length - 1];
      setStudents(lastState.students);
      setCurrentIndex(lastState.currentIndex);
      setHistory(prev => prev.slice(0, -1));
    }
  };

  const getProgress = () => {
    return ((currentIndex) / students.length) * 100;
  };

  if (isCompleted) {
    return <Results
      attendanceData={students}
      onBack={() => {
        setIsCompleted(false);
        setCurrentIndex(0);
        setStudents(students.map(student => ({ ...student, status: null })));
      }}
    />;
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-50 to-gray-100 overflow-hidden">
      <FlashFeedback status={flashStatus} />
      {/* Progress Bar */}
      <div className="w-full h-10 bg-gray-200 relative">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative"
          initial={{ width: 0 }}
          animate={{ width: `${getProgress()}%` }}
          transition={{ duration: 0.5 }}
        >
          <div className="absolute inset-0 flex items-center justify-end pr-8">
            <span className="text-4xl font-bold text-white">
              {Math.round(getProgress())}%
            </span>
          </div>
        </motion.div>
      </div>

      {/* Undo Button */}
      <div className="fixed top-20 right-8 z-[100]">
        <motion.button
          onClick={handleUndo}
          disabled={history.length === 0}
          className={`pointer-events-auto p-6 rounded-xl shadow-lg transform transition-all duration-300 flex items-center gap-3
            ${history.length === 0
              ? 'bg-gray-400 cursor-not-allowed opacity-50'
              : 'bg-gradient-to-br from-blue-500 to-purple-600 hover:shadow-xl hover:scale-105 hover:from-blue-600 hover:to-purple-700'}
            text-white`}
          whileHover={{ scale: history.length === 0 ? 1 : 1.05 }}
          whileTap={{ scale: history.length === 0 ? 1 : 0.95 }}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
          </svg>
          <span className="text-xl font-bold">UNDO</span>
        </motion.button>
      </div>

      {/* Cards Container */}
      <div className="flex-1 relative">
        <AnimatePresence>
          {students.slice(currentIndex, currentIndex + 3).map((student, index) => (
            <StudentCard
              key={student.id || student.rollNo}
              student={student}
              onSwipe={handleSwipe}
              style={{
                zIndex: 3 - index,
                scale: index === 0 ? 1 : 1 - index * 0.05,
                y: index * 20,
              }}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AttendanceScreen;
