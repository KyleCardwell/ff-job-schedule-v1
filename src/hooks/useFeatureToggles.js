import { useSelector } from 'react-redux';

export const useFeatureToggles = () => {
  const { features } = useSelector((state) => state.featureToggles);
  const { teamId } = useSelector((state) => state.auth);

  // Transform features object to check both conditions
  const transformedFeatures = Object.entries(features).reduce((acc, [featureName, { feature_enabled, enabled_teams }]) => ({
    ...acc,
    [featureName]: feature_enabled || (enabled_teams?.includes(teamId) ?? false)
  }), {});

  return transformedFeatures;
};

export default useFeatureToggles;
