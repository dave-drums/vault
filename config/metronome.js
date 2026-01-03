const { useState, useEffect, useRef } = React;

function Metronome() {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  const [subdivision, setSubdivision] = useState(0);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [subdivisionType, setSubdivisionType] = useState(1);
  const [beatEmphasis, setBeatEmphasis] = useState(Array(16).fill('normal'));
  const [tapTimes, setTapTimes] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);

  const subdivisions = [
    { 
      value: 1, 
      name: 'Quarter',
      latin: 'Crotchet',
      svg: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <ellipse cx="8" cy="18" rx="3.5" ry="2.5" transform="rotate(-20 8 18)"/>
          <rect x="10.5" y="5" width="2" height="13" rx="1"/>
        </svg>
      )
    },
    { 
      value: 2, 
      name: 'Eighth',
      latin: 'Quaver',
      svg: (
        <svg width="32" height="24" viewBox="0 0 32 24" fill="currentColor">
          <ellipse cx="6" cy="18" rx="3" ry="2" transform="rotate(-20 6 18)"/>
          <rect x="8" y="7" width="1.5" height="11" rx="0.75"/>
          <ellipse cx="20" cy="18" rx="3" ry="2" transform="rotate(-20 20 18)"/>
          <rect x="22" y="7" width="1.5" height="11" rx="0.75"/>
          <rect x="8" y="7" width="15.5" height="2" rx="1"/>
        </svg>
      )
    },
    { 
      value: 3, 
      name: '8th Trip',
      latin: 'Quaver Trip',
      svg: (
        <svg width="42" height="28" viewBox="0 0 42 28" fill="currentColor">
          <text x="21" y="6" fontSize="8" fontWeight="600" textAnchor="middle" fontFamily="Inter">3</text>
          <ellipse cx="6" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 6 21)"/>
          <rect x="7.5" y="10" width="1.5" height="11" rx="0.75"/>
          <ellipse cx="18" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 18 21)"/>
          <rect x="19.5" y="10" width="1.5" height="11" rx="0.75"/>
          <ellipse cx="30" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 30 21)"/>
          <rect x="31.5" y="10" width="1.5" height="11" rx="0.75"/>
          <rect x="7.5" y="10" width="25.5" height="2" rx="1"/>
        </svg>
      )
    },
    { 
      value: 4, 
      name: '16th',
      latin: 'Semiquaver',
      svg: (
        <svg width="44" height="24" viewBox="0 0 44 24" fill="currentColor">
          <ellipse cx="5" cy="18" rx="2.5" ry="1.8" transform="rotate(-20 5 18)"/>
          <rect x="6.5" y="6" width="1.5" height="12" rx="0.75"/>
          <ellipse cx="15" cy="18" rx="2.5" ry="1.8" transform="rotate(-20 15 18)"/>
          <rect x="16.5" y="6" width="1.5" height="12" rx="0.75"/>
          <ellipse cx="25" cy="18" rx="2.5" ry="1.8" transform="rotate(-20 25 18)"/>
          <rect x="26.5" y="6" width="1.5" height="12" rx="0.75"/>
          <ellipse cx="35" cy="18" rx="2.5" ry="1.8" transform="rotate(-20 35 18)"/>
          <rect x="36.5" y="6" width="1.5" height="12" rx="0.75"/>
          <rect x="6.5" y="6" width="31.5" height="1.8" rx="0.9"/>
          <rect x="6.5" y="9" width="31.5" height="1.8" rx="0.9"/>
        </svg>
      )
    },
    { 
      value: 5, 
      name: 'Fivelet',
      latin: 'Quintuplet',
      svg: (
        <svg width="52" height="28" viewBox="0 0 52 28" fill="currentColor">
          <text x="26" y="6" fontSize="8" fontWeight="600" textAnchor="middle" fontFamily="Inter">5</text>
          <ellipse cx="5" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 5 21)"/>
          <rect x="6.5" y="9" width="1.5" height="12" rx="0.75"/>
          <ellipse cx="14" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 14 21)"/>
          <rect x="15.5" y="9" width="1.5" height="12" rx="0.75"/>
          <ellipse cx="23" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 23 21)"/>
          <rect x="24.5" y="9" width="1.5" height="12" rx="0.75"/>
          <ellipse cx="32" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 32 21)"/>
          <rect x="33.5" y="9" width="1.5" height="12" rx="0.75"/>
          <ellipse cx="41" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 41 21)"/>
          <rect x="42.5" y="9" width="1.5" height="12" rx="0.75"/>
          <rect x="6.5" y="9" width="37.5" height="1.8" rx="0.9"/>
          <rect x="6.5" y="12" width="37.5" height="1.8" rx="0.9"/>
        </svg>
      )
    },
    { 
      value: 6, 
      name: '16th Tip',
      latin: 'Sextuplet',
      svg: (
        <svg width="60" height="28" viewBox="0 0 60 28" fill="currentColor">
          <text x="30" y="6" fontSize="8" fontWeight="600" textAnchor="middle" fontFamily="Inter">6</text>
          <ellipse cx="5" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 5 21)"/>
          <rect x="6.5" y="9" width="1.5" height="12" rx="0.75"/>
          <ellipse cx="13.5" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 13.5 21)"/>
          <rect x="15" y="9" width="1.5" height="12" rx="0.75"/>
          <ellipse cx="22" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 22 21)"/>
          <rect x="23.5" y="9" width="1.5" height="12" rx="0.75"/>
          <ellipse cx="30.5" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 30.5 21)"/>
          <rect x="32" y="9" width="1.5" height="12" rx="0.75"/>
          <ellipse cx="39" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 39 21)"/>
          <rect x="40.5" y="9" width="1.5" height="12" rx="0.75"/>
          <ellipse cx="47.5" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 47.5 21)"/>
          <rect x="49" y="9" width="1.5" height="12" rx="0.75"/>
          <rect x="6.5" y="9" width="44" height="1.8" rx="0.9"/>
          <rect x="6.5" y="12" width="44" height="1.8" rx="0.9"/>
        </svg>
      )
    },
    { 
      value: 7, 
      name: 'Sevenlet',
      latin: 'Septuplet',
      svg: (
        <svg width="68" height="28" viewBox="0 0 68 28" fill="currentColor">
          <text x="34" y="6" fontSize="8" fontWeight="600" textAnchor="middle" fontFamily="Inter">7</text>
          <ellipse cx="5" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 5 21)"/>
          <rect x="6.5" y="9" width="1.5" height="12" rx="0.75"/>
          <ellipse cx="13" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 13 21)"/>
          <rect x="14.5" y="9" width="1.5" height="12" rx="0.75"/>
          <ellipse cx="21" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 21 21)"/>
          <rect x="22.5" y="9" width="1.5" height="12" rx="0.75"/>
          <ellipse cx="29" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 29 21)"/>
          <rect x="30.5" y="9" width="1.5" height="12" rx="0.75"/>
          <ellipse cx="37" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 37 21)"/>
          <rect x="38.5" y="9" width="1.5" height="12" rx="0.75"/>
          <ellipse cx="45" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 45 21)"/>
          <rect x="46.5" y="9" width="1.5" height="12" rx="0.75"/>
          <ellipse cx="53" cy="21" rx="2.5" ry="1.8" transform="rotate(-20 53 21)"/>
          <rect x="54.5" y="9" width="1.5" height="12" rx="0.75"/>
          <rect x="6.5" y="9" width="49.5" height="1.8" rx="0.9"/>
          <rect x="6.5" y="12" width="49.5" height="1.8" rx="0.9"/>
        </svg>
      )
    },
    { 
      value: 8, 
      name: '32nd',
      latin: 'Demisemiquaver',
      svg: (
        <svg width="76" height="24" viewBox="0 0 76 24" fill="currentColor">
          <ellipse cx="5" cy="18" rx="2.5" ry="1.8" transform="rotate(-20 5 18)"/>
          <rect x="6.5" y="5" width="1.5" height="13" rx="0.75"/>
          <ellipse cx="13" cy="18" rx="2.5" ry="1.8" transform="rotate(-20 13 18)"/>
          <rect x="14.5" y="5" width="1.5" height="13" rx="0.75"/>
          <ellipse cx="21" cy="18" rx="2.5" ry="1.8" transform="rotate(-20 21 18)"/>
          <rect x="22.5" y="5" width="1.5" height="13" rx="0.75"/>
          <ellipse cx="29" cy="18" rx="2.5" ry="1.8" transform="rotate(-20 29 18)"/>
          <rect x="30.5" y="5" width="1.5" height="13" rx="0.75"/>
          <ellipse cx="37" cy="18" rx="2.5" ry="1.8" transform="rotate(-20 37 18)"/>
          <rect x="38.5" y="5" width="1.5" height="13" rx="0.75"/>
          <ellipse cx="45" cy="18" rx="2.5" ry="1.8" transform="rotate(-20 45 18)"/>
          <rect x="46.5" y="5" width="1.5" height="13" rx="0.75"/>
          <ellipse cx="53" cy="18" rx="2.5" ry="1.8" transform="rotate(-20 53 18)"/>
          <rect x="54.5" y="5" width="1.5" height="13" rx="0.75"/>
          <ellipse cx="61" cy="18" rx="2.5" ry="1.8" transform="rotate(-20 61 18)"/>
          <rect x="62.5" y="5" width="1.5" height="13" rx="0.75"/>
          <rect x="6.5" y="5" width="57.5" height="1.5" rx="0.75"/>
          <rect x="6.5" y="8" width="57.5" height="1.5" rx="0.75"/>
          <rect x="6.5" y="11" width="57.5" height="1.5" rx="0.75"/>
        </svg>
      )
    }
  ];

  const getRowSplit = (total) => {
    if (total <= 8) return [total];
    const splits = {
      9: [5, 4], 10: [5, 5], 11: [6, 5], 12: [6, 6],
      13: [7, 6], 14: [7, 7], 15: [8, 7], 16: [8, 8]
    };
    return splits[total] || [total];
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    setBeatEmphasis(prev => {
      const newEmphasis = Array(16).fill('normal');
      for (let i = 0; i < Math.min(beatsPerBar, prev.length); i++) {
        newEmphasis[i] = prev[i];
      }
      return newEmphasis;
    });
  }, [beatsPerBar]);

  const playClick = (isDownbeat, isSubdivision, beatIndex) => {
    if (beatIndex !== undefined && beatEmphasis[beatIndex] === 'mute') {
      return;
    }
    
    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const isAccented = beatIndex !== undefined && beatEmphasis[beatIndex] === 'accent';

    if (isDownbeat) {
      oscillator.frequency.value = isAccented ? 1400 : 900;
      gainNode.gain.value = isAccented ? 0.45 : 0.28;
    } else if (isSubdivision) {
      oscillator.frequency.value = 600;
      gainNode.gain.value = 0.2;
    } else {
      oscillator.frequency.value = isAccented ? 1100 : 900;
      gainNode.gain.value = isAccented ? 0.38 : 0.28;
    }

    oscillator.start(audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
    oscillator.stop(audioContext.currentTime + 0.08);
  };

  useEffect(() => {
    if (isPlaying) {
      playClick(true, false, 0);
      setBeat(0);
      setSubdivision(0);
      
      const beatInterval = (60 / bpm) * 1000;
      const subdivisionInterval = beatInterval / subdivisionType;
      
      let currentBeat = 0;
      let currentSubdivision = 0;
      
      intervalRef.current = setInterval(() => {
        currentSubdivision = (currentSubdivision + 1) % subdivisionType;
        
        if (currentSubdivision === 0) {
          currentBeat = (currentBeat + 1) % beatsPerBar;
          setBeat(currentBeat);
          playClick(currentBeat === 0, false, currentBeat);
        } else {
          playClick(false, true, currentBeat);
        }
        
        setSubdivision(currentSubdivision);
      }, subdivisionInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setBeat(0);
      setSubdivision(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, bpm, beatsPerBar, subdivisionType, beatEmphasis]);

  useEffect(() => {
    let timerInterval;
    if (isPlaying) {
      const startTime = Date.now() - (elapsedTime * 1000);
      timerInterval = setInterval(() => {
        setElapsedTime((Date.now() - startTime) / 1000);
      }, 100);
    } else {
      setElapsedTime(0);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [isPlaying]);

  const handleTapTempo = () => {
    const now = Date.now();
    const newTapTimes = [...tapTimes, now].slice(-4);
    setTapTimes(newTapTimes);

    if (newTapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTapTimes.length; i++) {
        intervals.push(newTapTimes[i] - newTapTimes[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      setBpm(Math.max(40, Math.min(240, calculatedBpm)));
    }

    setTimeout(() => {
      setTapTimes(prev => {
        const lastTap = prev[prev.length - 1];
        if (lastTap && Date.now() - lastTap > 3000) {
          return [];
        }
        return prev;
      });
    }, 3000);
  };

  const cycleBeatEmphasis = (index) => {
    setBeatEmphasis(prev => {
      const newEmphasis = [...prev];
      const current = newEmphasis[index];
      newEmphasis[index] = current === 'normal' ? 'accent' : current === 'accent' ? 'mute' : 'normal';
      return newEmphasis;
    });
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="metronome-wrapper" style={{ 
      minHeight: '60vh', 
      background: '#f8f9fa', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '40px 20px',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ width: '100%', maxWidth: '600px' }}>
        <div className="metronome-card" style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e9ecef'
        }}>
          
          {/* BPM Display */}
          <div className="bpm-display" style={{
            background: 'linear-gradient(135deg, #06b3fd, #38bdf8)',
            borderRadius: '16px',
            padding: '32px',
            marginBottom: '24px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(6,179,253,0.3)'
          }}>
            <div className="bpm-number" style={{
              fontSize: '55px',
              fontWeight: '600',
              color: '#fff',
              lineHeight: '1',
              marginBottom: '8px',
              fontFamily: "'Inter', sans-serif"
            }}>
              {bpm}
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: '14px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontFamily: "'Inter', sans-serif"
            }}>
              Beats Per Minute
            </div>
          </div>

          {/* Beat Indicators */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '16px',
            alignItems: 'center'
          }}>
            {getRowSplit(beatsPerBar).map((rowCount, rowIndex) => {
              const startIndex = rowIndex === 0 ? 0 : getRowSplit(beatsPerBar)[0];
              return (
                <div
                  key={rowIndex}
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {[...Array(rowCount)].map((_, colIndex) => {
                    const index = startIndex + colIndex;
                    const emphasis = beatEmphasis[index];
                    const isActive = isPlaying && beat === index;
                    
                    return (
                      <button
                        key={index}
                        onClick={() => cycleBeatEmphasis(index)}
                        className="beat-circle"
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: isActive
                            ? (index === 0 
                              ? 'linear-gradient(135deg, #06b3fd, #38bdf8)' 
                              : emphasis === 'accent'
                              ? 'linear-gradient(135deg, #06b3fd, #38bdf8)'
                              : emphasis === 'mute'
                              ? '#9ca3af'
                              : '#06b3fd')
                            : emphasis === 'accent'
                            ? 'rgba(6,179,253,0.15)'
                            : emphasis === 'mute'
                            ? '#e5e7eb'
                            : '#f8f9fa',
                          border: isActive 
                            ? 'none' 
                            : emphasis === 'accent'
                            ? '2px solid #06b3fd'
                            : emphasis === 'mute'
                            ? '2px solid #9ca3af'
                            : '2px solid #e9ecef',
                          transition: 'all 0.1s ease',
                          boxShadow: isActive 
                            ? '0 4px 12px rgba(6,179,253,0.4)'
                            : 'none',
                          transform: isActive ? 'scale(1.1)' : 'scale(1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        {isActive && subdivisionType > 1 && emphasis !== 'mute' ? (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                              {subdivisionType === 2 && [...Array(2)].map((_, subIdx) => (
                                <div key={subIdx} style={{ width: '5px', height: '5px', borderRadius: '50%', background: subIdx <= subdivision ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'all 0.05s ease' }} />
                              ))}
                              {subdivisionType === 3 && [...Array(3)].map((_, subIdx) => (
                                <div key={subIdx} style={{ width: '5px', height: '5px', borderRadius: '50%', background: subIdx <= subdivision ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'all 0.05s ease' }} />
                              ))}
                              {subdivisionType === 4 && [...Array(4)].map((_, subIdx) => (
                                <div key={subIdx} style={{ width: '5px', height: '5px', borderRadius: '50%', background: subIdx <= subdivision ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'all 0.05s ease' }} />
                              ))}
                              {subdivisionType === 5 && [...Array(3)].map((_, subIdx) => (
                                <div key={subIdx} style={{ width: '5px', height: '5px', borderRadius: '50%', background: subIdx <= subdivision ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'all 0.05s ease' }} />
                              ))}
                              {subdivisionType === 6 && [...Array(3)].map((_, subIdx) => (
                                <div key={subIdx} style={{ width: '5px', height: '5px', borderRadius: '50%', background: subIdx <= subdivision ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'all 0.05s ease' }} />
                              ))}
                              {subdivisionType === 7 && [...Array(4)].map((_, subIdx) => (
                                <div key={subIdx} style={{ width: '5px', height: '5px', borderRadius: '50%', background: subIdx <= subdivision ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'all 0.05s ease' }} />
                              ))}
                              {subdivisionType === 8 && [...Array(4)].map((_, subIdx) => (
                                <div key={subIdx} style={{ width: '5px', height: '5px', borderRadius: '50%', background: subIdx <= subdivision ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'all 0.05s ease' }} />
                              ))}
                            </div>
                            
                            {subdivisionType >= 5 && (
                              <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                                {subdivisionType === 5 && [...Array(2)].map((_, subIdx) => (
                                  <div key={subIdx + 3} style={{ width: '5px', height: '5px', borderRadius: '50%', background: (subIdx + 3) <= subdivision ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'all 0.05s ease' }} />
                                ))}
                                {subdivisionType === 6 && [...Array(3)].map((_, subIdx) => (
                                  <div key={subIdx + 3} style={{ width: '5px', height: '5px', borderRadius: '50%', background: (subIdx + 3) <= subdivision ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'all 0.05s ease' }} />
                                ))}
                                {subdivisionType === 7 && [...Array(3)].map((_, subIdx) => (
                                  <div key={subIdx + 4} style={{ width: '5px', height: '5px', borderRadius: '50%', background: (subIdx + 4) <= subdivision ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'all 0.05s ease' }} />
                                ))}
                                {subdivisionType === 8 && [...Array(4)].map((_, subIdx) => (
                                  <div key={subIdx + 4} style={{ width: '5px', height: '5px', borderRadius: '50%', background: (subIdx + 4) <= subdivision ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'all 0.05s ease' }} />
                                ))}
                              </div>
                            )}
                          </div>
                        ) : emphasis === 'mute' ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ opacity: isActive ? 1 : 0.5 }}>
                            <path d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V10.18L16.45 12.63C16.48 12.43 16.5 12.22 16.5 12ZM19 12C19 12.94 18.8 13.82 18.46 14.64L19.97 16.15C20.63 14.91 21 13.5 21 12C21 7.72 18 4.14 14 3.23V5.29C16.89 6.15 19 8.83 19 12ZM4.27 3L3 4.27L7.73 9H3V15H7L12 20V13.27L16.25 17.52C15.58 18.04 14.83 18.46 14 18.7V20.77C15.38 20.45 16.63 19.82 17.68 18.96L19.73 21L21 19.73L12 10.73L4.27 3ZM12 4L9.91 6.09L12 8.18V4Z" fill="currentColor"/>
                          </svg>
                        ) : emphasis === 'accent' ? (
                          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                            <path d="M8 18L14 10L20 18" fill="none" stroke={isActive ? '#fff' : '#06b3fd'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Slider */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '12px'
            }}>
              <button
                onClick={() => setBpm(Math.max(40, bpm - 5))}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  fontSize: '24px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                −
              </button>
              
              <div style={{ flex: '1' }}>
                <input
                  type="range"
                  min="40"
                  max="240"
                  value={bpm}
                  onChange={(e) => setBpm(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    background: '#e9ecef',
                    outline: 'none',
                    cursor: 'pointer',
                    WebkitAppearance: 'none',
                    appearance: 'none'
                  }}
                />
              </div>

              <button
                onClick={() => setBpm(Math.min(240, bpm + 5))}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  fontSize: '24px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Play/Stop and Tap Tempo */}
          <div style={{ 
            marginBottom: '24px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}>
            <button
              onClick={togglePlay}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: isPlaying ? '2px solid #06b3fd' : 'none',
                background: isPlaying 
                  ? 'rgba(6,179,253,0.15)'
                  : 'linear-gradient(135deg, #06b3fd, #38bdf8)',
                color: isPlaying ? '#06b3fd' : '#fff',
                boxShadow: isPlaying
                  ? '0 4px 12px rgba(6,179,253,0.3)'
                  : '0 4px 12px rgba(6,179,253,0.3)',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              {isPlaying ? formatTime(elapsedTime) : '▶ Start'}
            </button>

            <button
              onClick={handleTapTempo}
              className="tap-btn"
              style={{
                minWidth: '90px',
                height: '54px',
                padding: '0 16px',
                borderRadius: '10px',
                background: '#f8f9fa',
                border: '1px solid #e9ecef',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1a1a1a',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontFamily: "'Inter', sans-serif",
                transform: 'scale(1)'
              }}
            >
              <span>👆</span>
              <span>Tap</span>
            </button>
          </div>

          {/* Beats per Bar */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '12px',
              fontWeight: '600',
              fontSize: '14px',
              color: '#1a1a1a',
              fontFamily: "'Inter', sans-serif"
            }}>
              Beats per Bar
            </label>
            <div className="beats-per-bar-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: '6px'
            }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((beats) => (
                <button
                  key={beats}
                  onClick={() => setBeatsPerBar(beats)}
                  className="beats-per-bar-btn"
                  style={{
                    padding: '8px 4px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: beatsPerBar === beats 
                      ? 'linear-gradient(135deg, #06b3fd, #38bdf8)' 
                      : '#f8f9fa',
                    color: beatsPerBar === beats ? '#fff' : '#1a1a1a',
                    border: beatsPerBar === beats ? 'none' : '1px solid #e9ecef',
                    boxShadow: beatsPerBar === beats 
                      ? '0 2px 8px rgba(6,179,253,0.3)' 
                      : 'none',
                    fontFamily: "'Inter', sans-serif"
                  }}
                >
                  {beats}
                </button>
              ))}
            </div>
          </div>

          {/* Subdivisions */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '12px',
              fontWeight: '600',
              fontSize: '14px',
              color: '#1a1a1a',
              fontFamily: "'Inter', sans-serif"
            }}>
              Subdivisions
            </label>
            <div className="subdivision-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px'
            }}>
              {subdivisions.map((sub) => (
                <button
                  key={sub.value}
                  onClick={() => setSubdivisionType(sub.value)}
                  className="subdivision-btn"
                  style={{
                    padding: '12px 8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: subdivisionType === sub.value 
                      ? 'linear-gradient(135deg, #06b3fd, #38bdf8)' 
                      : '#f8f9fa',
                    color: subdivisionType === sub.value ? '#fff' : '#1a1a1a',
                    border: subdivisionType === sub.value ? 'none' : '1px solid #e9ecef',
                    boxShadow: subdivisionType === sub.value 
                      ? '0 4px 12px rgba(6,179,253,0.3)' 
                      : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    fontFamily: "'Inter', sans-serif",
                    minHeight: '72px',
                    justifyContent: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px' }}>
                    {sub.svg}
                  </div>
                  <span style={{ 
                    fontSize: '10px', 
                    fontWeight: '600',
                    opacity: subdivisionType === sub.value ? 1 : 0.6,
                    textAlign: 'center',
                    fontFamily: "'Inter', sans-serif"
                  }}>
                    {sub.name}<br/>{sub.latin}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export to window for use in other pages
window.Metronome = Metronome;
