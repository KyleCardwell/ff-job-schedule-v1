import { Actions } from "../actions";

const initialState = {
  loading: false,
  error: null,
  estimates: [],
  currentEstimate: null,
  filters: {
    status: "all",
    searchTerm: "",
  },
  projectsForSelection: [],
  projectsLoading: false,
  projectsError: null,
  estimateProjects: [],
};

export const estimatesReducer = (state = initialState, action) => {
  switch (action.type) {
    case Actions.estimates.FETCH_ESTIMATES_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case Actions.estimates.FETCH_ESTIMATES_SUCCESS:
      return {
        ...state,
        estimates: action.payload,
        loading: false,
        error: null,
      };

    case Actions.estimates.FETCH_ESTIMATES_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case Actions.estimates.CREATE_ESTIMATE_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case Actions.estimates.CREATE_ESTIMATE_SUCCESS:
      return {
        ...state,
        estimates: [...state.estimates, action.payload],
        currentEstimate: action.payload,
        loading: false,
        error: null,
      };

    case Actions.estimates.CREATE_ESTIMATE_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case Actions.estimates.SET_CURRENT_ESTIMATE:
      return {
        ...state,
        currentEstimate: action.payload,
      };

    case Actions.estimates.SET_ESTIMATE_FILTERS:
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload,
        },
      };

    case Actions.estimates.CREATE_ESTIMATE_PROJECT_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case Actions.estimates.CREATE_ESTIMATE_PROJECT_SUCCESS:
      return {
        ...state,
        estimateProjects: [...state.estimateProjects, action.payload],
        loading: false,
        error: null,
      };

    case Actions.estimates.CREATE_ESTIMATE_PROJECT_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case Actions.estimates.FETCH_ESTIMATE_SUCCESS:
      return {
        ...state,
        currentEstimate: {
          ...action.payload,
          estimate_project: action.payload.estimate_project || null,
          tasks: (action.payload.tasks || []).map(task => ({
            ...task,
            sections: (task.sections || []).map(section => ({
              ...section,
              section_data: section.section_data || {},
              cabinets: section.cabinets || []
            }))
          }))
        },
        loading: false,
        error: null
      };

    case Actions.estimates.UPDATE_ESTIMATE_SUCCESS:
      // eslint-disable-next-line no-case-declarations
      const { type, data } = action.payload;
      if (type === 'project') {
        return {
          ...state,
          currentEstimate: {
            ...state.currentEstimate,
            ...data
          },
          loading: false,
          error: null
        };
      } else if (type === 'task') {
        const { tasks } = data;
        return {
          ...state,
          currentEstimate: {
            ...state.currentEstimate,
            tasks
          },
          loading: false,
          error: null
        };
      } else if (type === 'section') {
        const { taskId, task } = data;
        return {
          ...state,
          currentEstimate: {
            ...state.currentEstimate,
            tasks: state.currentEstimate.tasks.map(t => 
              t.est_task_id === taskId ? task : t
            )
          },
          loading: false,
          error: null
        };
      }
      return state;

    case Actions.estimates.UPDATE_SECTION_ITEMS_SUCCESS:
      // eslint-disable-next-line no-case-declarations
      const { type: itemType, data: sectionData } = action.payload;
      // eslint-disable-next-line no-case-declarations
      const { sectionId, operations } = sectionData;
      
      return {
        ...state,
        currentEstimate: {
          ...state.currentEstimate,
          tasks: state.currentEstimate.tasks.map(task => ({
            ...task,
            sections: task.sections.map(section => {
              if (section.est_section_id === sectionId) {
                // Get current items for this section type
                const currentItems = section[itemType] || [];
                
                // Remove deleted items
                const itemsAfterDelete = currentItems.filter(item => 
                  !operations.deleted.includes(item.id)
                );
                
                // Update existing items
                const itemsAfterUpdate = itemsAfterDelete.map(item => {
                  const updatedItem = operations.updated.find(u => u.id === item.id);
                  return updatedItem || item;
                });
                
                // Add inserted items
                const finalItems = [...itemsAfterUpdate, ...operations.inserted];
                
                return {
                  ...section,
                  [itemType]: finalItems
                };
              }
              return section;
            })
          }))
        },
        loading: false,
        error: null
      };

    case Actions.estimates.UPDATE_ESTIMATE_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    case Actions.estimates.CLEAR_CURRENT_ESTIMATE:
      return {
        ...state,
        currentEstimate: null,
        loading: false,
        error: null
      };

    default:
      return state;
  }
};
