import { Actions } from "../actions";
import { supabase } from "../../utils/supabase";
import { updateNextTaskNumber } from "./chartConfig";
import { binarySearch } from "../../utils/helpers";

export const fetchProjectsOptions = {
  select:
    "*, tasks (task_id, project_id, task_number, task_name, task_active, task_completed_at, task_created_at, est_duration, subtasks (subtask_id, task_id, employee_id, duration,subtask_width, start_date, end_date, subtask_created_at, hard_start_date))",
};

export const fetchCompletedProjectsOptions = {
  select:
    "*, tasks (task_id, project_id, task_number, task_name, task_active, task_created_at, est_duration)",
};

export const fetchProjects =
  (options = {}) =>
  async (dispatch) => {
    dispatch({ type: Actions.projects.FETCH_PROJECTS_START });

    try {
      const { data: result, error } = await supabase
        .from("projects")
        .select(fetchProjectsOptions.select)
        .is("project_completed_at", null)
        .order("project_created_at", { ascending: true });

      if (error) throw error;

      // Extract project-level data into a map for O(1) lookup
      const projectsData = result.reduce((acc, project) => {
        acc[project.project_id] = {
          project_name: project.project_name,
          project_id: project.project_id,
          project_created_at: project.project_created_at,
          needs_attention: project.needs_attention,
          deposit_date: project.deposit_date,
          install_date: project.install_date,
          install_date_updated_at: project.install_date_updated_at,
          project_notes: project.project_notes,
        };
        return acc;
      }, {});

      const flattenedResult = result
        .flatMap((project) =>
          project.tasks.flatMap((task) => {
            // Sort subtasks by created_at before mapping
            const sortedSubtasks = [...task.subtasks].sort((a, b) =>
              a.subtask_created_at.localeCompare(b.subtask_created_at)
            );

            return sortedSubtasks.map((subTask, index) => ({
              ...subTask,
              project_id: task.project_id,
              project_name: project.project_name,
              project_created_at: project.project_created_at,
              task_name: task.task_name,
              task_created_at: task.task_created_at,
              task_active: task.task_active,
              task_completed_at: task.task_completed_at,
              heightAdjust: index === 0 ? sortedSubtasks.length : 0,
              task_number: task.task_number,
              needs_attention: project.needs_attention,
              est_duration: task.est_duration,
            }));
          })
        )
        .sort((a, b) => {
          const projectCompare = a.project_created_at.localeCompare(
            b.project_created_at
          );
          if (projectCompare !== 0) return projectCompare;

          const taskCompare = a.task_created_at.localeCompare(
            b.task_created_at
          );
          if (taskCompare !== 0) return taskCompare;

          return a.subtask_created_at.localeCompare(b.subtask_created_at);
        });

      // Dispatch both the projects data and the flattened tasks
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

export const saveProject = (projectData) => async (dispatch) => {
  dispatch({ type: Actions.projects.SAVE_PROJECT_START });

  try {
    const {
      jobName,
      projectId,
      newProjectCreatedAt,
      updatedTasks,
      removedWorkPeriods,
      nextJobNumber,
      chartConfigId,
      projectCompletedAt = null,
      needsAttention,
      depositDate,
      completedTasks = [],
    } = projectData;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: teamData } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .single();

    if (!teamData?.team_id) {
      throw new Error("No team found for user");
    }

    // 1. Create or update project
    let newProject;
    if (projectId) {
      const { data, error: projectError } = await supabase
        .from("projects")
        .update({
          project_name: jobName,
          project_created_at: newProjectCreatedAt,
          project_completed_at: projectCompletedAt,
          needs_attention: needsAttention,
          deposit_date: depositDate,
          team_id: teamData.team_id,
        })
        .eq("project_id", projectId)
        .select()
        .single();

      if (projectError)
        throw new Error(`Error updating project: ${projectError}`);
      newProject = data;
    } else {
      const { data, error: projectError } = await supabase
        .from("projects")
        .insert({
          project_name: jobName,
          project_created_at: newProjectCreatedAt,
          project_completed_at: projectCompletedAt,
          needs_attention: needsAttention,
          deposit_date: depositDate,
          team_id: teamData.team_id,
        })
        .select()
        .single();

      if (projectError)
        throw new Error(`Error creating project: ${projectError}`);
      newProject = data;
    }

    // 2. Handle tasks - separate into new and existing
    const tasksToUpdate = [];
    const tasksToInsert = [];

    Object.values(
      [...updatedTasks, ...completedTasks].reduce((acc, task) => {
        if (!acc[task.task_id]) {
          const taskData = {
            temp_task_id: task.temp_task_id,
            project_id: task.taskIsNew
              ? newProject.project_id
              : task.project_id,
            task_number: task.task_number,
            task_name: task.task_name,
            task_active: task.task_active,
            task_created_at: task.task_created_at,
            task_completed_at: task.task_completed_at,
          };

          if (task.taskIsNew) {
            tasksToInsert.push({ ...taskData, est_duration: task.duration });
          } else {
            tasksToUpdate.push({ ...taskData, task_id: task.task_id });
          }
          acc[task.task_id] = taskData;
        }
        return acc;
      }, {})
    );

    // Insert new tasks
    let newTasks = [];
    if (tasksToInsert.length > 0) {
      const { data, error } = await supabase
        .from("tasks")
        .insert(tasksToInsert)
        .select();
      if (error) throw new Error(`Error inserting tasks: ${error}`);
      newTasks = [...newTasks, ...data];
    }

    // Update existing tasks
    if (tasksToUpdate.length > 0) {
      // Process updates one at a time to avoid conflicts
      for (const task of tasksToUpdate) {
        const { temp_task_id, task_id, ...updateData } = task;
        const { data, error } = await supabase
          .from("tasks")
          .update(updateData)
          .eq("task_id", task_id) // Use .eq instead of .in
          .select();

        if (error) throw new Error(`Error updating task ${task_id}: ${error}`);
        newTasks.push(data[0]);
      }
    }

    // 3. Handle subtasks - separate into new and existing
    const subtasksToUpdate = [];
    const subtasksToInsert = [];

    updatedTasks.forEach((wp) => {
      const newTask = newTasks.find(
        (task) =>
          task.task_id === wp.task_id || task.temp_task_id === wp.temp_task_id
      );

      if (!newTask) {
        throw new Error(
          `Could not find matching task for work period ${wp.task_name}`
        );
      }

      const subtaskData = {
        task_id: wp.subTaskIsNew ? newTask.task_id : wp.task_id,
        temp_subtask_id: wp.temp_subtask_id,
        employee_id: wp.employee_id,
        start_date: wp.start_date,
        end_date: wp.end_date,
        duration: wp.duration,
        subtask_width: wp.subtask_width,
        subtask_created_at: wp.subtask_created_at,
        hard_start_date: wp.hard_start_date,
      };

      if (wp.subTaskIsNew) {
        subtasksToInsert.push(subtaskData);
      } else {
        subtasksToUpdate.push({ ...subtaskData, subtask_id: wp.subtask_id });
      }
    });

    // Insert new subtasks
    let newSubtasks = [];
    if (subtasksToInsert.length > 0) {
      const { data, error } = await supabase
        .from("subtasks")
        .insert(subtasksToInsert)
        .select();
      if (error) throw new Error(`Error inserting subtasks: ${error}`);
      newSubtasks = [...newSubtasks, ...data];
    }

    // Update existing subtasks
    if (subtasksToUpdate.length > 0) {
      // Process updates one at a time to avoid conflicts
      for (const subtask of subtasksToUpdate) {
        const { temp_subtask_id, subtask_id, ...updateData } = subtask;
        const { data, error } = await supabase
          .from("subtasks")
          .update(updateData)
          .eq("subtask_id", subtask_id) // Use .eq instead of .in
          .select();

        if (error)
          throw new Error(`Error updating subtask ${subtask_id}: ${error}`);
        newSubtasks.push(data[0]);
      }
    }

    // Delete removed work periods
    if (removedWorkPeriods.length > 0) {
      const { error: deleteError } = await supabase
        .from("subtasks")
        .delete()
        .in("subtask_id", removedWorkPeriods);

      if (deleteError) {
        throw new Error(`Error deleting removed work periods: ${deleteError}`);
      }
    }

    dispatch(updateNextTaskNumber(nextJobNumber, chartConfigId));

    // 5. Fetch fresh data
    await dispatch(fetchProjects(fetchProjectsOptions));

    dispatch({
      type: Actions.projects.SAVE_PROJECT_SUCCESS,
      payload: newProject,
    });

    return { success: true };
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
      let query = supabase
        .from("projects")
        .select(fetchCompletedProjectsOptions.select)
        .not("project_completed_at", "is", null);

      // Add search filter if searchTerm is provided
      if (searchTerm) {
        query = query.ilike("project_name", `%${searchTerm}%`);
      }

      // Add date range filters if provided
      if (dateRange.start) {
        query = query.gte("project_completed_at", dateRange.start);
      }
      if (dateRange.end) {
        // Add one day to include the end date fully
        const endDate = new Date(dateRange.end);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt("project_completed_at", endDate.toISOString());
      }

      // Add category filters if provided
      if (categories.length > 0) {
        query = query.contains("categories", categories);
      }

      // Always order by completion date
      query = query.order("project_completed_at", { ascending: false });

      const { data: result, error } = await query;

      if (error) throw error;

      // Filter tasks client-side if there's a search term
      const processedResult = result.map((project) => ({
        ...project,
        tasks: project.tasks
          .sort((a, b) => a.task_created_at.localeCompare(b.task_created_at))
          .map((task) => ({
            task_id: task.task_id,
            task_number: task.task_number,
            task_name: task.task_name,
          })),
      }));

      dispatch({
        type: Actions.completedProjects.FETCH_COMPLETED_PROJECTS_SUCCESS,
        payload: processedResult,
      });
    } catch (error) {
      console.error("Error fetching completed projects:", error);
      dispatch({
        type: Actions.completedProjects.FETCH_COMPLETED_PROJECTS_ERROR,
        payload: error.message,
      });
    }
  };
