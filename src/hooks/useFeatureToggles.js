import { useSelector } from 'react-redux';

export const useFeatureToggles = () => {
  const { features } = useSelector((state) => state.featureToggles);

  return features;
};

export default useFeatureToggles;
