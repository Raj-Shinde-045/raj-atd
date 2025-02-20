import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get, set, remove } from 'firebase/database';
import { app } from '../../firebase';
import { motion, AnimatePresence } from 'framer-motion';

const SubjectManagement = () => {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    assignedTeachers: []
  });

  useEffect(() => {
    fetchSubjects();
    fetchTeachers();
  }, []);

  const fetchSubjects = async () => {
    setIsLoading(true);
    setError('');
    try {
      const db = getDatabase(app);
      const subjectsRef = ref(db, 'subjects');
      const snapshot = await get(subjectsRef);
      
      if (snapshot.exists()) {
        const subjectsData = snapshot.val();
        const subjectsArray = Object.entries(subjectsData).map(([key, value]) => ({
          id: key,
          ...value
        }));
        setSubjects(subjectsArray);
      } else {
        setSubjects([]);
      }
    } catch (err) {
      setError('Failed to fetch subjects: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const db = getDatabase(app);
      const teachersRef = ref(db, 'teachers');
      const snapshot = await get(teachersRef);
      
      if (snapshot.exists()) {
        const teachersData = snapshot.val();
        const teachersArray = Object.entries(teachersData).map(([key, value]) => ({
          id: key,
          ...value
        }));
        setTeachers(teachersArray);
      } else {
        setTeachers([]);
      }
    } catch (err) {
      setError('Failed to fetch teachers: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const db = getDatabase(app);
      const subjectId = editingSubject ? editingSubject.id : formData.code.toLowerCase();

      await set(ref(db, `subjects/${subjectId}`), {
        ...formData,
        id: subjectId
      });

      setIsModalOpen(false);
      setEditingSubject(null);
      setFormData({ name: '', code: '', description: '', assignedTeachers: [] });
      fetchSubjects();
    } catch (err) {
      setError('Failed to save subject: ' + err.message);
    }
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code,
      description: subject.description || '',
      assignedTeachers: subject.assignedTeachers || []
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (subjectId) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    
    try {
      const db = getDatabase(app);
      await remove(ref(db, `subjects/${subjectId}`));
      fetchSubjects();
    } catch (err) {
      setError('Failed to delete subject: ' + err.message);
    }
  };

  const handleTeacherToggle = (teacherId) => {
    setFormData(prev => {
      const assignedTeachers = [...(prev.assignedTeachers || [])];
      const index = assignedTeachers.indexOf(teacherId);
      
      if (index === -1) {
        assignedTeachers.push(teacherId);
      } else {
        assignedTeachers.splice(index, 1);
      }
      
      return { ...prev, assignedTeachers };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Subject Management</h2>
          <p className="text-gray-600 mt-2">Manage subjects and their assignments</p>
        </div>
        <button
          onClick={() => {
            setEditingSubject(null);
            setFormData({ name: '', code: '', description: '', assignedTeachers: [] });
            setIsModalOpen(true);
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add New Subject
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-8">Loading...</div>
        ) : subjects.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No subjects found
          </div>
        ) : (
          subjects.map((subject) => (
            <motion.div
              key={subject.id}
              layout
              className="bg-white rounded-xl shadow-md p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{subject.name}</h3>
                  <p className="text-gray-600 text-sm">Code: {subject.code}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(subject)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(subject.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              {subject.description && (
                <p className="text-gray-600 text-sm mb-4">{subject.description}</p>
              )}

              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Assigned Teachers:</h4>
                <div className="flex flex-wrap gap-2">
                  {subject.assignedTeachers?.map((teacherId) => {
                    const teacher = teachers.find(t => t.id === teacherId);
                    return teacher ? (
                      <span
                        key={teacherId}
                        className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs"
                      >
                        {teacher.name}
                      </span>
                    ) : null;
                  })}
                  {!subject.assignedTeachers?.length && (
                    <span className="text-gray-500 text-sm">No teachers assigned</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add/Edit Subject Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl p-8 max-w-md w-full mx-4"
            >
              <h3 className="text-2xl font-bold mb-6">
                {editingSubject ? 'Edit Subject' : 'Add New Subject'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Teachers
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {teachers.map((teacher) => (
                      <label key={teacher.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.assignedTeachers?.includes(teacher.id)}
                          onChange={() => handleTeacherToggle(teacher.id)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{teacher.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingSubject ? 'Save Changes' : 'Add Subject'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubjectManagement; 