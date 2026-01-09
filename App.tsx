import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import ServicesList from './pages/ServicesList';
import Settings from './pages/Settings';
import TrackOrder from './pages/TrackOrder';
import AddFunds from './pages/AddFunds';
import AdminTransactions from './pages/AdminTransactions';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<ServicesList />} />
          <Route path="/calculator" element={<NewOrder />} />
          <Route path="/track" element={<TrackOrder />} />
          <Route path="/ai-strategy" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/add-funds" element={<AddFunds />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
