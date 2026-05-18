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
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';
import { ToastProvider } from './context/ToastContext';
import Toast from './components/Toast';

function App() {
  const [walletAddress, setWalletAddress] = useState('');

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Force MetaMask to display the authorization and account selection popup
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });

        // Request account access
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        setWalletAddress(accounts[0]);
        localStorage.setItem('walletConnected', 'true');

        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
          setWalletAddress(accounts[0] || '');
          if (!accounts[0]) {
            localStorage.removeItem('walletConnected');
          }
        });
      } catch (error) {
        console.error('Error connecting wallet:', error);
        // Don't alert if user rejected the request
        if (error.code !== 4001) {
          alert('Failed to connect wallet. Please make sure MetaMask is unlocked.');
        }
      }
    } else {
      alert('Please install MetaMask to use this feature!');
    }
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    localStorage.removeItem('walletConnected');
  };

  useEffect(() => {
    // Check if wallet is already connected
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined' && localStorage.getItem('walletConnected') === 'true') {
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
      <ToastProvider>
        <div className="min-h-screen relative">
          {/* Scroll to top on route change */}
          <ScrollToTop />

          {/* Floating Educational Background */}
          <FloatingBackground />

          <Navigation
            walletAddress={walletAddress}
            onConnectWallet={connectWallet}
            onDisconnectWallet={disconnectWallet}
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
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
          <Toast />
        </div>
      </ToastProvider>
    </Router>
  );
}

export default App;
