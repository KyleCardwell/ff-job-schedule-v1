import { createSelector } from "@reduxjs/toolkit";

// Memoized selector for filtering schedulable employees
export const selectSchedulableEmployees = createSelector(
  [(state) => state.builders.employees],
  (employees) => employees.filter((employee) => employee.can_schedule)
);