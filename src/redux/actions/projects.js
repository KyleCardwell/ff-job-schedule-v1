import { addDays, differenceInCalendarDays, subDays } from "date-fns";

import { normalizeDate } from "../../utils/dateUtils";
import { binarySearch } from "../../utils/helpers";
import { supabase } from "../../utils/supabase";
import { Actions } from "../actions";

export const fetchEarliestStartDate =
  (excludeEmployeeId) => async (dispatch) => {
    try {
      // SQL function:
      // create or replace function get_earliest_active_start_date(exclude_employee_id uuid)
      // returns timestamp with time zone
      // language sql
      // as $$
      //   SELECT MIN(s.start_date)
      //   FROM projects p
      //   JOIN tasks t ON t.project_id = p.project_id
      //   JOIN subtasks s ON s.task_id = t.task_id
      //   WHERE t.task_active = true
      //   AND p.project_completed_at IS NULL
      //   AND p.project_scheduled_at IS NOT NULL
      //   AND s.employee_id != exclude_employee_id;
      // $$;
      const { data } = await supabase.rpc("get_earliest_active_start_date", {
        exclude_employee_id: excludeEmployeeId,
      });

      if (data) {
        dispatch({
          type: Actions.chartData.UPDATE_CHART_START_DATE,
          payload: subDays(data, 15),
        });
      }
    } catch (error) {
      console.error("Error fetching earliest start date:", error);
    }
  };

export const restoreTaskToSchedule =
  ({ projectId, taskId }) =>
  async (dispatch, getState) => {
    try {
      const { error: taskError } = await supabase
        .from("tasks")
        .update({ task_completed_at: null, task_active: true })
        .eq("task_id", taskId);

      if (taskError) {
        throw taskError;
      }

      const { error: projectError } = await supabase
        .from("projects")
        .update({ project_completed_at: null })
        .eq("project_id", projectId);

      if (projectError) {
        throw projectError;
      }

      const state = getState();
      await dispatch(
        fetchProjects(
          state.builders.employees[0].employee_id,
          fetchProjectsOptions.select,
        ),
      );
      await dispatch(fetchCompletedProjects());

      return { success: true };
    } catch (error) {
      console.error("Error restoring task to schedule:", error);
      return { success: false, error: error.message };
    }
  };

export const restoreProjectToSchedule =
  (projectId) => async (dispatch, getState) => {
    try {
      const { error: tasksError } = await supabase
        .from("tasks")
        .update({ task_completed_at: null, task_active: true })
        .eq("project_id", projectId);

      if (tasksError) {
        throw tasksError;
      }

      const { error: projectError } = await supabase
        .from("projects")
        .update({ project_completed_at: null })
        .eq("project_id", projectId);

      if (projectError) {
        throw projectError;
      }

      const state = getState();
      await dispatch(
        fetchProjects(
          state.builders.employees[0].employee_id,
          fetchProjectsOptions.select,
        ),
      );
      await dispatch(fetchCompletedProjects());

      return { success: true };
    } catch (error) {
      console.error("Error restoring project to schedule:", error);
      return { success: false, error: error.message };
    }
  };

export const fetchEarliestAndLatestDates =
  (excludeEmployeeId) => async (dispatch) => {
    try {
      // CREATE OR REPLACE FUNCTION get_min_start_and_max_end_dates(exclude_employee_id INTEGER)
      // RETURNS TABLE (earliest_start TIMESTAMPTZ, latest_end TIMESTAMPTZ)
      // LANGUAGE SQL
      // AS $$
      //   SELECT
      //     MIN(s.start_date) AS earliest_start,
      //     MAX(s.end_date) AS latest_end
      //   FROM projects p
      //   JOIN tasks t ON t.project_id = p.project_id
      //   JOIN subtasks s ON s.task_id = t.task_id
      //   WHERE t.task_active = true
      //     AND p.project_completed_at IS NULL
      //     AND p.project_scheduled_at IS NOT NULL
      //     AND s.employee_id != exclude_employee_id;
      // $$;
      const { data } = await supabase.rpc("get_min_start_and_max_end_dates", {
        exclude_employee_id: excludeEmployeeId,
      });

      if (data) {
        const daysBeforeStart = 15;
        const daysAfterEnd = 15;
        const chartStartDate = normalizeDate(subDays(data[0], daysBeforeStart));
        const chartEndDate = normalizeDate(addDays(data[1], daysAfterEnd));
        const numDays = differenceInCalendarDays(chartEndDate, chartStartDate);
        dispatch({
          type: Actions.chartData.UPDATE_CHART_START_END_DATES,
          payload: {
            chartStartDate,
            chartEndDate,
            earliestStartDate: normalizeDate(data[0]),
            latestStartDate: normalizeDate(data[1]),
            numDays,
          },
        });
      }
    } catch (error) {
      console.error("Error fetching earliest and latest dates:", error);
    }
  };

