import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HiOutlineSearch, HiOutlineFilm } from "react-icons/hi";
import { AiFillStar } from "react-icons/ai";
import { FiSettings, FiHome, FiTv, FiInfo, FiVideo } from "react-icons/fi";
import ContentWrapper from "../content-wrapper";
import "./index.scss";

const TopNav = () => {
	const [query, setQuery] = useState("");
	const navigate = useNavigate();
	const location = useLocation();

	const handleSearch = (e) => {
		const code = e.keyCode;
		if ((e.key === "Enter" || code === 13 || code === 23 || code === 66) && query.trim().length > 0) {
			e.preventDefault();
			navigate(`/search/${encodeURIComponent(query.trim())}`);
		}
	};

	const handleSearchClick = () => {
		if (query.trim().length > 0) {
			navigate(`/search/${encodeURIComponent(query.trim())}`);
		}
	};

	const isActive = (path) => {
		return location.pathname === path ? "active" : "";
	};

	return (
		<nav className="topNav">
			<ContentWrapper>
				<div className="topNavInner">
					{/* App Logo - Non-focusable branding display */}
					<div className="navLogo" style={{ pointerEvents: "none", userSelect: "none" }}>
						<img src="/logo.png" alt="BubbaFlix TV" tabIndex="-1" style={{ pointerEvents: "none" }} />
					</div>

					{/* Navigation Item Links */}
					<div className="navLinks">
						<button
							className={`navBtn ${isActive("/")}`}
							tabIndex="0"
							onClick={() => navigate("/")}
							onKeyDown={(e) => {
								const code = e.keyCode;
								if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
									e.preventDefault();
									navigate("/");
								}
							}}
						>
							<FiHome className="navIcon" />
							<span>Home</span>
						</button>

						<button
							className={`navBtn ${isActive("/livetv")}`}
							tabIndex="0"
							onClick={() => navigate("/livetv")}
							onKeyDown={(e) => {
								const code = e.keyCode;
								if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
									e.preventDefault();
									navigate("/livetv");
								}
							}}
						>
							<FiTv className="navIcon" />
							<span>Live TV</span>
						</button>

						<button
							className={`navBtn ${isActive("/recordings")}`}
							tabIndex="0"
							onClick={() => navigate("/recordings")}
							onKeyDown={(e) => {
								const code = e.keyCode;
								if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
									e.preventDefault();
									navigate("/recordings");
								}
							}}
						>
							<FiVideo className="navIcon" />
							<span>Recordings</span>
						</button>

						<button
							className={`navBtn ${isActive("/search")}`}
							tabIndex="0"
							onClick={() => navigate("/search")}
							onKeyDown={(e) => {
								const code = e.keyCode;
								if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
									e.preventDefault();
									navigate("/search");
								}
							}}
						>
							<HiOutlineSearch className="navIcon" />
							<span>Search</span>
						</button>

						<button
							className={`navBtn ${isActive("/favorites")}`}
							tabIndex="0"
							onClick={() => navigate("/favorites")}
							onKeyDown={(e) => {
								const code = e.keyCode;
								if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
									e.preventDefault();
									navigate("/favorites");
								}
							}}
						>
							<AiFillStar className="navIcon" style={{ color: "#ffd700" }} />
							<span>Favorites</span>
						</button>

						<button
							className={`navBtn ${isActive("/explore/movie")}`}
							tabIndex="0"
							onClick={() => navigate("/explore/movie")}
							onKeyDown={(e) => {
								const code = e.keyCode;
								if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
									e.preventDefault();
									navigate("/explore/movie");
								}
							}}
						>
							<HiOutlineFilm className="navIcon" />
							<span>Movies</span>
						</button>

						<button
							className={`navBtn ${isActive("/explore/tv")}`}
							tabIndex="0"
							onClick={() => navigate("/explore/tv")}
							onKeyDown={(e) => {
								const code = e.keyCode;
								if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
									e.preventDefault();
									navigate("/explore/tv");
								}
							}}
						>
							<FiTv className="navIcon" />
							<span>TV Series</span>
						</button>

						<button
							className={`navBtn ${isActive("/settings")}`}
							tabIndex="0"
							onClick={() => navigate("/settings")}
							onKeyDown={(e) => {
								const code = e.keyCode;
								if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
									e.preventDefault();
									navigate("/settings");
								}
							}}
						>
							<FiSettings className="navIcon" />
							<span>Settings</span>
						</button>

						<button
							className={`navBtn ${isActive("/about")}`}
							tabIndex="0"
							onClick={() => navigate("/about")}
							onKeyDown={(e) => {
								const code = e.keyCode;
								if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
									e.preventDefault();
									navigate("/about");
								}
							}}
						>
							<FiInfo className="navIcon" />
							<span>About</span>
						</button>
					</div>
				</div>
			</ContentWrapper>
		</nav>
	);
};

export default TopNav;
