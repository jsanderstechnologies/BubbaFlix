/* eslint-disable no-unused-vars */
import { useEffect } from "react";
import { fetchDataFromAPI } from "./utils/api";
import { useDispatch, useSelector } from "react-redux";
import { getApiConfiguration } from "./store/homeSlice";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/home-page";
import DetailsPage from "./pages/details-page";
import SearchResult from "./pages/search-result";
import ExplorePage from "./pages/explore-page";
import SettingsPage from "./pages/settings-page";
import Page404 from "./pages/404-page";
import Header from "./components/header";
import Footer from "./components/footer";

import { getSavedTheme, applyTheme } from "./utils/theme";
import { initDpadNavigation } from "./utils/dpadNavigation";
import { fetchUserSimklHistory } from "./utils/simkl";

const App = () => {
	const dispatch = useDispatch();
	const { url } = useSelector((state) => state.home);

	useEffect(() => {
		const currentTheme = getSavedTheme();
		applyTheme(currentTheme);
		fetchApiConfig();
		fetchUserSimklHistory();
		const cleanupDpad = initDpadNavigation();
		return () => {
			if (cleanupDpad) cleanupDpad();
		};
	}, []);

	const fetchApiConfig = () => {
		fetchDataFromAPI("/configuration").then((res) => {
			console.log(res);

			const config_url = {
				backdrop: res?.images?.secure_base_url + "w1280",
				poster: res?.images?.secure_base_url + "w500",
				profile: res?.images?.secure_base_url + "w185",
			};

			dispatch(getApiConfiguration(config_url));
		});
	};

	return (
		<BrowserRouter>
			<Header />
			<Routes>
				<Route path="/" element={<HomePage />} />
				<Route path="/settings" element={<SettingsPage />} />
				<Route path="/:mediaType/:id" element={<DetailsPage />} />
				<Route path="/search/:query" element={<SearchResult />} />
				<Route path="/explore/:mediaType" element={<ExplorePage />} />
				<Route path="*" element={<Page404 />} />
			</Routes>
			<Footer />
		</BrowserRouter>
	);
};

export default App;