export const fetchProjectsOptions = {
  select:
    "*, tasks (task_id, project_id, task_number, task_name, task_active, task_completed_at, task_created_at, est_duration, subtasks (subtask_id, task_id, employee_id, duration,subtask_width, start_date, end_date, subtask_created_at, hard_start_date))",
};

export const fetchCompletedProjectsOptions = {
  select:
    "*, tasks (task_id, project_id, task_number, task_name, task_active, task_completed_at, task_created_at, est_duration, project_financials (costing_complete))",
};

const fetchPartiallyCompletedProjectsOptions = {
  select:
    "*, tasks!inner (task_id, project_id, task_number, task_name, task_active, task_completed_at, task_created_at, est_duration, project_financials (costing_complete))",
};

export const fetchProjects =
  (firstEmployeeId, options = {}) =>
  async (dispatch, getState) => {
    dispatch({ type: Actions.projects.FETCH_PROJECTS_START });

    try {
      // Fetch earliest and latest dates, excluding first employee
      await dispatch(fetchEarliestAndLatestDates(firstEmployeeId));

      const { data: result, error } = await supabase
        .from("projects")
        .select(fetchProjectsOptions.select)
        .is("project_completed_at", null)
        .not("project_scheduled_at", "is", null)
        .order("project_scheduled_at", { ascending: true });

      if (error) throw error;

      const projectsData = result.reduce((acc, project) => {
        const completedRooms = (project.tasks || [])
          .filter((task) => task.task_completed_at)
          .map((task) => ({
            task_id: task.task_id,
            task_number: task.task_number,
            task_name: task.task_name,
            task_completed_at: task.task_completed_at,
          }))
          .sort(
            (a, b) =>
              new Date(b.task_completed_at || 0).getTime() -
              new Date(a.task_completed_at || 0).getTime(),
          );

        const inactiveRooms = (project.tasks || [])
          .filter((task) => !task.task_active && !task.task_completed_at)
          .map((task) => {
            const sortedSubtasks = [...(task.subtasks || [])].sort((a, b) =>
              a.subtask_created_at.localeCompare(b.subtask_created_at),
            );

            return {
              task_id: task.task_id,
              task_number: task.task_number,
              task_name: task.task_name,
              project_id: task.project_id,
              project_name: project.project_name,
              task_created_at: task.task_created_at,
              task_active: task.task_active,
              task_completed_at: task.task_completed_at,
              workPeriods: sortedSubtasks.map((subTask, index) => ({
                ...subTask,
                project_id: task.project_id,
                project_name: project.project_name,
                project_created_at: project.project_created_at,
                project_scheduled_at: project.project_scheduled_at,
                task_name: task.task_name,
                task_created_at: task.task_created_at,
                task_active: task.task_active,
                task_completed_at: task.task_completed_at,
                heightAdjust: index === 0 ? sortedSubtasks.length : 0,
                task_number: task.task_number,
                needs_attention: project.needs_attention,
                est_duration: task.est_duration,
              })),
            };
          })
          .sort((a, b) => a.task_created_at.localeCompare(b.task_created_at));

        acc[project.project_id] = {
          project_name: project.project_name,
          project_id: project.project_id,
          project_created_at: project.project_created_at,
          project_scheduled_at: project.project_scheduled_at,
          needs_attention: project.needs_attention,
          deposit_date: project.deposit_date,
          delivery_date: project.delivery_date,
          project_notes: project.project_notes,
          completed_rooms: completedRooms,
          inactive_rooms: inactiveRooms,
        };
        return acc;
      }, {});

      const flattenedResult = result
        .flatMap((project) =>
          project.tasks.flatMap((task) => {
            if (!task.task_active || task.task_completed_at) {
              return [];
            }

            // Sort subtasks by created_at before mapping
            const sortedSubtasks = [...task.subtasks].sort((a, b) =>
              a.subtask_created_at.localeCompare(b.subtask_created_at),
            );

            return sortedSubtasks.map((subTask, index) => ({
              ...subTask,
              project_id: task.project_id,
              project_name: project.project_name,
              project_created_at: project.project_created_at,
              project_scheduled_at: project.project_scheduled_at,
              task_name: task.task_name,
              task_created_at: task.task_created_at,
              task_active: task.task_active,
              task_completed_at: task.task_completed_at,
              heightAdjust: index === 0 ? sortedSubtasks.length : 0,
              task_number: task.task_number,
              needs_attention: project.needs_attention,
              est_duration: task.est_duration,
            }));
          }),
        )
        .sort((a, b) => {
          const projectCompare = a.project_scheduled_at.localeCompare(
            b.project_scheduled_at,
          );
          if (projectCompare !== 0) return projectCompare;

          const taskCompare = a.task_created_at.localeCompare(
            b.task_created_at,
          );
          if (taskCompare !== 0) return taskCompare;

          return a.subtask_created_at.localeCompare(b.subtask_created_at);
        });

      dispatch({
        type: Actions.projects.FETCH_PROJECTS_SUCCESS,
        payload: projectsData,
      });

      dispatch({
        type: Actions.chartData.FETCH_CHART_DATA_SUCCESS,
        payload: flattenedResult,
      });

      dispatch({
        type: Actions.taskData.FETCH_TASK_DATA_SUCCESS,
        payload: {
          flattenedResult,
          subTasksByEmployee: flattenedResult.reduce((acc, subTask) => {
            if (subTask.task_active === false) {
              return acc;
            }

            if (!acc[subTask.employee_id]) {
              acc[subTask.employee_id] = [];
            }

            // Find insertion point using binary search
            const insertionIndex = binarySearch(acc[subTask.employee_id], {
              start_date: subTask.start_date,
              draggedLeft: false,
            });

            // Insert at the correct position
            acc[subTask.employee_id].splice(insertionIndex, 0, subTask);
            return acc;
          }, {}),
        },
      });
    } catch (error) {
      dispatch({
        type: Actions.chartData.FETCH_CHART_DATA_ERROR,
        payload: error.message,
      });

      dispatch({
        type: Actions.taskData.FETCH_TASK_DATA_ERROR,
        payload: error.message,
      });

      dispatch({
        type: Actions.projects.FETCH_PROJECTS_ERROR,
        payload: error.message,
      });
    }
  };

