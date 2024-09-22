import React from "react";
import GanttChart from "./components/GanttChart";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const App = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="App">
        <h1>Forever Furniture Job Schedule</h1>
        <GanttChart />
      </div>
    </DndProvider>
  );
};

export default App;
