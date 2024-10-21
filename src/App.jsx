import React from "react";
import GanttChart from "./components/GanttChart";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import ErrorBoundary from "./components/ErrorBoundary";
import { ChartContainer } from "./components/ChartContainer";

const App = () => {
	return (
		<DndProvider backend={HTML5Backend}>
			<div className="App">
				<ErrorBoundary>
					{/* <GanttChart /> */}
					<ChartContainer />
				</ErrorBoundary>
			</div>
		</DndProvider>
	);
};

export default App;
