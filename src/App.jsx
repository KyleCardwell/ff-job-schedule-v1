import React from "react";
import GanttChart from "./components/GanttChart";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import ErrorBoundary from "./components/ErrorBoundary";

const App = () => {
	return (
		<DndProvider backend={HTML5Backend}>
			<div className="App">
				<ErrorBoundary>
					<GanttChart />
				</ErrorBoundary>
			</div>
		</DndProvider>
	);
};

export default App;
