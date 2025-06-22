import React from "react";
import "../styles/About.css";
import headshot from "../media/me-headshot-bw.jpg"; // Adjust path if needed

const About = () => (
  <div className="about-container about-flex">
    <img src={headshot} alt="Headshot" className="about-headshot-large" />
    <div className="about-text">
      <h1 className="about-title-large">About Me</h1>
      <p className="about-description-large">
        Hello! I'm Lawrence Thomas Walsh III, a passionate developer with experience in building modern web applications.
        I enjoy solving problems, learning new technologies, and creating impactful digital experiences.
      </p>
    </div>
  </div>
);

export default About;