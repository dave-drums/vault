const { useState, useEffect, useRef } = React;

function Metronome() {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  const [subdivision, setSubdivision] = useState(0);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [subdivisionType, setSubdivisionType] = useState(1);
  const [beatEmphasis, setBeatEmphasis] = useState(['accent', ...Array(15).fill('normal')]);
  const [tapTimes, setTapTimes] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showTrainerPopup, setShowTrainerPopup] = useState(false);
  const [showBeatsPopup, setShowBeatsPopup] = useState(false);
  const [showSubdivisionsPopup, setShowSubdivisionsPopup] = useState(false);
  const [trainerMode, setTrainerMode] = useState('off');
  const [trainerAmount, setTrainerAmount] = useState(5);
  const [trainerInterval, setTrainerInterval] = useState(4);
  const [trainerStop, setTrainerStop] = useState(200);
  const [trainerPressed, setTrainerPressed] = useState(false);
  const [tapPressed, setTapPressed] = useState(false);
  const [minusPressed, setMinusPressed] = useState(false);
  const [plusPressed, setPlusPressed] = useState(false);
  const intervalRef = useRef(null);
  const audioBuffersRef = useRef({});
  const audioContextRef = useRef(null);
  const barCountRef = useRef(0);
  const bpmRef = useRef(120);
  const trainerModeRef = useRef('off');
  const trainerAmountRef = useRef(5);
  const trainerIntervalRef = useRef(4);
  const trainerStopRef = useRef(200);
  const nextNoteTimeRef = useRef(0);
  const currentBeatRef = useRef(0);
  const currentSubdivisionRef = useRef(0);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { trainerModeRef.current = trainerMode; }, [trainerMode]);
  useEffect(() => { trainerAmountRef.current = trainerAmount; }, [trainerAmount]);
  useEffect(() => { trainerIntervalRef.current = trainerInterval; }, [trainerInterval]);
  useEffect(() => { trainerStopRef.current = trainerStop; }, [trainerStop]);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const loadSound = async (url) => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return await audioContextRef.current.decodeAudioData(arrayBuffer);
    };
    Promise.all([
      loadSound('/assets/metronome-low.mp3'),
      loadSound('/assets/metronome-normal.mp3'),
      loadSound('/assets/metronome-high.mp3')
    ]).then(([low, normal, high]) => {
      audioBuffersRef.current = { low, normal, high };
    });
    return () => { if (audioContextRef.current) audioContextRef.current.close(); };
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT') return;
      switch(e.key) {
        case ' ': e.preventDefault(); setIsPlaying(prev => !prev); break;
        case 'ArrowUp': e.preventDefault(); setBpm(prev => Math.min(300, prev + 1)); break;
        case 'ArrowDown': e.preventDefault(); setBpm(prev => Math.max(1, prev - 1)); break;
        case 'ArrowRight': e.preventDefault(); setBpm(prev => Math.min(300, prev + 5)); break;
        case 'ArrowLeft': e.preventDefault(); setBpm(prev => Math.max(1, prev - 5)); break;
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const subdivisions = [
    { value: 1, name: 'Quarter', svg: React.createElement('div', { style: { transform: 'scaleY(1.2)' }}, React.createElement('svg', { width: "24", height: "24", viewBox: "0 0 24 24", fill: "currentColor" }, React.createElement('ellipse', { cx: "8", cy: "18", rx: "3.5", ry: "2.5", transform: "rotate(-20 8 18)" }), React.createElement('rect', { x: "10.5", y: "5", width: "2", height: "13", rx: "1" }))) },
    { value: 2, name: 'Eighth', svg: React.createElement('div', { style: { transform: 'scaleY(1.2)' }}, React.createElement('svg', { width: "32", height: "24", viewBox: "0 0 32 24", fill: "currentColor" }, React.createElement('ellipse', { cx: "6", cy: "18", rx: "3", ry: "2", transform: "rotate(-20 6 18)" }), React.createElement('rect', { x: "8", y: "7", width: "1.5", height: "11", rx: "0.75" }), React.createElement('ellipse', { cx: "20", cy: "18", rx: "3", ry: "2", transform: "rotate(-20 20 18)" }), React.createElement('rect', { x: "22", y: "7", width: "1.5", height: "11", rx: "0.75" }), React.createElement('rect', { x: "8", y: "7", width: "15.5", height: "2", rx: "1" }))) },
    { value: 3, name: '8th Triplet', svg: React.createElement('div', { style: { transform: 'scaleY(1.2)' }}, React.createElement('svg', { width: "42", height: "28", viewBox: "0 0 42 28", fill: "currentColor" }, React.createElement('text', { x: "21", y: "6", fontSize: "8", fontWeight: "600", textAnchor: "middle", fontFamily: "Inter" }, '3'), React.createElement('ellipse', { cx: "6", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 6 21)" }), React.createElement('rect', { x: "7.5", y: "10", width: "1.5", height: "11", rx: "0.75" }), React.createElement('ellipse', { cx: "18", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 18 21)" }), React.createElement('rect', { x: "19.5", y: "10", width: "1.5", height: "11", rx: "0.75" }), React.createElement('ellipse', { cx: "30", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 30 21)" }), React.createElement('rect', { x: "31.5", y: "10", width: "1.5", height: "11", rx: "0.75" }), React.createElement('rect', { x: "7.5", y: "10", width: "25.5", height: "2", rx: "1" }))) },
    { value: 4, name: '16th', svg: React.createElement('div', { style: { transform: 'scaleY(1.2)' }}, React.createElement('svg', { width: "44", height: "24", viewBox: "0 0 44 24", fill: "currentColor" }, React.createElement('ellipse', { cx: "5", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 5 18)" }), React.createElement('rect', { x: "6.5", y: "6", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "15", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 15 18)" }), React.createElement('rect', { x: "16.5", y: "6", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "25", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 25 18)" }), React.createElement('rect', { x: "26.5", y: "6", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "35", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 35 18)" }), React.createElement('rect', { x: "36.5", y: "6", width: "1.5", height: "12", rx: "0.75" }), React.createElement('rect', { x: "6.5", y: "6", width: "31.5", height: "1.8", rx: "0.9" }), React.createElement('rect', { x: "6.5", y: "9", width: "31.5", height: "1.8", rx: "0.9" }))) },
    { value: 5, name: 'Fivelet', svg: React.createElement('div', { style: { transform: 'scaleY(1.2)' }}, React.createElement('svg', { width: "52", height: "28", viewBox: "0 0 52 28", fill: "currentColor" }, React.createElement('text', { x: "26", y: "6", fontSize: "8", fontWeight: "600", textAnchor: "middle", fontFamily: "Inter" }, '5'), React.createElement('ellipse', { cx: "5", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 5 21)" }), React.createElement('rect', { x: "6.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "14", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 14 21)" }), React.createElement('rect', { x: "15.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "23", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 23 21)" }), React.createElement('rect', { x: "24.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "32", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 32 21)" }), React.createElement('rect', { x: "33.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "41", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 41 21)" }), React.createElement('rect', { x: "42.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('rect', { x: "6.5", y: "9", width: "37.5", height: "1.8", rx: "0.9" }), React.createElement('rect', { x: "6.5", y: "12", width: "37.5", height: "1.8", rx: "0.9" }))) },
    { value: 6, name: '16th Triplet', svg: React.createElement('div', { style: { transform: 'scaleY(1.2)' }}, React.createElement('svg', { width: "60", height: "28", viewBox: "0 0 60 28", fill: "currentColor" }, React.createElement('text', { x: "30", y: "6", fontSize: "8", fontWeight: "600", textAnchor: "middle", fontFamily: "Inter" }, '6'), React.createElement('ellipse', { cx: "5", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 5 21)" }), React.createElement('rect', { x: "6.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "13.5", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 13.5 21)" }), React.createElement('rect', { x: "15", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "22", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 22 21)" }), React.createElement('rect', { x: "23.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "30.5", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 30.5 21)" }), React.createElement('rect', { x: "32", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "39", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 39 21)" }), React.createElement('rect', { x: "40.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "47.5", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 47.5 21)" }), React.createElement('rect', { x: "49", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('rect', { x: "6.5", y: "9", width: "44", height: "1.8", rx: "0.9" }), React.createElement('rect', { x: "6.5", y: "12", width: "44", height: "1.8", rx: "0.9" }))) },
    { value: 7, name: 'Sevenlet', svg: React.createElement('div', { style: { transform: 'scaleY(1.2)' }}, React.createElement('svg', { width: "68", height: "28", viewBox: "0 0 68 28", fill: "currentColor" }, React.createElement('text', { x: "34", y: "6", fontSize: "8", fontWeight: "600", textAnchor: "middle", fontFamily: "Inter" }, '7'), React.createElement('ellipse', { cx: "5", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 5 21)" }), React.createElement('rect', { x: "6.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "13", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 13 21)" }), React.createElement('rect', { x: "14.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "21", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 21 21)" }), React.createElement('rect', { x: "22.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "29", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 29 21)" }), React.createElement('rect', { x: "30.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "37", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 37 21)" }), React.createElement('rect', { x: "38.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "45", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 45 21)" }), React.createElement('rect', { x: "46.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('ellipse', { cx: "53", cy: "21", rx: "2.5", ry: "1.8", transform: "rotate(-20 53 21)" }), React.createElement('rect', { x: "54.5", y: "9", width: "1.5", height: "12", rx: "0.75" }), React.createElement('rect', { x: "6.5", y: "9", width: "49.5", height: "1.8", rx: "0.9" }), React.createElement('rect', { x: "6.5", y: "12", width: "49.5", height: "1.8", rx: "0.9" }))) },
    { value: 8, name: '32nd', svg: React.createElement('div', { style: { transform: 'scaleY(1.2)' }}, React.createElement('svg', { width: "76", height: "24", viewBox: "0 0 76 24", fill: "currentColor" }, React.createElement('ellipse', { cx: "5", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 5 18)" }), React.createElement('rect', { x: "6.5", y: "5", width: "1.5", height: "13", rx: "0.75" }), React.createElement('ellipse', { cx: "13", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 13 18)" }), React.createElement('rect', { x: "14.5", y: "5", width: "1.5", height: "13", rx: "0.75" }), React.createElement('ellipse', { cx: "21", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 21 18)" }), React.createElement('rect', { x: "22.5", y: "5", width: "1.5", height: "13", rx: "0.75" }), React.createElement('ellipse', { cx: "29", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 29 18)" }), React.createElement('rect', { x: "30.5", y: "5", width: "1.5", height: "13", rx: "0.75" }), React.createElement('ellipse', { cx: "37", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 37 18)" }), React.createElement('rect', { x: "38.5", y: "5", width: "1.5", height: "13", rx: "0.75" }), React.createElement('ellipse', { cx: "45", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 45 18)" }), React.createElement('rect', { x: "46.5", y: "5", width: "1.5", height: "13", rx: "0.75" }), React.createElement('ellipse', { cx: "53", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 53 18)" }), React.createElement('rect', { x: "54.5", y: "5", width: "1.5", height: "13", rx: "0.75" }), React.createElement('ellipse', { cx: "61", cy: "18", rx: "2.5", ry: "1.8", transform: "rotate(-20 61 18)" }), React.createElement('rect', { x: "62.5", y: "5", width: "1.5", height: "13", rx: "0.75" }), React.createElement('rect', { x: "6.5", y: "5", width: "57.5", height: "1.5", rx: "0.75" }), React.createElement('rect', { x: "6.5", y: "8", width: "57.5", height: "1.5", rx: "0.75" }), React.createElement('rect', { x: "6.5", y: "11", width: "57.5", height: "1.5", rx: "0.75" }))) }
  ];

  const playClick = (isSubdivision, currentBeatIndex, time) => {
    if (beatEmphasis[currentBeatIndex] === 'mute') return;
    const audioContext = audioContextRef.current;
    if (!audioContext || !audioBuffersRef.current.low) return;
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    if (isSubdivision) {
      source.buffer = audioBuffersRef.current.low;
      gainNode.gain.value = 0.15;
    } else if (beatEmphasis[currentBeatIndex] === 'accent') {
      source.buffer = audioBuffersRef.current.high;
      gainNode.gain.value = 0.4;
    } else {
      source.buffer = audioBuffersRef.current.normal;
      gainNode.gain.value = 0.25;
    }
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start(time);
  };

  const getRowSplit = (total) => {
    if (total <= 8) return [total];
    const splits = { 9: [5, 4], 10: [5, 5], 11: [6, 5], 12: [6, 6], 13: [7, 6], 14: [7, 7], 15: [8, 7], 16: [8, 8] };
    return splits[total] || [total];
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    setBeatEmphasis(prev => {
      const newEmphasis = ['accent', ...Array(15).fill('normal')];
      for (let i = 0; i < beatsPerBar && i < prev.length; i++) {
        newEmphasis[i] = prev[i];
      }
      return newEmphasis;
    });
  }, [beatsPerBar]);

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setBeat(0);
      setSubdivision(0);
      barCountRef.current = 0;
      currentBeatRef.current = 0;
      currentSubdivisionRef.current = 0;
      return;
    }

    const audioContext = audioContextRef.current;
    if (!audioContext) return;
    
    setBeat(0);
    setSubdivision(0);
    barCountRef.current = 0;
    currentBeatRef.current = 0;
    currentSubdivisionRef.current = 0;
    nextNoteTimeRef.current = audioContext.currentTime;

    const scheduleAheadTime = 0.1;
    const lookahead = 25;

    const scheduler = () => {
      const subdivisionInterval = (60 / bpmRef.current) / subdivisionType;
      
      while (nextNoteTimeRef.current < audioContext.currentTime + scheduleAheadTime) {
        const scheduleTime = nextNoteTimeRef.current;
        const displayTime = (scheduleTime - audioContext.currentTime) * 1000;
        const beatToPlay = currentBeatRef.current;
        const subdivisionToPlay = currentSubdivisionRef.current;
        
        if (currentSubdivisionRef.current === 0) {
          playClick(false, currentBeatRef.current, scheduleTime);
          setTimeout(() => setBeat(beatToPlay), Math.max(0, displayTime));
        } else {
          playClick(true, currentBeatRef.current, scheduleTime);
        }
        
        setTimeout(() => setSubdivision(subdivisionToPlay), Math.max(0, displayTime));
        
        currentSubdivisionRef.current++;
        
        if (currentSubdivisionRef.current >= subdivisionType) {
          currentSubdivisionRef.current = 0;
          currentBeatRef.current++;
          
          if (currentBeatRef.current >= beatsPerBar) {
            currentBeatRef.current = 0;
            barCountRef.current++;
            
            const mode = trainerModeRef.current;
            if (mode === 'increase' && barCountRef.current > 0 && barCountRef.current % trainerIntervalRef.current === 0) {
              setBpm(prev => {
                const newBpm = prev + trainerAmountRef.current;
                return newBpm <= trainerStopRef.current ? newBpm : prev;
              });
            } else if (mode === 'decrease' && barCountRef.current > 0 && barCountRef.current % trainerIntervalRef.current === 0) {
              setBpm(prev => {
                const newBpm = prev - trainerAmountRef.current;
                return newBpm >= trainerStopRef.current ? newBpm : prev;
              });
            }
          }
        }
        
        nextNoteTimeRef.current += subdivisionInterval;
      }
    };
    
    scheduler();
    intervalRef.current = setInterval(scheduler, lookahead);
    
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, beatsPerBar, subdivisionType, beatEmphasis]);

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
    return () => { if (timerInterval) clearInterval(timerInterval); };
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
      setBpm(Math.max(1, Math.min(300, calculatedBpm)));
    }
    setTimeout(() => {
      setTapTimes(prev => {
        const lastTap = prev[prev.length - 1];
        if (lastTap && Date.now() - lastTap > 3000) return [];
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

  const handleBpmButtonDown = (change) => {
    setBpm(prev => Math.max(1, Math.min(300, prev + change)));
    const interval = setInterval(() => {
      setBpm(prev => Math.max(1, Math.min(300, prev + change)));
    }, 150);
    const stopHold = () => {
      clearInterval(interval);
      document.removeEventListener('mouseup', stopHold);
      document.removeEventListener('mouseleave', stopHold);
    };
    document.addEventListener('mouseup', stopHold);
    document.addEventListener('mouseleave', stopHold);
  };

  const handleTrainerClick = () => {
    setIsPlaying(false);
    setShowTrainerPopup(true);
  };

  const handleBpmChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setBpm(Math.max(1, Math.min(300, value)));
    } else if (e.target.value === '') {
      setBpm('');
    }
  };

  const handleBpmBlur = () => {
    if (bpm === '' || bpm < 1) setBpm(1);
    if (bpm > 300) setBpm(300);
  };

  const trainerActive = trainerMode !== 'off';

  return React.createElement('div', { className: "metronome-wrapper", style: { minHeight: '60vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: "'Inter', sans-serif" }},
    React.createElement('style', null, `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      input[type="range"]::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      .beat-circle {
        width: clamp(32px, calc((100vw - 140px) / 8), 48px) !important;
        height: clamp(32px, calc((100vw - 140px) / 8), 48px) !important;
      }
      .subdivision-dot {
        width: clamp(3.3px, calc((100vw - 140px) / 96), 5px) !important;
        height: clamp(3.3px, calc((100vw - 140px) / 96), 5px) !important;
      }
      @media (max-width: 560px) {
        .subdivision-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        .beats-popup-grid {
          grid-template-columns: repeat(4, 1fr) !important;
        }
        .subdivisions-popup-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
      }
    `),
    React.createElement('div', { style: { width: '100%', maxWidth: '600px' }},
      React.createElement('div', { className: "metronome-card", style: { background: '#fff', borderRadius: '15px', padding: '30px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', border: '2px solid #e9ecef' }},
        React.createElement('div', { className: "bpm-display", style: { background: 'linear-gradient(135deg, #06b3fd, #38bdf8)', borderRadius: '15px', padding: '20px', marginBottom: '24px', boxShadow: '0 4px 12px rgba(6,179,253,0.3)' }},
          React.createElement('div', { style: { textAlign: 'center', marginBottom: '8px' }},
            React.createElement('input', { type: "text", value: bpm, onChange: handleBpmChange, onBlur: handleBpmBlur, style: { fontSize: '80px', fontWeight: '600', color: '#fff', lineHeight: '1', marginBottom: '8px', fontFamily: "'Inter', sans-serif", background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', width: '100%', padding: 0 }}),
            React.createElement('div', { style: { color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'Inter', sans-serif" }}, 'Beats Per Minute')
          ),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' }},
            React.createElement('button', { 
              onMouseDown: () => { setMinusPressed(true); handleBpmButtonDown(-5); }, 
              onMouseUp: () => setMinusPressed(false), 
              onMouseLeave: () => setMinusPressed(false), 
              style: { width: '45px', height: '45px', background: '#fff', borderRadius: '10px', border: '2px solid #fff', fontSize: '24px', fontWeight: '600', color: '#06b3fd', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', transform: minusPressed ? 'translateY(2px)' : 'translateY(0)' }
            }, '−'),
            React.createElement('div', { style: { flex: '1' }},
              React.createElement('input', { type: "range", min: "1", max: "300", value: bpm, onChange: (e) => setBpm(parseInt(e.target.value)), style: { width: '100%', height: '8px', borderRadius: '4px', background: '#7dd3fc', outline: 'none', cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' }})
            ),
            React.createElement('button', { 
              onMouseDown: () => { setPlusPressed(true); handleBpmButtonDown(5); }, 
              onMouseUp: () => setPlusPressed(false), 
              onMouseLeave: () => setPlusPressed(false), 
              style: { width: '45px', height: '45px', background: '#fff', borderRadius: '10px', border: '2px solid #fff', fontSize: '24px', fontWeight: '600', color: '#06b3fd', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', transform: plusPressed ? 'translateY(2px)' : 'translateY(0)' }
            }, '+')
          )
        ),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', alignItems: 'center' }},
          getRowSplit(beatsPerBar).map((rowCount, rowIndex) => {
            const startIndex = rowIndex === 0 ? 0 : getRowSplit(beatsPerBar)[0];
            return React.createElement('div', { key: rowIndex, style: { display: 'flex', justifyContent: 'center', gap: '8px' }},
              [...Array(rowCount)].map((_, colIndex) => {
                const index = startIndex + colIndex;
                const emphasis = beatEmphasis[index];
                const isActive = isPlaying && beat === index;
                return React.createElement('button', { 
                  key: index, 
                  onClick: () => cycleBeatEmphasis(index),
                  className: 'beat-circle',
                  style: { width: '48px', height: '48px', borderRadius: '50%', background: isActive ? (emphasis === 'accent' ? 'linear-gradient(135deg, #06b3fd, #38bdf8)' : emphasis === 'mute' ? '#9ca3af' : '#06b3fd') : emphasis === 'accent' ? 'rgba(6,179,253,0.15)' : emphasis === 'mute' ? '#e5e7eb' : '#f8f9fa', border: isActive ? 'none' : emphasis === 'accent' ? '2px solid #06b3fd' : emphasis === 'mute' ? '2px solid #9ca3af' : '2px solid #e9ecef', transition: 'all 0.1s ease', boxShadow: isActive ? '0 4px 12px rgba(6,179,253,0.4)' : 'none', transform: isActive ? 'scale(1.1)' : 'scale(1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }
                },
                  isActive && subdivisionType > 1 && emphasis !== 'mute' ? 
                    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center', justifyContent: 'center' }},
                      React.createElement('div', { style: { display: 'flex', gap: '3px', justifyContent: 'center' }},
                        [...Array(Math.min(subdivisionType, 4))].map((_, subIdx) => 
                          React.createElement('div', { key: subIdx, className: 'subdivision-dot', style: { width: '5px', height: '5px', borderRadius: '50%', background: subIdx <= subdivision ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'all 0.05s ease' }})
                        )
                      ),
                      subdivisionType >= 5 && React.createElement('div', { style: { display: 'flex', gap: '3px', justifyContent: 'center' }},
                        [...Array(subdivisionType - (subdivisionType >= 7 ? 4 : 3))].map((_, subIdx) => 
                          React.createElement('div', { key: subIdx + (subdivisionType >= 7 ? 4 : 3), className: 'subdivision-dot', style: { width: '5px', height: '5px', borderRadius: '50%', background: (subIdx + (subdivisionType >= 7 ? 4 : 3)) <= subdivision ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'all 0.05s ease' }})
                        )
                      )
                    ) : emphasis === 'mute' ?
                    React.createElement('svg', { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", style: { opacity: isActive ? 1 : 0.5 }},
                      React.createElement('path', { d: "M16.5 12C16.5 10.23 15.48 8.71 14 7.97V10.18L16.45 12.63C16.48 12.43 16.5 12.22 16.5 12ZM19 12C19 12.94 18.8 13.82 18.46 14.64L19.97 16.15C20.63 14.91 21 13.5 21 12C21 7.72 18 4.14 14 3.23V5.29C16.89 6.15 19 8.83 19 12ZM4.27 3L3 4.27L7.73 9H3V15H7L12 20V13.27L16.25 17.52C15.58 18.04 14.83 18.46 14 18.7V20.77C15.38 20.45 16.63 19.82 17.68 18.96L19.73 21L21 19.73L12 10.73L4.27 3ZM12 4L9.91 6.09L12 8.18V4Z", fill: "currentColor" })
                    ) : emphasis === 'accent' ?
                    React.createElement('svg', { width: "28", height: "28", viewBox: "0 0 28 28", fill: "none" },
                      React.createElement('path', { d: "M8 18L14 10L20 18", fill: "none", stroke: isActive ? '#fff' : '#06b3fd', strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" })
                    ) : null
                );
              })
            );
          })
        ),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }},
          React.createElement('button', { 
            onClick: handleTrainerClick, 
            onMouseDown: () => setTrainerPressed(true), 
            onMouseUp: () => setTrainerPressed(false), 
            onMouseLeave: () => setTrainerPressed(false), 
            style: { width: '56px', height: '56px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s ease', border: (trainerPressed || trainerActive) ? 'none' : '2px solid #e9ecef', background: (trainerPressed || trainerActive) ? 'linear-gradient(135deg, #06b3fd, #38bdf8)' : '#f8f9fa', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }
          },
            React.createElement('svg', { viewBox: "0 0 56 56", xmlns: "http://www.w3.org/2000/svg", style: { width: '28px', height: '28px', fill: (trainerPressed || trainerActive) ? '#fff' : '#1a1a1a' }},
              React.createElement('path', { d: "M 27.9999 51.9063 C 41.0546 51.9063 51.9063 41.0781 51.9063 28 C 51.9063 14.9453 41.0780 4.0937 28.0234 4.0937 C 26.7812 4.0937 26.1718 4.8437 26.1718 6.0625 L 26.1718 15.1563 C 26.1718 16.1641 26.8514 16.9844 27.8827 16.9844 C 28.9140 16.9844 29.6171 16.1641 29.6171 15.1563 L 29.6171 8.1484 C 39.9296 8.9688 47.8983 17.5 47.8983 28 C 47.8983 39.0625 39.0390 47.9219 27.9999 47.9219 C 16.9374 47.9219 8.0546 39.0625 8.0780 28 C 8.1014 23.0781 9.8593 18.6016 12.7890 15.1563 C 13.5155 14.2422 13.5624 13.1406 12.7890 12.3203 C 12.0155 11.4766 10.7030 11.5469 9.8593 12.6016 C 6.2733 16.7734 4.0937 22.1641 4.0937 28 C 4.0937 41.0781 14.9218 51.9063 27.9999 51.9063 Z M 31.7499 31.6094 C 33.6014 29.6875 33.2265 27.0625 30.9999 25.5156 L 18.6014 16.8672 C 17.4296 16.0469 16.2109 17.2656 17.0312 18.4375 L 25.6796 30.8359 C 27.2265 33.0625 29.8514 33.4609 31.7499 31.6094 Z" })
            )
          ),
          React.createElement('button', { onClick: () => setIsPlaying(!isPlaying), style: { flex: 1, padding: '16px', borderRadius: '10px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', border: '2px solid #06b3fd', background: isPlaying ? 'linear-gradient(135deg, #06b3fd, #38bdf8)' : 'rgba(6,179,253,0.15)', color: isPlaying ? '#fff' : '#06b3fd', boxShadow: '0 4px 12px rgba(6,179,253,0.3)', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}, 
            isPlaying && React.createElement('svg', { width: "16", height: "16", viewBox: "0 0 16 16", fill: "currentColor" }, React.createElement('rect', { x: "2", y: "2", width: "12", height: "12", rx: "2" })),
            isPlaying ? formatTime(elapsedTime) : '▶ Start'
          ),
          React.createElement('button', { 
            onClick: handleTapTempo, 
            onMouseDown: () => setTapPressed(true), 
            onMouseUp: () => setTapPressed(false), 
            onMouseLeave: () => setTapPressed(false), 
            style: { width: '56px', height: '56px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s ease', border: tapPressed ? 'none' : '2px solid #e9ecef', background: tapPressed ? 'linear-gradient(135deg, #06b3fd, #38bdf8)' : '#f8f9fa', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }
          },
            React.createElement('svg', { viewBox: "0 0 32 32", xmlns: "http://www.w3.org/2000/svg", style: { width: '28px', height: '28px', fill: tapPressed ? '#fff' : '#1a1a1a' }},
              React.createElement('path', { d: "M20,8H18A5,5,0,0,0,8,8H6A7,7,0,0,1,20,8Z" }),
              React.createElement('path', { d: "M25,15a2.94,2.94,0,0,0-1.47.4A3,3,0,0,0,21,14a2.94,2.94,0,0,0-1.47.4A3,3,0,0,0,16,13.18V8h0a3,3,0,0,0-6,0V19.1L7.77,17.58h0A2.93,2.93,0,0,0,6,17a3,3,0,0,0-2.12,5.13l8,7.3A6.16,6.16,0,0,0,16,31h5a7,7,0,0,0,7-7V18A3,3,0,0,0,25,15Zm1,9a5,5,0,0,1-5,5H16a4.17,4.17,0,0,1-2.76-1L5.29,20.7A1,1,0,0,1,5,20a1,1,0,0,1,1.6-.8L12,22.9V8a1,1,0,0,1,2,0h0V19h2V16a1,1,0,0,1,2,0v3h2V17a1,1,0,0,1,2,0v2h2V18a1,1,0,0,1,2,0Z" })
            )
          )
        ),
        React.createElement('div', { style: { display: 'flex', gap: '8px', marginBottom: '24px' }},
          React.createElement('button', { onClick: () => setShowBeatsPopup(true), style: { flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', background: '#f8f9fa', color: '#1a1a1a', border: '2px solid #e9ecef', fontFamily: "'Inter', sans-serif" }}, `Beats per Bar: ${beatsPerBar}`),
          React.createElement('button', { onClick: () => setShowSubdivisionsPopup(true), style: { flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', background: '#f8f9fa', color: '#1a1a1a', border: '2px solid #e9ecef', fontFamily: "'Inter', sans-serif" }}, `Subdivision: ${subdivisionType}`)
        )
      )
    ),
    showTrainerPopup && React.createElement('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }, onClick: () => setShowTrainerPopup(false) },
      React.createElement('div', { style: { background: '#fff', borderRadius: '15px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }, onClick: (e) => e.stopPropagation() },
        React.createElement('div', { style: { padding: '20px 24px', borderBottom: '2px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }},
          React.createElement('h3', { style: { fontSize: '18px', fontWeight: '600', fontFamily: "'Inter', sans-serif", margin: 0 }}, 'Tempo Trainer'),
          React.createElement('button', { onClick: () => setShowTrainerPopup(false), style: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6c757d', lineHeight: 1, padding: 0 }}, '×')
        ),
        React.createElement('div', { style: { padding: '24px' }},
          React.createElement('div', { style: { marginBottom: '20px' }},
            React.createElement('div', { style: { display: 'flex', gap: '8px', marginBottom: '16px' }},
              React.createElement('button', { onClick: () => setTrainerMode('off'), style: { flex: 1, padding: '12px', borderRadius: '8px', background: trainerMode === 'off' ? 'linear-gradient(135deg, #06b3fd, #38bdf8)' : '#f8f9fa', color: trainerMode === 'off' ? '#fff' : '#1a1a1a', border: trainerMode === 'off' ? 'none' : '2px solid #e9ecef', fontWeight: '600', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}, 'Off'),
              React.createElement('button', { onClick: () => setTrainerMode('increase'), style: { flex: 1, padding: '12px', borderRadius: '8px', background: trainerMode === 'increase' ? 'linear-gradient(135deg, #06b3fd, #38bdf8)' : '#f8f9fa', color: trainerMode === 'increase' ? '#fff' : '#1a1a1a', border: trainerMode === 'increase' ? 'none' : '2px solid #e9ecef', fontWeight: '600', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}, 'Increase'),
              React.createElement('button', { onClick: () => setTrainerMode('decrease'), style: { flex: 1, padding: '12px', borderRadius: '8px', background: trainerMode === 'decrease' ? 'linear-gradient(135deg, #06b3fd, #38bdf8)' : '#f8f9fa', color: trainerMode === 'decrease' ? '#fff' : '#1a1a1a', border: trainerMode === 'decrease' ? 'none' : '2px solid #e9ecef', fontWeight: '600', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}, 'Decrease')
            )
          ),
          React.createElement('div', { style: { opacity: trainerMode === 'off' ? 0.4 : 1, pointerEvents: trainerMode === 'off' ? 'none' : 'auto' }},
            React.createElement('div', { style: { marginBottom: '16px' }},
              React.createElement('label', { style: { display: 'block', fontSize: '14px', color: '#495057', marginBottom: '8px', fontFamily: "'Inter', sans-serif" }}, 'Change by'),
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' }},
                React.createElement('input', { type: "number", value: trainerAmount, onChange: (e) => setTrainerAmount(parseInt(e.target.value) || 1), style: { flex: 1, padding: '10px 12px', border: '2px solid #dee2e6', borderRadius: '6px', fontSize: '14px', fontWeight: '600', fontFamily: "'Inter', sans-serif" }}),
                React.createElement('span', { style: { fontSize: '14px', color: '#495057', fontFamily: "'Inter', sans-serif" }}, 'BPM')
              )
            ),
            React.createElement('div', { style: { marginBottom: '16px' }},
              React.createElement('label', { style: { display: 'block', fontSize: '14px', color: '#495057', marginBottom: '8px', fontFamily: "'Inter', sans-serif" }}, 'Every'),
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' }},
                React.createElement('input', { type: "number", value: trainerInterval, onChange: (e) => setTrainerInterval(parseInt(e.target.value) || 1), style: { flex: 1, padding: '10px 12px', border: '2px solid #dee2e6', borderRadius: '6px', fontSize: '14px', fontWeight: '600', fontFamily: "'Inter', sans-serif" }}),
                React.createElement('span', { style: { fontSize: '14px', color: '#495057', fontFamily: "'Inter', sans-serif" }}, 'bars')
              )
            ),
            React.createElement('div', null,
              React.createElement('label', { style: { display: 'block', fontSize: '14px', color: '#495057', marginBottom: '8px', fontFamily: "'Inter', sans-serif" }}, 'Stop at'),
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' }},
                React.createElement('input', { type: "number", value: trainerStop, onChange: (e) => setTrainerStop(parseInt(e.target.value) || 1), style: { flex: 1, padding: '10px 12px', border: '2px solid #dee2e6', borderRadius: '6px', fontSize: '14px', fontWeight: '600', fontFamily: "'Inter', sans-serif" }}),
                React.createElement('span', { style: { fontSize: '14px', color: '#495057', fontFamily: "'Inter', sans-serif" }}, 'BPM')
              )
            )
          )
        ),
        React.createElement('div', { style: { padding: '16px 24px', borderTop: '2px solid #e9ecef', display: 'flex', justifyContent: 'flex-end' }},
          React.createElement('button', { onClick: () => setShowTrainerPopup(false), style: { padding: '10px 20px', borderRadius: '8px', background: 'linear-gradient(135deg, #06b3fd, #38bdf8)', border: 'none', color: '#fff', fontWeight: '600', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}, 'Done')
        )
      )
    ),
    showBeatsPopup && React.createElement('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }, onClick: () => setShowBeatsPopup(false) },
      React.createElement('div', { style: { background: '#fff', borderRadius: '15px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }, onClick: (e) => e.stopPropagation() },
        React.createElement('div', { style: { padding: '20px 24px', borderBottom: '2px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }},
          React.createElement('h3', { style: { fontSize: '18px', fontWeight: '600', fontFamily: "'Inter', sans-serif", margin: 0 }}, 'Beats per Bar'),
          React.createElement('button', { onClick: () => setShowBeatsPopup(false), style: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6c757d', lineHeight: 1, padding: 0 }}, '×')
        ),
        React.createElement('div', { style: { padding: '24px' }},
          React.createElement('div', { className: 'beats-popup-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px' }},
            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((beats) => 
              React.createElement('button', { key: beats, onClick: () => { setBeatsPerBar(beats); setShowBeatsPopup(false); }, style: { padding: '12px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', background: beatsPerBar === beats ? 'linear-gradient(135deg, #06b3fd, #38bdf8)' : '#f8f9fa', color: beatsPerBar === beats ? '#fff' : '#1a1a1a', border: beatsPerBar === beats ? 'none' : '2px solid #e9ecef', boxShadow: beatsPerBar === beats ? '0 2px 8px rgba(6,179,253,0.3)' : 'none', fontFamily: "'Inter', sans-serif" }}, beats)
            )
          )
        )
      )
    ),
    showSubdivisionsPopup && React.createElement('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }, onClick: () => setShowSubdivisionsPopup(false) },
      React.createElement('div', { style: { background: '#fff', borderRadius: '15px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }, onClick: (e) => e.stopPropagation() },
        React.createElement('div', { style: { padding: '20px 24px', borderBottom: '2px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }},
          React.createElement('h3', { style: { fontSize: '18px', fontWeight: '600', fontFamily: "'Inter', sans-serif", margin: 0 }}, 'Subdivision'),
          React.createElement('button', { onClick: () => setShowSubdivisionsPopup(false), style: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6c757d', lineHeight: 1, padding: 0 }}, '×')
        ),
        React.createElement('div', { style: { padding: '24px' }},
          React.createElement('div', { className: 'subdivisions-popup-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }},
            subdivisions.map((sub) => 
              React.createElement('button', { key: sub.value, onClick: () => { setSubdivisionType(sub.value); setShowSubdivisionsPopup(false); }, style: { padding: '12px 8px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', background: subdivisionType === sub.value ? 'linear-gradient(135deg, #06b3fd, #38bdf8)' : '#f8f9fa', color: subdivisionType === sub.value ? '#fff' : '#1a1a1a', border: subdivisionType === sub.value ? 'none' : '2px solid #e9ecef', boxShadow: subdivisionType === sub.value ? '0 4px 12px rgba(6,179,253,0.3)' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontFamily: "'Inter', sans-serif", minHeight: '72px', justifyContent: 'center' }},
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px' }}, sub.svg),
                React.createElement('span', { style: { fontSize: '10px', fontWeight: '600', opacity: subdivisionType === sub.value ? 1 : 0.6, textAlign: 'center', fontFamily: "'Inter', sans-serif" }}, sub.name)
              )
            )
          )
        )
      )
    )
  );
}

window.Metronome = Metronome;