const buildTaskMutationPayload = (updatedTasks = [], completedTasks = []) => {
  const tasksToUpdate = [];
  const tasksToInsert = [];
  const subtasksToUpdate = [];
  const subtasksToInsert = [];

  Object.values(
    [...updatedTasks, ...completedTasks].reduce((acc, task) => {
      if (!task?.task_id || acc[task.task_id]) {
        return acc;
      }

      const taskData = {
        task_id: task.task_id,
        temp_task_id: task.temp_task_id,
        task_number: task.task_number,
        task_name: task.task_name,
        task_active: task.task_active,
        task_created_at: task.task_created_at,
        task_completed_at: task.task_completed_at,
      };

      if (task.taskIsNew) {
        tasksToInsert.push({
          ...taskData,
          est_duration: task.duration,
        });
      } else {
        tasksToUpdate.push(taskData);
      }

      acc[task.task_id] = taskData;
      return acc;
    }, {}),
  );

  updatedTasks.forEach((task) => {
    const subtaskData = {
      subtask_id: task.subtask_id,
      temp_subtask_id: task.temp_subtask_id,
      task_id: task.task_id,
      temp_task_id: task.temp_task_id,
      employee_id: task.employee_id,
      start_date: task.start_date,
      end_date: task.end_date,
      duration: task.duration,
      subtask_width: task.subtask_width,
      subtask_created_at: task.subtask_created_at,
      hard_start_date: task.hard_start_date,
    };

    if (task.subTaskIsNew) {
      subtasksToInsert.push(subtaskData);
    } else {
      subtasksToUpdate.push(subtaskData);
    }
  });

  return {
    tasksToInsert,
    tasksToUpdate,
    subtasksToInsert,
    subtasksToUpdate,
  };
};

