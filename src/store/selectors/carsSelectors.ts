import { RootState } from '../store';

export const selectCarsById = (state: RootState) => state.cars.byId;
export const selectCarsIsLoading = (state: RootState) => state.cars.isLoading;
export const selectCarsIsInitialized = (state: RootState) => state.cars.isInitialized;
export const selectCarsError = (state: RootState) => state.cars.error;
export const selectCarsFilters = (state: RootState) => state.cars.filters;

export const selectAllCars = (state: RootState) =>
  state.cars.allIds.map((id) => state.cars.byId[id]);

export const selectFilteredCars = (state: RootState) => {
  const { search, status } = state.cars.filters;
  return state.cars.allIds
    .map((id) => state.cars.byId[id])
    .filter((car) => {
      const matchesSearch =
        !search ||
        car.name.toLowerCase().includes(search.toLowerCase()) ||
        car.number.toLowerCase().includes(search.toLowerCase()) ||
        car.model.toLowerCase().includes(search.toLowerCase()) ||
        car.color.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === 'all' || car.status === status;
      return matchesSearch && matchesStatus;
    });
};

export const selectCarStats = (state: RootState) => {
  const cars = state.cars.allIds.map((id) => state.cars.byId[id]);
  return {
    total: cars.length,
    active: cars.filter((c) => c.status === 'active').length,
    inactive: cars.filter((c) => c.status === 'inactive').length,
    maintenance: cars.filter((c) => c.status === 'maintenance').length,
  };
};
