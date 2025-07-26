// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { AuthProvider } from './contexts/AuthContext';
import Chat from './chat';
import BackendStatus from './components/ui/BackendStatus';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
initializeApp(firebaseConfig);

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    let isMounted = true;
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (isMounted) {
        setUser(user);
        setLoading(false);
      }
    });
    
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [auth]);

  // Coin animation effect
  useEffect(() => {
    const canvas = document.getElementById('coins');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const coinsArray = [];
    const coinCount = 50;
    
    // Unicode coin symbols
    const coinSymbols = ['₿', 'Ξ', 'Ł', '$', '€', '£', '₹', '¥', '¢'];

    class Coin {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 20 + 15;
        this.speedX = (Math.random() - 0.5) * 2;
        this.speedY = (Math.random() - 0.5) * 2;
        this.symbol = coinSymbols[Math.floor(Math.random() * coinSymbols.length)];
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
        this.opacity = Math.random() * 0.5 + 0.3;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;

        // Bounce off edges
        if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
        if (this.y > canvas.height || this.y < 0) this.speedY *= -1;

        // Keep within bounds
        this.x = Math.max(0, Math.min(canvas.width, this.x));
        this.y = Math.max(0, Math.min(canvas.height, this.y));
      }

      draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add subtle shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillText(this.symbol, 0, 0);
        ctx.restore();
      }
    }

    const init = () => {
      for (let i = 0; i < coinCount; i++) {
        coinsArray.push(new Coin());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < coinsArray.length; i++) {
        coinsArray[i].update();
        coinsArray[i].draw();
      }
      requestAnimationFrame(animate);
    };

    init();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Show loading screen
  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="fixed inset-0 bg-gradient-animation z-0"></div>
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-white mb-2">💰 FiNIX</h1>
            <p className="text-white/80">Loading your financial assistant...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <div className="relative min-h-screen overflow-hidden">
        {/* Backend Status Indicator */}
        <BackendStatus />
        
        {/* Animated Gradient Background */}
        <div className="fixed inset-0 bg-gradient-animation z-0"></div>
        
        {/* Floating Coins */}
        <canvas 
          id="coins" 
          className="fixed inset-0 z-0"
          style={{ pointerEvents: 'none' }}
        ></canvas>

        {/* Main Content */}
        <div className="relative z-10 min-h-screen p-6 font-sans flex items-center justify-center">
          {!user ? (
            <div className="flex flex-col items-center w-full space-y-6">
              <h1 className="text-4xl font-extrabold text-indigo-800 text-center">💰 FiNIX: Talk to Your Money</h1>
              <button
                onClick={handleLogin}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
              >
                Login with Google
              </button>
              <p className="text-center text-gray-700 text-lg italic">🔒 Please login to use the chat.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center w-full mb-6 border-b pb-4">
                <h1 className="text-4xl font-extrabold text-indigo-800">💰 FiNIX: Talk to Your Money</h1>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  Logout
                </button>
              </div>
              <Chat />
            </>
          )}
        </div>
      </div>
    </AuthProvider>
  );
};

export default App;