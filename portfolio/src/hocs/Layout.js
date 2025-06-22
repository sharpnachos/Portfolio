import React, { Fragment } from 'react';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const hideNavbar = location.pathname === "/";

    return (
        <Fragment>
            {!hideNavbar && <Navbar />}
            <div className="container">
                {children}
            </div>
            {/* <footer className="footer">
                <div className="container text-center">
                    <p>&copy; {new Date().getFullYear()} Thomas. All rights reserved.</p>
                    <button onClick={() => navigate('/')} className="btn btn-light">Back to Top</button>
                </div>
            </footer> */}
        </Fragment>
    )
}

export default Layout;