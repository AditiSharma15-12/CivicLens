import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Overview from './components/Overview';
import ReportPage from './pages/ReportPage';
import IssueMap from './components/IssueMap';
import IssueQueue from './components/IssueQueue';
import Analytics from './components/Analytics';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#FAF8F5] text-slate-800 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/map" element={<IssueMap />} />
            <Route path="/issues" element={<IssueQueue />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
