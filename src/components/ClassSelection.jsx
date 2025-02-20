import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getDatabase, ref, get } from 'firebase/database';
import { app } from '../firebase';

const ClassSelection = () => {
  const navigate = useNavigate();
  const teacherData = JSON.parse(sessionStorage.getItem('teacherData') || '{}');
  const [studentCounts, setStudentCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Class mapping
  const classMapping = {
    'CSE-1': 'classA',
    'CSE-2': 'classB',
    'CSE-3': 'classC'
  };

  useEffect(() => {
    const fetchStudentCounts = async () => {
      try {
        const db = getDatabase(app);
        const studentsRef = ref(db, 'students');
        const snapshot = await get(studentsRef);

        if (snapshot.exists()) {
          const data = snapshot.val();
          const counts = {};
          
          Object.keys(classMapping).forEach(className => {
            const dbClass = classMapping[className];
            const classStudents = data[dbClass] || [];
            counts[className] = Array.isArray(classStudents) 
              ? classStudents.length 
              : Object.keys(classStudents).length;
          });
          
          setStudentCounts(counts);
        }
      } catch (error) {
        console.error('Error fetching student counts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentCounts();
  }, []);

  const classes = [
    { id: '1A', name: 'CSE-1', students: studentCounts['CSE-1'] || 0 },
    { id: '1B', name: 'CSE-2', students: studentCounts['CSE-2'] || 0 },
    { id: '1C', name: 'CSE-3', students: studentCounts['CSE-3'] || 0 },
  ];

  const handleClassSelect = (classData) => {
    navigate('/subject', { 
      state: { 
        className: classData.name,
        studentCount: classData.students
      } 
    });
  };

  return (
    <div className="container mx-auto px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
          Welcome, {teacherData.name}
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Please select a class to take attendance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {classes.map((classData) => (
          <motion.div
            key={classData.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <button
              onClick={() => handleClassSelect(classData)}
              className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 
                         hover:shadow-xl transition-shadow
                         dark:shadow-gray-900/50 dark:hover:shadow-gray-900/70"
            >
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
                {classData.name}
              </h2>
              {isLoading ? (
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  Loading...
                </p>
              ) : (
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  {classData.students} Students
                </p>
              )}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ClassSelection;