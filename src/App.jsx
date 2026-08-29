import { useEffect, useState } from "react";
import { fetchDataFromAPI } from "./utils/api";
import { useDispatch, useSelector } from "react-redux";
import { getApiConfiguration } from "./store/homeSlice";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/home-page";
import DetailsPage from "./pages/details-page";
import SearchResult from "./pages/search-result";
import ExplorePage from "./pages/explore-page";
import FavoritesPage from "./pages/favorites-page";
import SettingsPage from "./pages/settings-page";
import Page404 from "./pages/404-page";
import Footer from "./components/footer";
import SplashScreen from "./components/splash-screen";

import { getSavedTheme, applyTheme } from "./utils/theme";
import { initDpadNavigation } from "./utils/dpadNavigation";
import { fetchUserSimklHistory } from "./utils/simkl";
import { fetchServerSettings } from "./utils/serverSettings";

import AboutPage from "./pages/about-page";
import TvInstallPrompt from "./components/tv-install-prompt";
import BackgroundRotator from "./components/background-rotator";
import LiveTvPage from "./pages/live-tv-page";
import RecordingsPage from "./pages/recordings-page";

const App = () => {
	const dispatch = useDispatch();
	const { url } = useSelector((state) => state.home);
	const [showSplash, setShowSplash] = useState(() => {
		return !sessionStorage.getItem("bubbaflix_splash_shown");
	});

	useEffect(() => {
		const currentTheme = getSavedTheme();
		applyTheme(currentTheme);

		// Pull global settings from backend server on startup
		fetchServerSettings().then(() => {
			fetchApiConfig();
			fetchUserSimklHistory();
		});

		const cleanupDpad = initDpadNavigation();
		return () => {
			if (cleanupDpad) cleanupDpad();
		};
	}, []);

	const handleSplashComplete = () => {
		sessionStorage.setItem("bubbaflix_splash_shown", "true");
		setShowSplash(false);
	};

	const fetchApiConfig = () => {
		fetchDataFromAPI("/configuration").then((res) => {
			const config_url = {
				backdrop: res?.images?.secure_base_url + "w1280",
				poster: res?.images?.secure_base_url + "w500",
				profile: res?.images?.secure_base_url + "w185",
			};

			dispatch(getApiConfiguration(config_url));
		});
	};

	return (
		<>
			{showSplash && <SplashScreen onComplete={handleSplashComplete} />}
			<TvInstallPrompt />
			<BrowserRouter>
				<BackgroundRotator />
				<div style={{ position: "relative", zIndex: 1, opacity: 1 }}>
					<Routes>
						<Route path="/" element={<HomePage />} />
						<Route path="/livetv" element={<LiveTvPage />} />
						<Route path="/recordings" element={<RecordingsPage />} />
						<Route path="/about" element={<AboutPage />} />
						<Route path="/favorites" element={<FavoritesPage />} />
						<Route path="/settings" element={<SettingsPage />} />
						<Route path="/:mediaType/:id" element={<DetailsPage />} />
						<Route path="/search" element={<SearchResult />} />
						<Route path="/search/:query" element={<SearchResult />} />
						<Route path="/explore/:mediaType" element={<ExplorePage />} />
						<Route path="*" element={<Page404 />} />
					</Routes>
					<Footer />
				</div>
			</BrowserRouter>
		</>
	);
};

export default App;
