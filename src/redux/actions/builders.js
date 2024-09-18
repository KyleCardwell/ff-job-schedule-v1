import { Actions } from "../actions";

export const addBuilder = (name, color) => {
  console.log('in addbuilder')
	return {
		type: Actions.builders.ADD_BUILDER,
		payload: { name, color },
	};
};

export const deleteBuilder = (id) => ({
	type: Actions.builders.DELETE_BUILDER,
	payload: id,
});

export const updateBuilder = (builder) => ({
	type: Actions.builders.UPDATE_BUILDER,
	payload: builder,
});