const buildProjectRpcPayload = ({
  jobName,
  projectId,
  newProjectCreatedAt,
  projectScheduledAt,
  projectCompletedAt,
  needsAttention,
  depositDate,
  deliveryDate,
  projectNotes,
  nextJobNumber,
  chartConfigId,
  removedWorkPeriods,
  tasksToInsert,
  tasksToUpdate,
  subtasksToInsert,
  subtasksToUpdate,
}) => ({
  p_project_id: projectId || null,
  p_job_name: jobName,
  p_project_created_at: newProjectCreatedAt,
  p_project_scheduled_at: projectScheduledAt,
  p_project_completed_at: projectCompletedAt,
  p_needs_attention: needsAttention,
  p_deposit_date: depositDate,
  p_delivery_date: deliveryDate,
  p_project_notes: projectNotes,
  p_next_task_number: nextJobNumber,
  p_chart_config_id: chartConfigId,
  p_tasks_to_insert: tasksToInsert,
  p_tasks_to_update: tasksToUpdate,
  p_subtasks_to_insert: subtasksToInsert,
  p_subtasks_to_update: subtasksToUpdate,
  p_removed_work_period_ids: removedWorkPeriods || [],
});

export const saveProject = (projectData) => async (dispatch, getState) => {
  dispatch({ type: Actions.projects.SAVE_PROJECT_START });

  try {
    const {
      jobName,
      projectId,
      newProjectCreatedAt,
      project_scheduled_at: projectScheduledAt,
      updatedTasks,
      removedWorkPeriods,
      nextJobNumber,
      chartConfigId,
      projectCompletedAt = null,
      needsAttention,
      depositDate,
      deliveryDate,
      projectNotes,
    } = projectData;

    const {
      tasksToInsert,
      tasksToUpdate,
      subtasksToInsert,
      subtasksToUpdate,
    } = buildTaskMutationPayload(updatedTasks, []);

    const { data, error } = await supabase.rpc(
      "save_project_with_tasks",
      buildProjectRpcPayload({
        jobName,
        projectId,
        newProjectCreatedAt,
        projectScheduledAt,
        projectCompletedAt,
        needsAttention,
        depositDate,
        deliveryDate,
        projectNotes,
        nextJobNumber,
        chartConfigId,
        removedWorkPeriods,
        tasksToInsert,
        tasksToUpdate,
        subtasksToInsert,
        subtasksToUpdate,
      }),
    );

    if (error) {
      throw new Error(error.message || `Error saving project: ${error}`);
    }

    dispatch({
      type: Actions.chartConfig.UPDATE_NEXT_TASK_NUMBER,
      payload: data?.next_task_number ?? nextJobNumber,
    });

    const state = getState();
    await dispatch(
      fetchProjects(
        state.builders.employees[0].employee_id,
        fetchProjectsOptions.select,
      ),
    );

    dispatch({
      type: Actions.projects.SAVE_PROJECT_SUCCESS,
      payload: {
        project_id: data?.project_id ?? projectId,
      },
    });

    return { success: true, data };
  } catch (error) {
    dispatch({
      type: Actions.projects.SAVE_PROJECT_ERROR,
      payload: error.message,
    });
    return { success: false, error: error.message };
  }
};

