import React, { useState, useRef, useEffect } from 'react';
import '../styles/Index.css';
import TypingAnimation from '../animations/TypingAnimation';
import SeeMore from './SeeMore';
import backgroundVideo from '../media/background.mp4';

function Index() {
  const [showVideo, setShowVideo] = useState(false);

  // This function will be called when typing animation is done
  const handleTypingComplete = () => {
    setShowVideo(true);
  };
  const videoRef = useRef(null);

    useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 1; // 0.5 = half speed, adjust as needed
    }
  }, []);

  return (
    <div className="index-container">
      {/* Video Background */}
      <video
      ref={videoRef}
        className="bg-video"
        src={backgroundVideo}
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="index-content">
        <h1>
          <TypingAnimation
            text={"Hello World, I'm Thomas."}
            speed={100}
            onComplete={handleTypingComplete}
          />
        </h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <SeeMore label="About" to="/about" />
          <SeeMore label="Work" />
          <SeeMore label="Contact" to="/contact"/>
        </div>
      </div>
    </div>
  );
}

export default Index;