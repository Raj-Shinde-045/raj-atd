import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get } from 'firebase/database';
import { app } from '../../firebase';
import { motion } from 'framer-motion';

const AttendanceReports = () => {
  const [selectedClass, setSelectedClass] = useState('classA');
  const [selectedDate, setSelectedDate] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalStudents: 0,
    present: 0,
    absent: 0,
    percentage: 0
  });

  const classes = ['classA', 'classB', 'classC'];

  useEffect(() => {
    if (selectedDate) {
      fetchAttendanceData();
    }
  }, [selectedClass, selectedDate]);

  const fetchAttendanceData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const db = getDatabase(app);
      const attendanceRef = ref(db, `attendance/${selectedClass}/${selectedDate}`);
      const snapshot = await get(attendanceRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const formattedData = Object.entries(data).map(([id, status]) => ({
          id,
          status
        }));

        // Calculate statistics
        const total = formattedData.length;
        const presentCount = formattedData.filter(item => item.status === 'present').length;
        const absentCount = total - presentCount;
        const attendancePercentage = total > 0 ? (presentCount / total) * 100 : 0;

        setStats({
          totalStudents: total,
          present: presentCount,
          absent: absentCount,
          percentage: attendancePercentage.toFixed(2)
        });

        setAttendanceData(formattedData);
      } else {
        setAttendanceData([]);
        setStats({
          totalStudents: 0,
          present: 0,
          absent: 0,
          percentage: 0
        });
      }
    } catch (err) {
      setError('Failed to fetch attendance data: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Attendance Reports</h2>
          <p className="text-gray-600 mt-2">View and analyze attendance records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex gap-4">
          {classes.map((classOption) => (
            <button
              key={classOption}
              onClick={() => setSelectedClass(classOption)}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedClass === classOption
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {classOption}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white p-6 rounded-xl shadow-md"
        >
          <h3 className="text-lg font-semibold text-gray-600">Total Students</h3>
          <p className="text-3xl font-bold mt-2">{stats.totalStudents}</p>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white p-6 rounded-xl shadow-md"
        >
          <h3 className="text-lg font-semibold text-gray-600">Present</h3>
          <p className="text-3xl font-bold mt-2 text-green-600">{stats.present}</p>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white p-6 rounded-xl shadow-md"
        >
          <h3 className="text-lg font-semibold text-gray-600">Absent</h3>
          <p className="text-3xl font-bold mt-2 text-red-600">{stats.absent}</p>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white p-6 rounded-xl shadow-md"
        >
          <h3 className="text-lg font-semibold text-gray-600">Attendance %</h3>
          <p className="text-3xl font-bold mt-2 text-blue-600">{stats.percentage}%</p>
        </motion.div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan="2" className="px-6 py-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : attendanceData.length === 0 ? (
              <tr>
                <td colSpan="2" className="px-6 py-4 text-center text-gray-500">
                  No attendance data found for the selected date
                </td>
              </tr>
            ) : (
              attendanceData.map((record) => (
                <tr key={record.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.status === 'present'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceReports; 