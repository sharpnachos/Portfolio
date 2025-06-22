import React from "react";
import { FaEnvelope, FaGithub, FaLinkedin } from "react-icons/fa";
// If Bootstrap is not yet imported globally, add this line in your main entry file:
// import 'bootstrap/dist/css/bootstrap.min.css';

const contactOptions = [
  {
    name: "GitHub",
    url: "https://github.com/yourusername",
    icon: <FaGithub />,
  },
  {
    name: "Email",
    url: "mailto:your.email@example.com",
    icon: <FaEnvelope />,
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/in/yourprofile",
    icon: <FaLinkedin />,
  },
];

const Contact = () => (
  <div className="d-flex align-items-center justify-content-center min-vh-100 bg-black text-white">
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-8 mx-auto d-flex align-items-center justify-content-center py-5">
          <div className="me-4">
            <h1>Contact Me</h1>
          </div>
          <div>
            <ul className="list-unstyled mb-0">
              {contactOptions.map((option) => (
                <li key={option.name} className="mb-3">
                  <a
                    href={option.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white text-decoration-none fs-4 d-flex align-items-center gap-2"
                  >
                    <span>{option.icon}</span>
                    <span>{option.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default Contact;