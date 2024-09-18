import React from "react";
import GanttChart from "./components/GanttChart";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import AddBuilderForm from "./components/AddBuilderForm";

const App = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="App">
        <h1>Gantt Chart with D3.js and Drag-and-Drop</h1>
        <GanttChart />
        <AddBuilderForm />
      </div>
    </DndProvider>
  );
};

export default App;
