import { getDatabase, ref, get, set } from 'firebase/database';
import { app } from '../firebase';

// Admin credentials (in a real app, this would be in a secure database)
const defaultAdmin = {
  id: 'admin1',
  username: 'admin',
  password: 'admin123', // In real app, this would be hashed
  name: 'System Administrator',
  role: 'admin',
  status: 'active'
};

// Simple hash function (in a real app, use a proper hashing library)
const hashPassword = (password) => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

// Default teacher data
const defaultTeachers = [
  {
    id: 'AI001',
    username: 'oop_teacher',
    password: 'oop123', // Will be hashed during initialization
    name: 'OOP Faculty',
    email: 'oop.faculty@example.com',
    subjects: ['oop'],
    status: 'active'
  }
];

// Default subjects data
const defaultSubjects = [
  {
    id: 'oop',
    name: 'Object Oriented Programming',
    code: 'OOP',
    description: 'Learn object-oriented programming concepts and principles',
    assignedTeachers: ['AI001']
  }
];

export const authenticateTeacher = async (username, password) => {
  console.log('Attempting teacher authentication:', { username });
  
  try {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    const db = getDatabase(app);
    console.log('Got database reference');
    
    const teachersRef = ref(db, 'teachers');
    const snapshot = await get(teachersRef);
    console.log('Teachers snapshot exists:', snapshot.exists());

    if (!snapshot.exists()) {
      throw new Error('No teachers found in database');
    }

    const teachers = snapshot.val();
    console.log('Found teachers:', Object.keys(teachers).length);

    // Find teacher by username first
    const teacher = Object.values(teachers).find(t => t.username === username);
    
    if (!teacher) {
      console.log('No teacher found with username:', username);
      throw new Error('Invalid credentials');
    }

    console.log('Found teacher:', teacher.name);
    
    // Compare plain text passwords since that's what we have in the database
    if (teacher.password !== password) {
      console.log('Password mismatch');
      throw new Error('Invalid credentials');
    }

    if (teacher.status !== 'active') {
      console.log('Teacher account not active');
      throw new Error('Account is inactive');
    }

    const { password: _, ...teacherData } = teacher;
    
    // Get teacher's assigned subjects
    const subjectsRef = ref(db, 'subjects');
    const subjectsSnapshot = await get(subjectsRef);
    
    const subjects = subjectsSnapshot.exists() ? subjectsSnapshot.val() : {};
    teacherData.assignedSubjects = Object.values(subjects)
      .filter(subject => subject.assignedTeachers?.includes(teacher.id))
      .map(subject => ({
        id: subject.id,
        name: subject.name,
        code: subject.code
      }));
    
    console.log('Authentication successful:', {
      teacherId: teacher.id,
      assignedSubjects: teacherData.assignedSubjects
    });
    
    return teacherData;
  } catch (error) {
    console.error('Authentication error:', error);
    if (error.message.includes('required')) {
      throw new Error('Please enter both username and password');
    }
    if (error.message.includes('Invalid credentials')) {
      throw new Error('Invalid username or password');
    }
    if (error.message.includes('inactive')) {
      throw new Error('Account is inactive. Please contact administrator.');
    }
    if (error.message.includes('No teachers found')) {
      throw new Error('System not initialized. Please contact administrator.');
    }
    throw new Error('Login failed: ' + error.message);
  }
};

// Helper function to initialize teacher data
const initializeTeacherData = async (db) => {
  console.log('Checking if teacher data needs initialization...');
  const teachersRef = ref(db, 'teachers');
  const subjectsRef = ref(db, 'subjects');
  
  const [teachersSnapshot, subjectsSnapshot] = await Promise.all([
    get(teachersRef),
    get(subjectsRef)
  ]);

  if (!teachersSnapshot.exists() || !subjectsSnapshot.exists()) {
    console.log('Initializing teacher and subject data...');
    
    // Initialize teachers with hashed passwords
    const teacherPromises = defaultTeachers.map(teacher => 
      set(ref(db, `teachers/${teacher.id}`), {
        ...teacher,
        password: hashPassword(teacher.password)
      })
    );

    // Initialize subjects
    const subjectPromises = defaultSubjects.map(subject =>
      set(ref(db, `subjects/${subject.id}`), subject)
    );

    await Promise.all([...teacherPromises, ...subjectPromises]);
    console.log('Teacher and subject data initialized');
  } else {
    console.log('Teacher and subject data already exists');
  }
};

