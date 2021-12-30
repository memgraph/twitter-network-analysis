import { useState } from 'react';
import './App.css';
import CommunityDetection from './components/CommunityDetection';
import PageRank from './components/PageRank';

function App() {
  const [algorithm, setAlgorithm] = useState("CommunityDetection")

  const handleSelect = () => {
    console.log("handle select")
    var select = document.getElementById("algorithm");
    var value = select.value
    setAlgorithm(value)
  }

  if (algorithm === "PageRank") {
    return (
      <div className="App">
        <select name="algorithm" id="algorithm">
          <option value="PageRank">PageRank</option>
          <option value="CommunityDetection" selected="selected">Community Detection</option>
        </select>
        <br></br>
        <button onClick={handleSelect}>Select algorithm</button>
        <PageRank />
      </div >
    );
  }
  else {
    return (
      <div className="App">
        <select name="algorithm" id="algorithm">
          <option value="PageRank" selected="selected">PageRank</option>
          <option value="CommunityDetection">Community Detection</option>
        </select>
        <br></br>
        <button onClick={handleSelect}>Select algorithm</button>
        <CommunityDetection />
      </div >
    );
  }
}

export default App;