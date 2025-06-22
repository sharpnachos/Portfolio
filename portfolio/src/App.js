import './App.css';
import Index from './components/Index'; 
import About from './components/About';
import Contact from './components/Contact';
import Layout from './hocs/Layout';
import { Routes, Route, useLocation } from 'react-router-dom';

function AppContent() {
  const location = useLocation();
  const hideNavbar = location.pathname === "/";

  return (
    <>
      <Layout>
        <Routes>
          <Route exact path='/' element={<Index />} />
          <Route path='/about' element={<About />} />
          <Route path='/work' element={<Index />} />
          <Route path='/contact' element={<Contact />} />
          {/* Add more routes as needed */}
        </Routes>
      </Layout>
    </>
  );
}

export default AppContent;
