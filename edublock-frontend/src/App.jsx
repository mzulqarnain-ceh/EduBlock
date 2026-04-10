import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import ScrollToTop from './components/ScrollToTop';
import FloatingBackground from './components/FloatingBackground';
import ErrorBoundary from './components/ErrorBoundary';
import Landing from './pages/Landing';
import Verification from './pages/Verification';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ContactUs from './pages/ContactUs';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

function App() {
  const [walletAddress, setWalletAddress] = useState('');

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Request account access
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        setWalletAddress(accounts[0]);

        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
          setWalletAddress(accounts[0] || '');
        });
      } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Failed to connect wallet. Please make sure MetaMask is installed.');
      }
    } else {
      alert('Please install MetaMask to use this feature!');
    }
  };

  useEffect(() => {
    // Check if wallet is already connected
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts'
          });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };

    checkConnection();
  }, []);

  return (
    <Router>
      <div className="min-h-screen relative">
        {/* Scroll to top on route change */}
        <ScrollToTop />

        {/* Floating Educational Background */}
        <FloatingBackground />

        <Navigation
          walletAddress={walletAddress}
          onConnectWallet={connectWallet}
        />
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/verify" element={<Verification />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/superadmin" element={<SuperAdminDashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </Router>
  );
}

export default App;
