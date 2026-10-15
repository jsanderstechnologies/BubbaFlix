import { createSlice } from "@reduxjs/toolkit";

const DEFAULT_POSTER_BASE = "https://image.tmdb.org/t/p/w500";
const DEFAULT_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";
const DEFAULT_PROFILE_BASE = "https://image.tmdb.org/t/p/w185";

export const homeSlice = createSlice({
  name: "home",
  initialState: {
    url: {
      backdrop: DEFAULT_BACKDROP_BASE,
      poster: DEFAULT_POSTER_BASE,
      profile: DEFAULT_PROFILE_BASE,
    },
    genres: {},
  },
  reducers: {
    getApiConfiguration: (state, action) => {
      state.url = {
        backdrop: action.payload?.backdrop || DEFAULT_BACKDROP_BASE,
        poster: action.payload?.poster || DEFAULT_POSTER_BASE,
        profile: action.payload?.profile || DEFAULT_PROFILE_BASE,
      };
    },
    getGenres: (state, action) => {
      state.genres = action.payload;
    },
  },
});

export const { getApiConfiguration, getGenres } = homeSlice.actions;

export default homeSlice.reducer;
