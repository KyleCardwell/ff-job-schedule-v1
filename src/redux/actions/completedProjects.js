import { Actions } from "../actions";

export const updateCompletedProjects = (completedProjects) => ({
  type: Actions.completedProjects.UPDATE_COMPLETED_PROJECTS,
  payload: completedProjects,
});

export const markProjectAsCompleted = (project) => ({
  type: Actions.completedProjects.MARK_PROJECT_AS_COMPLETED,
  payload: project,
});

export const restoreCompletedProject = (projectId) => ({
  type: Actions.completedProjects.RESTORE_COMPLETED_PROJECT,
  payload: projectId,
});