// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase, ref, set, get, child } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC47VdDc6rwIclC4QNn6xkyUSf4iAH0D54",
  authDomain: "despu-atd.firebaseapp.com",
  databaseURL: "https://despu-atd-default-rtdb.firebaseio.com",
  projectId: "despu-atd",
  storageBucket: "despu-atd.firebasestorage.app",
  messagingSenderId: "1093972872689",
  appId: "1:1093972872689:web:c4cad3ad6231c9e4eec850",
  measurementId: "G-EDQ2MP2L7T"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

// Function to initialize database with default data
export const initializeDatabase = async () => {
  try {
    const db = getDatabase(app);
    const studentsRef = ref(db, 'students');
    const snapshot = await get(studentsRef);

    if (!snapshot.exists()) {
      console.log('Initializing database with default data...');
      const defaultData = {
        students: {
          classA: [
            { id: "001", rollNo: "001", name: "Riddhi Narendra Chatorikar", serialNo: 1, status: "active" },
            { id: "002", rollNo: "002", name: "Aashay Sanjay Meharkure", serialNo: 2, status: "active" },
            { id: "003", rollNo: "003", name: "Pranav Rahul Dadhe", serialNo: 3, status: "active" },
            { id: "004", rollNo: "004", name: "Tejas Jagannath Gawande", serialNo: 4, status: "active" },
            { id: "005", rollNo: "005", name: "Shubham Deepak Dindorkar", serialNo: 5, status: "active" },
            { id: "006", rollNo: "006", name: "Kriti Bablu Singh", serialNo: 6, status: "active" },
            { id: "008", rollNo: "008", name: "Pradyumna Bhagwan Pandekar", serialNo: 7, status: "active" },
            { id: "009", rollNo: "009", name: "Mrudula Vijay Pimparwar", serialNo: 8, status: "active" },
            { id: "011", rollNo: "011", name: "Riddhee Sandeep Kulkarni", serialNo: 9, status: "active" },
            { id: "012", rollNo: "012", name: "Lobhas Mahesh Kulkarni", serialNo: 10, status: "active" },
            // Add all other students from classA
          ],
          classB: [
            { id: "B001", rollNo: "B001", name: "Aanya Khanna", serialNo: 1, status: "active" },
            { id: "B002", rollNo: "B002", name: "Abhinav Sharma", serialNo: 2, status: "active" },
            { id: "B003", rollNo: "B003", name: "Advik Patel", serialNo: 3, status: "active" },
            { id: "B004", rollNo: "B004", name: "Ahana Singh", serialNo: 4, status: "active" },
            { id: "B005", rollNo: "B005", name: "Akshay Kumar", serialNo: 5, status: "active" },
            { id: "B006", rollNo: "B006", name: "Amrita Gupta", serialNo: 6, status: "active" },
            { id: "B007", rollNo: "B007", name: "Aniket Verma", serialNo: 7, status: "active" },
            { id: "B008", rollNo: "B008", name: "Anushka Reddy", serialNo: 8, status: "active" },
            { id: "B009", rollNo: "B009", name: "Arushi Malhotra", serialNo: 9, status: "active" },
            { id: "B010", rollNo: "B010", name: "Ayush Iyer", serialNo: 10, status: "active" },
            // Add all other students from classB
          ],
          classC: [
            { id: "C001", rollNo: "C001", name: "Aaradhya Khanna", serialNo: 1, status: "active" },
            { id: "C002", rollNo: "C002", name: "Abhay Sharma", serialNo: 2, status: "active" },
            { id: "C003", rollNo: "C003", name: "Advika Patel", serialNo: 3, status: "active" },
            { id: "C004", rollNo: "C004", name: "Agastya Singh", serialNo: 4, status: "active" },
            { id: "C005", rollNo: "C005", name: "Amay Kumar", serialNo: 5, status: "active" },
            { id: "C006", rollNo: "C006", name: "Anaisha Gupta", serialNo: 6, status: "active" },
            { id: "C007", rollNo: "C007", name: "Atharv Verma", serialNo: 7, status: "active" },
            { id: "C008", rollNo: "C008", name: "Avantika Reddy", serialNo: 8, status: "active" },
            { id: "C009", rollNo: "C009", name: "Ayaan Malhotra", serialNo: 9, status: "active" },
            { id: "C010", rollNo: "C010", name: "Bhoomi Iyer", serialNo: 10, status: "active" },
            // Add all other students from classC
          ]
        }
      };

      await set(ref(db, '/'), defaultData);
      console.log('Database initialized successfully');
    } else {
      console.log('Database already contains data');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Call initializeDatabase when the app starts
initializeDatabase();

export { database };
