import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Play, Pause, Square, Plus, Minus, Coffee, Settings, Terminal, Monitor } from 'lucide-react';
import { io } from 'socket.io-client';
import './index.css';

// Connect to our local backend server
// If deploying, this should point to your server URL
const socket = io('http://localhost:4005');

const formatTime = (seconds) => {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// ==========================================
// DISPLAY COMPONENT (Fullscreen Countdown)
// ==========================================
function Display() {
  const [state, setState] = useState(null);
  const [displayTime, setDisplayTime] = useState(3600);

  useEffect(() => {
    socket.on('state_update', (newState) => {
      setState(newState);
    });

    return () => {
      socket.off('state_update');
    };
  }, []);

  useEffect(() => {
    if (!state) return;

    let interval;
    if (state.isRunning && !state.isLunchBreak) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((state.targetTime - Date.now()) / 1000));
        setDisplayTime(remaining);
      }, 100);
    } else {
      setDisplayTime(state.timeLeftWhenPaused);
    }
    return () => clearInterval(interval);
  }, [state]);

  if (!state) return <div className="display-page" style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><h1 style={{ color: 'var(--red-accent)' }}>CONNECTING...</h1></div>;

  return (
    <div className="display-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <div className="bg-grid"></div>
      
      {state.isLunchBreak ? (
        <div className="glitch-wrapper lunch-break-container">
          <h1 className="glitch" data-text={state.lunchBreakText} style={{ fontSize: '6rem', textAlign: 'center' }}>
            {state.lunchBreakText}
          </h1>
          <div style={{ marginTop: '2rem', color: 'var(--red-accent)', fontSize: '2rem', textTransform: 'uppercase', letterSpacing: '5px' }}>
            SYSTEM PAUSED
          </div>
        </div>
      ) : (
        <div className="glitch-wrapper countdown-container">
          <h1 className="glitch" data-text={formatTime(displayTime)} style={{ fontSize: '15vw', lineHeight: '1' }}>
            {formatTime(displayTime)}
          </h1>
          <div style={{ color: state.isRunning ? 'var(--text-secondary)' : 'var(--red-accent)', fontSize: '2rem', letterSpacing: '10px', marginTop: '1rem', textAlign: 'center' }}>
            {state.isRunning ? 'OPERATION IN PROGRESS' : 'TIMER PAUSED'}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// ADMIN COMPONENT (Control Panel)
// ==========================================
function Admin() {
  const [state, setState] = useState(null);
  const [inputMinutes, setInputMinutes] = useState(60);
  const [lunchInput, setLunchInput] = useState("LUNCH BREAK - BACK SOON");
  const [displayTime, setDisplayTime] = useState(3600);

  useEffect(() => {
    socket.on('state_update', (newState) => {
      setState(newState);
      setLunchInput(newState.lunchBreakText);
    });

    return () => {
      socket.off('state_update');
    };
  }, []);

  // Timer loop for admin display
  useEffect(() => {
    if (!state) return;

    let interval;
    if (state.isRunning && !state.isLunchBreak) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((state.targetTime - Date.now()) / 1000));
        setDisplayTime(remaining);
      }, 100);
    } else {
      setDisplayTime(state.timeLeftWhenPaused);
    }
    return () => clearInterval(interval);
  }, [state]);

  const updateServerState = (updates) => {
    socket.emit('update_state', updates);
  };

  const toggleTimer = () => {
    if (state.isRunning) {
      const currentRemaining = Math.max(0, Math.floor((state.targetTime - Date.now()) / 1000));
      updateServerState({ isRunning: false, timeLeftWhenPaused: currentRemaining });
    } else {
      updateServerState({ isRunning: true, targetTime: Date.now() + state.timeLeftWhenPaused * 1000, isLunchBreak: false });
    }
  };
  
  const stopTimer = () => {
    updateServerState({
      isRunning: false,
      isLunchBreak: false,
      timeLeftWhenPaused: inputMinutes * 60
    });
  };
  
  const toggleLunchBreak = () => {
    const willBeLunchBreak = !state.isLunchBreak;
    if (willBeLunchBreak) {
      const currentRemaining = state.isRunning ? Math.max(0, Math.floor((state.targetTime - Date.now()) / 1000)) : state.timeLeftWhenPaused;
      updateServerState({ isLunchBreak: true, isRunning: false, timeLeftWhenPaused: currentRemaining, lunchBreakText: lunchInput });
    } else {
      updateServerState({ isLunchBreak: false });
    }
  };

  const saveLunchText = () => {
    updateServerState({ lunchBreakText: lunchInput });
  };

  const addTime = (minutes) => {
    if (state.isRunning && !state.isLunchBreak) {
      updateServerState({ targetTime: state.targetTime + minutes * 60 * 1000 });
    } else {
      updateServerState({ timeLeftWhenPaused: Math.max(0, state.timeLeftWhenPaused + minutes * 60) });
    }
  };

  const setCustomTime = () => {
    updateServerState({
      isRunning: false,
      isLunchBreak: false,
      timeLeftWhenPaused: inputMinutes * 60
    });
  };

  if (!state) return <div className="app-container"><h1 style={{ color: 'var(--red-accent)' }}>CONNECTING TO SERVER...</h1></div>;

  return (
    <>
      <div className="bg-grid"></div>
      
      <header className="header-nav">
        <div style={{ color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--red-accent)' }}>//</span> ADMIN CONSOLE
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/display" target="_blank" className="btn primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
            <Monitor size={16} /> OPEN DISPLAY
          </Link>
          <div className="header-status">
            SYNC (WEBSOCKETS)
            <div className="status-dot"></div>
          </div>
        </div>
      </header>

      <main className="app-container">
        <p className="subtitle" style={{ marginBottom: '2rem' }}>
          Real-time countdown controller. Open the Display in a new tab/screen or on another device. Connected via Socket.io.
        </p>

        <div className="panels-grid">
          <div className={`panel ${state.isRunning && !state.isLunchBreak ? 'active' : ''}`}>
            <div className="panel-title">CURRENT TIMER</div>
            <div className="panel-value">{formatTime(displayTime)}</div>
          </div>
          
          <div className={`panel ${state.isLunchBreak ? 'active' : ''}`} style={{ borderLeft: '4px solid var(--red-accent)' }}>
            <div className="panel-title">STATUS</div>
            <div className="panel-value" style={{ fontSize: '1.8rem', color: state.isRunning ? 'var(--red-accent)' : (state.isLunchBreak ? 'cyan' : 'var(--text-secondary)') }}>
              {state.isLunchBreak ? 'LUNCH BREAK' : (state.isRunning ? 'ACTIVE' : 'PAUSED')}
            </div>
            <div style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {state.isLunchBreak ? `Displaying: "${state.lunchBreakText}"` : 'SYSTEM READY.'}
            </div>
          </div>
        </div>

        <div className="controls-section" style={{ marginBottom: '2rem' }}>
          <div className="controls-header">
            <Terminal size={24} color="var(--red-accent)" />
            <h2 className="controls-title">Timer Controls</h2>
          </div>
          
          <div className="time-input-group">
            <input 
              type="number" 
              className="time-input" 
              value={inputMinutes} 
              onChange={(e) => setInputMinutes(Number(e.target.value))}
              min="1"
            />
            <span style={{ color: 'var(--text-secondary)' }}>MINUTES</span>
            <button className="btn" onClick={setCustomTime}>SET TIMER</button>
            
            <div style={{ width: '2rem' }}></div>
            
            <button className="btn" onClick={() => addTime(5)}>
              <Plus size={18} /> 5 MIN
            </button>
            <button className="btn" onClick={() => addTime(-5)}>
              <Minus size={18} /> 5 MIN
            </button>
          </div>

          <div className="btn-group" style={{ marginTop: '2rem' }}>
            <button className={`btn ${state.isRunning && !state.isLunchBreak ? '' : 'primary'}`} onClick={toggleTimer} disabled={state.isLunchBreak}>
              {state.isRunning ? <Pause size={18} /> : <Play size={18} />}
              {state.isRunning ? 'PAUSE' : 'START'}
            </button>
            
            <button className="btn" onClick={stopTimer}>
              <Square size={18} />
              RESET
            </button>
          </div>
        </div>

        <div className="controls-section">
          <div className="controls-header">
            <Coffee size={24} color="cyan" />
            <h2 className="controls-title" style={{ color: 'cyan' }}>Lunch Break Configuration</h2>
          </div>
          
          <div className="time-input-group" style={{ width: '100%' }}>
            <input 
              type="text" 
              className="time-input" 
              style={{ width: '100%', maxWidth: '400px', textAlign: 'left' }}
              value={lunchInput} 
              onChange={(e) => setLunchInput(e.target.value)}
              placeholder="Enter lunch break text..."
            />
            <button className="btn" onClick={saveLunchText}>SAVE TEXT</button>
            <div style={{ width: '2rem' }}></div>
            <button className={`btn ${state.isLunchBreak ? 'primary' : ''}`} onClick={toggleLunchBreak} style={{ borderColor: state.isLunchBreak ? 'cyan' : '', color: state.isLunchBreak ? 'cyan' : '' }}>
              <Coffee size={18} />
              {state.isLunchBreak ? 'RESUME OP' : 'ACTIVATE LUNCH BREAK'}
            </button>
          </div>
        </div>

      </main>
    </>
  );
}

// ==========================================
// APP ROUTER
// ==========================================
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Admin />} />
        <Route path="/display" element={<Display />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
