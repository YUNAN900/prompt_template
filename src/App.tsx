import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PromptSquare from './pages/PromptSquare';
import SRTIntegration from './pages/SRTIntegration';
import QuickRef from './pages/QuickRef';
import PromptDebugPage from './pages/PromptDebugPage';
import PromptAdmin from './pages/PromptAdmin';
import Layout from './components/Layout';
import { PromptTemplate } from './types';

export default function App() {
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('selected_template');
    if (saved) {
      try {
        setSelectedTemplate(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const handleSelectTemplate = (p: PromptTemplate) => {
    setSelectedTemplate(p);
    localStorage.setItem('selected_template', JSON.stringify(p));
  };

  return (
    <Router>
      <Routes>
        <Route path="/debug" element={<PromptDebugPage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<PromptSquare />} />
          <Route path="quick-ref" element={<QuickRef selectedTemplate={selectedTemplate} onSelect={handleSelectTemplate} />} />
          <Route path="admin" element={<PromptAdmin />} />
          <Route path="srt" element={<SRTIntegration />} />
        </Route>
      </Routes>
    </Router>
  );
}