export const completeProjectTasks =
  (projectData) => async (dispatch, getState) => {
    dispatch({ type: Actions.projects.SAVE_PROJECT_START });

    try {
      const {
        jobName,
        projectId,
        newProjectCreatedAt,
        project_scheduled_at: projectScheduledAt,
        updatedTasks,
        removedWorkPeriods,
        nextJobNumber,
        chartConfigId,
        projectCompletedAt = null,
        needsAttention,
        depositDate,
        deliveryDate,
        projectNotes,
        completedTasks = [],
      } = projectData;

      const defaultEmployeeId = getState().builders.employees?.[0]?.employee_id;

      const {
        tasksToInsert,
        tasksToUpdate,
        subtasksToInsert,
        subtasksToUpdate,
      } = buildTaskMutationPayload(updatedTasks, completedTasks);

      const { data, error } = await supabase.rpc("complete_project_with_tasks", {
        ...buildProjectRpcPayload({
          jobName,
          projectId,
          newProjectCreatedAt,
          projectScheduledAt,
          projectCompletedAt,
          needsAttention,
          depositDate,
          deliveryDate,
          projectNotes,
          nextJobNumber,
          chartConfigId,
          removedWorkPeriods,
          tasksToInsert,
          tasksToUpdate,
          subtasksToInsert,
          subtasksToUpdate,
        }),
        p_completed_tasks: completedTasks,
        p_default_employee_id: defaultEmployeeId,
      });

      if (error) {
        throw new Error(error.message || `Error completing project: ${error}`);
      }

      dispatch({
        type: Actions.chartConfig.UPDATE_NEXT_TASK_NUMBER,
        payload: data?.next_task_number ?? nextJobNumber,
      });

      const state = getState();
      await dispatch(
        fetchProjects(
          state.builders.employees[0].employee_id,
          fetchProjectsOptions.select,
        ),
      );

      dispatch({
        type: Actions.projects.SAVE_PROJECT_SUCCESS,
        payload: {
          project_id: data?.project_id ?? projectId,
        },
      });

      return { success: true, data };
    } catch (error) {
      dispatch({
        type: Actions.projects.SAVE_PROJECT_ERROR,
        payload: error.message,
      });
      return { success: false, error: error.message };
    }
  };

export const updateSubtasksPositions = async (tasks) => {
  try {
    const updates = tasks.map((task) => ({
      subtask_id: task.subtask_id,
      task_id: task.task_id,
      employee_id: task.employee_id,
      subtask_created_at: task.subtask_created_at,
      start_date: task.start_date,
      end_date: task.end_date,
      duration: task.duration,
      subtask_width: task.subtask_width,
    }));

    const { data, error } = await supabase
      .from("subtasks")
      .upsert(updates)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating subtasks positions:", error);
    throw error;
  }
};

