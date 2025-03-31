import { v4 as uuidv4 } from "uuid";
import { Actions } from "../actions";

const ffBuilders = [
  {
    id: 12,
    employee_name: "Unassigned",
    employee_color: "#FFC0CC",
    timeOff: [],
    employee_type: null,
    employee_rate: null,
  },
  {
    id: 13,
    employee_name: "Frosty",
    employee_color: "#86CEEB",
    timeOff: [
      {
        start: "2024-10-01T06:00:00.000Z",
        end: "2024-10-08T06:00:00.000Z",
      },
    ],
    employee_type: null,
    employee_rate: null,
  },
  { id: 14, employee_name: "Nick", employee_color: "#A32ACF", timeOff: [], employee_type: null, employee_rate: null },
  {
    id: 15,
    employee_name: "Patrick",
    employee_color: "#4CAF51",
    timeOff: [
      {
        start: "2024-10-04T06:00:00.000Z",
        end: "2024-10-10T06:00:00.000Z",
      },
    ],
    employee_type: null,
    employee_rate: null,
  },
  { id: 16, employee_name: "Dawayne", employee_color: "#FF2E54", timeOff: [], employee_type: null, employee_rate: null },
];

const initialState = {
  builders: [], // Array to store builder objects with id, name, and color
  employees: [],
};

export const builders = (state = initialState, action) => {
  switch (action.type) {
    case Actions.builders.ADD_BUILDER:
      return {
        ...state,
        builders: [
          ...state.builders,
          {
            employee_id: uuidv4(),
            employee_name: action.payload.employee_name,
            employee_color: action.payload.employee_color,
            timeOff: action.payload.timeOff,
            employee_type: action.payload.employee_type,
            employee_rate: action.payload.employee_rate,
          },
        ], // Add new builder to the array
      };

    case Actions.builders.DELETE_BUILDER:
      return {
        ...state,
        builders: state.builders.filter(
          (builder) => builder.employee_id !== action.payload
        ), // Remove builder by id
      };

    case Actions.builders.UPDATE_BUILDER:
      return {
        ...state,
        builders: state.builders.map((builder) =>
          builder.employee_id === action.payload.employee_id
            ? { ...builder, ...action.payload } // Update the builder data
            : builder
        ),
      };

    case Actions.employees.SET_EMPLOYEES:
      return {
        ...state,
        employees: [...action.payload],
      };

    case Actions.employees.UPDATE_EMPLOYEE:
      return {
        ...state,
        employees: state.employees.map((employee) =>
          employee.employee_id === action.payload.employee_id
            ? { ...employee, ...action.payload }
            : employee
        ),
      };

    case Actions.employees.ADD_EMPLOYEE:
      return {
        ...state,
        employees: [...state.employees, action.payload],
      };

    case Actions.employees.DELETE_EMPLOYEE:
      return {
        ...state,
        employees: state.employees.filter(
          (employee) => employee.employee_id !== action.payload
        ),
      };

    case Actions.employees.UPDATE_EMPLOYEE_SCHEDULING_CONFLICTS:
      return {
        ...state,
        employees: state.employees.map((employee) =>
          employee.employee_id === action.payload.employeeId
            ? { ...employee, scheduling_conflicts: action.payload.conflicts }
            : employee
        ),
      };

    default:
      return state;
  }
};
