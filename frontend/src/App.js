import { useState } from 'react';
import './App.css';
import CommunityDetection from './components/CommunityDetection';
import PageRank from './components/PageRank';

function App() {
  const [algorithm, setAlgorithm] = useState("CommunityDetection")

  const handleClick = (algorithm) => {
    setAlgorithm(algorithm)
  }

  if (algorithm === "PageRank") {
    return (
      <div className="App">
        <button onClick={() => handleClick("CommunityDetection")}>Check out Community Detection</button>
        <PageRank />
      </div >
    );
  }
  else {
    return (
      <div className="App">
        <button onClick={() => handleClick("PageRank")}>Check out PageRank</button>
        <CommunityDetection />
      </div >
    );
  }
}

export default App;