export const authenticateAdmin = async (username, password) => {
  try {
    // Input validation
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    const db = getDatabase(app);
    const adminsRef = ref(db, 'admins');
    const snapshot = await get(adminsRef);

    // If no admins exist in the database, check against default admin
    if (!snapshot.exists()) {
      if (username === defaultAdmin.username && password === defaultAdmin.password) {
        // Create admin in database for future use
        const adminData = {
          ...defaultAdmin,
          password: hashPassword(defaultAdmin.password),
          lastLogin: new Date().toISOString()
        };
        await set(ref(db, `admins/${defaultAdmin.id}`), adminData);
        
        // Initialize settings if they don't exist
        const settingsRef = ref(db, 'settings');
        const settingsSnapshot = await get(settingsRef);
        if (!settingsSnapshot.exists()) {
          await set(settingsRef, {
            allowTeacherRegistration: false,
            requireAttendanceApproval: true,
            attendanceCutoffTime: '10:00',
            notifyAbsentees: true,
            maxAbsencesBeforeAlert: 3,
            academicYear: new Date().getFullYear().toString(),
            semester: '1'
          });
        }
        
        const { password: _, ...returnData } = defaultAdmin;
        return returnData;
      }
      throw new Error('Invalid admin credentials');
    }

    // Check credentials against database
    const admins = snapshot.val();
    const admin = Object.values(admins).find(a => 
      a.username === username && 
      a.password === hashPassword(password)
    );

    if (!admin) {
      throw new Error('Invalid admin credentials');
    }

    if (admin.status === 'inactive') {
      throw new Error('Account is inactive. Please contact support.');
    }

    // Update last login time and get system stats
    const { password: _, ...adminData } = admin;
    adminData.lastLogin = new Date().toISOString();
    await set(ref(db, `admins/${admin.id}/lastLogin`), adminData.lastLogin);

    // Get quick system stats
    const studentsRef = ref(db, 'students');
    const teachersRef = ref(db, 'teachers');
    const subjectsRef = ref(db, 'subjects');

    const [studentsSnapshot, teachersSnapshot, subjectsSnapshot] = await Promise.all([
      get(studentsRef),
      get(teachersRef),
      get(subjectsRef)
    ]);

    adminData.stats = {
      totalStudents: studentsSnapshot.exists() ? 
        Object.values(studentsSnapshot.val()).reduce((acc, curr) => acc + curr.length, 0) : 0,
      totalTeachers: teachersSnapshot.exists() ? Object.keys(teachersSnapshot.val()).length : 0,
      totalSubjects: subjectsSnapshot.exists() ? Object.keys(subjectsSnapshot.val()).length : 0
    };

    return adminData;
  } catch (error) {
    // Return user-friendly error messages
    if (error.message.includes('required')) {
      throw new Error('Please enter both username and password');
    }
    if (error.message.includes('Invalid credentials')) {
      throw new Error('Invalid username or password');
    }
    if (error.message.includes('inactive')) {
      throw new Error('Account is inactive. Please contact support.');
    }
    throw new Error('Login failed. Please try again later.');
  }
};

export const logout = async () => {
  try {
    const adminData = JSON.parse(sessionStorage.getItem('adminData') || '{}');
    if (adminData.id) {
      const db = getDatabase(app);
      await set(ref(db, `admins/${adminData.id}/lastLogout`), new Date().toISOString());
    }
    
    // Clear all stored data
    sessionStorage.clear();
    localStorage.clear();
  } catch (error) {
    console.error('Logout error:', error);
  }
}; 