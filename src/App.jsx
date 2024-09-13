// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'
// import GanttChart from './components/GanttChart'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <GanttChart />
//   //   <>
//   //     <div>
//   //       <a href="https://vitejs.dev" target="_blank">
//   //         <img src={viteLogo} className="logo" alt="Vite logo" />
//   //       </a>
//   //       <a href="https://react.dev" target="_blank">
//   //         <img src={reactLogo} className="logo react" alt="React logo" />
//   //       </a>
//   //     </div>
//   //     <h1>Vite + React</h1>
//   //     <div className="card">
//   //       <button onClick={() => setCount((count) => count + 1)}>
//   //         count is {count}
//   //       </button>
//   //       <p>
//   //         Edit <code>src/App.jsx</code> and save to test HMR
//   //       </p>
//   //     </div>
//   //     <p className="read-the-docs">
//   //       Click on the Vite and React logos to learn more
//   //     </p>
//   //   </>
//   )
// }

// export default App

// import React from "react";
// import GanttChart from "./components/GanttChart";

// const App = () => {
//   return (
//     <div className="App">
//       <h1>Gantt Chart with D3.js</h1>
//       <GanttChart />
//     </div>
//   );
// };

// export default App;


import React from "react";
import GanttChart from "./components/GanttChart";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const App = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="App">
        <h1>Gantt Chart with D3.js and Drag-and-Drop</h1>
        <GanttChart />
      </div>
    </DndProvider>
  );
};

export default App;