export const fetchCompletedProjects =
  ({ searchTerm = "", dateRange = {}, categories = [] } = {}) =>
  async (dispatch) => {
    dispatch({
      type: Actions.completedProjects.FETCH_COMPLETED_PROJECTS_START,
    });

    try {
      let completedProjectsQuery = supabase
        .from("projects")
        .select(fetchCompletedProjectsOptions.select)
        .not("project_completed_at", "is", null)
        .order("project_name", { ascending: true });

      let partialProjectsQuery = supabase
        .from("projects")
        .select(fetchPartiallyCompletedProjectsOptions.select)
        .is("project_completed_at", null)
        .not("tasks.task_completed_at", "is", null)
        .order("project_name", { ascending: true });

      // Add search filter if searchTerm is provided
      if (searchTerm) {
        completedProjectsQuery = completedProjectsQuery.ilike(
          "project_name",
          `%${searchTerm}%`,
        );
        partialProjectsQuery = partialProjectsQuery.ilike(
          "project_name",
          `%${searchTerm}%`,
        );
      }

      // Add category filters if provided
      if (categories.length > 0) {
        completedProjectsQuery = completedProjectsQuery.contains(
          "categories",
          categories,
        );
        partialProjectsQuery = partialProjectsQuery.contains(
          "categories",
          categories,
        );
      }

      const [completedProjectsResponse, partialProjectsResponse] =
        await Promise.all([completedProjectsQuery, partialProjectsQuery]);

      if (completedProjectsResponse.error) {
        throw completedProjectsResponse.error;
      }
      if (partialProjectsResponse.error) {
        throw partialProjectsResponse.error;
      }

      const mergedProjects = new Map();
      completedProjectsResponse.data?.forEach((project) => {
        mergedProjects.set(project.project_id, project);
      });
      partialProjectsResponse.data?.forEach((project) => {
        if (!mergedProjects.has(project.project_id)) {
          mergedProjects.set(project.project_id, project);
        }
      });
      const result = Array.from(mergedProjects.values());

      const processedResult = result.map((project) => {
        const filteredTasks = project.project_completed_at
          ? project.tasks
          : project.tasks.filter((task) => task.task_completed_at);
        const latestTaskCompletion = filteredTasks.reduce((latest, task) => {
          if (!task.task_completed_at) return latest;
          if (!latest) return task.task_completed_at;
          return task.task_completed_at > latest
            ? task.task_completed_at
            : latest;
        }, null);
        const completionDate = project.project_completed_at || latestTaskCompletion;

        return {
          ...project,
          completion_date: completionDate,
          tasks: filteredTasks
            .sort((a, b) => a.task_created_at.localeCompare(b.task_created_at))
            .map((task) => ({
              task_id: task.task_id,
              task_number: task.task_number,
              task_name: task.task_name,
              task_completed_at: task.task_completed_at,
              costing_complete:
                task.project_financials?.costing_complete || null,
            })),
        };
      });

      const filteredByDate = processedResult.filter((project) => {
        if (!dateRange.start && !dateRange.end) {
          return true;
        }

        if (!project.completion_date) {
          return false;
        }

        const completionDate = new Date(project.completion_date);
        if (dateRange.start) {
          const startDate = new Date(dateRange.start);
          if (completionDate < startDate) {
            return false;
          }
        }
        if (dateRange.end) {
          const endDate = new Date(dateRange.end);
          endDate.setDate(endDate.getDate() + 1);
          if (completionDate >= endDate) {
            return false;
          }
        }

        return true;
      });

      dispatch({
        type: Actions.completedProjects.FETCH_COMPLETED_PROJECTS_SUCCESS,
        payload: filteredByDate,
      });
    } catch (error) {
      console.error("Error fetching completed projects:", error);
      dispatch({
        type: Actions.completedProjects.FETCH_COMPLETED_PROJECTS_ERROR,
        payload: error.message,
      });
    }
  };

export const addEstimateToSchedule =
  ({
    projectName,
    teamId,
    employeeId,
    startDate,
    dayWidth,
    workdayHours,
    nextTaskNumber,
    chartConfigId,
    groups,
    existingTaskId = null,
  }) =>
  async (dispatch, getState) => {
    dispatch({ type: Actions.projects.ADD_TO_SCHEDULE_START });

    try {
      const { data, error } = await supabase.rpc("add_estimate_to_schedule", {
        p_project_name: projectName,
        p_team_id: teamId,
        p_employee_id: employeeId,
        p_start_date: startDate,
        p_day_width: dayWidth,
        p_workday_hours: workdayHours,
        p_next_task_number: nextTaskNumber,
        p_chart_config_id: chartConfigId,
        p_groups: groups,
        p_existing_task_id: existingTaskId,
      });

      if (error) throw error;

      // Update next_task_number in Redux
      dispatch({
        type: Actions.chartConfig.UPDATE_NEXT_TASK_NUMBER,
        payload: data.next_task_number,
      });

      // Refresh schedule data
      const state = getState();
      await dispatch(
        fetchProjects(
          state.builders.employees[0].employee_id,
          fetchProjectsOptions.select,
        ),
      );

      dispatch({
        type: Actions.projects.ADD_TO_SCHEDULE_SUCCESS,
        payload: data,
      });

      return { success: true, data };
    } catch (error) {
      console.error("Error adding estimate to schedule:", error);
      dispatch({
        type: Actions.projects.ADD_TO_SCHEDULE_ERROR,
        payload: error.message,
      });
      return { success: false, error: error.message };
    }
  };
