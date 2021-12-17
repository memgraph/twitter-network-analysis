<h1 align="center">
 Dynamic algorithms visualizations
</h1>

## Choosing the algorithm

In `App.js` you can choose which visualization you'd like to see. 

- For **PageRank** you'll have:
```
import './App.css';
import PageRank from './components/PageRank';

function App() {
  return (
    <div className="App">
      <PageRank />
    </div >

  );
}

export default App;
```

- For **community detection** edit `App.js` like this:
```
import './App.css';
import CommunityDetection from './components/CommunityDetection';

function App() {
  return (
    <div className="App">
      <CommunityDetection />
    </div >

  );
}

export default App;
```

## Starting the app

On the first run, you have to build the app by running `npm install`. After you have choosen the algorithm, you can start the app by placing yourself in the frontend folder and running `npm start`. The React application will be running on `http://localhost:3000`.