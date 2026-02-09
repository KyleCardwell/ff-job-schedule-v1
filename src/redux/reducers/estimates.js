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
        return {
          ...state,
          currentEstimate: {
            ...state.currentEstimate,
            tasks: data.tasks,
            tasks_order: data.tasks_order,
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
      } else if (type === 'custom_notes') {
        return {
          ...state,
          currentEstimate: {
            ...state.currentEstimate,
            custom_notes: data.custom_notes,
          },
          loading: false,
          error: null,
        };
      }
      return state;

    case Actions.estimates.UPDATE_SECTION_SUCCESS:
      // eslint-disable-next-line no-case-declarations
      const { taskId: updateTaskId, sectionId: updateSectionId, updatedSection } = action.payload;
      
      return {
        ...state,
        currentEstimate: {
          ...state.currentEstimate,
          tasks: state.currentEstimate.tasks.map(task => {
            if (task.est_task_id === updateTaskId) {
              return {
                ...task,
                sections: task.sections.map(section => {
                  if (section.est_section_id === updateSectionId) {
                    // Replace the entire section with the updated one
                    return updatedSection;
                  }
                  return section;
                })
              };
            }
            return task;
          })
        },
        loading: false,
        error: null
      };

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

    case Actions.estimates.UPDATE_SECTION_METADATA_SUCCESS:
      // eslint-disable-next-line no-case-declarations
      const { taskId: metaTaskId, sectionId: metaSectionId, updates } = action.payload;
      
      return {
        ...state,
        currentEstimate: {
          ...state.currentEstimate,
          tasks: state.currentEstimate.tasks.map(task => {
            if (task.est_task_id === metaTaskId) {
              return {
                ...task,
                sections: task.sections.map(section => {
                  if (section.est_section_id === metaSectionId) {
                    return {
                      ...section,
                      ...updates
                    };
                  }
                  return section;
                })
              };
            }
            return task;
          })
        },
        loading: false,
        error: null
      };

    case Actions.estimates.ADD_SECTION_SUCCESS:
      // eslint-disable-next-line no-case-declarations
      const { taskId: addTaskId, section: newSection } = action.payload;
      
      return {
        ...state,
        currentEstimate: {
          ...state.currentEstimate,
          tasks: state.currentEstimate.tasks.map(task => {
            if (task.est_task_id === addTaskId) {
              return {
                ...task,
                sections: [...task.sections, newSection]
                  .sort((a, b) => (a.section_order || 0) - (b.section_order || 0))
              };
            }
            return task;
          })
        },
        loading: false,
        error: null
      };

    case Actions.estimates.DELETE_SECTION_SUCCESS:
      // eslint-disable-next-line no-case-declarations
      const { taskId: deleteTaskId, sectionId: deleteSectionId } = action.payload;
      
      return {
        ...state,
        currentEstimate: {
          ...state.currentEstimate,
          tasks: state.currentEstimate.tasks.map(task => {
            if (task.est_task_id === deleteTaskId) {
              return {
                ...task,
                sections: task.sections.filter(section => 
                  section.est_section_id !== deleteSectionId
                )
              };
            }
            return task;
          })
        },
        loading: false,
        error: null
      };

    case Actions.estimates.UPDATE_SECTION_ITEM_ORDER_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case Actions.estimates.UPDATE_SECTION_ITEM_ORDER_SUCCESS:
      // eslint-disable-next-line no-case-declarations
      const { sectionId: orderSectionId, itemType: orderItemType, orderedIds } = action.payload;
      
      return {
        ...state,
        currentEstimate: {
          ...state.currentEstimate,
          tasks: state.currentEstimate.tasks.map(task => ({
            ...task,
            sections: task.sections.map(section => {
              if (section.est_section_id === orderSectionId) {
                const items = section[orderItemType] || [];
                const itemsMap = new Map(items.map(item => [item.id, item]));
                const reorderedItems = orderedIds.map(id => itemsMap.get(id)).filter(Boolean);

                return {
                  ...section,
                  [orderItemType]: reorderedItems,
                };
              }
              return section;
            })
          }))
        },
        loading: false,
        error: null
      };

    case Actions.estimates.UPDATE_SECTION_ITEM_ORDER_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case Actions.estimates.UPDATE_TASK_ORDER_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case Actions.estimates.UPDATE_TASK_ORDER_SUCCESS:
      // eslint-disable-next-line no-case-declarations
      const { estimateId, orderedTaskIds } = action.payload;
      if (state.currentEstimate && state.currentEstimate.estimate_id === estimateId) {
        const tasksMap = new Map(state.currentEstimate.tasks.map(task => [task.est_task_id, task]));
        const reorderedTasks = orderedTaskIds.map(id => tasksMap.get(id)).filter(Boolean);

        return {
          ...state,
          currentEstimate: {
            ...state.currentEstimate,
            tasks_order: orderedTaskIds,
            tasks: reorderedTasks,
          },
          loading: false,
        };
      }
      return {
        ...state,
        loading: false,
      };

    case Actions.estimates.UPDATE_TASK_ORDER_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case Actions.estimates.DELETE_ESTIMATE_TASK_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case Actions.estimates.DELETE_ESTIMATE_TASK_SUCCESS:
      return {
        ...state,
        loading: false,
        currentEstimate: {
          ...state.currentEstimate,
          tasks: state.currentEstimate.tasks.filter(
            (task) => task.est_task_id !== action.payload.taskId
          ),
          tasks_order: action.payload.newTasksOrder,
        },
      };

    case Actions.estimates.DELETE_ESTIMATE_TASK_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
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
