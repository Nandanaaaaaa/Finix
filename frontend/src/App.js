// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import Chat from './chat';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

initializeApp(firebaseConfig);

const App = () => {
  const [user, setUser] = useState(null);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, [auth]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-indigo-200 p-6 font-sans">
      <div className="max-w-5xl mx-auto rounded-lg shadow-xl bg-white/90 backdrop-blur-md p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h1 className="text-4xl font-extrabold text-indigo-800">💰 FiNIX: Talk to Your Money</h1>
          {user ? (
            <button onClick={handleLogout} className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold">Logout</button>
          ) : (
            <button onClick={handleLogin} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">Login with Google</button>
          )}
        </div>
        {user ? <Chat user={user} /> : <p className="text-center text-gray-700 text-lg italic">🔒 Please login to use the chat.</p>}
      </div>
    </div>
  );
};

export default App;
